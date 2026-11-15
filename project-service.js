import {z} from 'zod';
import {createProjectShortcuts,shortcutSchema} from './project-shortcuts.js';
import {createRepositoryResolver} from './project-repository.js';
import {createProjectTracking} from './project-tracking.js';
import {projectShortcutTool} from './project-tools.js';
export function attachProjects(ctx,{resolveRepository=createRepositoryResolver(),readGitHub}={}){
  let records,snapshots,ownerPromise,writes=Promise.resolve();
  const recordStore=()=>records||=(async()=>ctx.storageDomain.open({name:'dsh_personal_workbench_projects',version:1,tables:{},global:{initial:{items:[],retired:[]},schema:shortcutSchema(z).state}}))().catch(error=>{records=undefined;throw error;});
  const snapshotStore=()=>snapshots||=(async()=>ctx.storageDomain.open({name:'dsh_personal_workbench_project_sync',version:1,tables:{},global:{initial:{},schema:z.record(z.string().regex(/^repository-[a-f0-9]{24}-github$/),z.object({repository:z.string(),checkedAt:z.string(),value:z.json()}).strict())}}))().catch(error=>{snapshots=undefined;throw error;});
  const owner=()=>ownerPromise||=Promise.resolve(createProjectShortcuts({z,resolveRepository,store:{read:async()=>structuredClone((await recordStore()).global.get()),write:async data=>(await recordStore()).global.set(data)}}));
  const track=createProjectTracking({resolveRepository,...(readGitHub?{readGitHub}:{}),
    loadSnapshot:async key=>(await snapshotStore()).global.get()[key],
    saveSnapshot:(key,value)=>{const write=writes.then(async()=>{const domain=await snapshotStore();await domain.global.set({...domain.global.get(),[key]:value});});writes=write.catch(()=>{});return write;},
  });
  ctx.effect(()=>ctx.tools.register(projectShortcutTool({owner,track})));
  ctx.effect(()=>async()=>{if(ownerPromise)await(await ownerPromise).drain();await writes;for(const pending of [records,snapshots])if(pending)await(await pending.catch(()=>null))?.close();});
  return {async read(){const data=await(await owner()).list();return {projects:[],shortcuts:await track(data.items),writeBlocked:data.writeBlocked};},
    async change(input){if(!input||!['list','create','update','remove','import'].includes(input.action))throw new Error('未知项目操作');const {action,...fields}=input;return action==='list'?(await owner()).list():(await owner()).run(action,fields);}};
}
