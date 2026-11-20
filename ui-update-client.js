// Embedded into client.js by publish-ui.mjs. No eval, page reload or host setting changes.
export function updateBlockReason({active,quiet,editing,pending,dialog,draft,focused,composing,sessionKnown,running,interaction}) {
  if(!active)return 'other-page';
  if(!sessionKnown)return 'session-unknown';
  if(running||interaction)return 'chat-busy';
  if(editing||pending||dialog||draft||composing)return 'unsaved-work';
  if(!quiet)return 'interacting';
  return '';
}
export function installWorkbenchUpdates(ctx,{moduleId,endpoint,petNamespace,build}) {
  const key='__dshPersonalWorkbenchSafeUpdateV1';
  const runtime=window[key]||(window[key]={lastInput:Date.now(),inFlight:false,snapshot:null});
  runtime.activeBuild=build;
  const listeners=['pointerdown','keydown','wheel','input','compositionstart','compositionend'];
  let composing=false;
  const touch=event=>{runtime.lastInput=Date.now();if(event?.type==='compositionstart')composing=true;if(event?.type==='compositionend')composing=false;};
  ctx.effect(()=>{for(const event of listeners)document.addEventListener(event,touch,true);return()=>{for(const event of listeners)document.removeEventListener(event,touch,true);};});
  ctx.inject(['modules','uiSession'],scope=>{
    let stopped=false,checking=false,failedBuild='',timer;
    const read=()=>runtime.capture?.()||{};
    function blocked() {
      if(!runtime.capture)return 'not-mounted';
      const form=document.querySelector('.pw-assistant-frame');
      const inputs=form?[...form.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true]')]:[];
      const draft=inputs.some(el=>!el.disabled&&String(el.value??el.textContent??'').trim());
      const focused=inputs.includes(document.activeElement);
      // A retained cursor in an empty editor is not an unsent draft.
      let sessionId;try{sessionId=localStorage.getItem(petNamespace+'.assistantSession');}catch{return true;}
      const state=sessionId?scope.uiSession.sessionStatus.getSnapshot().get(sessionId):null;
      return updateBlockReason({active:ctx.layout.panelInfo.getSnapshot().activePanelId==='dsh-personal-workbench'&&!document.hidden,
        quiet:Date.now()-runtime.lastInput>=15000, ...read(),draft,focused,composing,
        sessionKnown:!sessionId||typeof state?.running==='boolean',running:state?.running,interaction:!!state?.pendingInteraction});
    }
    async function check() {
      if(stopped||checking||runtime.inFlight)return;
      checking=true;
      try {
        const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
        runtime.lastChecked=Date.now();
        if(!response.ok){runtime.checkError='检查更新失败：HTTP '+response.status;return;}
        runtime.checkError=null;
        const release=(await response.json()).value;
        if(stopped||!release?.available||typeof release.rev!=='string'||!release.rev||release.moduleId!==moduleId||release.build===build||release.build===failedBuild)return;
        runtime.pending=release.build;
        runtime.deferredReason=blocked();
        if(runtime.deferredReason)return;
        runtime.inFlight=true;
        const layout=ctx.layout, modules=scope.modules;
        const form=document.querySelector('.pw-assistant-frame');
        const focusedTag=form?.contains?.(document.activeElement)?document.activeElement?.tagName?.toLowerCase():null;
        const restoreFocus=['input','textarea'].includes(focusedTag)?focusedTag:document.activeElement?.isContentEditable?'[contenteditable=true]':null;
        const snapshot=read();
        runtime.snapshot={...snapshot,at:Date.now()};
        let navigated=false;
        const stopNavigation=layout.panelInfo.subscribe(()=>{
          const id=layout.panelInfo.getSnapshot().activePanelId;
          if(id!==null&&id!=='dsh-personal-workbench')navigated=true;
        });
        const cancelRestore=()=>{navigated=true;};
        document.addEventListener('pointerdown',cancelRestore,true);
        document.addEventListener('keydown',cancelRestore,true);
        try {
          // One entry only. Session transports and the host layout remain alive.
          await modules.entries.reload(moduleId,release.rev);
          if(runtime.activeBuild!==release.build)throw Error('宿主未激活新版模块');
          const failure=modules.entries.state.getSnapshot().failures.find(row=>row.id===moduleId);
          if(failure)throw Error(failure.message);
          if(!navigated&&layout.panelInfo.getSnapshot().activePanelId===null)layout.selectPanel('dsh-personal-workbench');
          const actual=document.querySelector('.pwb[data-ui-build]');
          if(actual&&actual.getAttribute('data-ui-build')!==release.build)throw Error('新版界面尚未加载');
          if(restoreFocus&&!navigated){
            await new Promise(resolve=>setTimeout(resolve,0));
            const input=document.querySelector('.pw-assistant-frame')?.querySelector?.(restoreFocus);
            if(!navigated&&input&&!String(input.value??input.textContent??'').trim())input.focus({preventScroll:true});
          }
          runtime.error=null;
          runtime.pending=null;
          runtime.loaded=release.build;
        } catch(error) {
          failedBuild=release.build;
          runtime.error='更新未完成，已停止自动重试：'+String(error.message).slice(0,160);
          console.error('[personal-workbench update]',error);
        } finally {
          stopNavigation();document.removeEventListener('pointerdown',cancelRestore,true);document.removeEventListener('keydown',cancelRestore,true);
          runtime.inFlight=false;
        }
      } catch {runtime.checkError='暂时无法检查更新'; /* Keep the current UI and retry next poll. */ }
      finally {checking=false;}
    }
    scope.effect(()=>{timer=setInterval(check,5000);void check();return()=>{stopped=true;clearInterval(timer);};});
  });
  return runtime;
}
