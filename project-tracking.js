import {createHash} from 'node:crypto';
import {readProjectGitHub} from './project-github.js';
import {createProjectStoreTracker} from './project-store.js';
import {createRepositoryResolver,readProjectAppearance} from './project-repository.js';
export function createProjectTracking({resolveRepository=createRepositoryResolver(),readGitHub=readProjectGitHub,readStore,loadSnapshot,saveSnapshot,now=()=>Date.now()}={}){
  const store=createProjectStoreTracker({readStore,now});
  const cache=new Map(),resolutions=new Map();
  async function resolve(entry){
    const key=JSON.stringify([entry.source,entry.threadId,entry.repository,entry.projectPath]);
    const last=resolutions.get(key);if(last&&now()<last.until)return last.promise;
    const promise=Promise.resolve().then(()=>resolveRepository(entry)).catch(()=>({repositoryState:'unavailable'}));
    resolutions.set(key,{until:now()+60000,promise});
    if(resolutions.size>100)resolutions.delete(resolutions.keys().next().value);
    return promise;
  }
  function github(repository){
    const old=cache.get(repository);if(old&&(old.inflight||now()<old.until))return old.promise;
    const state={inflight:true,until:0};
    state.promise=(async()=>{
      const key='repository-'+createHash('sha256').update(repository).digest('hex').slice(0,24)+'-github';
      let previous=old?.value;
      if(!previous)try{const saved=await loadSnapshot?.(key);if(saved?.repository===repository)previous=saved;}catch{}
      try{
        const current=await readGitHub({repo:repository,includeCommits:true});
        const events=new Map((previous?.value?.history||[]).map(event=>[event.id,event]));
        for(const event of current.history)events.set(event.id,event);
        const value={repository,checkedAt:new Date(now()).toISOString(),value:{pull:current.pull,history:[...events.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20)}};
        state.value=value;try{await saveSnapshot?.(key,value);}catch{}
        state.until=now()+300000;return {...value,availability:'connected'};
      }catch{state.value=previous;state.until=now()+60000;return {...previous,availability:'unavailable'};}
      finally{state.inflight=false;}
    })();
    cache.set(repository,state);if(cache.size>100)cache.delete(cache.keys().next().value);
    return state.promise;
  }
  return async entries=>{
    const result=new Array(entries.length);let cursor=0;
    await Promise.all(Array.from({length:Math.min(entries.length,3)},async()=>{
      while(cursor<entries.length){const index=cursor++,entry=entries[index];
        // Specialized sources retain their product-specific scope (e.g. browser vs Mac).
        if(entry.github){result[index]=entry;continue;}
        const association=await resolve(entry);
        const [repo,chrome,appearance]=await Promise.all([association.repository?github(association.repository):null,store(entry.chromeStore),
          readProjectAppearance(entry.projectPath||association.projectPath)]);
        result[index]={...entry,...association,...appearance,version:entry.version||appearance.version||'',...(repo?{github:repo}:{}),...chrome};
      }
    }));
    return result;
  };
}
