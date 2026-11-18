import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const chromeScope = 'https://www.googleapis.com/auth/chromewebstore.readonly';
export const chromeKeychain = 'dsh-personal-workbench.chrome-store.readonly';
export const chromeAccount = 'chrome-web-store';
const storeStates = {
  PENDING_REVIEW: '商店审核中',
  STAGED: '审核通过 · 待发布',
  PUBLISHED: '商店已发布',
  PUBLISHED_TO_TESTERS: '已发布给测试者',
  REJECTED: '商店审核退回',
  CANCELLED: '送审已取消',
};

const version = value => typeof value === 'string' && /^\d+(?:\.\d+){1,3}$/.test(value) ? value : '';



export function validStoreBinding(spec) {
  return typeof spec?.publisherId==='string' && /^[a-z0-9-]{1,100}$/i.test(spec.publisherId)
    && typeof spec.itemId==='string' && /^[a-p]{32}$/.test(spec.itemId);
}

export function projectStoreStatus(value, spec) {
  if (!validStoreBinding(spec)||value?.itemId!==spec.itemId) throw new Error('Chrome item mismatch');
  const submitted=value.submittedItemRevisionStatus, published=value.publishedItemRevisionStatus;
  const revision=snapshot=>{
    if(!snapshot||!Object.hasOwn(storeStates,snapshot.state))return null;
    const versions=[...new Set((Array.isArray(snapshot.distributionChannels)?snapshot.distributionChannels:[])
      .map(channel=>version(channel?.crxVersion)).filter(Boolean))].slice(0,4);
    return {state:snapshot.state,versions};
  };
  const candidate=revision(submitted), live=revision(published);
  const stage=value.takenDown===true ? 'TAKEN_DOWN' : value.warned===true ? 'WARNED' : candidate?.state||live?.state
    || (value.lastAsyncUploadState==='SUCCEEDED'?'UPLOADED':value.lastAsyncUploadState==='FAILED'?'UPLOAD_FAILED'
      :value.lastAsyncUploadState==='IN_PROGRESS'?'UPLOADING':'UNKNOWN');
  const label=storeStates[stage]||{TAKEN_DOWN:'商店条目已下架',WARNED:'商店有政策提醒',UPLOADED:'已上传 · 待送审',UPLOAD_FAILED:'商店上传失败',
    UPLOADING:'商店正在处理上传',UNKNOWN:'商店暂无发布状态'}[stage];
  return {stage,label,submittedVersions:candidate?.versions||[],publishedVersions:live?.versions||[],
    attention:['STAGED','REJECTED','TAKEN_DOWN','WARNED','UPLOAD_FAILED'].includes(stage)};
}

export async function readProjectStore(spec, {run=exec,request=fetch}={}) {
  // This opt-in credential belongs to this plugin and is created by connect-chrome-store.mjs.
  // The refresh token never enters a plugin route, command arguments or UI state.
  if(!validStoreBinding(spec))throw new Error('Chrome 商店条目格式无效');
  let settings;
  try {
    const key=await run('/usr/bin/security',['find-generic-password','-s',chromeKeychain,'-a',chromeAccount,'-w'],
      {timeout:4000,maxBuffer:16384});
    settings=JSON.parse(key.stdout);
  } catch(error) {
    if(error.code===44||error.code==='ENOENT')return {availability:'authorization_required'};
    throw error;
  }
  const {clientId,clientSecret,refreshToken}=settings||{};
  if(typeof clientId!=='string'||!clientId.endsWith('.apps.googleusercontent.com')||
    typeof refreshToken!=='string'||!refreshToken||typeof clientSecret!=='string')throw new Error('Chrome authorization unavailable');
  const tokenResponse=await request('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'})});
  if(!tokenResponse.ok)throw new Error('Chrome authorization failed');
  const token=await tokenResponse.json();
  if(typeof token.access_token!=='string'||token.scope!==chromeScope)throw new Error('Chrome read-only authorization required');
  const response=await request('https://chromewebstore.googleapis.com/v2/publishers/'+spec.publisherId+'/items/'+spec.itemId+':fetchStatus',
    {method:'GET',redirect:'error',signal:AbortSignal.timeout(6000),headers:{Authorization:'Bearer '+token.access_token}});
  if(!response.ok)throw new Error('Chrome store query failed');
  return {availability:'connected',status:projectStoreStatus(await response.json(),spec)};
}

export function createProjectStoreTracker({readStore=readProjectStore,now=()=>Date.now()}={}) {
  const cache=new Map();
  return function track(spec) {
    if(!validStoreBinding(spec))return {};
    const key=spec.publisherId+'/'+spec.itemId;
    const old=cache.get(key);
    if(old&&(old.pending||now()<old.until))return old.promise;
    const state={pending:true};
    state.promise=Promise.resolve().then(()=>readStore(spec)).then(result=>{
      state.until=now()+(result.availability==='connected'?3600000:60000);
      const storeURL='https://chrome.google.com/webstore/devconsole/'+key+'/edit';
      if(result.availability!=='connected')return {storeURL,store:{availability:result.availability}};
      const value=result.status,checkedAt=new Date(now()).toISOString();
      const id=JSON.stringify([value.stage,value.submittedVersions,value.publishedVersions]);
      const previous=old?.history||[];
      state.history=previous[0]?.id===id?previous:[{id,date:checkedAt,label:value.label,state:'Chrome 商店'},...previous].slice(0,20);
      return {storeURL,store:{availability:'connected',checkedAt,value:{...value,history:state.history}}};
    }).catch(()=>{
      state.until=now()+60000;
      return {store:{availability:'unavailable'}};
    }).finally(()=>{state.pending=false;});
    cache.set(key,state);
    if(cache.size>100)cache.delete(cache.keys().next().value);
    return state.promise;
  };
}
