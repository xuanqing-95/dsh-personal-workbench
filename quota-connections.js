import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {z} from 'zod';

const require = createRequire(import.meta.url);
const manualLimit = 12;
const units = ['%', '次', 'token', 'CNY', 'USD'];
const manualId = z.string().regex(/^manual-[0-9a-f-]{36}$/i);
const amount = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
const fields = {
  label: z.string().trim().min(1).max(80),
  unit: z.enum(units),
  value: amount,
};
const record = z.object({id:manualId, ...fields, observedAt:z.string().datetime()}).strict();
const savedSchema = z.object({harness:z.boolean(), manual:z.array(record).max(manualLimit)}).strict();
const initial = {harness:false, manual:[]};
const connectionSchema = z.discriminatedUnion('provider', [
  z.object({provider:z.literal('harness')}).strict(),
  z.object({provider:z.literal('manual'), id:manualId.optional(), ...fields}).strict(),
]);
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

function manualStatus({id,label,value,unit,observedAt}) {
  return {id, provider:'manual', label, entries:[{label:'剩余额度',value,unit}], observedAt, state:'ready', detail:'手动记录'};
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
    // No balances or account identifiers are persisted. Only explicitly linked Harness wallets are queried.
    const value = await (await store()).global.get();
    const canConnectHarness = typeof account?.getBalance === 'function';
    if (value.harness && !checking) {
      const request = harnessStatus(account,clientInfo);
      checking = request;
      request.finally(() => {if (checking===request) checking=undefined;});
    }
    const [codex,harness] = await Promise.all([codexStatus(readUsage),value.harness?checking:null]);
    return {canConnectHarness, accounts:[codex,...(harness?[harness]:[]),...value.manual.map(manualStatus)]};
  }
  function mutate(update) {
    const operation = queue.then(async () => {
      const {global} = await store();
      await global.set(update(await global.get()));
    });
    queue = operation.catch(()=>{});
    return operation.then(status);
  }
  async function connect(input) {
    const parsed = connectionSchema.safeParse(input);
    if (!parsed.success) throw fail('请选择来源并填写名称、有效的剩余额度和单位。');
    const source = parsed.data;
    if (source.provider==='harness') {
      if (typeof account?.getBalance !== 'function') throw fail('当前宿主没有提供账户余额服务。');
      return mutate(value => ({...value,harness:true}));
    }
    if (source.unit==='%' && source.value>100) throw fail('剩余百分比应在 0 到 100 之间。');
    if (['次','token'].includes(source.unit) && !Number.isSafeInteger(source.value)) throw fail('次数和 token 数量需要填写整数。');
    return mutate(value => {
      const manuals = value.manual;
      if (source.id && !manuals.some(row => row.id===source.id)) throw fail('找不到这条手动额度，请重新查看列表。');
      if (!source.id && manuals.some(row => row.label===source.label)) throw fail('这个来源名称已存在，可编辑原记录。');
      if (source.id && manuals.some(row=>row.id!==source.id && row.label===source.label)) throw fail('这个来源名称已存在。');
      if (!source.id && manuals.length>=manualLimit) throw fail('最多可记录 12 个手动额度来源。');
      const row = {id:source.id||'manual-'+randomUUID(),label:source.label,unit:source.unit,value:source.value,observedAt:new Date().toISOString()};
      return {...value, manual:source.id ? manuals.map(old=>old.id===source.id?row:old) : [...manuals,row]};
    });
  }
  async function disconnect(input) {
    const parsed = z.object({id:z.union([z.literal('harness'),manualId])}).strict().safeParse(input);
    if (!parsed.success) throw fail('请选择已连接的账户或手动额度来源。');
    return mutate(value => parsed.data.id==='harness' ? {...value,harness:false} :
      {...value,manual:value.manual.filter(row=>row.id!==parsed.data.id)});
  }
  ctx.effect(() => ctx.tools.register({
    name:'personal_quota',
    description:'list 查询工作台额度及来源和更新时间。仅在用户明确要求时连接已登录的 DeepSeek 余额或断开来源。记录其他助手额度时，value 和 unit 必须由用户提供；编辑手动记录请使用已有 id。Codex 配额从本机快照读取。',
    parameters:{type:'object',properties:{action:{enum:['list','connect','disconnect']},input:{type:'object',properties:{
      provider:{enum:['harness','manual']},id:{type:'string'},label:{type:'string'},value:{type:'number'},unit:{enum:units}
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
