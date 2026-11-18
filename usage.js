import {Worker} from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';

export function createUsageReader({home=os.homedir(),env=process.env,makeWorker=options=>new Worker(new URL('./usage-worker.js',import.meta.url),options),now=Date.now}={}) {
  const locations={
    codexHome:env.CODEX_HOME || path.join(home,'.codex'),
    hermesHome:env.HERMES_HOME || path.join(home,'.hermes'),
    harnessHome:env.DSH_HOME || path.join(home,'.dsh')
  };
  const empty={state:'loading',checkedAt:null,models:[],projects:[],sources:[],quotas:[],coverage:[]};
  let worker=null, closed=false, busy=false, lastStart=-Infinity, value=empty;
  function read(projects=[]) {
    if(closed)return {...empty,state:'unavailable'};
    if(!busy && now()-lastStart>=60000){
      lastStart=now();
      try{
        if(!worker){
          const current=worker=makeWorker({workerData:locations});
          current.on('message',m=>{
            if(worker!==current || closed)return;
            if(m.type==='result'){value=m.value;busy=false;}
            if(m.type==='progress' && value.state==='loading')value={...empty,progress:m.progress};
          });
          function lost(){
            if(worker!==current)return;
            worker=null;busy=false;value={...empty,state:'unavailable'};
          }
          current.on('error',lost);current.on('exit',lost);current.unref();
        }
        const hints=projects.filter(Boolean).slice(0,500).map(({title,threadId,source,repository,repo,projectPath})=>({title,threadId,source,repository,repo,projectPath}));
        busy=true;worker.postMessage({type:'read',hints});
      }catch{busy=false;value={...empty,state:'unavailable'};}
    }
    return {...value,refreshing:busy};
  }
  return {read,close(){closed=true;const current=worker;worker=null;return current?.terminate();}};
}
