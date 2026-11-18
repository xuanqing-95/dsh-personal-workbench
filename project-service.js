import {z} from 'zod';
import {createCodexCatalogReader} from './codex-catalog.js';
import {createProjectShortcuts,shortcutSchema} from './project-shortcuts.js';
import {createRepositoryResolver} from './project-repository.js';
import {createProjectTracking} from './project-tracking.js';
import {projectShortcutTool} from './project-tools.js';
export function attachProjects(ctx,{resolveRepository=createRepositoryResolver(),readGitHub,readCatalog=createCodexCatalogReader()}={}){
  let records,snapshots,ownerPromise,writes=Promise.resolve();
  let catalogPromise, catalogExpires=0;
  function catalog() {
    if(!catalogPromise||Date.now()>=catalogExpires) {
      catalogExpires=Date.now()+15000;
      catalogPromise=Promise.resolve().then(readCatalog).catch(()=>({availability:'unavailable',items:[]}));
    }
    return catalogPromise;
  }
  const recordStore=()=>records||=(async()=>ctx.storageDomain.open({name:'dsh_personal_workbench_projects',version:1,tables:{},global:{initial:{items:[],retired:[]},schema:shortcutSchema(z).state}}))().catch(error=>{records=undefined;throw error;});
  const snapshotStore=()=>snapshots||=(async()=>ctx.storageDomain.open({name:'dsh_personal_workbench_project_sync',version:1,tables:{},global:{initial:{},schema:z.record(z.string().regex(/^repository-[a-f0-9]{24}-github$/),z.object({repository:z.string(),checkedAt:z.string(),value:z.json()}).strict())}}))().catch(error=>{snapshots=undefined;throw error;});
  const owner=()=>ownerPromise||=Promise.resolve(createProjectShortcuts({z,resolveRepository,store:{read:async()=>structuredClone((await recordStore()).global.get()),write:async data=>(await recordStore()).global.set(data)}}));
  const track=createProjectTracking({resolveRepository,...(readGitHub?{readGitHub}:{}),
    loadSnapshot:async key=>(await snapshotStore()).global.get()[key],
    saveSnapshot:(key,value)=>{const write=writes.then(async()=>{const domain=await snapshotStore();await domain.global.set({...domain.global.get(),[key]:value});});writes=write.catch(()=>{});return write;},
  });
  ctx.effect(()=>ctx.tools.register(projectShortcutTool({owner,track})));
  ctx.effect(()=>async()=>{if(ownerPromise)await(await ownerPromise).drain();await writes;for(const pending of [records,snapshots])if(pending)await(await pending.catch(()=>null))?.close();});
  return {async has(id){return (await (await owner()).list()).items.some(item=>item.id===id);},
    async read(){
      const data=await(await owner()).list();
      const [shortcuts,codex]=await Promise.all([track(data.items),catalog()]);
      const now = Date.now();
      const threads = codex.items.map(row => {
        const thread = {id:row.id,title:row.title,source:'codex',hostId:'local'};
        const finished = Date.parse(row.completedAt);
        if (row.status === 'failed' && finished <= now && finished >= now - 24 * 60 * 60 * 1000) {
          return {...thread,state:'failed',completedAt:row.completedAt};
        }
        return thread;
      });
      const turns=new Map(codex.items.map(row=>[row.id,row]));
      return {projects:[],threads,availability:codex.availability,writeBlocked:data.writeBlocked,shortcuts:shortcuts.map(item=>{
        const turn=item.source==='codex'&&turns.get(item.threadId);
        return turn?.status?{...item,development:{status:turn.status,lastActivityAt:turn.lastActivityAt}}:item;
      })};
    },
    async change(input){if(!input||!['list','create','update','remove','import'].includes(input.action))throw new Error('未知项目操作');const {action,...fields}=input;return action==='list'?(await owner()).list():(await owner()).run(action,fields);}};
}
