// Usage only: never retain prompts, replies, credentials or tool arguments.
export const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
export const label = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,120) : '';
export function quotaSnapshot(raw, stamp, now=Date.now()) {
  if(!raw || !Number.isFinite(Date.parse(stamp)))return null;
  const windows = [['primary',raw.primary],['secondary',raw.secondary]].flatMap(([id,w])=>{
    const used=w?.used_percent, reset=w?.resets_at;
    if(typeof used!=='number'||!Number.isFinite(used)||used<0||used>100||!Number.isFinite(reset)||reset<=0||!Number.isFinite(new Date(reset*1000).getTime()))return [];
    return [{id,remaining:Math.round((100-used)*10)/10,minutes:w.window_minutes,resetAt:new Date(reset*1000).toISOString(),expired:reset*1000<=now}];
  });
  if(!windows.length)return null;
  return {provider:'Codex',plan:label(raw.plan_type),observedAt:stamp,stale:now-Date.parse(stamp)>10*60000,windows};
}
export function newLogState(){return {rows:new Map(),events:[],seen:new Set(),lastTotal:null,model:'未标明模型',cwd:'',createdAt:0,quota:null,missing:0};}
function add(state,model,values,key,stamp){
  if(key&&state.seen.has(key))return;
  const input=count(values.input),output=count(values.output),cached=count(values.cached)||0;
  if(input===null||output===null||cached>input){state.missing++;return;}
  if(key)state.seen.add(key);
  const name=label(model)||'未标明模型';const row=state.rows.get(name)||{model:name,input:0,output:0,cached:0,calls:0};
  row.input+=input;row.output+=output;row.cached+=cached;row.calls++;state.rows.set(name,row);
  if(Number.isFinite(stamp)&&stamp>=Date.now()-8*86400000)state.events.push({at:stamp,model:name,input,output,cached,calls:1});
}
export function codexRecord(state, record, createdAt=0) {
  const p=record.payload,stamp=Date.parse(record.timestamp);
  // Forks contain copied parent history. Only the new session's own events count.
  if(!Number.isFinite(stamp)||stamp<createdAt||!p)return;
  if(record.type==='turn_context') {state.model=label(p?.model)||'未标明模型';state.cwd=label(p?.cwd)||state.cwd;return;}
  if(record.type!=='event_msg'||p?.type!=='token_count')return;
  const q=quotaSnapshot(p.rate_limits,record.timestamp);if(q && (!state.quota || Date.parse(q.observedAt)>=Date.parse(state.quota.observedAt)))state.quota=q;
  const total=p.info?.total_token_usage?.total_tokens,last=p.info?.last_token_usage;
  if(!last||count(total)===null)return;
  // Repeated notifications carry the same cumulative count, not another call.
  if(total===state.lastTotal)return;
  if(state.lastTotal!==null&&total<state.lastTotal){state.lastTotal=total;return;}
  state.lastTotal=total;
  add(state,state.model,{input:last.input_tokens,output:last.output_tokens,cached:last.cached_input_tokens},null,stamp);
}
export function harnessRecord(state,r){
  if(r.type==='session'){state.cwd=r.cwd||'';state.createdAt=r.createdAt||0;return;}
  if(r.type!=='assistant/message'||r.surfaceOp!=='append'||r.time<state.createdAt)return;
  const m=r.data?.message,u=r.data?.usage;
  if(!u){state.missing++;return;}
  // Harness inputTokens excludes the cache buckets; totalTokens includes them.
  const output=count(u.outputTokens),total=count(u.totalTokens);
  const input=total!==null&&output!==null&&total>=output?total-output:null;
  add(state,m?.source?.model,{input,output,cached:u.cacheReadTokens},m?.id||String(r.seq),r.time);
}
export function projectFor(meta,hints=[],parents=new Map()){
  let id=meta.id;const visited=new Set();
  while(id&&!visited.has(id)){
    visited.add(id);const hit=hints.find(p=>p.threadId===id&&(!p.source||p.source===meta.source.toLowerCase()));
    if(hit)return label(hit.title)||'未命名项目';
    id=parents.get(id);
  }
  const repo=(meta.repo||'').replace(/\.git$/,'').split(/[/:]/).filter(Boolean).slice(-2).join('/');
  const repoMatch=repo&&hints.find(p=>p.repository===repo||p.repo===repo);
  if(repoMatch)return label(repoMatch.title);
  const pathMatch=hints.filter(p=>p.projectPath&&meta.cwd&&(meta.cwd===p.projectPath||(meta.cwd.startsWith(p.projectPath+'/')||meta.cwd.startsWith(p.projectPath+'\\')))).sort((a,b)=>b.projectPath.length-a.projectPath.length)[0];
  if(pathMatch)return label(pathMatch.title);
  if(repo&&repo.includes('/'))return label(repo.split('/').at(-1));
  return '未归属';
}
export function summarize(records,hints=[],parents=new Map()){
  const models=new Map(),projects=new Map(),sources=new Map();
  for(const record of records){
    const project=projectFor(record,hints,parents);
    for(const row of record.rows){
      const values={input:row.input,output:row.output,cached:row.cached||0,calls:row.calls||0};
      if(count(values.input)===null||count(values.output)===null)continue;
      for(const [map,key,name] of [[models,record.source+'\0'+row.model,row.model],[projects,record.source+'\0'+project,project],[sources,record.source,record.source]]){
        const entry=map.get(key)||{name,source:record.source,input:0,output:0,cached:0,calls:0};
        for(const field of Object.keys(values))entry[field]+=values[field];map.set(key,entry);
      }
    }
  }
  const sorted=map=>[...map.values()].map(r=>({...r,total:r.input+r.output})).sort((a,b)=>b.total-a.total);
  return {models:sorted(models),projects:sorted(projects),sources:sorted(sources)};
}

// Exact rolling window. Events keep only counters and time; never conversation content.
export function usageTrend(records,hints=[],parents=new Map(),coverage=[],now=Date.now()){
  const start=now-86400000,step=1800000;
  return {start:new Date(start).toISOString(),end:new Date(now).toISOString(),intervalMinutes:30,
    sources:['Codex','Harness'].map(source=>{
      const status=coverage.find(c=>c.source===source)?.state||'unavailable';
      const buckets=Array.from({length:48},(_,i)=>({start:new Date(start+i*step).toISOString(),end:new Date(start+(i+1)*step).toISOString(),total:status==='connected'?0:null,cached:status==='connected'?0:null,nonCached:status==='connected'?0:null}));
      const timed=records.filter(r=>r.source===source).map(r=>({...r,rows:(r.events||[]).filter(e=>e.at>=start&&e.at<=now)}));
      for(const r of timed)for(const e of r.rows){const b=buckets[Math.min(47,Math.floor((e.at-start)/step))];b.total=(b.total||0)+e.input+e.output;b.cached=(b.cached||0)+(e.cached||0);b.nonCached=(b.nonCached||0)+e.input+e.output-(e.cached||0);}
      const totals=summarize(timed,hints,parents);
      return {source,state:status,total:status==='unavailable'?null:totals.sources.reduce((sum,r)=>sum+r.total,0),buckets,...totals};
    }),excluded:[{source:'Hermes',reason:'仅有累计账本，无法准确还原最近 24 小时；请查看累计明细。'}]};
}

// Calendar dates follow the host timezone, including shorter and longer DST days.
export function usageDay(records,hints=[],parents=new Map(),coverage=[],now=Date.now()) {
  const day=new Date(now),year=day.getFullYear(),month=day.getMonth(),number=day.getDate();
  const start=new Date(year,month,number).getTime(),end=new Date(year,month,number+1).getTime(),step=1800000;
  const date=year+'-'+String(month+1).padStart(2,'0')+'-'+String(number).padStart(2,'0');
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {date,timeZone,start:new Date(start).toISOString(),end:new Date(end).toISOString(),intervalMinutes:30,
    sources:['Codex','Harness'].map(source=>{
      const status=coverage.find(c=>c.source===source)?.state||'unavailable';
      const buckets=Array.from({length:Math.ceil((end-start)/step)},(_,i)=>{
        const future=start+i*step>now,known=status==='connected'&&!future;
        return {start:new Date(start+i*step).toISOString(),end:new Date(Math.min(end,start+(i+1)*step)).toISOString(),future,total:known?0:null,cached:known?0:null,nonCached:known?0:null};
      });
      const timed=records.filter(r=>r.source===source).map(r=>({...r,rows:(r.events||[]).filter(e=>e.at>=start&&e.at<end&&e.at<=now)}));
      for(const r of timed)for(const e of r.rows){const b=buckets[Math.floor((e.at-start)/step)];b.total=(b.total||0)+e.input+e.output;b.cached=(b.cached||0)+(e.cached||0);b.nonCached=(b.nonCached||0)+e.input+e.output-(e.cached||0);}
      const totals=summarize(timed,hints,parents);
      return {source,state:status,total:status==='unavailable'?null:totals.sources.reduce((sum,r)=>sum+r.total,0),buckets,...totals};
    })};
}

// Advance through local midnights rather than subtracting fixed 24-hour intervals.
export function usageHistory(records,hints=[],parents=new Map(),coverage=[],now=Date.now()) {
  let at=now;
  return Array.from({length:7},(_,index)=>{
    const day=usageDay(records,hints,parents,coverage,at);
    at=Date.parse(day.start)-1;
    // An entirely absent historical day is unknown, not evidence of zero usage.
    if(index>0)for(const source of day.sources)if(!source.models.length){
      source.total=null;source.state='unavailable';
      for(const b of source.buckets){b.total=null;b.cached=null;b.nonCached=null;}
    }
    return day;
  });
}
