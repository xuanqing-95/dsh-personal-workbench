import {createRequire} from 'node:module';
import path from 'node:path';
import {z} from 'zod';

const require = createRequire(import.meta.url);
// Older profiles may carry saved notes. Leave them on disk when changing the wallet connection.
const savedSchema = z.object({harness:z.boolean(), manual:z.array(z.unknown()).optional()}).strict();
const initial = {harness:false};
const connectionSchema = z.object({provider:z.literal('harness')}).strict();
const disconnectionSchema = z.object({id:z.literal('harness')}).strict();
const fail = message => Object.assign(new Error(message), {code:'QUOTA_CONNECTION'});

// The official account service derives request headers from these three UI facts.
// It owns login and authorization; the workbench never needs the grant.
function hostClient() {
  let version = process.env.DSH_CLIENT_VERSION;
  if (!version) {
    const packages = ['@deepseek-ai/dsh/package.json'];
    if (process.resourcesPath) packages.push(path.join(process.resourcesPath,'app.asar','package.json'));
    for (const candidate of packages) {
      try {version = require(candidate).version;} catch {continue;}
      if (version) break;
    }
  }
  if (!version && process.argv[1] && path.isAbsolute(process.argv[1])) {
    try {version = createRequire(process.argv[1])('@deepseek-ai/dsh/package.json').version;} catch {}
  }
  if (!version) throw fail('当前宿主未提供账户客户端版本。');
  return {version, locale:Intl.DateTimeFormat().resolvedOptions().locale, timezoneOffsetSeconds:-new Date().getTimezoneOffset()*60};
}

function groupWallets(label, wallets) {
  if (!Array.isArray(wallets)) throw fail('账户余额格式暂无法读取。');
  return wallets.map(wallet => {
    if (!['CNY','USD'].includes(wallet?.currency) || typeof wallet.balance !== 'string' ||
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(wallet.balance) ||
        !Number.isFinite(Number(wallet.balance))) throw fail('账户余额格式暂无法读取。');
    // Preserve the decimal returned by the provider, including negative balances.
    return {label,value:wallet.balance,unit:wallet.currency};
  });
}

async function harnessStatus(account, clientInfo) {
  const base = {id:'harness', provider:'harness', label:'DeepSeek Harness', entries:[], observedAt:null};
  if (!account) return {...base,state:'unavailable',detail:'当前宿主没有提供账户余额服务。'};
  try {
    const response = await account.getBalance(clientInfo());
    if (response === null) return {...base,state:'signed-out',detail:'请先在 DeepSeek Harness 中登录。'};
    if (response?.status !== 'ready') throw Error();
    const entries = [...groupWallets('充值余额',response.value), ...groupWallets('赠金',response.bonusWallets)];
    return {...base,entries,observedAt:new Date().toISOString(),state:entries.length?'ready':'empty',
      detail:entries.length?'来自当前登录的 DeepSeek 账户':'账户尚未返回钱包余额。'};
  } catch {
    return {...base,state:'unavailable',detail:'暂时无法读取账户余额，请稍后再试。'};
  }
}

async function codexStatus(readUsage) {
  const base = {id:'codex',provider:'codex',label:'Codex',entries:[],observedAt:null};
  try {
    const usage = await readUsage();
    const quota = usage?.quotas?.find(q => q.provider === 'Codex');
    if (!quota) return {...base,state:usage?.state === 'unavailable'?'unavailable':'empty',
      detail:usage?.state === 'loading'?'正在读取本机用量记录。':'本机暂无 Codex 配额快照。'};
    const now = Date.now();
    const entries = quota.windows.filter(w => !w.expired && Date.parse(w.resetAt)>now &&
      Number.isFinite(w.remaining) && w.remaining>=0 && w.remaining<=100).map(w => ({
        label:w.minutes>0 ? (w.minutes%1440===0 ? (w.minutes/1440)+' 天额度' :
          w.minutes%60===0 ? (w.minutes/60)+' 小时额度' : w.minutes+' 分钟额度') : (w.id==='primary'?'短周期额度':'长周期额度'),
        value:w.remaining,unit:'%',resetAt:w.resetAt,
      }));
    const observedAt = Number.isFinite(Date.parse(quota.observedAt)) ? quota.observedAt : null;
    return {...base,entries,observedAt,state:!entries.length||quota.stale?'stale':'ready',
      detail:!entries.length?'上次记录的额度周期已结束。':'来自本机最近一次 Codex 配额记录'};
  } catch {return {...base,state:'unavailable',detail:'本机用量记录暂时不可用。'};}
}

export function attachQuotaConnections(ctx, {readUsage,clientInfo=hostClient}) {
  let opening, account, checking;
  let queue = Promise.resolve();
  function store() {
    if (!opening) {
      opening = ctx.storageDomain.open({name:'dsh_personal_workbench_quota_connections',version:1,tables:{},
        global:{schema:savedSchema,initial}});
      opening.catch(() => {opening = undefined;});
    }
    return opening;
  }
  ctx.effect(() => async () => {if (opening) await (await opening.catch(()=>null))?.close();});
  ctx.inject?.(['deepseekAccount'], child => {
    account = child.deepseekAccount;
    child.effect(() => () => {if (account===child.deepseekAccount) {account=undefined; checking=undefined;}});
  });
  async function status() {
    // Only query a wallet after it has been linked. Provider replies stay in memory.
    const value = await (await store()).global.get();
    const canConnectHarness = typeof account?.getBalance === 'function';
    if (value.harness && !checking) {
      const request = harnessStatus(account,clientInfo);
      checking = request;
      request.finally(() => {if (checking===request) checking=undefined;});
    }
    const [codex,harness] = await Promise.all([codexStatus(readUsage),value.harness?checking:null]);
    return {canConnectHarness, accounts:harness?[codex,harness]:[codex]};
  }
  function setHarnessConnected(connected) {
    const operation = queue.then(async () => {
      const {global} = await store();
      const saved = await global.get();
      await global.set({...saved,harness:connected});
    });
    queue = operation.catch(()=>{});
    return operation.then(status);
  }
  async function connect(input) {
    if (!connectionSchema.safeParse(input).success) throw fail('请选择支持的账户余额来源。');
    if (typeof account?.getBalance !== 'function') throw fail('当前宿主没有提供账户余额服务。');
    return setHarnessConnected(true);
  }
  async function disconnect(input) {
    if (!disconnectionSchema.safeParse(input).success) throw fail('请选择已连接的账户余额来源。');
    return setHarnessConnected(false);
  }
  ctx.effect(() => ctx.tools.register({
    name:'personal_quota',
    description:'list 查询本机 Codex 套餐额度及已连接的 DeepSeek 账户余额，返回数据来源和更新时间。仅在用户明确要求时连接或断开 DeepSeek Harness 账户余额。',
    parameters:{type:'object',properties:{action:{enum:['list','connect','disconnect']},input:{type:'object',properties:{
      provider:{enum:['harness']},id:{enum:['harness']}
    },additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute({action,input}) {
      if (action==='list') return status();
      if (action==='connect') return connect(input);
      if (action==='disconnect') return disconnect(input);
      throw fail('未知额度操作。');
    }, isConcurrencySafe:()=>false,
  }));
  return {status,connect,disconnect};
}
