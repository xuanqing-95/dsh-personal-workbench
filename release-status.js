import pkg from './package.json' with {type:'json'};

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const endpoint='https://xuanqing-lab.github.io/dsh-personal-workbench-xuanqing/index.json';
const hour=3600_000;
const run=promisify(execFile);

async function readIndex(){
  try{
    const res=await fetch(endpoint,{signal:AbortSignal.timeout(4500)});
    if(!res.ok)throw Error('release index unavailable');
    return await res.json();
  }catch{
    // curl also supports installations using a system proxy.
    const {stdout}=await run(process.platform==='win32'?'curl.exe':'curl',
      ['-q','--proto','=https','-fsS','--max-time','6',endpoint],{timeout:7000,maxBuffer:128*1024,windowsHide:true});
    return JSON.parse(stdout);
  }
}

function newerStableVersion(installed,tag){
  const current=/^(\d+)\.(\d+)\.(\d+)(-[\w.-]+)?(?:\+[\w.-]+)?$/.exec(installed);
  const stable=/^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if(!current||!stable)return false;
  for(let i=1;i<=3;i++){
    const difference=Number(stable[i])-Number(current[i]);
    if(difference)return difference>0;
  }
  return Boolean(current[4]);
}

export function createReleaseCheck({version=pkg.version,request=readIndex,now=Date.now}={}){
  let nextCheck=0,pending,available=null;
  async function refresh(){
    try{
      const index=await request();
      const entry=index.plugins.find(plugin=>plugin.name===pkg.name);
      const latest=entry.versions[0].version;
      available=newerStableVersion(version,'v'+latest)?latest:null;
      nextCheck=now()+hour;
    }catch{nextCheck=now()+5*60_000;}
    return {available};
  }
  return function check(){
    if(now()<nextCheck)return Promise.resolve({available});
    return pending??=refresh().finally(()=>{pending=undefined;});
  };
}
