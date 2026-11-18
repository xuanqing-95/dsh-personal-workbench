import {parentPort,workerData} from 'node:worker_threads';
import {readdir,stat,realpath,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import * as zlib from 'node:zlib';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {newLogState,codexRecord,harnessRecord,summarize,usageTrend,usageDay,usageHistory,quotaSnapshot,label} from './usage-core.js';
const {codexHome, harnessHome, hermesHome} = workerData;
const run = promisify(execFile);
const cache = new Map();
const SQLite = await import('node:sqlite').catch(() => null);
async function inside(root, file) {
  const base = await realpath(root), actual = await realpath(file);
  const relative = path.relative(base,actual);
  if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw Error('outside local source');
  return actual;
}
const MAX_LINE=4*1024*1024,MAX_FILE=1024*1024*1024;
// Electron's bundled zstd stops at the first appended frame. bytesWritten lets
// us continue at the next frame, while standard Node can consume them together.
// Keep both compressed input and inflated output bounded inside this worker.
async function* harnessChunks(file){
  if(typeof zlib.zstdDecompressSync!=='function')throw Error('Harness compression unavailable');
  const compressed=await readFile(file);let offset=0;
  while(offset<compressed.length){
    const {buffer,engine}=zlib.zstdDecompressSync(compressed.subarray(offset),{info:true,maxOutputLength:128*1024*1024});
    const consumed=engine.bytesWritten;
    if(!Number.isSafeInteger(consumed)||consumed<=0||consumed>compressed.length-offset)throw Error('invalid compressed frame');
    offset+=consumed;
    for(let i=0;i<buffer.length;i+=128*1024)yield buffer.subarray(i,i+128*1024);
  }
}
async function query(file, sql) {
  if (SQLite?.DatabaseSync) {
    const db = new SQLite.DatabaseSync(file, {readOnly:true});
    try { return db.prepare(sql).all(); } finally { db.close(); }
  }
  const {stdout} = await run('sqlite3',['-readonly','-json',file,sql],{shell:false,timeout:6000,maxBuffer:24*1024*1024});
  return stdout.trim() ? JSON.parse(stdout) : [];
}
async function codexThreads() {
  const states = (await entries(codexHome)).map(e=>/^state_(\d+)\.sqlite$/.exec(e.name)).filter(Boolean)
    .sort((a,b)=>Number(b[1])-Number(a[1]));
  for(const [name] of states){
    try {
      const db = await inside(codexHome,path.join(codexHome,name));
      const columns = new Set((await query(db,'pragma table_info(threads)')).map(r=>r.name));
      const fields = ['id','rollout_path','created_at','created_at_ms','source','cwd','git_origin_url','attached_thread_parent_id'];
      const selected = fields.map(key=>columns.has(key)?key:'NULL AS '+key);
      if(!columns.has('id') || !columns.has('rollout_path'))continue;
      return await query(db,'SELECT '+selected.join(',')+' FROM threads ORDER BY '+(columns.has('updated_at')?'updated_at':'id')+' DESC LIMIT 20001');
    } catch { continue; }
  }
  throw Error('local Codex ledger unavailable');
}
async function entries(dir){try{return await readdir(dir,{withFileTypes:true});}catch{return [];}}
async function scan(file,kind,createdAt=0){
  const info=await stat(file);if(!info.isFile()||info.size===0||info.size>(kind==='Harness'?64*1024*1024:MAX_FILE))throw Error('unavailable');
  const old=cache.get(file);
  if(old&&old.size===info.size&&old.mtime===info.mtimeMs&&old.ino===info.ino)return old.state;
  const append=kind==='Codex'&&old&&info.ino===old.ino&&info.size>old.size;
  const state=append?structuredClone(old.state):newLogState();
  let offset=append?old.offset:0,pending='',skip=false,overlong=0;
  const raw=kind==='Harness'?null:createReadStream(file,{start:append?offset:0,end:info.size-1,highWaterMark:128*1024});
  const input=raw||harnessChunks(file);
  // Only complete lines are committed. The next pass rereads a partial tail.
  let bytes=offset;
  try{
    for await(const chunk of input){
      let start=0;
      for(let i=0;i<chunk.length;i++)if(chunk[i]===10){
        const piece=chunk.subarray(start,i);bytes+=piece.length+1;
        if(!skip&&Buffer.byteLength(pending)+piece.length<=MAX_LINE){
          const line=pending+piece.toString('utf8');
          // Drop content/tool records before JSON parsing, including large image data.
          const wanted=kind==='Codex'?/"type"\s*:\s*"(?:turn_context|event_msg)"/.test(line.slice(0,240))&&(/"token_count"/.test(line)||/"turn_context"/.test(line.slice(0,240))):/^\{"type":"(?:session|assistant\/message)"/.test(line);
          if(wanted){try{const r=JSON.parse(line);if(kind==='Codex')codexRecord(state,r,createdAt);else harnessRecord(state,r);}catch{state.missing++;}}
        }else{overlong++;}
        pending='';skip=false;start=i+1;offset=bytes;
      }
      const tail=chunk.subarray(start);bytes+=tail.length;
      if(!skip){if(Buffer.byteLength(pending)+tail.length>MAX_LINE){skip=true;pending='';}else pending+=tail.toString('utf8');}
    }
  }catch(e){if(kind!=='Harness'||!offset)throw e;state.incomplete=true;}finally{raw?.destroy();}
  state.overlong=(state.overlong||0)+overlong;
  cache.set(file,{size:info.size,mtime:info.mtimeMs,ino:info.ino,offset,state});
  return state;
}
async function collect(hints){
  const records=[],coverage=[],parents=new Map();let latestQuota=null;
  const used=new Set();
  let codexCount=0,codexFailed=0,codexMissing=0;
  try{
    const db=await codexThreads();
    for(const row of db){let parent=row.attached_thread_parent_id;try{parent ||= JSON.parse(row.source)?.subagent?.thread_spawn?.parent_thread_id;}catch{}if(parent)parents.set(row.id,parent);}
    for(const [i,row] of db.slice(0,20000).entries()){
      try{
        const file=await inside(codexHome,row.rollout_path);
        if(!file.endsWith('.jsonl')||used.has(file))continue;used.add(file);
        const s=await scan(file,'Codex',row.created_at_ms||row.created_at*1000);
        records.push({id:row.id,source:'Codex',cwd:row.cwd,repo:row.git_origin_url,rows:[...s.rows.values()],events:s.events});codexCount++;codexMissing+=s.missing+(s.overlong||0);
        if(s.quota&&(!latestQuota||Date.parse(s.quota.observedAt)>Date.parse(latestQuota.observedAt)))latestQuota=s.quota;
      }catch{codexFailed++;}
      if(i%20===0)parentPort.postMessage({type:'progress',progress:{source:'Codex',done:i+1,total:db.length}});
    }
    coverage.push({source:'Codex',state:codexFailed||codexMissing||db.length>20000?'partial':'connected',sessions:codexCount,unreadable:codexFailed,note:codexFailed||codexMissing?'部分历史记录无法读取；数字仅含已确认用量。':'本机保留的调用记录；分支继承的旧消息不重复统计。'});
  }catch{coverage.push({source:'Codex',state:'unavailable',note:'本机 Codex 用量记录暂不可读。'});}
  let hermesProfiles=0,hermesFailed=0,hermesCount=0;const hermesRows=new Map();
  const profiles=[{name:'default',file:path.join(hermesHome,'state.db')},...(await entries(path.join(hermesHome,'profiles'))).filter(e=>e.isDirectory()).map(e=>({name:e.name,file:path.join(hermesHome,'profiles',e.name,'state.db')}))];
  for(const profile of profiles){
    try{
      const rows=await query(await inside(hermesHome,profile.file),`SELECT u.session_id,u.model,u.billing_provider,u.billing_mode,u.task,u.input_tokens,u.output_tokens,u.cache_read_tokens,u.cache_write_tokens,u.api_call_count,u.last_seen,s.cwd,s.git_repo_root,s.parent_session_id FROM session_model_usage u JOIN sessions s ON s.id=u.session_id LIMIT 20001`);
      hermesProfiles++;if(rows.length>20000)hermesFailed++;
      for(const row of rows.slice(0,20000)){
        const key=JSON.stringify([row.session_id,row.model,row.billing_provider,row.billing_mode,row.task]);
        const previous=hermesRows.get(key);if(previous&&previous.row.last_seen>=row.last_seen)continue;
        hermesRows.set(key,{row,profile:profile.name});
      }
    }catch{try{await stat(profile.file);hermesFailed++;}catch{}}
  }
  for(const {row,profile} of hermesRows.values()){
    if(row.parent_session_id)parents.set(row.session_id,row.parent_session_id);
    records.push({source:'Hermes',id:row.session_id,cwd:row.git_repo_root||row.cwd,profile,rows:[{model:label(row.model)||'未标明模型',input:row.input_tokens+row.cache_read_tokens+row.cache_write_tokens,output:row.output_tokens,cached:row.cache_read_tokens,calls:row.api_call_count}]});hermesCount++;
  }
  coverage.push({source:'Hermes',state:hermesProfiles?(hermesFailed?'partial':'connected'):'unavailable',sessions:new Set([...hermesRows.values()].map(v=>v.row.session_id)).size,note:hermesProfiles?'本机各机器人按模型累计的记录，含辅助调用；没有逐日账本，不冒充今日用量。':'Hermes 尚无可读取的模型用量账本。'});
  let harnessCount=0,harnessFailed=0,harnessMissing=0;
  const root=path.join(harnessHome,'sessions');
  for(const workspace of (await entries(root)).filter(e=>e.isDirectory())){
    for(const session of (await entries(path.join(root,workspace.name))).filter(e=>e.isDirectory())){
      const file=path.join(root,workspace.name,session.name,'session.v4.jsonl.zstd');
      try{const s=await scan(await inside(root,file),'Harness');records.push({source:'Harness',id:session.name,cwd:s.cwd,rows:[...s.rows.values()],events:s.events});harnessCount++;harnessMissing+=s.missing+(s.overlong||0)+(s.incomplete?1:0);used.add(file);}catch{harnessFailed++;}
    }
  }
  coverage.push({source:'Harness',state:harnessCount?(harnessFailed||harnessMissing?'partial':'connected'):'unavailable',sessions:harnessCount,unreadable:harnessFailed,note:harnessCount?'DeepSeek Harness 本机已保存的模型回复用量；未返回用量的请求不按零消耗计算。':'DeepSeek Harness 暂无可读取的用量记录。'});
  for(const [file,entry] of cache){if(!used.has(file))cache.delete(file);else entry.state.events=entry.state.events.filter(e=>e.at>=Date.now()-8*86400000);}
  const quotas=latestQuota?[{...latestQuota,stale:Date.now()-Date.parse(latestQuota.observedAt)>600000,windows:latestQuota.windows.map(w=>({...w,expired:Date.parse(w.resetAt)<=Date.now()}))}]:[];
  const checkedAt=Date.now();
  return {state:'ready',checkedAt:new Date(checkedAt).toISOString(),scope:'本机已记录累计',...summarize(records,hints,parents),trend:usageTrend(records,hints,parents,coverage,checkedAt),day:usageDay(records,hints,parents,coverage,checkedAt),history:usageHistory(records,hints,parents,coverage,checkedAt),quotas,coverage};
}
let busy=false;
parentPort.on('message',async m=>{if(m.type!=='read'||busy)return;busy=true;try{parentPort.postMessage({type:'result',value:await collect(m.hints||[])});}catch{parentPort.postMessage({type:'result',value:{state:'unavailable',models:[],projects:[],sources:[],quotas:[],coverage:[],checkedAt:null}});}finally{busy=false;}});
