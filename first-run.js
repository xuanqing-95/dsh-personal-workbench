import {z} from 'zod';

const schema=z.union([
  z.object({mode:z.enum(['new','examples','hidden'])}).strict(),
  z.object({dismissed:z.boolean()}).strict(),
]);

// Only the first visit checks eligibility. All later reads respect the saved choice.
export function attachFirstRun(ctx) {
  let opened,queue=Promise.resolve();
  const store=()=>opened??=ctx.storageDomain.open({
    name:'dsh_personal_workbench_first_run',version:1,tables:{},
    global:{schema,initial:{mode:'new'}},
  }).catch(error=>{opened=undefined;throw error;});
  ctx.effect(()=>async()=>{if(opened)await (await opened.catch(()=>null))?.close();});
  function serial(action){
    const next=queue.then(action);
    queue=next.catch(()=>{});
    return next;
  }
  return {
    status(hasExistingContent){
      return serial(async()=>{
        const {global}=await store();
        const state=await global.get();
        let mode=state.mode??(state.dismissed?'hidden':'examples');
        if(mode==='new')mode=await hasExistingContent()?'hidden':'examples';
        if(mode!==state.mode)await global.set({mode});
        return {showExamples:mode==='examples'};
      });
    },
    dismiss(){
      return serial(async()=>{
        await (await store()).global.set({mode:'hidden'});
        return {showExamples:false};
      });
    },
  };
}
