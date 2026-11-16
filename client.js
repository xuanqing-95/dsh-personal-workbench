window.__ModuleLoader__.load({
  id: 'dsh-personal-workbench',
  factory(require) {
    const React = require('react'), h = React.createElement;
    const WORKBENCH_UI_BUILD = "release-0.8.0-beta.4";
// BEGIN SAFE UI UPDATER
// Embedded into client.js by publish-ui.mjs. No eval, page reload or host setting changes.
function updateBlockReason({active,quiet,editing,pending,dialog,draft,focused,composing,sessionKnown,running,interaction}) {
  if(!active)return 'other-page';
  if(!sessionKnown)return 'session-unknown';
  if(running||interaction)return 'chat-busy';
  if(editing||pending||dialog||draft||composing)return 'unsaved-work';
  if(!quiet)return 'interacting';
  return '';
}
function installWorkbenchUpdates(ctx,{moduleId,endpoint,petNamespace,build}) {
  const key='__personalWorkbenchSafeUpdateV1';
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
      return updateBlockReason({active:ctx.layout.panelInfo.getSnapshot().activePanelId==='personal-workbench'&&!document.hidden,
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
          if(id!==null&&id!=='personal-workbench')navigated=true;
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
          if(!navigated&&layout.panelInfo.getSnapshot().activePanelId===null)layout.selectPanel('personal-workbench');
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
// END SAFE UI UPDATER
    function restoredUI(key,fallback){const value=window.__personalWorkbenchSafeUpdateV1?.snapshot;return value&&Date.now()-value.at<600000&&value[key]!==undefined?value[key]:fallback;}

    const { createPortal } = require('react-dom');
    const ns = 'dsh-personal-workbench-cat';
    const catCss = `
.hbc-conversation-fill{flex:1;min-height:0;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}.hbc-conversation-fill>div{flex:1;min-height:0;height:100%}.hbc-drawer-head{flex-shrink:0}.hbc-settings{flex-shrink:0}

.hbc-settings{padding:16px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--dsw-alias-border-l1);max-height:65vh;overflow:auto;font:13px/1.6 sans-serif}.hbc-settings p{margin:0;color:var(--dsw-alias-label-secondary)}.hbc-settings textarea{resize:vertical;min-height:150px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px;font:13px/1.6 inherit}.hbc-settings button{align-self:flex-end;padding:7px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}

.hbc-launcher{position:fixed;right:24px;top:calc(var(--dsh-frame-top-clearance,0px) + 14px);z-index:25;width:96px;pointer-events:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:18px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:4px 8px 8px;cursor:pointer;font:11px/1.4 sans-serif}.hbc-launcher svg{width:74px;height:74px;display:block}.hbc-launcher:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.hbc-drawer{position:relative;width:100%;height:100%;min-width:0;min-height:0;flex:1;pointer-events:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-left:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;animation:hbc-enter .22s ease-out}.hbc-drawer-head{display:flex;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}.hbc-drawer-head svg{width:40px;height:40px}.hbc-drawer-head strong{font-size:14px}.hbc-drawer-head p{margin:3px 0 0;font-size:11px;color:var(--dsw-alias-label-secondary)}.hbc-drawer-head button,.hbc-retry{margin-left:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}.hbc-drawer-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}.hbc-notice{padding:24px;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary)}@keyframes hbc-enter{from{transform:translateX(100%)}to{transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.hbc-drawer{animation:none}}

.hbc-pet{position:fixed;z-index:40;width:150px;height:170px;pointer-events:none;user-select:none}
.hbc-cat{display:block;width:150px;height:150px;padding:0;border:0;background:none;cursor:grab;touch-action:none;pointer-events:auto;outline-offset:2px;-webkit-tap-highlight-color:transparent}
.hbc-cat:active{cursor:grabbing}.hbc-cat svg{overflow:visible;filter:drop-shadow(0 3px 2px #0002)}
.hbc-body{transform-origin:76px 140px;animation:hbc-breathe 4.6s ease-in-out infinite}.hbc-tail{transform-origin:105px 125px;animation:hbc-tail 6s ease-in-out infinite}
.hbc-eyes{transform-box:fill-box;transform-origin:center;animation:hbc-blink 6.7s infinite}.hbc-loved .hbc-eyes{transform:scaleY(.14);animation:none}.hbc-loved .hbc-body{animation:hbc-purr .25s ease-in-out infinite alternate}
.hbc-tools{display:flex;gap:4px;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}.hbc-pet:hover .hbc-tools,.hbc-pet:focus-within .hbc-tools{opacity:1;pointer-events:auto}
.hbc-tools button,.hbc-mini{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:12px;font:11px/1.4 sans-serif;padding:3px 8px;cursor:pointer;pointer-events:auto}
.hbc-bubble{position:absolute;bottom:168px;left:0;right:0;text-align:center;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:14px 14px 14px 3px;padding:8px 10px;font:12px/1.5 sans-serif;pointer-events:none}
.hbc-mini{position:fixed;right:16px;bottom:180px;z-index:40;width:42px;height:42px;padding:3px;border-radius:50%}
@keyframes hbc-breathe{50%{transform:scale(1.015,.982)}}@keyframes hbc-tail{50%{transform:rotate(6deg)}}@keyframes hbc-blink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.08)}}@keyframes hbc-purr{to{transform:translateY(-1px) rotate(.6deg)}}
@media(prefers-reduced-motion:reduce){.hbc-body,.hbc-tail,.hbc-eyes{animation:none}}

`;
    function CatArt({ loved }) {
      const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
      const id = name => `${uid}-${name}`;
      const url = name => `url(#${id(name)})`;
      return h('svg', {viewBox:'0 0 180 180',width:'100%',height:'100%','aria-hidden':true},
        h('defs',null,
          h('linearGradient',{id:id('body'),x1:'0',y1:'0',x2:'1',y2:'.4'},h('stop',{offset:'0%',stopColor:'#363637'}),h('stop',{offset:'32%',stopColor:'#121214'}),h('stop',{offset:'69%',stopColor:'#202022'}),h('stop',{offset:'100%',stopColor:'#09090b'})),
          h('linearGradient',{id:id('tail'),x1:'0',y1:'1',x2:'.7',y2:'0'},h('stop',{stopColor:'#0b0b0d'}),h('stop',{offset:'.65',stopColor:'#202022'}),h('stop',{offset:'1',stopColor:'#535355'})),
          h('radialGradient',{id:id('shine'),cx:'.27',cy:'.18',rx:'.7',r:'.85'},h('stop',{stopColor:'#c0bcb6',stopOpacity:'.48'}),h('stop',{offset:'.28',stopColor:'#77777a',stopOpacity:'.26'}),h('stop',{offset:'.65',stopColor:'#45454a',stopOpacity:'.08'}),h('stop',{offset:'1',stopColor:'#000',stopOpacity:'0'})),
          h('radialGradient',{id:id('volume'),cx:'.38',cy:'.32',r:'.76'},h('stop',{stopColor:'#454548'}),h('stop',{offset:'.43',stopColor:'#242427'}),h('stop',{offset:'.78',stopColor:'#111114'}),h('stop',{offset:'1',stopColor:'#050507'})),
          h('linearGradient',{id:id('rim'),x1:'0',y1:'0',x2:'1',y2:'0'},h('stop',{stopColor:'#b7b7bd',stopOpacity:'.04'}),h('stop',{offset:'.8',stopColor:'#c5c5ce',stopOpacity:'.36'}),h('stop',{offset:'1',stopColor:'#62626a',stopOpacity:'.05'})),
          h('radialGradient',{id:id('gold'),cx:'.28',cy:'.2',r:'.85'},h('stop',{stopColor:'#ffe8a0'}),h('stop',{offset:'.48',stopColor:'#edbf48'}),h('stop',{offset:'1',stopColor:'#9e641c'})),
          h('linearGradient',{id:id('bow'),x1:'0',y1:'0',x2:'.25',y2:'1'},h('stop',{stopColor:'#99d3ac'}),h('stop',{offset:'.28',stopColor:'#408c66'}),h('stop',{offset:'.63',stopColor:'#206246'}),h('stop',{offset:'1',stopColor:'#10392c'})),
          h('linearGradient',{id:id('knot'),x1:'0',y1:'0',x2:'1',y2:'.8'},h('stop',{stopColor:'#a3dbb4'}),h('stop',{offset:'.45',stopColor:'#408c66'}),h('stop',{offset:'1',stopColor:'#174832'})),
          h('radialGradient',{id:id('shadow')},h('stop',{stopColor:'#000',stopOpacity:'.36'}),h('stop',{offset:'.6',stopColor:'#000',stopOpacity:'.12'}),h('stop',{offset:'1',stopColor:'#000',stopOpacity:'0'})),
          h('filter',{id:id('soft'),x:'-70%',y:'-70%',width:'240%',height:'240%'},h('feGaussianBlur',{stdDeviation:'2.5'}))),
        h('ellipse',{cx:85,cy:164,rx:72,ry:12,fill:url('shadow')}),
        h('ellipse',{cx:84,cy:161,rx:47,ry:3.5,fill:'#000',opacity:'.24',filter:url('soft')}),
        h('path',{className:'hbc-tail',d:'M111 139 C137 116 133 83 137 61 C139 44 159 47 161 31 C164 14 148 7 138 17 C115 37 120 64 117 86 L100 133Z',fill:url('tail')}),
        h('g',{className:'hbc-body'},
          h('path',{d:'M23 145 C18 130 30 90 39 60 C42 49 43 35 51 34 C59 33 70 46 82 48 C90 50 100 47 108 48 C115 43 120 42 124 51 C137 79 145 116 144 143 C144 159 120 165 85 165 C49 165 27 160 23 145Z',fill:url('volume'),stroke:url('rim'),strokeWidth:'1.3'}),
          h('path',{d:'M23 145 C18 130 30 90 39 60 C42 49 43 35 51 34 C59 33 70 46 82 48 C90 50 100 47 108 48 C115 43 120 42 124 51 C137 79 145 116 144 143 C144 159 120 165 85 165 C49 165 27 160 23 145Z',fill:url('shine')}),
          h('path',{d:'M115 51 C123 65 126 91 127 119',fill:'none',stroke:url('rim'),strokeWidth:6,strokeLinecap:'round',filter:url('soft')}),
          h('path',{d:'M44 60 Q44 43 52 42 Q59 43 67 49',fill:'none',stroke:'#d4d0c8',strokeOpacity:'.19',strokeWidth:4,strokeLinecap:'round',filter:url('soft')}),
          h('ellipse',{cx:43,cy:114,rx:9,ry:28,transform:'rotate(13 43 114)',fill:'#a9aaaf',opacity:'.09',filter:url('soft')}),
          h('g',{className:'hbc-eyes'},
            h('ellipse',{cx:54,cy:82,rx:7,ry:9.3,transform:'rotate(15 54 82)',fill:url('gold')}),
            h('ellipse',{cx:79,cy:86,rx:8,ry:9.5,transform:'rotate(9 79 86)',fill:url('gold')}),
            h('ellipse',{cx:55,cy:82,rx:3.2,ry:5.9,fill:'#101013'}),h('ellipse',{cx:80,cy:86,rx:3.7,ry:6.1,fill:'#101013'}),
            h('circle',{cx:52,cy:79,r:1.2,fill:'#fff0b3',opacity:'.7'}),h('circle',{cx:77,cy:83,r:1.3,fill:'#fff0b3',opacity:'.7'})),
          loved ? h('text',{x:100,y:77,fill:'#e6ac97',fontSize:14},'♥') : null));
    }
    const operationsIcon='data:image/png;base64,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';
    const list = value => Array.isArray(value) ? value : [];
    const text = value => typeof value === 'string' ? value : '';
    const safeURL = value => {try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }};
    function safeReadingLink(value) {
      try {const link=new URL(value);return link.protocol==='https:'&&!link.username&&!link.password?link.href:null;} catch{return null;}
    }
    const activeStatus = value => ['running','processing','in_progress','queued','pending'].includes(String(value).toLowerCase());
    const pending = value => Array.isArray(value) && value.length > 0;
    const queued = value => typeof value === 'number' ? value > 0 : pending(value);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sessionId = /^(?:session-)?[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
    const resultSources = {'xhs.original.text.generate':['originals','original'],'xhs.original.image.generate':['originals','original'],'xhs.rewrite.pipeline':['rewrites','rewrite']};
    const recent = (value,now=Date.now()) => {const time=new Date(value).getTime();return Boolean(value)&&Number.isFinite(time)&&time<=now+300000&&time>=now-7*86400000;};
    const safeHTTPS = value => {const url=safeURL(value);return url?.startsWith('https://')?url:null;};
    const inputLabel = value => list(value).includes('approval')?'等你确认':list(value).includes('question')?'等你回复':'等待输入';
    const runLabel = run => run.action_id==='xhs.original.image.generate'?'内容配图':run.action_id==='xhs.original.text.generate'?'原创内容':run.action_id==='xhs.rewrite.pipeline'?'内容仿写':'内容制作';
    function selectBriefEdition(selected,archived,published) {
      const editions=[archived,published].filter(edition=>edition&&(!selected||edition.date===selected));
      return editions.sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
    }
    function briefDateLabel(date,today) {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '选择日期';
      const days=Math.round((Date.parse(date)-Date.parse(today))/86400000);
      const relative=({'0':'今天','-1':'昨天','-2':'前天','1':'明天'})[days];
      const calendar=(date.slice(0,4)!==today.slice(0,4)?Number(date.slice(0,4))+'年':'')+Number(date.slice(5,7))+'月'+Number(date.slice(8))+'日';
      return (relative?relative+' · ':'')+calendar;
    }
    const localDay = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const actualPattern = /^(.*?)(（实际\s+(.+?)｜(专注|合计)\s+(\d+h(?:\d+m)?(?:\d+s)?|\d+m(?:\d+s)?|\d+s)）)$/u;
    function taskText(value) {
      const raw = text(value).trim(), match = raw.match(actualPattern);
      return match ? {title:match[1].trimEnd(),note:'实际 '+match[3]+' · 专注 '+match[5]} : {title:raw,note:''};
    }
    // Format only explicit timing metadata; the source task remains unchanged.
    function planTaskContent(value) {
      const content=taskText(value),parts=[];
      let title=content.title;
      const scheduled=title.match(/^((?:[01]?\d|2[0-3])[:：][0-5]\d(?:\s*[-–—~～]\s*(?:[01]?\d|2[0-3])[:：][0-5]\d)?)\s+(.+)$/u);
      if(scheduled){parts.push('计划 '+scheduled[1]);title=scheduled[2];}
      const estimate=title.match(/\s*[（(]\s*((?:\d+(?:\.\d+)?\s*(?:小时|分钟|分|h(?:ours?|r)?|mins?|m)\s*)+)[)）]$/iu);
      if(estimate&&title.slice(0,estimate.index).trim()){
        parts.push('预计 '+estimate[1].trim());title=title.slice(0,estimate.index).trimEnd();
      }
      if(content.note)parts.push(content.note);
      return {title,timing:parts.join(' · '),label:content.title};
    }
    async function api(action, signal, input={}) {
      const opening = ['addPlanTask','checkPlanTask','projectShortcuts','openCodexThread'].includes(action);
      const response = await fetch('/api/dsh-personal-workbench'+(opening?'':'?'+new URLSearchParams({action,...input})),{method:opening?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:opening?{'Content-Type':'application/json','X-Personal-UI':'1'}:undefined,body:opening?JSON.stringify({action,input}):undefined});
      const result = await response.json();
      if(!response.ok || result.error) throw new Error(text(result.error) || '暂时无法读取，请稍后再试。');
      return Object.prototype.hasOwnProperty.call(result,'value') ? result.value : result;
    }
    const dateInShanghai = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'});
    const timeInShanghai = new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    function assistantDate(value,today,includeTime=false) {
      if(!value||!Number.isFinite(Date.parse(value)))return '';
      const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?value:dateInShanghai.format(new Date(value));
      const yesterday=new Date(Date.parse(today)-86400000).toISOString().slice(0,10);
      const tomorrow=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
      const label=date===today?'今天':date===yesterday?'昨天':date===tomorrow?'明天':date.slice(0,4)===today.slice(0,4)?date.slice(5).replace('-','/'):date;
      return includeTime?label+' '+timeInShanghai.format(new Date(value)):label;
    }
    const assistantReviewKey = 'dsh-personal-workbench:assistant-reviews:v1';
    const failedRun = status => ['error','failed','interrupted'].includes(status);
    const runTarget = run => run.original_id||run.topic_id||run.result_id;
    function runIsFresh(run,now) {
      const at=Date.parse(run.heartbeat_at||run.updated_at||run.started_at||run.created_at||'');
      return Number.isFinite(at)&&at<=now+5000&&at>=now-15*60000;
    }
    function assistantOperations(monitor,today,now) {
      const synced=monitor?.availability==='connected'&&(!monitor.checkedAt||now-Date.parse(monitor.checkedAt)<45000);
      const runs=list(monitor?.items).filter(run=>activeStatus(run.status)||recent(run.updated_at,now)||failedRun(run.status))
        .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
      const relevant=runs.filter(run=>!failedRun(run.status)||!runTarget(run)||!runs.some(next=>
        next.status==='done'&&next.action_id===run.action_id&&runTarget(next)===runTarget(run)&&Date.parse(next.updated_at)>Date.parse(run.updated_at)));
      const visible=[...relevant.filter(run=>activeStatus(run.status)),...relevant.filter(run=>failedRun(run.status)),
        ...relevant.filter(run=>!activeStatus(run.status)&&!failedRun(run.status)&&dateInShanghai.format(new Date(run.updated_at))===today)];
      const operation=visible.sort((a,b)=>Number(activeStatus(b.status)&&runIsFresh(b,now))-Number(activeStatus(a.status)&&runIsFresh(a,now))).slice(0,5).map(run=>{
        const queued=['queued','pending'].includes(run.status),active=activeStatus(run.status);
        const stale=active&&!runIsFresh(run,now);
        const date=assistantDate(active?run.started_at||run.created_at:run.updated_at,today,run.status==='done');
        const timing=!date?'':active?date==='今天'?'':date+(queued?'排队':run.started_at?'开始':'提交'):date;
        const state=!synced||stale?'unknown':active?'active':failedRun(run.status)?'failed':run.status==='done'?'done':'unknown';
        const label=!synced?'待同步':stale?'状态待更新':queued?'排队中':active?'进行中':run.status==='interrupted'?'已中断':failedRun(run.status)?'失败':run.status==='done'?'执行完成':'待确认';
        const detail=text(run.error_message||run.message).replace(/(?:sk-|Bearer\s+)[A-Za-z0-9_-]{10,}/g,'[已隐藏]').slice(0,180);
        return {id:run.id,title:runLabel(run),state,label,detail,timing:synced?timing:'',stale,updatedAt:run.updated_at};
      });
      return {operation,synced};
    }
    function assistantReviewRows(results,reviewed) {
      const known=new Map();
      for(const row of results) {
        if(typeof row?.key!=='string'||typeof row.title!=='string'||!safeHTTPS(row.url)||known.has(row.key))continue;
        known.set(row.key,row);
      }
      const sorted=[...known.values()].sort((a,b)=>String(b.deliveredAt||b.updatedAt||b.date||'').localeCompare(String(a.deliveredAt||a.updatedAt||a.date||'')));
      const wasReviewed=row=>Object.hasOwn(reviewed,row.key);
      const latest=sorted[0];
      return {latest:latest?{...latest,reviewed:wasReviewed(latest)}:null,
        pending:sorted.filter(row=>!wasReviewed(row)),history:sorted.filter(wasReviewed)};
    }
    function useAssistantReviews(scope,results) {
      const storageKey=scope?assistantReviewKey+':'+scope:null;
      const [revision,setRevision]=React.useState(0);
      const [error,setError]=React.useState('');
      function read() {
        try { return storageKey?JSON.parse(localStorage.getItem(storageKey)||'{}'):{}; } catch {return {};}
      }
      const raw=read();
      const rows=assistantReviewRows([...results,...list(raw?.results)],raw?.reviewed||{});
      function save(marked) {
        if(!storageKey)return false;
        const current=read();
        const reviewed={...current?.reviewed,...(marked?{[marked]:true}:{})};
        const nextRows=assistantReviewRows([...results,...list(current?.results)],reviewed);
        const history=nextRows.history.slice(0,30);
        const next=JSON.stringify({results:[...nextRows.pending,...history],reviewed});
        try {
          if(localStorage.getItem(storageKey)!==next)localStorage.setItem(storageKey,next);
          return true;
        } catch {return false;}
      }
      React.useEffect(()=>{
        if(rows.pending.length||rows.history.length)save();
      },[storageKey,results,revision]);
      React.useEffect(()=>{
        function refresh(event){if(event.key===storageKey)setRevision(value=>value+1);}
        window.addEventListener('storage',refresh);
        return ()=>window.removeEventListener('storage',refresh);
      },[storageKey]);
      function mark(key) {
        if(save(key)){
          setRevision(value=>value+1);
          setError('');
        }else setError('本次验收未保存，请重试。');
      }
      return {latest:rows.latest,mark:storageKey?mark:null,error};
    }
    const productionCache=new Map();
    async function production(signal) {
      async function read(args) {
        const response = await fetch('/api/redflow-workbench?'+new URLSearchParams(args),{credentials:'same-origin',cache:'no-store',signal});
        if(response.status===404&&args.action==='status')return {connected:false};
        const result = await response.json();if(!response.ok || result.error) throw new Error('内容进展暂时无法读取');return result.value;
      }
      try {
        const status = await read({action:'status'});
        if(!status?.connected) return {availability:'not_connected',items:[]};
        const result = await read({action:'list',kind:'runs',offset:'0'});
        if(!Array.isArray(result?.items)) throw new Error('读取失败');
        const items=result.items.slice(0,30),candidates=new Map();
        for(const run of [...items].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))) {
          const source=resultSources[run.action_id];
          if(run.status!=='done'||!source||!uuid.test(run.result_id||'')||!Number.isFinite(Date.parse(run.updated_at))||Date.parse(run.updated_at)>Date.now()+300000)continue;
          const key=source[1]+':'+run.result_id.toLowerCase();if(!candidates.has(key))candidates.set(key,{run,source,key});
        }
        let resultsUnavailable=false;
        const results=(await Promise.all([...candidates.values()].slice(0,6).map(async({run,source,key})=>{
          try {
            const cache=productionCache.get(key+':'+run.updated_at);
            const record=cache&&Date.now()-cache.at<60000?cache.record:await read({action:'detail',kind:source[0],id:run.result_id});
            if(!record||text(record.id).toLowerCase()!==run.result_id.toLowerCase())return null;
            productionCache.set(key+':'+run.updated_at,{at:Date.now(),record});if(productionCache.size>30)productionCache.delete(productionCache.keys().next().value);
            return {key:key+':'+run.id,title:text(record.title).trim().slice(0,150)||'已生成内容',status:'已生成',updatedAt:run.updated_at,url:'https://www.pipeline.xin/workspace/task-pool/'+source[1]+'/'+run.result_id.toLowerCase()};
          } catch(error){if(signal.aborted)throw error;resultsUnavailable=true;return null;}
        }))).filter(Boolean);
        return {availability:'connected',items,results,resultsUnavailable,checkedAt:new Date().toISOString(),
          accountId:uuid.test(status.account?.id||'')?status.account.id.toLowerCase():null};
      } catch(error) {if(signal.aborted) throw error;return {availability:'unavailable',items:[]};}
    }
    function activityItems(data, monitor) {
      const rows=[],seen=new Set();
      function add(key,row){if(!seen.has(key)){seen.add(key);rows.push({...row,key});}}
      for(const session of list(data?.ai?.items)) {
        const waiting=pending(session.pendingInput);
        if(waiting || session.running===true || queued(session.queue)) add('session:'+session.id,{title:session.title||'AI 对话',owner:'AI',status:waiting?inputLabel(session.pendingInput):session.running?'进行中':'排队中',waiting,destination:{session:session.id}});
      }
      for(const job of list(data?.automations?.items)) {
        const execution=job.execution,waiting=pending(execution?.pendingInput);
        if(!waiting && execution?.running!==true && !queued(execution?.queue)) continue;
        add(job.sessionId?'session:'+job.sessionId:'automation:'+job.id,{title:job.name||'自动任务',owner:'AI',status:waiting?inputLabel(execution.pendingInput):execution?.running?'进行中':'排队中',waiting,destination:job.sessionId?{session:job.sessionId}:job.source==='harness'?{panel:'schedules'}:null});
      }
      for(const run of list(monitor?.items)) if(activeStatus(run.status)) add('run:'+String(run.id).toLowerCase(),{title:runLabel(run),owner:'AI',status:['queued','pending'].includes(run.status)?'排队中':'制作中',destination:{panel:'redflow-workbench'}});
      return rows.sort((a,b)=>Number(Boolean(b.waiting))-Number(Boolean(a.waiting)));
    }
    function attentionItems(data,monitor,now=Date.now()) {
      const rows=[],seen=new Set();
      const day=data?.today||localDay();
      const add=(key,row)=>{if(!seen.has(key)){seen.add(key);rows.push({key,...row});}};
      for(const session of list(data?.ai?.items))if(pending(session.pendingInput))add('session:'+session.id,{title:session.title||'AI 对话',status:inputLabel(session.pendingInput),action:'打开对话',destination:{session:session.id}});
      for(const job of list(data?.automations?.items)) {
        if(pending(job.execution?.pendingInput))add(job.sessionId?'session:'+job.sessionId:'automation:'+job.id,{title:job.name||'自动任务',status:inputLabel(job.execution.pendingInput),action:job.sessionId?'打开对话':'查看任务',destination:job.sessionId?{session:job.sessionId}:job.source==='harness'?{panel:'schedules'}:null});
      }
      for(const run of list(monitor?.items))if(['error','interrupted'].includes(run.status)&&recent(run.updated_at,now))add('run:'+String(run.id).toLowerCase(),{title:runLabel(run)+(run.status==='interrupted'?'已中断':'未完成'),status:'需要检查',action:'查看内容工作台',destination:{panel:'redflow-workbench'}});
      for(const task of list(data?.tasks?.items)) {
        const due=task.dueDate;
        if(task.archived||task.owner==='ai'||task.status==='done'||!/^\d{4}-\d{2}-\d{2}$/.test(due||'')||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due||due>=day)continue;
        const destination=task.link?.kind==='redflow-run'?{panel:'redflow-workbench'}:null;
        add('task:'+task.id,{title:task.title,status:'原定 '+due.slice(5).replace('-','/')+' 完成',note:destination?'查看关联内容后再安排':'这件事还没有标记完成',action:'查看内容工作台',destination});
      }
      return rows;
    }
    function completedItems(monitor) {
      return list(monitor?.results).filter(row=>safeHTTPS(row.url)).map(row=>({...row,url:safeHTTPS(row.url)}));
    }
    const storedValue=(key,fallback)=>{try{const value=localStorage.getItem(key);return value&&value.length<50000?JSON.parse(value):fallback;}catch{return fallback;}};
    function calendarDates(date,mode){
      const selected=new Date(date+'T12:00:00Z'),first=mode==='month'?new Date(date.slice(0,7)+'-01T12:00:00Z'):selected;
      const offset=(first.getUTCDay()+6)%7,start=new Date(first);start.setUTCDate(start.getUTCDate()-offset);
      return Array.from({length:mode==='month'?42:7},(_,i)=>{const value=new Date(start);value.setUTCDate(value.getUTCDate()+i);return value.toISOString().slice(0,10);});
    }
    function assistantOverview(monitor,now=Date.now()){
      const today=dateInShanghai.format(new Date(now));
      return {...assistantOperations(monitor,today,now),today};
    }
    const PROJECT_SHORTCUTS_KEY='dsh-personal-workbench:project-shortcuts:v1';
    const PROJECT_NOTES_KEY='dsh-personal-workbench:project-notes:v1';
    function projectShortcuts(value){return list(value).slice(0,20).filter(item=>item&&typeof item.title==='string'&&item.title.trim()&&sessionId.test(item.threadId||'')&&item.source==='harness').map(item=>({id:uuid.test(item.id||'')?item.id:item.threadId,title:item.title.trim().slice(0,50),version:text(item.version).slice(0,40),progress:text(item.progress).trim().slice(0,120),threadId:item.threadId.toLowerCase(),source:item.source,icon:['app','code','design','writing'].includes(item.icon)?item.icon:'app'}));}
    function projectNotes(value) {
      if(!value||typeof value!=='object')return {};
      return Object.fromEntries(Object.entries(value).filter(([id,note])=>/^[\w-]{1,80}$/.test(id)&&note&&typeof note==='object').map(([id,note])=>[id,{
        progress:text(note.progress).trim().slice(0,120),
        requirements:list(note.requirements).slice(0,100).filter(item=>item&&uuid.test(item.id||'')&&text(item.title).trim())
          .map(item=>({id:item.id,title:item.title.trim().slice(0,400),done:item.done===true,createdAt:Number.isFinite(item.createdAt)?item.createdAt:0})),
      }]));
    }
    /* GRID_GEOMETRY_START */
    // Geometry stays independent of DOM pixels. Persisted values are untrusted;
    // only known cards and bounded integer grid coordinates are accepted.
    function gridProfile(width) {
      return width>=1000?{key:'wide',cols:12,minW:4,rows:12}:width>=640?{key:'medium',cols:8,minW:4,rows:12}:{key:'narrow',cols:4,minW:4,rows:12};
    }
    function gridDefaults(profile) {
      const single=profile.cols===4,left=profile.cols===12?7:4;
      const expandedNews=single?11:profile.cols===8?7:5;
      const news=profile.collapsed?2:expandedNews,pet=single?5:expandedNews;
      const assistants=single?7:6,newsY=single?pet:0;
      return [
        {id:'plan',x:single?0:left,y:single?pet+news:pet,w:single?4:profile.cols-left,h:single?6:12},
        {id:'news',x:0,y:newsY,w:left,h:news},
        {id:'activity',x:0,y:single?pet+news+6:news,w:left,h:assistants},
        {id:'projects',x:0,y:single?pet+news+6+assistants:news+assistants,w:left,h:profile.cols===12?6:12},
        {id:'pet',x:single?0:left,y:0,w:single?4:profile.cols-left,h:pet}
      ];
    }
    const oldGridPresets={
      wide:{plan:[7,0,5,12],news:[0,0,4,5],activity:[0,5,7,4],pet:[4,0,3,5],projects:[0,9,7,3]},
      medium:{plan:[4,0,4,12],news:[0,0,4,3],activity:[0,6,4,3],pet:[0,3,4,3],projects:[0,9,4,3]},
      narrow:{plan:[0,6,4,6],news:[0,0,4,3],activity:[0,12,4,4],pet:[0,3,4,3],projects:[0,16,4,3]}
    };
    function gridSavedRows(value,profile) {
      if(!Array.isArray(value))return [];
      if(value.some(row=>row?.fixedHeight===true))return value;
      const preset=oldGridPresets[profile.key],keys=['x','y','w','h'];
      if(preset&&value.length===5&&Object.keys(preset).every(id=>value.some(row=>row?.id===id&&keys.every((key,i)=>row[key]===preset[id][i]))))return [];
      const expanded=gridDefaults({...profile,collapsed:false});
      // Fold only the news. The pet keeps its own coordinates and dimensions.
      if(profile.collapsed&&expanded.every(card=>value.some(row=>row?.id===card.id&&keys.every(key=>row[key]===card[key]))))return gridDefaults(profile);
      if(value.some(row=>row?.id==='pet'))return value;
      const single=profile.cols===4,left=single?4:profile.cols===12?7:4;
      const news=profile.cols===4?11:profile.cols===8?7:5,activity=single?7:6;
      const old={plan:[single?0:left,news,single?4:profile.cols-left,single?6:12],news:[0,0,profile.cols,news],activity:[0,news+(single?6:0),left,activity],projects:[0,news+activity+(single?6:0),left,profile.cols===12?6:12]};
      // The former content-fitting preset had no pet row. Adopt the equivalent
      // five-card preset, retaining a deliberately resized projects card.
      if(value.length===4&&Object.keys(old).every(id=>value.some(row=>row?.id===id&&keys.every((key,i)=>id==='projects'&&key==='h'||row[key]===old[id][i])))){
        return gridDefaults(profile).map(card=>card.id==='projects'?{...card,h:value.find(row=>row.id==='projects').h}:card);
      }
      return value;
    }
    function gridBound(value,fallback,min,max) {
      return Math.max(min,Math.min(max,typeof value==='number'&&Number.isFinite(value)?Math.round(value):fallback));
    }
    function gridCard(value,fallback,profile) {
      const minimumHeight=fallback.id==='plan'||(fallback.id==='activity'&&profile.cols!==8)?4:3;
      // Existing wide layouts allow a three-column companion beside a nine-column brief.
      // Increasing that saved width would create a collision and move unrelated cards.
      const minimumWidth=fallback.id==='pet'&&profile.key==='wide'?3:profile.minW;
      const w=gridBound(value?.w,fallback.w,minimumWidth,profile.cols);
      return {...(value?.fixedHeight===true?{fixedHeight:true}:{}),id:fallback.id,x:gridBound(value?.x,fallback.x,0,profile.cols-w),y:gridBound(value?.y,fallback.y,0,160),w,h:profile.collapsed&&fallback.id==='news'?2:gridBound(value?.h,fallback.h,minimumHeight,24)};
    }
    function gridOverlap(a,b) {
      return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    }
    function gridFits(item,occupied) {return !occupied.some(other=>gridOverlap(item,other));}
    function gridPlace(item,occupied,profile) {
      if(gridFits(item,occupied))return {...item};
      const xs=Array.from({length:profile.cols-item.w+1},(_,x)=>x).sort((a,b)=>Math.abs(a-item.x)-Math.abs(b-item.x)||a-b);
      // Prefer the same row, then make room below. A bounded upward fallback
      // guarantees room even if a damaged saved layout started near row 72.
      const ys=[item.y,...Array.from({length:160-item.y},(_,i)=>item.y+i+1),...Array.from({length:item.y},(_,i)=>item.y-i-1)];
      for(const y of ys)for(const x of xs){const next={...item,x,y};if(gridFits(next,occupied))return next;}
      return null;
    }
    function gridNormalize(value,profile) {
      const defaults=gridDefaults(profile),rows=gridSavedRows(value,profile),seen=new Set(),byId=new Map();
      for(const row of rows.slice(0,32))if(row&&typeof row==='object'&&defaults.some(card=>card.id===row.id)&&!seen.has(row.id)){seen.add(row.id);byId.set(row.id,row);}
      const cards=defaults.map(card=>gridCard(byId.get(card.id),card,profile)),placed=[];
      const ordered=[...cards].sort((a,b)=>Number(byId.has(b.id))-Number(byId.has(a.id))||a.y-b.y||a.x-b.x||defaults.findIndex(d=>d.id===a.id)-defaults.findIndex(d=>d.id===b.id));
      for(const card of ordered){const next=gridPlace(card,placed,profile);if(!next){placed.length=0;for(const row of ordered)placed.push(gridPlace({...row,y:0},placed,profile));break;}placed.push(next);}
      return defaults.map(card=>placed.find(row=>row.id===card.id));
    }
    function canFitOverviewContent(layout, profile) {
      if(layout.some(card=>card.fixedHeight))return false;
      return gridDefaults(profile).every(base=>{
        const card=layout.find(row=>row.id===base.id);
        return card&&['x','y','w','h'].every(key=>base.id==='projects'&&key==='h'||card[key]===base[key]);
      });
    }
    function gridArrange(value,id,patch,profile) {
      const base=gridNormalize(value,profile),old=base.find(card=>card.id===id);
      if(!old)return base;
      const active=gridCard({...old,...(patch&&typeof patch==='object'?patch:{})},old,profile);
      if(['x','y','w','h','fixedHeight'].every(key=>old[key]===active[key]))return base;
      const placed=[active],others=base.filter(card=>card.id!==id).sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const card of others){const next=gridPlace(card,placed,profile);if(!next){placed.splice(1);for(const row of others)placed.push(gridPlace({...row,y:0},placed,profile));break;}placed.push(next);}
      // Fill vertical gaps left by moving/shrinking a card. Only passive cards
      // compact; the card the person is holding always remains at their target.
      const passive=placed.filter(card=>card.id!==id).sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const card of passive){const occupied=placed.filter(other=>other!==card);while(card.y>0&&gridFits({...card,y:card.y-1},occupied))card.y--;}
      return base.map(card=>placed.find(row=>row.id===card.id));
    }
    // Layout coordinates are intent; growing content only moves cards beneath it.
    function gridContentRects(layout,{column,row,gap,foldedExtra=0},heights={}) {
      const step=row+gap,placed=new Map();
      const ordered=[...layout].sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const item of ordered){
        const minimum=item.h*step-gap+(item.id==='news'?foldedExtra:0);
        const height=item.fixedHeight?minimum:Math.max(minimum,Number.isFinite(heights[item.id])?heights[item.id]:0);
        const anchors=new Set();
        for(let x=item.x;x<item.x+item.w;x++){
          const above=ordered.filter(other=>other.id!==item.id&&other.x<=x&&other.x+other.w>x&&other.y+other.h<=item.y)
            .sort((a,b)=>(b.y+b.h)-(a.y+a.h))[0];
          if(above)anchors.add(above);
        }
        let top=item.y*step;
        for(const above of anchors){const previous=placed.get(above.id);if(previous)top=Math.max(top,previous.top+previous.height+gap+(item.y-above.y-above.h)*step);}
        placed.set(item.id,{left:item.x*column,top,width:Math.max(0,item.w*column-gap),height,minimum});
      }
      return Object.fromEntries(placed);
    }
    /* GRID_GEOMETRY_END */
    function PlanInlineLink({href,label}) {
      const [copyState,setCopyState]=React.useState('');
      React.useEffect(()=>{if(!copyState)return;const timer=setTimeout(()=>setCopyState(''),2500);return()=>clearTimeout(timer);},[copyState]);
      return h('span',{className:'pw-plan-inline-link'},
        h('a',{href,target:'_blank',rel:'noopener noreferrer',title:href},label,h(Icon,{name:'arrow',size:11})),
        h('button',{type:'button',title:'复制链接','aria-label':'复制链接：'+label,onClick:async()=>{
          try{await navigator.clipboard.writeText(href);setCopyState('已复制');}catch{setCopyState('未能复制，请右键链接复制');}
        }},'复制'),h('span',{className:'pw-link-copy-status',role:'status','aria-live':'polite'},copyState));
    }
    function Icon({name='grid',size=18}) {
      const paths={grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',calendar:'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7 2v4M17 2v4M3 10h18M7 14h3M14 14h3',check:'m5 12 4 4L19 6',news:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5M8 18h7',refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M18 18a8 8 0 0 1-13-2',arrow:'M7 17 17 7M7 7h10v10',chevron:'m9 5 7 7-7 7',left:'m15 5-7 7 7 7',down:'m6 9 6 6 6-6',up:'m6 15 6-6 6 6',activity:'M3 12h4l3-8 4 16 3-8h4',chat:'M21 11a8 8 0 0 1-8 8H5l-4 3V11a10 10 0 0 1 20 0z',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z'};
      return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.grid}));
    }
    const css=`
.pwb{height:100%;min-height:0;position:relative;isolation:isolate;z-index:0;overflow:hidden;background:var(--pw-bg);color:var(--pw-ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","PingFang SC",sans-serif;-webkit-font-smoothing:antialiased;container-type:inline-size;container-name:pw-root;color-scheme:light}
.pwb,.pwb *{box-sizing:border-box}.pwb h1,.pwb h2,.pwb h3,.pwb p{margin:0}.pwb button,.pwb a{font:inherit;color:inherit}.pwb button{border:0;background:none;padding:0;cursor:pointer}.pwb a{text-decoration:none}.pwb svg{flex-shrink:0}.pwb button:disabled{opacity:.5;cursor:default}.pwb :is(button,a):focus-visible{outline:3px solid var(--pw-blue);outline-offset:3px;border-radius:5px}.pwb .pw-theme-probe{position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--dsw-alias-bg-base,#f5f5f7)}
.pwb .pw-shell{--pw-gutter:28px;max-width:1380px;height:100%;margin:auto;padding:0 var(--pw-gutter);display:flex;flex-direction:column;min-height:0}.pwb .pw-head{flex-shrink:0;min-height:92px;display:flex;align-items:center;gap:16px;justify-content:space-between}.pwb .pw-head h1{font-size:23px;line-height:1.25;font-weight:650;letter-spacing:-.6px}.pwb .pw-refresh{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;color:var(--pw-muted);-webkit-app-region:no-drag}.pwb .pw-refresh:hover{background:var(--pw-line);color:var(--pw-ink)}
.pwb .pw-homeboard{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1.35fr) minmax(0,1fr);gap:20px}.pwb .pw-card{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:20px;box-shadow:0 2px 10px rgba(20,20,30,.025);overflow:hidden}.pwb .pw-plan{grid-row:1/3;background:var(--pw-plan);color:var(--pw-plan-ink);border-color:var(--pw-plan-line)}.pwb .pw-news{grid-column:2;grid-row:1}.pwb .pw-activity{grid-column:2;grid-row:2}.pwb .pw-card-head{padding:21px 24px 13px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0}.pwb .pw-card-title{display:flex;align-items:center;gap:9px;min-width:0}.pwb .pw-card-title h2{font-size:17px;letter-spacing:-.35px;font-weight:650}.pwb .pw-card-title>svg{color:var(--pw-muted);width:17px;height:17px}.pwb .pw-card-link{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;color:var(--pw-muted);font-size:11px;min-height:26px}.pwb .pw-card-link:hover{color:var(--pw-blue)}.pwb .pw-count{font-size:11px;color:var(--pw-muted);font-variant-numeric:tabular-nums;white-space:nowrap}.pwb .pw-card-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent}.pwb .pw-card-foot{flex-shrink:0;margin:0 24px;padding:11px 0 13px;border-top:1px solid var(--pw-line);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:var(--pw-muted)}
.pwb .pw-plan .pw-card-head{padding:25px 27px 12px;align-items:flex-end}.pwb .pw-plan h2{font:600 32px/1.2 "Songti SC","STSong","Noto Serif CJK SC",serif;letter-spacing:1px}.pwb .pw-plan .pw-card-link{color:var(--pw-plan-muted)}.pwb .pw-progress{display:flex;align-items:center;gap:12px;padding:5px 27px 17px;color:var(--pw-plan-muted);font-size:12px;flex-shrink:0}.pwb .pw-progress-track{height:5px;background:var(--pw-plan-line);border-radius:5px;overflow:hidden;flex:1}.pwb .pw-progress-value{height:100%;background:var(--pw-olive);border-radius:inherit}.pwb .pw-plan .pw-card-body{padding:0 27px 8px}.pwb .pw-plan-group+.pw-plan-group{margin-top:19px}.pwb .pw-group-title{font-size:12px;font-weight:600;color:var(--pw-plan-muted);margin:4px 0 7px;line-height:1.6}.pwb .pw-plan-row{display:flex;gap:11px;align-items:flex-start;padding:8px 0;min-width:0}.pwb .pw-plan-check{border:1.5px solid var(--pw-plan-muted);border-radius:5px;width:17px;height:17px;display:flex;align-items:center;justify-content:center;margin-top:2px;flex-shrink:0}.pwb .pw-plan-row.is-done .pw-plan-check{background:var(--pw-olive);border-color:var(--pw-olive);color:var(--pw-plan)}.pwb .pw-plan-copy{min-width:0;flex:1}.pwb .pw-plan-text{font-size:14px;line-height:1.55;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pwb .is-done .pw-plan-text{color:var(--pw-plan-muted);text-decoration:line-through;text-decoration-thickness:1px}.pwb .pw-plan[data-density=compact] .pw-plan-row{padding:5px 0}.pwb .pw-plan[data-density=compact] .pw-plan-text{font-size:13px}.pwb .pw-plan[data-density=compact] .pw-plan-group+.pw-plan-group{margin-top:14px}.pwb .pw-plan-meta{font-size:10px;color:var(--pw-olive);margin-top:3px}.pwb .pw-plan-note{color:var(--pw-plan-muted);font-size:11px;line-height:1.65;margin:7px 0;white-space:pre-line;overflow-wrap:anywhere}.pwb .pw-plan-note.quote{border-left:2px solid var(--pw-olive);padding-left:10px}.pwb .pw-plan-note.callout{background:color-mix(in srgb,var(--pw-olive) 9%,transparent);padding:9px 11px;border-radius:8px;color:var(--pw-plan-ink)}.pwb .pw-plan-nested{padding-left:28px}.pwb .pw-plan-nested .pw-plan-text{font-size:12px}.pwb .pw-plan .pw-card-foot{margin:0 27px;border-color:var(--pw-plan-line);color:var(--pw-plan-muted)}.pwb .pw-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--pw-olive);margin-right:6px;vertical-align:1px}
.pwb .pw-news-list{padding:0 24px 6px}.pwb .pw-news-entry{display:block;padding:6px 0;border-top:1px solid var(--pw-line)}.pwb .pw-news-entry:first-child{border-top:0;padding-top:1px}.pwb .pw-news-entry.is-lead{background:var(--pw-news);border-radius:10px;padding:12px 14px;margin-bottom:7px}.pwb .pw-news-entry.is-lead+.pw-news-entry{border-top:0}.pwb .pw-news-entry a{display:flex;align-items:flex-start;gap:10px;min-width:0}.pwb .pw-news-entry a:hover .pw-news-title{color:var(--pw-blue)}.pwb .pw-news-number{flex-shrink:0;width:14px;font-size:10px;color:var(--pw-muted);font-variant-numeric:tabular-nums;line-height:21px}.pwb .pw-news-title{font-size:12px;line-height:1.65;font-weight:500;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.pwb .is-lead .pw-news-title{font-size:15px;line-height:1.4;font-weight:600;-webkit-line-clamp:2;letter-spacing:-.2px}.pwb .pw-news-summary{font-size:11px;line-height:1.65;color:var(--pw-muted);margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pwb .pw-news-entry:not(.is-lead) .pw-news-arrow{margin-left:auto;color:var(--pw-muted);align-self:center;width:11px}.pwb .pw-news-entry>div{min-width:0}.pwb .pw-news-date{font-size:10px;color:var(--pw-muted);white-space:nowrap}
.pwb .pw-activity-list{padding:0 24px 5px}.pwb .pw-activity-row{display:flex;align-items:center;gap:11px;min-width:0;width:100%;text-align:left;padding:10px 0;border-top:1px solid var(--pw-line);color:var(--pw-ink)}.pwb .pw-activity-row:first-child{border-top:0}.pwb button.pw-activity-row:hover .pw-activity-title{color:var(--pw-blue)}.pwb .pw-activity-icon{width:30px;height:30px;border-radius:9px;background:var(--pw-news);color:var(--pw-blue);display:flex;align-items:center;justify-content:center;flex-shrink:0}.pwb .pw-activity-icon.is-waiting{background:color-mix(in srgb,var(--pw-orange) 9%,transparent);color:var(--pw-orange)}.pwb .pw-activity-copy{min-width:0;flex:1}.pwb .pw-activity-title{font-size:12px;line-height:1.55;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pwb .pw-activity-status{font-size:10px;color:var(--pw-muted);margin-top:3px;display:flex;gap:8px;align-items:center}.pwb .pw-activity-status .is-waiting{color:var(--pw-orange)}.pwb .pw-activity-status .pw-running{color:var(--pw-blue)}.pwb .pw-activity-owner{border-right:1px solid var(--pw-line);padding-right:8px}.pwb .pw-row-arrow{color:var(--pw-muted);width:12px}.pwb .pw-quiet-link{font-size:11px;display:inline-flex;align-items:center;gap:5px;color:var(--pw-muted);min-height:24px}.pwb .pw-quiet-link:hover{color:var(--pw-blue)}
.pwb .pw-partial{padding:0 24px 8px;font-size:10px;color:var(--pw-orange)}.pwb .pw-empty{height:100%;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:7px;padding:18px;color:var(--pw-muted)}.pwb .pw-empty>svg{opacity:.55;margin-bottom:5px}.pwb .pw-empty strong{font-size:13px;font-weight:500;color:var(--pw-ink)}.pwb .pw-empty p{font-size:11px;line-height:1.65;max-width:240px}.pwb .pw-footer{min-height:35px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px;color:var(--pw-muted)}.pwb .pw-footer-message{color:var(--pw-orange);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pwb .pw-loading{background:linear-gradient(90deg,var(--pw-line),transparent,var(--pw-line));height:9px;border-radius:4px;margin:16px 24px;max-width:70%}.pwb .pw-loading:nth-child(2){max-width:90%}.pwb .pw-loading:nth-child(3){max-width:45%}
.pwb .pw-head-title{flex-shrink:0}.pwb .pw-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:14px;min-width:0;flex:1}.pwb .pw-attention{position:relative;min-width:0;max-width:360px}.pwb .pw-attention summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:9px 13px;border:1px solid color-mix(in srgb,var(--pw-orange) 15%,transparent);border-radius:12px;background:color-mix(in srgb,var(--pw-orange) 6%,var(--pw-paper));-webkit-app-region:no-drag}.pwb .pw-attention summary::-webkit-details-marker{display:none}.pwb .pw-attention summary:focus-visible{outline:3px solid var(--pw-blue);outline-offset:3px}.pwb .pw-attention-label{font-size:12px;font-weight:600;color:var(--pw-orange);white-space:nowrap}.pwb .pw-attention summary>svg{color:var(--pw-orange);transform:rotate(90deg)}.pwb .pw-attention[open] summary>svg{transform:rotate(-90deg)}.pwb .pw-attention-popover{position:absolute;right:0;top:calc(100% + 9px);width:360px;max-width:calc(100cqw - 24px);max-height:min(440px,65vh);overflow:auto;padding:8px 17px;background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:15px;box-shadow:0 12px 40px rgba(0,0,0,.17);z-index:10}.pwb .pw-attention-item{padding:12px 0;border-top:1px solid var(--pw-line)}.pwb .pw-attention-item:first-child{border-top:0}.pwb .pw-attention-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pwb .pw-attention-item strong{font-size:12px;font-weight:550}.pwb .pw-attention-item p{font-size:11px;line-height:1.6;color:var(--pw-muted);margin-top:5px}.pwb .pw-attention-item .pw-quiet-link{color:var(--pw-blue);margin-top:5px}.pwb .pw-attention-tag{font-size:10px;white-space:nowrap;color:var(--pw-orange)}
.pwb .pw-progress-sections{flex:1;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);padding:0 24px 5px}.pwb .pw-progress-section{min-height:0;display:flex;flex-direction:column}.pwb .pw-progress-section+.pw-progress-section{border-top:1px solid var(--pw-line);padding-top:8px;margin-top:3px}.pwb .pw-section-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}.pwb .pw-section-heading h3{font-size:11px;font-weight:550;color:var(--pw-muted)}.pwb .pw-section-heading span{font-size:10px;color:var(--pw-muted)}.pwb .pw-progress-section .pw-card-body{padding:0}.pwb .pw-progress-section .pw-activity-list{padding:0}.pwb .pw-progress-section .pw-activity-row{padding:6px 0;gap:9px;min-height:42px}.pwb .pw-progress-section .pw-activity-icon{width:27px;height:27px}.pwb .pw-progress-section .pw-activity-status{margin-top:1px}.pwb .pw-section-empty{font-size:11px;line-height:1.6;color:var(--pw-muted);padding:9px 0}.pwb .pw-result-row:hover .pw-activity-title{color:var(--pw-blue)}.pwb .pw-activity-icon.is-result{color:var(--pw-olive);background:color-mix(in srgb,var(--pw-olive) 10%,transparent)}
@container pw-root (max-width:1050px){.pwb .pw-shell{--pw-gutter:22px}.pwb .pw-homeboard{gap:16px;grid-template-columns:minmax(0,1.04fr) minmax(0,1fr)}.pwb .pw-card-head{padding:18px 19px 11px}.pwb .pw-news-list,.pwb .pw-activity-list{padding-inline:19px}.pwb .pw-card-foot{margin-inline:19px}.pwb .pw-plan .pw-card-head{padding:23px 23px 12px}.pwb .pw-plan .pw-card-body{padding-inline:23px}.pwb .pw-progress{padding-inline:23px}.pwb .pw-plan .pw-card-foot{margin-inline:23px}}
@container pw-root (max-width:720px){.pwb .pw-shell{--pw-gutter:16px}.pwb .pw-head{min-height:78px}.pwb .pw-head h1{font-size:20px}.pwb .pw-homeboard{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1.25fr) minmax(0,1fr) minmax(0,.85fr);gap:12px}.pwb .pw-plan,.pwb .pw-news,.pwb .pw-activity{grid-column:1;grid-row:auto}.pwb .pw-card{border-radius:15px}.pwb .pw-card-head,.pwb .pw-plan .pw-card-head{padding:12px 17px 7px}.pwb .pw-card-title h2{font-size:15px}.pwb .pw-plan h2{font-size:23px}.pwb .pw-progress{padding:3px 17px 8px;gap:9px;font-size:10px}.pwb .pw-plan .pw-card-body{padding:0 17px 3px}.pwb .pw-plan-row{padding:5px 0}.pwb .pw-plan-text{font-size:12px}.pwb .pw-plan-check{width:14px;height:14px}.pwb .pw-group-title{font-size:10px}.pwb .pw-plan-note{font-size:10px}.pwb .pw-card-foot,.pwb .pw-plan .pw-card-foot{margin-inline:17px;padding:5px 0 6px;font-size:10px}.pwb .pw-card-link{font-size:10px}.pwb .pw-news-list,.pwb .pw-activity-list{padding-inline:17px}.pwb .pw-news-entry{padding:6px 0}.pwb .is-lead .pw-news-title{font-size:13px}.pwb .pw-news-summary{-webkit-line-clamp:1;font-size:10px}.pwb .pw-news-entry.is-lead{padding:8px 10px}.pwb .pw-activity-row{padding:7px 0}.pwb .pw-activity-icon{width:25px;height:25px}.pwb .pw-activity-title{font-size:11px}.pwb .pw-empty{padding:10px;gap:3px}.pwb .pw-empty>svg{display:none}.pwb .pw-empty strong{font-size:12px}.pwb .pw-empty p{font-size:10px}.pwb .pw-footer{min-height:28px}.pwb .pw-activity .pw-card-foot{display:none}}
@container pw-root (max-width:430px){.pwb .pw-shell{--pw-gutter:12px}.pwb .pw-head h1{font-size:17px;letter-spacing:-.4px}.pwb .pw-head{gap:6px}.pwb .pw-refresh{width:28px;height:28px}.pwb .pw-card-title h2{font-size:14px}}
.pwb .pw-progress-sections{padding:16px 24px 5px;grid-template-rows:minmax(0,.8fr) minmax(0,1.2fr)}.pwb .pw-section-heading h2{font-size:13px;font-weight:600;letter-spacing:-.2px}.pwb .pw-section-heading{padding-bottom:5px}.pwb .pw-progress-section .pw-activity-copy{display:flex;align-items:center;gap:9px}.pwb .pw-progress-section .pw-activity-title{flex:1;min-width:0;font-size:11px}.pwb .pw-progress-section .pw-activity-status{flex-shrink:0;white-space:nowrap;margin:0;gap:6px}.pwb .pw-progress-section .pw-activity-row{min-height:29px;padding:3px 0}.pwb .pw-progress-section .pw-activity-icon{width:23px;height:23px}.pwb .pw-progress-section .pw-activity-owner{padding-right:6px}.pwb .pw-activity .pw-card-foot{padding:5px 0}
.pwb .pw-codex-status{padding:0 24px 5px;color:var(--pw-muted);font-size:10px}.pwb .pw-codex-status.is-stale{color:var(--pw-orange)}.pwb .pw-activity-status .is-unknown{color:var(--pw-muted)}
@container pw-root (max-width:1050px){.pwb .pw-progress-sections{padding-inline:19px}}
@container pw-root (max-width:720px){.pwb .pw-head-actions{gap:6px}.pwb .pw-attention summary{padding:7px 9px;gap:5px}.pwb .pw-attention-label{font-size:10px}.pwb .pw-progress-sections{padding:11px 17px 9px}.pwb .pw-progress-section+.pw-progress-section{padding-top:5px}.pwb .pw-progress-section .pw-activity-row{padding:3px 0;min-height:29px}.pwb .pw-progress-section .pw-activity-status{font-size:9px}.pwb .pw-partial{padding:0 17px 5px}.pwb .pw-section-heading h2{font-size:12px}}
@container pw-root (max-width:520px){.pwb .pw-head{flex-wrap:wrap;gap:0;align-content:center;padding-top:9px;padding-bottom:8px}.pwb .pw-head-title{flex:1;min-width:0}.pwb .pw-head-actions{flex:0 0 auto}.pwb .pw-attention{position:static}.pwb .pw-attention summary{padding:5px 7px}.pwb .pw-attention-label{font-size:10px}.pwb .pw-attention-popover{right:12px;top:78px}.pwb .pw-head:has(.pw-attention){min-height:102px}.pwb .pw-head:has(.pw-attention) .pw-head-title{flex:0 0 100%}.pwb .pw-head h1{white-space:nowrap}.pwb .pw-head:has(.pw-attention) .pw-head-actions{flex-basis:100%;justify-content:flex-start;padding-top:6px}.pwb .pw-head:has(.pw-attention) .pw-refresh{margin-left:auto}.pwb .pw-head:has(.pw-attention) .pw-attention-popover{top:101px}}
@media(max-height:590px){.pwb{overflow:auto}.pwb .pw-shell{min-height:570px}}
@media(prefers-reduced-motion:reduce){.pwb *{scroll-behavior:auto!important}}
.pwb .pw-homeboard{display:block;position:relative;overflow:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent;scrollbar-gutter:stable}
.pwb .pw-grid-canvas{position:relative;width:100%;min-height:100%}
.pwb .pw-card-content{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.pwb .pw-card{position:absolute;grid-area:auto;container-type:inline-size;container-name:pw-card}
.pwb .pw-layout-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;padding:5px 11px;border:1px solid var(--pw-line);border-radius:9px;background:var(--pw-paper);font-size:11px;white-space:nowrap;-webkit-app-region:no-drag}
.pwb .pw-layout-button:hover{background:var(--pw-hover);color:var(--pw-blue)}
.pwb .pw-layout-button.is-primary{background:var(--pw-blue);border-color:var(--pw-blue);color:white;font-weight:600}
.pwb .pw-layout-button.is-quiet{background:transparent;border-color:transparent;color:var(--pw-muted);padding-inline:6px}
.pwb[data-editing=true] .pw-grid-canvas{background-image:radial-gradient(circle,var(--pw-muted) .8px,transparent 1px);background-size:var(--pw-grid-column) var(--pw-grid-row);background-position:-8px -8px}
.pwb[data-editing=true] .pw-card{transition:left .18s ease,top .18s ease,width .18s ease,height .18s ease;padding-top:28px;border-color:color-mix(in srgb,var(--pw-blue) 35%,var(--pw-line));box-shadow:0 3px 14px rgba(0,0,0,.05)}
.pwb[data-editing=true] .pw-card[data-active=true]{z-index:2;transition:none;outline:2px solid var(--pw-blue);outline-offset:-2px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.pwb[data-editing=true] .pw-card-body,.pwb[data-editing=true] .pw-card-foot,.pwb[data-editing=true] .pw-card-head{pointer-events:none}
.pwb[data-editing=true] .pw-card-foot{padding-right:26px}
.pwb .pw-grid-move{position:absolute;left:0;top:0;width:100%;height:28px;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--pw-muted);background:var(--pw-hover);font-size:10px;cursor:grab;touch-action:none;user-select:none;-webkit-app-region:no-drag}
.pwb .pw-grid-move>span:first-child{font-size:20px;line-height:1}
.pwb .pw-grid-move:active{cursor:grabbing}
.pwb .pw-grid-resize{position:absolute;bottom:0;right:0;z-index:3;width:38px;height:38px;display:flex;align-items:flex-end;justify-content:flex-end;padding:5px;color:var(--pw-blue);cursor:nwse-resize;touch-action:none;user-select:none;-webkit-app-region:no-drag;border-radius:12px 0 0 0;background:linear-gradient(135deg,transparent 32%,var(--pw-paper) 70%)}
.pwb .pw-grid-move:focus-visible,.pwb .pw-grid-resize:focus-visible{outline-offset:-4px}
.pwb .pw-layout-help{font-size:11px;line-height:1.5;color:var(--pw-muted);margin-top:5px;max-width:310px}
.pwb .pw-layout-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@container pw-card (max-width:380px){.pw-card .pw-card-head,.pw-plan .pw-card-head{padding:12px 17px 7px}.pw-plan h2{font-size:24px}.pw-card .pw-card-title h2{font-size:14px}.pw-card .pw-progress{padding:3px 17px 8px}.pw-plan .pw-card-body{padding-inline:17px}.pw-card .pw-card-foot{margin-inline:17px;font-size:10px}.pw-card .pw-news-list{padding-inline:17px}.pw-card .pw-progress-sections{padding:11px 17px 5px}.pw-card .pw-progress-section .pw-activity-copy{display:block}.pw-card .pw-progress-section .pw-activity-status{margin-top:2px}.pw-card .pw-codex-status{padding-inline:17px}.pw-card .pw-card-link{font-size:10px}}
@container pw-root (max-width:520px){.pwb[data-editing=true] .pw-head{padding-top:10px;padding-bottom:10px;gap:8px}.pwb[data-editing=true] .pw-head-title{flex:0 0 100%}.pwb[data-editing=true] .pw-head-actions{flex:0 0 100%;justify-content:flex-start;flex-wrap:wrap;gap:4px}.pwb .pw-layout-button{padding-inline:8px;font-size:10px}.pwb .pw-layout-help{font-size:10px}.pwb .pw-head-actions{flex-wrap:wrap}}
@media(prefers-reduced-motion:reduce){.pwb .pw-card{transition:none}}
.pwb .pw-head{min-height:82px}.pwb .pw-card-head{padding:17px 21px 10px}.pwb .pw-card-title h2{font-size:16px}.pwb .pw-card-foot{margin-inline:21px;padding:6px 0 9px;font-size:10px}.pwb .pw-card{box-shadow:0 3px 16px rgba(30,40,60,.035)}
.pwb .pw-news-banner{background:linear-gradient(125deg,var(--pw-news),var(--pw-paper) 85%)}.pwb .pw-news-banner .pw-card-title h2{font-size:20px;letter-spacing:-.5px}.pwb .pw-news-banner .pw-news-list{padding-inline:21px}.pwb .pw-news-banner .pw-news-entry{padding:6px 0}.pwb .pw-news-banner .pw-news-entry.is-lead{background:transparent;padding:0 0 9px}.pwb .pw-news-banner .is-lead .pw-news-title{font-size:16px;line-height:1.4}.pwb .pw-news-banner .pw-news-summary{-webkit-line-clamp:1;margin-top:4px}.pwb .pw-news-banner .pw-news-date{font-size:10px}.pwb .pw-news-banner[data-folded=true] .pw-card-head{padding:4px 18px;min-height:100%;gap:9px}.pwb .pw-news-banner[data-folded=true] .pw-card-title h2{font-size:13px;white-space:nowrap}.pwb .pw-news-banner[data-folded=true] .pw-card-body,.pwb .pw-news-banner[data-folded=true] .pw-card-foot{display:none}.pwb .pw-folded-summary{font-size:10px;color:var(--pw-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwb .pw-pet{background:linear-gradient(135deg,var(--pw-paper),color-mix(in srgb,var(--pw-plan) 80%,var(--pw-paper)))}.pwb .pw-pet-main{display:flex;align-items:center;gap:10px;padding:14px 18px 6px;flex:1;min-height:0;overflow:auto}.pwb .pw-pet-art{flex:0 0 104px;align-self:center}.pwb .pw-pet .hbc-launcher{width:104px!important;background:transparent;border:0;padding:0!important;color:var(--pw-muted)}.pwb .pw-pet .hbc-launcher svg{width:100px;height:100px}.pwb .pw-pet .hbc-launcher span{font-size:10px}.pwb .pw-pet-copy{min-width:0;flex:1}.pwb .pw-eyebrow{font-size:10px;letter-spacing:.5px;color:var(--pw-muted)}.pwb .pw-pet-copy h2{font-size:17px;letter-spacing:-.4px;line-height:1.5;margin:4px 0 5px}.pwb .pw-pet-copy p{font-size:11px;line-height:1.7;color:var(--pw-muted);overflow-wrap:anywhere}.pwb .pw-pet-copy .pw-pet-goal{color:var(--pw-plan-ink);font-size:10px;margin-top:8px}.pwb .pw-pet-goal span{font-weight:600;display:block;color:var(--pw-olive);margin-bottom:2px}.pwb .pw-pet-placeholder{font-size:10px;color:var(--pw-muted)}
.pwb .pw-assistant-list{padding:0 21px 8px}.pwb .pw-assistant-group+.pw-assistant-group{border-top:1px solid var(--pw-line);padding-top:10px;margin-top:9px}.pwb .pw-assistant-heading{display:flex;align-items:center;gap:8px}.pwb .pw-assistant-heading strong{font-size:12px;font-weight:600}.pwb .pw-assistant-heading .pw-quiet-link{margin-left:auto;font-size:10px}.pwb .pw-assistant-avatar{width:25px;height:25px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--pw-news);color:var(--pw-blue);flex-shrink:0}.pwb .pw-assistant-avatar.is-news{color:var(--pw-olive);background:var(--pw-plan)}.pwb .pw-mini-meta{font-size:9px;color:var(--pw-muted)}.pwb .pw-assistant-detail,.pwb .pw-assistant-empty{padding-left:33px;margin-top:3px}.pwb .pw-state{font-size:9px;line-height:1.5;border-radius:5px;padding:1px 5px;background:var(--pw-line);color:var(--pw-muted);white-space:nowrap}.pwb .pw-state[data-state=active]{color:var(--pw-blue);background:color-mix(in srgb,var(--pw-blue) 9%,transparent)}.pwb .pw-state[data-state=done]{color:var(--pw-olive);background:color-mix(in srgb,var(--pw-olive) 12%,transparent)}.pwb .pw-state[data-state=failed],.pwb .pw-state[data-state=attention]{color:var(--pw-orange);background:color-mix(in srgb,var(--pw-orange) 10%,transparent)}.pwb .pw-assistants .pw-card-foot{display:flex}
.pwb .pw-project-list{padding:0 21px}
.pwb .pw-project-row{border-top:1px solid var(--pw-line)}
.pwb .pw-project-row:first-child{border-top:0}
.pwb .pw-project-open{width:100%;min-width:0;text-align:left}
.pwb .pw-project-icon{object-fit:contain}
.pwb .pw-project-icon.is-placeholder{display:flex;align-items:center;justify-content:center;color:var(--pw-blue);background:var(--pw-news)}
.pwb .pw-project-remove{padding:8px;color:var(--pw-muted)}
.pwb .pw-plan .pw-card-head{padding:20px 23px 10px}.pwb .pw-plan h2{font-size:27px}.pwb .pw-plan .pw-card-body{padding-inline:23px}.pwb .pw-plan .pw-progress{padding:9px 23px 13px}.pwb .pw-plan .pw-card-foot{margin-inline:23px}.pwb .pw-calendar{padding:0 23px;flex-shrink:0}.pwb .pw-calendar-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px}.pwb .pw-segmented{display:flex;padding:2px;border-radius:8px;background:var(--pw-plan-line);gap:1px}.pwb .pw-segmented button{font-size:11px;min-width:27px;padding:3px 6px;border-radius:6px;color:var(--pw-plan-muted)}.pwb .pw-segmented button[aria-pressed=true]{background:var(--pw-paper);color:var(--pw-ink);box-shadow:0 1px 3px #0001}.pwb .pw-date-nav{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--pw-plan-muted)}.pwb .pw-date-nav button{min-width:23px;min-height:26px;border-radius:6px;font-size:18px}.pwb .pw-date-nav button:hover{background:var(--pw-plan-line)}.pwb .pw-date-nav .pw-today{font-size:10px}.pwb .pw-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin-top:9px}.pwb .pw-week-label{text-align:center;color:var(--pw-plan-muted);font-size:9px;padding-bottom:3px}.pwb .pw-calendar-grid button{border-radius:7px;min-height:25px;font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}.pwb .pw-calendar-grid button i{width:3px;height:3px;border-radius:50%;background:transparent}.pwb .pw-calendar-grid button i.has-plan{background:var(--pw-olive)}.pwb .pw-calendar-grid button.is-today{color:var(--pw-blue);font-weight:650}.pwb .pw-calendar-grid button.is-outside{opacity:.4}.pwb .pw-calendar-grid button[aria-pressed=true]{background:var(--pw-olive);color:var(--pw-paper)}.pwb .pw-calendar-grid button[aria-pressed=true] i.has-plan{background:var(--pw-paper)}.pwb .pw-calendar-status{font-size:9px;color:var(--pw-plan-muted);padding-top:5px}
.pwb .pw-modal-backdrop{position:absolute;inset:0;z-index:30;background:#0005;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}.pwb .pw-project-dialog{background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:20px;padding:24px;width:390px;max-width:100%;max-height:95%;overflow:auto;box-shadow:0 20px 70px #0003}.pwb .pw-project-dialog h2{font-size:20px}.pwb .pw-project-dialog>p{font-size:12px;color:var(--pw-muted);margin:7px 0 18px}.pwb .pw-project-dialog label{display:block;font-size:12px;margin-top:13px}.pwb .pw-project-dialog input,.pwb .pw-project-dialog select{display:block;width:100%;margin-top:6px;padding:9px 10px;background:var(--pw-bg);border:1px solid var(--pw-line);border-radius:8px;color:var(--pw-ink);font:inherit}.pwb .pw-project-dialog footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}
@container pw-card (max-width:400px){.pwb .pw-calendar{padding-inline:16px}.pwb .pw-date-nav{gap:3px;font-size:10px}.pwb .pw-pet-main{padding:12px;gap:4px}.pwb .pw-pet-art{flex-basis:80px}.pwb .pw-pet .hbc-launcher{width:80px!important}.pwb .pw-pet .hbc-launcher svg{width:78px;height:78px}.pwb .pw-pet-copy h2{font-size:15px}.pwb .pw-card .pw-card-title h2{font-size:15px}.pwb .pw-news-banner .pw-folded-summary{display:none}.pwb .pw-assistant-list,.pwb .pw-project-list{padding-inline:16px}}

.pwb .pw-head-title h1 {
  font:500 clamp(26px,4.2cqw,60px)/.95 var(--pw-display);
  letter-spacing:-.025em;
}
.pwb .pw-head-title {position:relative}
.pwb .pw-card-title>svg {color:var(--pw-blue)}
.pwb .pw-layout-button.is-primary {background:var(--pw-accent);border-color:var(--pw-accent);color:var(--pw-on-accent)}
.pwb .pw-layout-button.is-primary:hover {background:var(--pw-ink)}
.pwb .pw-assistant-avatar,.pwb .pw-attention summary,.pwb .pw-segmented,.pwb .pw-calendar-grid button {border-radius:6px}
.pwb .pw-project-dialog,.pwb .pw-attention-popover {border-radius:16px}
.pwb .pw-project-dialog :is(input,select,textarea) {border-radius:6px}
.pwb .pw-card-link,.pwb .pw-layout-button,.pwb .pw-quiet-link {
  transition:color var(--pw-motion-fast) ease,background-color var(--pw-motion-fast) ease,border-color var(--pw-motion-fast) ease;
}
@media(prefers-reduced-motion:reduce) {
  .pwb .pw-card-link,.pwb .pw-layout-button,.pwb .pw-quiet-link {transition:none}
}

.pwb .pw-news-banner .pw-card-content {position:relative;isolation:isolate}
.pwb .pw-news-banner .pw-card-title>svg {width:16px;height:16px;color:var(--pw-blue)}
.pwb .pw-news-banner .pw-card-link {color:var(--pw-ink)}
.pwb .pw-news-banner .pw-card-link:hover {color:var(--pw-blue)}
.pwb .pw-news-banner .pw-news-copy {min-width:0}
.pwb .pw-news-banner .pw-news-entry:not(.is-lead) .pw-news-title {color:var(--pw-muted)}
.pwb .pw-news-banner .pw-news-entry a:hover .pw-news-title {color:var(--pw-blue)}
.pwb .pw-news-banner :is(a,button):focus-visible {outline-color:var(--pw-blue);outline-offset:-2px}
.pwb .pw-news-lead .pw-news-copy {flex:1}
.pwb .pw-news-figure {
  display:grid;
  place-items:center;
  flex:none;
  width:120px;
  height:90px;
  background:var(--pw-tile);
  border:1px solid var(--pw-line);
  border-radius:6px;
  overflow:hidden;
}
.pwb .pw-news-image {display:block;width:100%;height:100%;min-width:0;min-height:0;object-fit:cover;object-position:center}
.pwb .pw-news-image[hidden] {display:none}
@container pw-card (max-width:400px) {
  .pwb .pw-news-actions .pw-read-extra {display:none}
}

.pwb .pw-pet {
  background:transparent;
  border-color:transparent;
  box-shadow:none;
  backdrop-filter:none;
}
.pwb .pw-pet-art {display:grid;place-items:center}
.pwb[data-editing=true] .pw-pet {
  border:1px dashed color-mix(in srgb,var(--pw-blue) 55%,transparent);
  box-shadow:none;
}
.pwb .pw-assistant-avatar.is-news {color:var(--pw-orange);background:color-mix(in srgb,var(--pw-gold) 24%,var(--pw-paper))}
.pwb .pw-assistant-heading .pw-quiet-link {padding-inline:3px;color:var(--pw-blue);white-space:nowrap}
.pwb .pw-state[data-state=failed] {background:color-mix(in srgb,var(--pw-gold) 40%,var(--pw-paper));color:var(--pw-blue)}

.pwb .pw-project-row:focus-within,.pwb .pw-project-row:hover {background:var(--pw-hover)}
.pwb .pw-project-open:focus-visible {outline-offset:-3px}
.pwb .pw-project-dialog.pw-project-detail {width:min(100%,540px);max-height:calc(100% - 24px);overflow:auto}
.pwb .pw-project-detail header {display:flex;justify-content:space-between;align-items:center;gap:8px}
.pwb .pw-project-detail header button,.pwb .pw-requirement-controls button {min-width:28px;min-height:28px;border:1px solid var(--pw-line);border-radius:7px}
.pwb .pw-project-detail :is(ol,ul) {list-style:none;margin:0;padding:0}
.pwb .pw-project-detail form {display:grid;gap:8px}
.pwb .pw-project-detail textarea {resize:vertical;min-height:56px;width:100%;padding:8px;border:1px solid var(--pw-line);border-radius:8px;color:inherit;background:var(--pw-bg);font:inherit}
.pwb .pw-project-detail .pw-requirement-row {display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-top:1px solid var(--pw-line);padding-block:8px;font-size:13px;overflow-wrap:anywhere}
.pwb .pw-requirement-row>span {white-space:pre-wrap;flex:1}
.pwb .pw-requirement-controls {display:flex;gap:4px;flex-shrink:0}
.pwb .pw-project-detail :disabled {opacity:.5;cursor:default}
.pwb .pw-project-detail footer {flex-wrap:wrap}
@container pw-card (min-width:500px) {
  .pwb .pw-project-list,.pwb .pw-assistant-list {grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .pwb .pw-project-list>:first-child:not(.pw-project-row) {grid-column:1/-1}
}

.pwb .pw-plan-view {display:flex;flex:1;min-height:0;flex-direction:column}
.pwb .pw-plan-view[data-mode=month] {overflow:auto;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent}
.pwb .pw-plan-view[data-mode=month]>.pw-card-body {flex:0 0 auto;overflow:visible}
.pwb .pw-segmented {background:var(--pw-tile);border:1px solid var(--pw-line)}
.pwb .pw-segmented button {min-height:24px}
.pwb .pw-segmented button[aria-pressed=true] {background:var(--pw-accent);color:var(--pw-on-accent);box-shadow:none}
.pwb .pw-date-nav>span {color:var(--pw-ink);font-weight:650;white-space:nowrap}
.pwb .pw-date-nav .pw-today {padding:0 5px;color:var(--pw-blue)}
.pwb .pw-calendar-grid {row-gap:4px}
.pwb .pw-calendar-grid button {gap:1px;border-radius:8px;min-height:26px}
.pwb .pw-calendar-grid button > .pw-calendar-number {min-width:23px;padding:2px;text-align:center;border-radius:50%}
.pwb .pw-calendar-grid button:hover {background:var(--pw-hover)}
.pwb .pw-calendar-grid button[aria-pressed=true] {background:transparent;color:var(--pw-ink);font-weight:700}
.pwb .pw-calendar-grid button[aria-pressed=true] > .pw-calendar-number {background:var(--pw-olive);color:var(--pw-on-accent)}
.pwb .pw-calendar-grid button.is-today:not([aria-pressed=true]) > .pw-calendar-number {background:var(--pw-gold);color:#111}
.pwb .pw-calendar-grid button.is-outside {color:var(--pw-muted);opacity:.72}
.pwb .pw-week-label {font-size:10px;font-weight:600}
.pwb .pw-progress-value {background:var(--pw-olive)}
.pwb button.pw-plan-check {border:1.5px solid var(--pw-plan-muted)}
.pwb button.pw-plan-check:hover:not(:disabled) {border-color:var(--pw-blue);background:var(--pw-hover)}
.pwb .is-done button.pw-plan-check:hover:not(:disabled) {background:var(--pw-olive);filter:brightness(.92)}
.pwb button.pw-plan-check[aria-busy=true] {cursor:progress}
.pwb .pw-plan .pw-card-foot>span {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwb .pw-plan-row.is-done .pw-plan-check {color:var(--pw-on-accent)}
.pwb .pw-group-title {color:var(--pw-muted);font-weight:650}
.pwb .pw-plan-note.quote {background:var(--pw-tile);border-radius:0 6px 6px 0;padding-block:3px}
@container pw-root (max-width:520px) {
  .pwb .pw-head-title h1 {font-size:21px}
}
@container pw-card (max-width:399px) {
  .pwb .pw-assistant-heading {gap:5px;flex-wrap:wrap}
  .pwb .pw-date-nav button {min-width:19px}
}
/* Shared component dimensions and visual treatments. See DESIGN.md. */
.pwb .pw-shell {--pw-gutter:32px;max-width:none}
.pwb .pw-head {min-height:88px;gap:16px}
.pwb .pw-head-title {padding-inline-start:16px}
.pwb .pw-head-title h1 {font-size:clamp(32px,4cqw,48px);font-weight:600;line-height:1}
.pwb .pw-card {
  --pw-card-inset:24px;
  border:0;
  border-radius:16px;
  background:var(--pw-glass);
  box-shadow:none;
  backdrop-filter:blur(12px);
}
.pwb .pw-card-head,.pwb .pw-plan .pw-card-head {padding:16px var(--pw-card-inset) 8px;gap:8px}
.pwb .pw-card-title {gap:8px}
.pwb .pw-card-head .pw-card-title h2 {font-size:18px;font-weight:600;line-height:28px}
.pwb .pw-card-title>svg {width:16px;height:16px}
.pwb .pw-card-foot,.pwb .pw-plan .pw-card-foot {margin-inline:var(--pw-card-inset);padding:8px 0;font-size:11px;line-height:16px}
.pwb .pw-news-banner .pw-news-list,.pwb .pw-assistant-list,.pwb .pw-project-list,
.pwb .pw-plan .pw-card-body,.pwb .pw-calendar,.pwb .pw-plan .pw-progress {padding-inline:var(--pw-card-inset)}
.pwb .pw-news-banner .pw-news-entry.is-lead {padding:0 0 8px;margin-bottom:4px}
.pwb .pw-news-banner .is-lead .pw-news-title {font:600 clamp(20px,4cqw,28px)/1 var(--pw-display);letter-spacing:-.025em;text-transform:uppercase}
.pwb .pw-news-banner .pw-news-summary {font-size:14px;line-height:20px;margin-top:8px}
.pwb .pw-news-banner .pw-news-entry:not(.is-lead) {padding-block:4px}
.pwb .pw-news-entry:not(.is-lead) .pw-news-title {font-size:13px;line-height:20px}
.pwb .pw-news-actions {display:flex;align-items:center;gap:12px;flex-shrink:0}
.pwb .pw-brief-edition {font-size:11px;font-weight:400;white-space:nowrap}
.pwb .pw-news-banner .pw-card-title:has(.pw-brief-edition) {flex-wrap:wrap;column-gap:8px;row-gap:0}
.pwb .pw-news-banner .pw-news-lead {display:flex;align-items:center;gap:16px}
.pwb .pw-pet {border-color:transparent;background:transparent;backdrop-filter:none}
.pwb .pw-pet .pw-pet-main {padding:8px var(--pw-card-inset);gap:16px}
.pwb .pw-pet-art {
  background:radial-gradient(circle closest-side at 50% 43%,var(--pw-accent) 99%,transparent) center top / min(100%,136px) 112px no-repeat;
}
.pwb .pw-assistant-list,.pwb .pw-project-list {display:grid;gap:8px;padding-bottom:8px}
.pwb .pw-assistant-group,.pwb .pw-project-row,.pwb .pw-project-row:first-child {
  min-width:0;border:0;border-top:1px solid var(--pw-line);border-radius:6px;background:var(--pw-tile);
}
.pwb .pw-assistant-group,.pwb .pw-assistant-group+.pw-assistant-group {margin-top:0;padding:8px}
.pwb .pw-project-icon {width:36px;height:36px;border-radius:6px}
.pwb .pw-assistant-heading strong {font-size:14px;font-weight:600;line-height:20px}
.pwb .pw-assistant-detail {font-size:12px;line-height:16px}
.pwb .pw-plan .pw-progress {padding-block:8px 12px}
.pwb .pw-plan-text,.pwb .pw-plan[data-density=compact] .pw-plan-text {font-size:14px;line-height:20px}
.pwb .pw-plan-row,.pwb .pw-plan[data-density=compact] .pw-plan-row {gap:8px;padding-block:4px}
.pwb .pw-layout-button,.pwb .pw-card-link,.pwb .pw-quiet-link {border-radius:0;min-height:28px;font-size:12px;font-weight:600}
.pwb .pw-layout-button {min-height:32px;padding:4px 12px}
.pwb .pw-layout-button.is-primary,
.pwb .pw-task-form button,.pwb .pw-release-form button {
  padding:0;
  min-height:32px;
  border:0;
  border-radius:0;
  background:var(--pw-accent);
  color:var(--pw-on-accent);
  font:600 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);
}
.pwb .pw-layout-button.is-primary:hover,
.pwb .pw-task-form button:hover,.pwb .pw-release-form button:hover {background:var(--pw-ink);color:var(--pw-on-accent)}
.pwb .pw-card-link,.pwb .pw-plan .pw-card-link,.pwb .pw-assistant-heading .pw-quiet-link {color:var(--pw-ink)}
.pwb .pw-card-link:hover,.pwb .pw-plan .pw-card-link:hover,.pwb .pw-quiet-link:hover {color:var(--pw-blue)}
.pwb .pw-state {border-radius:9999px;padding:2px 6px;font-size:10px}
.pwb .pw-segmented,.pwb .pw-calendar-grid button {border-radius:6px}
.pwb button.pw-plan-check {border-radius:2px}
.pwb .pw-progress-track {height:4px;border-radius:9999px}
.pwb .pw-project-detail header button,.pwb .pw-requirement-controls button,.pwb .pw-project-detail textarea {border-radius:6px}
@container pw-root (max-width:1050px) {
  .pwb .pw-shell {--pw-gutter:24px}
}
@container pw-root (max-width:640px) {
  .pwb .pw-shell {--pw-gutter:16px}
  .pwb .pw-head {min-height:80px;gap:8px}
  .pwb .pw-head-title {padding-inline-start:8px}
  .pwb .pw-head-title h1 {font-size:24px}
}
@container pw-card (max-width:399px) {
  .pwb .pw-card-content {--pw-card-inset:16px}
  .pwb .pw-card-head,.pwb .pw-plan .pw-card-head {padding-block:12px 8px}
  .pwb .pw-news-banner .pw-news-lead {gap:8px}
  .pwb .pw-news-figure {width:80px;height:60px}
  .pwb .pw-news-actions {gap:8px}
}

.pwb .pw-plan .pw-card-head {align-items:center}
.pwb .pw-plan h2 {font:600 18px/28px var(--pw-display);letter-spacing:0}
.pwb .pw-plan .pw-card-head .pw-segmented {flex-shrink:0}
.pwb .pw-calendar-grid[data-mode=month] {gap:0}
.pwb .pw-calendar-grid[data-mode=month] .pw-week-label {padding-block:4px}
.pwb .pw-calendar-grid[data-mode=month] button {
  min-width:0;
  min-height:40px;
  align-items:flex-start;
  justify-content:flex-start;
  padding:2px 4px;
  border:1px solid var(--pw-line);
  border-inline-end:0;
  border-bottom:0;
  border-radius:0;
}
.pwb .pw-calendar-grid[data-mode=month] button:nth-child(7n) {border-inline-end:1px solid var(--pw-line)}
.pwb .pw-calendar-grid[data-mode=month] button:nth-last-child(-n+7) {border-bottom:1px solid var(--pw-line)}
.pwb .pw-calendar-grid[data-mode=month] button[aria-pressed=true] {background:var(--pw-hover);box-shadow:inset 0 0 0 1px var(--pw-accent)}
.pwb .pw-calendar-grid .pw-calendar-number {min-width:20px;line-height:16px}
.pwb .pw-calendar-marker {color:var(--pw-blue);font-size:9px;line-height:11px;white-space:nowrap}
.pwb .pw-plan .pw-selected-plan {margin:12px var(--pw-card-inset) 0;font-size:13px;font-weight:600}
.pwb .pw-plan .pw-progress-count {white-space:nowrap}
.pwb .pw-plan-view[data-mode=day] .pw-progress-count {order:-1;color:var(--pw-ink);font-weight:600}
@container pw-card (max-width:399px) {
  .pwb .pw-plan h2 {font-size:18px}
}

.pwb .pw-head:has(.pw-attention[open]) {z-index:5}
.pwb .pw-head-title {flex:1;min-width:0}
.pwb .pw-head-actions {flex:0 0 auto}
.pwb .pw-plugin-name {
  color:var(--pw-muted);
  font-size:14px;
  line-height:20px;
  margin-top:4px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.pwb .pw-pet .pw-pet-main {justify-content:center}
@container pw-root (max-width:640px) {
  .pwb .pw-head {position:relative;padding-block:8px}
  .pwb .pw-head-title,.pwb .pw-head:has(.pw-attention) .pw-head-title {flex:0 0 100%}
  .pwb .pw-head-actions,.pwb .pw-head:has(.pw-attention) .pw-head-actions {
    flex:0 0 100%;
    justify-content:flex-start;
    padding-top:0;
  }
  .pwb .pw-head .pw-refresh {margin-inline-start:auto}
  .pwb .pw-head:has(.pw-attention) .pw-attention-popover {top:100%;right:0}
}

/* Text on the black canvas uses the secondary white. Glass uses primary ink. */
.pwb .pw-head-title h1,.pwb .pw-head .pw-refresh:hover {color:var(--pw-on-dark)}
.pwb :is(.pw-plugin-name,.pw-date,.pw-layout-help,.pw-footer,.pw-head .pw-refresh) {color:var(--pw-muted-on-dark)}
.pwb .pw-head .pw-layout-button:not(.is-primary) {color:var(--pw-on-dark);border-color:#fff6;background:#fff1}
.pwb .pw-head .pw-layout-button:not(.is-primary):hover,.pwb .pw-head .pw-refresh:hover {background:#fff3}
.pwb .pw-head .pw-attention summary {color:var(--pw-gold);border-color:color-mix(in srgb,var(--pw-gold) 50%,transparent);background:color-mix(in srgb,var(--pw-gold) 10%,transparent)}
.pwb .pw-head .pw-attention summary .pw-attention-label {color:inherit}
.pwb .pw-head .pw-attention summary .pw-attention-preview {color:var(--pw-muted-on-dark)}
.pwb .pw-head .pw-attention-popover {color:var(--pw-ink);background:var(--pw-glass);backdrop-filter:blur(12px)}
.pwb .pw-pet .pw-pet-copy h2,.pwb .pw-pet .pw-pet-goal {color:var(--pw-on-dark)}
.pwb .pw-pet :is(.pw-eyebrow,.pw-pet-copy>p:not(.pw-pet-goal),.pw-card-foot,.pw-pet-placeholder) {color:var(--pw-muted-on-dark)}
.pwb .pw-pet .pw-pet-goal>span {color:var(--pw-gold)}
.pwb .pw-pet .pw-card-foot {border-color:#fff3}
.pwb .pw-pet-art .hbc-launcher {color:var(--pw-on-dark)}
.pwb .pw-plan-text,.pwb .pw-plan[data-density=compact] .pw-plan-text,
.pwb .pw-news-banner .pw-news-summary,.pwb .pw-pet-copy>p:not(.pw-pet-goal) {
  font:600 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body);
  letter-spacing:var(--pw-body-tracking);
}
.pwb .pw-card-link,.pwb .pw-plan .pw-card-link,.pwb .pw-quiet-link,.pwb .pw-assistant-heading .pw-quiet-link {padding:0;border:0;border-radius:0}
.pwb :is(.pw-card-link,.pw-quiet-link,.pw-layout-button):focus-visible {border-radius:0}
.pwb .pw-project-dialog {color-scheme:light;background:var(--pw-glass);box-shadow:none;backdrop-filter:blur(12px)}
.pwb .pw-project-dialog :is(input,select,textarea) {background:var(--pw-tile);color:var(--pw-ink)}
.pwb .pw-project-dialog .pw-footer-message {color:var(--pw-orange)}
.pwb .pw-plan-note.callout {padding:8px 12px;border-radius:6px}
.pwb .pw-plan-row.is-done .pw-plan-check {color:var(--pw-on-accent)}
.pwb .pw-news-banner .pw-card-title h2 {letter-spacing:normal}
.pwb .pw-card-head .pw-card-title h2,.pwb .pw-plan h2 {font:600 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body)}
.pwb .pw-card-head .pw-segmented button[aria-pressed=true] {color:var(--pw-on-accent)}
.pwb .pw-card-body {color-scheme:light}
.pwb .pw-calendar-grid button > .pw-calendar-number {border-radius:9999px}
.pwb .pw-card-foot .pw-dot {border-radius:9999px}
.pwb .pw-footer .pw-footer-message {color:var(--pw-gold)}
.pwb .pw-grid-resize,.pwb .pw-grid-move {color:var(--pw-ink)}
.pwb[data-editing=true] .pw-pet :is(.pw-grid-resize,.pw-grid-move) {color:var(--pw-on-dark)}
@container pw-root (max-width:640px) {
  .pwb .pw-head .pw-head-actions {
    gap:4px;
  }
  .pwb .pw-head .pw-layout-button {
    padding-inline:6px;
  }
  .pwb .pw-head .pw-attention summary {
    gap:4px;
    padding-inline:6px;
  }
  .pwb .pw-head .pw-refresh {
    width:24px;
    height:28px;
  }
  .pwb .pw-head .pw-layout-button.is-primary {
    padding-inline:0;
  }
}
@container pw-card (max-width:399px) {
  .pwb .pw-news-banner .pw-card-title h2 {font-size:16px;line-height:24px}
}

/* Compact cards keep their useful content visible within the saved grid. */
.pwb .pw-operations-icon {width:24px;height:24px;object-fit:contain;flex:none}
.pwb .pw-assistant-compact .pw-assistant-group {display:grid;grid-template-rows:24px auto auto;row-gap:4px;align-items:start}
.pwb .pw-assistant-compact .pw-assistant-heading {gap:8px;flex-wrap:nowrap;min-width:0}
.pwb .pw-assistant-compact .pw-assistant-heading strong {white-space:nowrap}
.pwb .pw-assistant-compact .pw-assistant-heading .pw-quiet-link {flex:none}
.pwb .pw-assistant-field {display:grid;grid-template-columns:4em minmax(0,1fr);gap:8px;align-items:start;font-size:11px;line-height:20px;min-width:0}
.pwb .pw-assistant-label,.pwb .pw-assistant-context,.pwb .pw-assistant-warning {color:var(--pw-muted)}
.pwb .pw-assistant-status {display:flex;align-items:center;gap:3px 6px;flex-wrap:wrap;min-width:0}
.pwb .pw-assistant-context,.pwb .pw-assistant-warning {overflow-wrap:anywhere;font-size:12px}
.pwb .pw-assistant-warning {color:var(--pw-orange)}
.pwb .pw-assistant-review {display:grid;gap:4px;min-width:0}
.pwb .pw-assistant-receipt {display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0 4px;min-width:0}
.pwb .pw-assistant-review .pw-quiet-link {max-width:100%;min-width:0;color:var(--pw-blue);white-space:nowrap}
.pwb .pw-assistant-result-name {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwb .pw-assistant-review .pw-assistant-receipt .pw-quiet-link {font-size:12px}
.pwb .pw-assistant-receipt > small {grid-column:1/-1;line-height:15px;color:var(--pw-muted);overflow-wrap:anywhere}
.pwb .pw-assistant-reviewed {display:grid;place-items:center;width:24px;height:24px;border:1px solid var(--pw-line);color:var(--pw-blue)}
.pwb .pw-assistant-reviewed:hover {background:var(--pw-hover)}
.pwb .pw-assistant-review-empty {color:var(--pw-muted);font-size:11px}
@container pw-card (min-width:500px) {
  .pwb .pw-assistant-compact .pw-assistant-group {grid-row:span 3;grid-template-rows:subgrid}
}
.pwb .pw-project-sync {display:grid;gap:6px;min-width:0;overflow-wrap:anywhere}
.pwb .pw-project-sync li+li {margin-top:6px}

.pwb .pw-news-banner .pw-card-body {overflow-y:auto;scrollbar-gutter:stable}
.pwb .pw-news-split[data-quick=true] {
  display:grid;
  grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);
  gap:16px;
  align-items:start;
}
.pwb .pw-news-split .pw-news-lead {
  display:grid;
  grid-template-columns:minmax(0,1fr);
  align-items:start;
  gap:8px 12px;
}
.pwb .pw-news-split .pw-news-lead:has(.pw-news-figure) {
  grid-template-columns:minmax(0,1fr) auto;
}
.pwb .pw-news-lead .pw-news-title {grid-column:1/-1}
.pwb .pw-news-lead .pw-news-figure {grid-column:2;grid-row:2}
.pwb .pw-news-split .pw-news-entry.is-lead {margin:0;padding:0}
.pwb .pw-news-split .is-lead :is(.pw-news-title,.pw-news-summary) {
  display:block;
  -webkit-line-clamp:unset;
  overflow-wrap:anywhere;
}
.pwb .pw-news-split .is-lead .pw-news-title {font-size:clamp(17px,3.8cqw,24px);line-height:1.2}
.pwb .pw-news-split .is-lead .pw-news-summary {
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:4;
  overflow:hidden;
  margin-top:0;
}
.pwb .pw-news-split .pw-news-entry.is-lead {background:transparent}
.pwb .pw-news-quick {list-style:none;margin:0;padding:0 0 0 16px;border-inline-start:1px solid var(--pw-line);min-width:0}
.pwb .pw-news-quick li+li {border-top:1px solid var(--pw-line)}
.pwb .pw-news-quick .pw-news-entry {padding:4px 0}
.pwb .pw-news-quick .pw-news-entry a {align-items:center;gap:4px}
.pwb .pw-news-quick .pw-news-title {font-size:13px;line-height:16px;color:var(--pw-ink)}
.pwb .pw-news-quick .pw-news-copy {min-width:0}
@container pw-card (max-width:499px) {
  .pwb .pw-news-split[data-quick=true] {grid-template-columns:minmax(0,1fr);gap:12px}
  .pwb .pw-news-quick {padding:4px 0 0;border-inline-start:0;border-block-start:1px solid var(--pw-line)}
}
@container pw-card (max-width:639px) {
  .pwb .pw-news-lead .pw-news-figure {width:80px;height:60px}
}
@container pw-card (max-width:399px) {
  .pwb .pw-news-quick .pw-news-title {font-size:12px;line-height:16px}
  .pwb .pw-news-quick .pw-news-entry {padding-block:0;min-height:20px}
  .pwb .pw-news-banner .pw-card-head {padding-block:8px 4px}
  .pwb .pw-news-banner .pw-card-title h2 {font-size:16px;line-height:24px}
}

/* Koko glass, grid and typography with the workbench mint palette. */
.pwb {
  --pw-bg: #edf7f6;
  --pw-paper: #fff;
  --pw-glass: rgba(252,255,254,.86);
  --pw-glass-shadow: 0 20px 40px -20px rgba(0,0,0,.3);
  --pw-glass-blur: blur(12px);
  --pw-label-tracking: 1.8px;
  --pw-ink: #163031;
  --pw-muted: #586e70;
  --pw-line: #d7e9e7;
  --pw-divider: #e7efee;
  --pw-accent: #076567;
  --pw-blue: #076567;
  --pw-hover: #e7f5f3;
  --pw-plan: #fff;
  --pw-plan-ink: var(--pw-ink);
  --pw-plan-muted: var(--pw-muted);
  --pw-plan-line: #d7e9e7;
  --pw-olive: #076567;
  --pw-news: #075d5f;
  --pw-orange: #984b39;
  --pw-gold: #ffd042;
  --pw-tile: #f0f8f7;
  --pw-on-accent: #fff;
  --pw-on-dark: #fff;
  --pw-muted-on-dark: #d1eeeb;
  --pw-body: "PWB Koko Inter", "Inter", "PingFang SC", -apple-system, sans-serif;
  --pw-display: var(--pw-body);
  --pw-label-size: 12px;
  --pw-label-leading: 16px;
  --pw-body-size: 14px;
  --pw-body-leading: 20px;
  --pw-motion-fast: 150ms;
  color-scheme: light;
  font: 400 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body);
  background:
    radial-gradient(ellipse at 4% 0%, #acd6d6 0%, transparent 48%),
    radial-gradient(ellipse at 98% 70%, rgba(172,214,214,.8), transparent 56%),
    var(--pw-bg);
}
.pwb .pw-shell {
  --pw-gutter: 24px;
  max-width: none;
  width: 100%;
  height: 100%;
  margin: 0;
  padding-block-end: 12px;
  border-radius: 0;
  background: transparent;
}
.pwb .pw-head {
  --pw-window-offset: 0px;
  --pw-plugin-name-height: 0px;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "plugin tools" "title title";
  align-items: center;
  min-height: 0;
  column-gap: 12px;
  row-gap: 2px;
  padding-block: 12px;
}
html[data-platform="darwin"] .pwb .pw-head {
  --pw-window-offset: max(0px, calc(var(--dsh-frame-leading-clearance, 0px) - var(--pw-gutter)));
  /* Keep the name centered on the macOS button row even when the sidebar is open. */
  --pw-plugin-name-height: calc(var(--dsh-frame-top-clearance, 48px) + 2px - 2 * var(--pw-header-top-inset));
}
.pwb .pw-head .pw-plugin-name {
  grid-area: plugin;
  display: flex;
  align-items: center;
  min-height: var(--pw-plugin-name-height);
  padding-inline-start: calc(var(--pw-window-offset) + min(8px, var(--pw-window-offset)));
  margin: 0;
  font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);
  letter-spacing: var(--pw-label-tracking);
  text-transform: uppercase;
  color: var(--pw-muted);
  overflow-wrap: anywhere;
  white-space: normal;
}
.pwb .pw-head .pw-head-title { grid-area: title; padding-inline-start: 0; }
.pwb .pw-head .pw-head-title h1 {
  color: var(--pw-ink);
  font: 500 clamp(26px, 4.2cqw, 48px)/.95 var(--pw-display);
  letter-spacing: -.025em;
}
.pwb .pw-head .pw-head-actions { grid-area: tools; justify-self: end; width: auto; gap: 8px; }
.pwb .pw-head .pw-refresh {
  color: var(--pw-blue);
  border-radius: 0;
  background: var(--pw-glass);
}
.pwb .pw-head .pw-refresh:hover { color: var(--pw-ink); background: var(--pw-hover); }
.pwb .pw-head .pw-attention summary {
  min-height: 36px;
  padding: 8px 12px;
  gap: 6px;
  border: 1px solid var(--pw-ink);
  border-radius: 0;
  background: var(--pw-glass);
  color: var(--pw-ink);
}
.pwb .pw-head .pw-attention summary:hover { background: var(--pw-hover); }
.pwb .pw-head .pw-attention-label { font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body); }
.pwb .pw-layout-help,.pwb .pw-footer.pw-footer-message { color: var(--pw-muted); }
.pwb .pw-footer.pw-footer-message { padding-block: 8px; white-space: normal; overflow-wrap: anywhere; }

.pwb[data-editing=true] .pw-homeboard {
  background-image: linear-gradient(90deg,rgba(7,101,103,.08) 1px,transparent 1px),
    linear-gradient(rgba(7,101,103,.08) 1px,transparent 1px);
  background-size: 32px 32px;
}
.pwb .pw-card {
  --pw-card-inset: 20px;
  border: 0;
  border-radius: 0;
  color: var(--pw-ink);
  background: var(--pw-glass);
  box-shadow: none;
  -webkit-backdrop-filter: var(--pw-glass-blur);
  backdrop-filter: var(--pw-glass-blur);
}
.pwb .pw-card-head,.pwb .pw-plan .pw-card-head {
  padding: var(--pw-card-inset) var(--pw-card-inset) 8px;
  gap: 8px;
}
.pwb .pw-card-head .pw-card-title h2,.pwb .pw-plan h2 {
  font: 500 20px/24px var(--pw-display);
  letter-spacing: -.025em;
}
.pwb .pw-card-head .pw-card-title > svg { color: var(--pw-blue); }
.pwb .pw-card.pw-news-banner {
  --pw-card-inset: 21px;
  color: #fff;
  border-radius: 0;
  background: rgba(7,101,103,.93);
}
.pwb .pw-news-banner[data-folded=false] {
  box-shadow: var(--pw-glass-shadow);
}
.pwb .pw-news-banner[data-folded=false]::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255,255,255,.46);
  border-radius: inherit;
  pointer-events: none;
}
.pwb .pw-news-banner .pw-card-head .pw-card-title > svg,
.pwb .pw-news-banner .pw-card-link,.pwb .pw-news-banner .pw-news-title { color: #fff; }
.pwb .pw-news-banner :is(button,a):focus-visible { outline-color: #ffdc63; }
.pwb .pw-news-banner .pw-card-link:hover,.pwb .pw-news-banner .pw-news-entry a:hover .pw-news-title { color: #ffdf73; }
.pwb .pw-news-banner[data-folded=true] .pw-card-head {
  flex: 1;
  align-items: center;
  padding: 0 var(--pw-card-inset);
}
.pwb .pw-news-banner .is-lead .pw-news-title {
  font: 650 clamp(17px, 3.5cqw, 22px)/1.35 var(--pw-body);
  letter-spacing: normal;
  text-transform:none;
}
.pwb .pw-news-banner .pw-news-summary { color: #edf9f7; font: 400 13px/1.6 var(--pw-body); letter-spacing: normal; }
.pwb .pw-news-banner .pw-news-split { padding-block: 6px 12px; }
.pwb .pw-news-banner .pw-news-lead { row-gap:10px; }
.pwb .pw-news-banner .pw-brief-edition { color:#d1eeeb; font: 400 12px/18px var(--pw-body); white-space:nowrap; }
.pwb .pw-news-banner .pw-brief-date {
  min-height:26px; max-width:105px; padding-inline:4px; border:1px solid rgba(255,255,255,.35);
  border-radius:0; background:#116668; color:#fff; font:400 12px/18px var(--pw-body);
}
.pwb .pw-news-banner .pw-brief-date:focus-visible { outline:2px solid #ffdc63; }
.pwb .pw-news-banner[data-folded=false] .pw-card-head { flex-wrap:wrap; row-gap:6px; }
.pwb .pw-news-banner .pw-news-quick {
  border-color: rgba(255,255,255,.25);
}
.pwb .pw-news-banner .pw-news-quick .pw-news-entry { padding-block:5px; }
.pwb .pw-news-banner .pw-news-entry:not(.is-lead) .pw-news-title {
  display:block; color:#f0fbfa; font:400 13px/1.5 var(--pw-body); overflow-wrap:anywhere;
}
.pwb .pw-news-banner .pw-news-quick :is(li + li,.pw-news-entry) { border-color: rgba(255,255,255,.22); }
.pwb .pw-news-figure { border: 1px solid rgba(255,255,255,.22); border-radius: 0; background: #1a7778; }

.pwb .pw-card.pw-pet {
  color: var(--pw-ink);
  background: rgba(223,242,240,.70);
}
.pwb .pw-pet .pw-pet-main { padding: var(--pw-card-inset); }
.pwb .pw-pet .pw-pet-art {
  background: radial-gradient(circle closest-side at 50% 38%, #ffd041 98%, transparent) center top / 116px 104px no-repeat;
}
.pwb .pw-pet .hbc-launcher,.pwb .pw-pet .pw-pet-placeholder { color: var(--pw-ink); }
.pwb .pw-pet .hbc-state-label { color: var(--pw-muted); }
.pwb .pw-pet :is(.hbc-launcher span,.hbc-state-label,.hbc-pet-actions button) { font: 500 12px/17px var(--pw-body); }
.pwb .pw-pet .hbc-pet-actions button {
  color: var(--pw-blue);
  padding: 6px 12px;
  border: 1px solid var(--pw-accent);
  border-radius: 0;
  background: var(--pw-glass);
}
.pwb .pw-pet .hbc-pet-actions button:last-child { color: #fff; border-color: var(--pw-accent); background: var(--pw-accent); }

.pwb .pw-card:is(.pw-assistants,.pw-projects) {
  box-shadow: inset 0 0 0 1px var(--pw-line);
}
.pwb .pw-assistant-list,.pwb .pw-project-list { gap: 8px 16px; padding-bottom: 12px; }
.pwb .pw-assistant-group,.pwb .pw-assistant-group+.pw-assistant-group,
.pwb .pw-project-row,.pwb .pw-project-row:first-child {
  border: 1px solid var(--pw-line);
  border-radius: 0;
  background: rgba(255,255,255,.64);
}
.pwb .pw-assistant-group,.pwb .pw-assistant-group+.pw-assistant-group { padding: 12px; }
.pwb .pw-assistant-compact .pw-assistant-group { row-gap: 3px; }
.pwb .pw-project-row:focus-within,.pwb .pw-project-row:hover { background: rgba(240,251,250,.93); }
.pwb .pw-project-icon,.pwb .pw-assistant-avatar { border-radius: 0; }
.pwb .pw-assistant-heading strong { font: 500 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body); }
.pwb .pw-project-row { display: grid; position: relative; align-items: stretch; }
.pwb .pw-project-open { display: grid; align-content: start; align-items: start; padding: 10px 12px; gap: 0; }
.pwb .pw-project-heading {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  align-items: center;
  gap: 8px;
  padding-block-end: 5px;
}
.pwb .pw-project-heading .pw-project-icon { width: 28px; height: 28px; }
.pwb .pw-project-heading strong {
  font: 600 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body);
  overflow-wrap: anywhere;
}
.pwb .pw-project-heading > svg { color: var(--pw-blue); }
.pwb .pw-project-row:has(> .pw-project-remove) .pw-project-heading { padding-inline-end: 28px; }
.pwb .pw-project-row > .pw-project-remove {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 5px;
  width: 30px;
  height: 30px;
}
.pwb .pw-project-field {
  display: grid;
  grid-template-columns: 4em minmax(0,1fr);
  align-items: start;
  gap: 8px;
  padding-block: 2px;
  font: 400 12px/17px var(--pw-body);
}
.pwb .pw-project-field-label { color: var(--pw-muted); }
.pwb .pw-project-field-value { min-width: 0; overflow-wrap: anywhere; }
.pwb .pw-project-field[data-field=status] .pw-project-field-value {
  justify-self: start;
  color: var(--pw-blue);
  background: color-mix(in srgb,var(--pw-blue) 10%,transparent);
  padding-inline: 5px;
}
.pwb .pw-project-field:is([data-field=progress],[data-field=requirements]) .pw-project-field-value {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pwb .pw-project-field[hidden] { display: none; }
@container pw-card (min-width:500px) {
  .pwb .pw-project-list { row-gap: 0; }
  .pwb .pw-project-row,.pwb .pw-project-open { grid-template-rows: subgrid; grid-row: span 6; }
  .pwb .pw-project-row { margin-block-end: 8px; }
  .pwb .pw-project-field[hidden] { display: block; visibility: hidden; padding: 0; }
}

.pwb .pw-state {
  font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);
  border-radius: 0;
  padding: 2px 7px;
}
.pwb .pw-state[data-state=active] { color: #604500; background: #ffedac; }
.pwb .pw-state[data-state=done] { color: #065657; background: #d9efeb; }
.pwb .pw-state[data-state=failed],.pwb .pw-state[data-state=attention] { color: #914734; background: #fae8e1; }

.pwb .pw-card.pw-plan {
  background: var(--pw-glass);
  border: 0;
  border-radius: 0;
}
.pwb .pw-plan .pw-card-head { align-items: center; padding-bottom: 12px; }
.pwb .pw-plan .pw-segmented {
  padding: 2px;
  gap: 2px;
  background: transparent;
  border: 1px solid var(--pw-accent);
  border-radius: 0;
}
.pwb .pw-plan .pw-segmented button {
  min-width: 28px;
  min-height: 24px;
  border-radius: 0;
  color: var(--pw-muted);
  font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);
}
.pwb .pw-plan .pw-card-head .pw-segmented button[aria-pressed=true] { background: var(--pw-accent); color: #fff; box-shadow: none; }
.pwb .pw-plan .pw-calendar { padding-bottom: 8px; }
.pwb .pw-plan .pw-card-head { flex-wrap: wrap; }
.pwb .pw-plan .pw-card-head h2 { flex: 0 0 auto; white-space: nowrap; }
.pwb .pw-plan .pw-date-nav { gap: 2px; justify-content: center; }
.pwb .pw-plan .pw-date-nav > span { font-size: 12px; line-height: 18px; font-variant-numeric: tabular-nums; }
.pwb .pw-plan .pw-date-nav button {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  min-height: 28px;
  border-radius: 0;
}
.pwb .pw-plan .pw-date-nav button:hover:not(:disabled) { background: var(--pw-hover); }
.pwb .pw-plan .pw-date-nav .pw-today { white-space: nowrap; }
.pwb .pw-plan .pw-date-nav .pw-today:disabled { color: var(--pw-muted); cursor: default; }
@container pw-card (max-width: 350px) {
  .pwb .pw-plan .pw-date-nav { order: 1; flex-basis: 100%; justify-content: flex-start; }
}
.pwb .pw-plan .pw-calendar-grid { gap: 4px; }
.pwb .pw-plan .pw-calendar-grid :is(.pw-week-label,.pw-calendar-marker,.pw-calendar-week-status) { color: var(--pw-muted); font: 500 10px/14px var(--pw-body); }
.pwb .pw-plan .pw-calendar-grid button,
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button {
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[data-period=future] { border: 1px dashed var(--pw-line); }
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[data-period=past],
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button[data-has-record=true] { background: #f2f9f8; }
.pwb .pw-plan .pw-calendar-grid button:hover,.pwb .pw-plan .pw-calendar-grid button[aria-pressed=true] { background: #e3f2ef; }
.pwb .pw-plan .pw-calendar-grid .pw-calendar-number { min-width: 24px; min-height: 24px; padding: 3px; font: 600 12px/18px var(--pw-body); border-radius: 0; }
.pwb .pw-plan .pw-calendar-grid button.is-today > .pw-calendar-number { color: #413000; background: var(--pw-gold); }
.pwb .pw-plan .pw-calendar-grid button[aria-pressed=true] > .pw-calendar-number { color: #fff; background: var(--pw-accent); }
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button { min-height: 60px; padding: 4px; }
.pwb .pw-plan .pw-calendar-grid[data-mode=week]{gap:0;border-block:1px solid var(--pw-line)}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button{border:0;background:transparent;min-height:68px;padding:5px 2px;gap:2px;justify-content:flex-start}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button+button{border-left:1px solid var(--pw-line)}
.pwb .pw-plan .pw-calendar-weekday{font:500 10px/14px var(--pw-body);color:var(--pw-muted)}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[aria-pressed=true]{background:var(--pw-hover)}
.pwb .pw-plan .pw-calendar-grid[data-mode=month]{gap:0}
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button{border:0;border-top:1px solid var(--pw-line);background:transparent;min-height:96px;align-items:stretch;justify-content:flex-start;gap:4px;padding:6px;overflow:hidden}
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button:not(:nth-of-type(7n+1)){border-left:1px solid var(--pw-line)}
.pwb .pw-plan .pw-calendar-grid[data-mode=month] button[aria-pressed=true]{background:var(--pw-hover)}
.pwb .pw-plan .pw-calendar-grid[data-mode=month] .pw-calendar-number{align-self:flex-start;font-size:11px;min-height:20px;line-height:14px}
.pwb .pw-plan .pw-calendar-task-list{display:flex;flex-direction:column;gap:4px;min-width:0;width:100%}
.pwb .pw-plan .pw-calendar-task-list .pw-calendar-preview{display:block;width:100%;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font:400 10px/15px var(--pw-body);color:var(--pw-ink)}
.pwb .pw-plan .pw-calendar-task-list .pw-calendar-preview[data-checked=true]{color:var(--pw-muted);text-decoration:line-through}
.pwb .pw-plan .pw-calendar-task-list .pw-calendar-marker{font:400 10px/15px var(--pw-body);text-align:left}
.pwb .pw-plan .pw-progress { padding-block: 8px; gap: 8px; }
.pwb .pw-plan .pw-progress-track { height: 4px; border-radius: 0; background: #e3eeec; }
.pwb .pw-plan .pw-progress-value { height: 4px; border-radius: 0; background: var(--pw-accent); }
.pwb .pw-plan .pw-progress-count { font: 600 12px/17px var(--pw-body); }
.pwb .pw-plan .pw-card-body { padding-block: 2px 8px; }
.pwb .pw-plan .pw-group-title { color: var(--pw-accent); font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body); letter-spacing: var(--pw-label-tracking); text-transform: uppercase; margin-block: 6px 4px; }
.pwb .pw-plan :is(.pw-plan-note.quote,.pw-plan-note.callout) {
  margin-block: 4px; padding: 4px 8px; border-radius: 0; background: #eef7f5;
}
.pwb .pw-plan .pw-plan-note { font: 400 12px/17px var(--pw-body); }
.pwb .pw-plan .pw-plan-text,.pwb .pw-plan[data-density=compact] .pw-plan-text { font: 400 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body); letter-spacing: normal; }
.pwb .pw-plan .pw-plan-row,.pwb .pw-plan[data-density=compact] .pw-plan-row { gap: 8px; padding-block: 4px; }
.pwb .pw-plan .pw-plan-check { border: 1px solid #9fbdb9; border-radius: 0; }
.pwb .pw-plan .is-done .pw-plan-check { color: #fff; background: var(--pw-accent); }
.pwb .pw-plan .pw-plan-row.has-time {
  margin-block: 4px;
  padding: 4px 8px;
  border: 1px solid #cbe6e2;
  border-radius: 0;
  background: #edf8f6;
}
.pwb .pw-plan-time { color: var(--pw-accent); font: 650 10px/14px var(--pw-body); }
.pwb .pw-plan .pw-card-foot { margin-inline: var(--pw-card-inset); padding-block: 8px; font: 400 11px/16px var(--pw-body); }
.pwb .pw-plan .pw-card-foot .pw-dot { background: #0a8a76; }

.pwb .pw-layout-button,.pwb .pw-head .pw-layout-button:not(.is-primary) {
  min-height: 36px; padding: 8px 12px; border: 1px solid var(--pw-ink); border-radius: 0;
  background: var(--pw-glass); color: var(--pw-ink); font: 400 14px/20px var(--pw-body);
}
.pwb .pw-layout-button.is-primary,.pwb .pw-head .pw-layout-button.is-primary,
.pwb .pw-task-form button,.pwb .pw-release-form button {
  min-height: 36px; padding: 10px; border: 0; border-radius: 0;
  background: var(--pw-accent); color: #fff; font: 400 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);
  letter-spacing: var(--pw-label-tracking); text-transform: uppercase;
}
.pwb .pw-action-label { display: flex; align-items: center; gap: 6px; }
.pwb .pw-layout-button.is-primary:hover,.pwb .pw-head .pw-layout-button.is-primary:hover { background: #084c4e; }
.pwb .pw-head .pw-layout-button:not(.is-primary):hover { color: var(--pw-ink); background: var(--pw-hover); }
.pwb :is(.pw-card-link,.pw-quiet-link),.pwb .pw-plan .pw-card-link,.pwb .pw-assistant-review .pw-quiet-link {
  padding: 0; border: 0; border-radius: 0; color: var(--pw-blue); font: 400 14px/20px var(--pw-body);
}
.pwb :is(.pw-card-link,.pw-quiet-link):hover { text-decoration: underline; text-underline-offset: 3px; }
.pwb .pw-head .pw-attention-popover,.pwb .pw-project-dialog {
  background: rgba(255,255,255,.96); color: var(--pw-ink); border: 1px solid var(--pw-line);
  border-radius: 0; box-shadow: var(--pw-glass-shadow);
  -webkit-backdrop-filter: var(--pw-glass-blur);
  backdrop-filter: var(--pw-glass-blur);
}
.pwb .pw-head .pw-attention-popover {
  max-height: min(320px, 42dvh);
  padding: 0 20px;
  overscroll-behavior: contain;
  -webkit-app-region: no-drag;
}
.pwb .pw-attention-popover:focus-visible { outline: 2px solid var(--pw-accent); outline-offset: -2px; }
.pwb .pw-attention-item-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
  align-items: start;
  gap: 6px 16px;
}
.pwb .pw-attention-item :is(strong, p, .pw-attention-tag) { overflow-wrap: anywhere; }
.pwb .pw-attention-item strong { font: 500 14px/20px var(--pw-body); }
.pwb .pw-attention-item p { font: 400 13px/18px var(--pw-body); }
.pwb .pw-attention-tag {
  justify-self: end;
  max-width: 168px;
  padding: 2px 6px;
  background: color-mix(in srgb,var(--pw-orange) 9%,var(--pw-paper));
  white-space: normal;
  font: 400 12px/16px var(--pw-body);
}
.pwb .pw-attention-item .pw-quiet-link { margin-top: 4px; }
.pwb .pw-project-dialog { padding: 21px; }
.pwb .pw-project-dialog :is(input,select,textarea) { border-radius: 0; }
.pwb[data-editing=true] .pw-card { border: 1px dashed #79b4af; }
.pwb[data-editing=true] .pw-card[data-active=true] { outline-color: var(--pw-accent); }
.pwb .pw-grid-resize { color: var(--pw-accent); background: #e2f4f1; border-radius: 0; }
.pwb .pw-head :is(button,summary),.pwb :is(.pw-card-link,.pw-quiet-link) {
  transition: color var(--pw-motion-fast) ease, background-color var(--pw-motion-fast) ease;
}
@container pw-root (max-width: 760px) {
  .pwb .pw-shell { --pw-gutter: 16px; }
}
@container pw-root (max-width: 560px) {
  .pwb .pw-head { grid-template-columns: minmax(0,1fr); grid-template-areas: "plugin" "title" "tools"; padding-block: 8px; }
  .pwb .pw-head .pw-head-actions { flex-wrap: wrap; width: 100%; justify-content: flex-end; }
  .pwb .pw-attention-item-top { grid-template-columns: minmax(0, 1fr); }
  .pwb .pw-attention-tag { justify-self: start; max-width: 100%; }
}
@container pw-card (max-width: 400px) {
  .pwb .pw-card-content { --pw-card-inset: 12px; }
  .pwb .pw-card-head .pw-card-title h2,.pwb .pw-plan h2 { font-size: 16px; }
  .pwb .pw-news-banner .pw-card-link { font-size: 11px; gap: 4px; }
  .pwb .pw-plan .pw-card-foot .pw-card-link { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .pwb .pw-head :is(button,summary),.pwb :is(.pw-card-link,.pw-quiet-link),
  .pwb[data-editing=true] .pw-card { transition: none; }
}

.pwb .pw-pet .pw-pet-art { background: none; }
.pwb .pw-plan .pw-plan-view[data-mode=day] { overflow-y: auto; }
.pwb .pw-plan .pw-plan-view[data-mode=day] > .pw-card-body { flex: 0 0 auto; overflow: visible; }

@container pw-card (max-width: 400px) {
  .pwb .pw-news-banner[data-folded=false] .pw-card-body { padding-bottom: 16px; }
}

.pwb .pw-pet .hbc-launcher { font-family: var(--pw-body); }
.pwb .pw-news-banner .pw-news-quick .pw-news-entry svg { color: #d1eeeb; }
@container pw-root (max-width: 560px) {
  .pwb .pw-head .pw-layout-button:not(.is-primary) { padding: 6px 8px; }
}
@container pw-card (max-width: 400px) {
  .pwb .pw-assistant-group,.pwb .pw-assistant-group+.pw-assistant-group { padding: 10px; }
}

.pwb .pw-project-detail header button,.pwb .pw-requirement-controls button,
.pwb .pw-plan-note.callout,.pwb .pw-card-foot .pw-dot,
.pwb .pw-news-entry.is-lead,.pwb .pw-activity-icon,.pwb .pw-pet .hbc-launcher { border-radius: 0; }


.pwb .pw-head .pw-attention { position: relative; }
.pwb .pw-head .pw-attention:has(> summary) { flex: 0 0 auto; }
.pwb .pw-head .pw-attention .pw-attention-popover {
  inset: calc(100% + 6px) 0 auto auto;
  width: var(--pw-attention-width, 360px);
  max-width: calc(100cqw - 24px);
  box-sizing: border-box;
}
.pwb .pw-head .pw-attention[data-align=left] .pw-attention-popover { inset-inline: 0 auto; }
@container pw-root (max-width: 560px) {
  .pwb .pw-head .pw-attention .pw-attention-popover { max-height: 36dvh; padding-inline: 12px; }
}

/* Dashboard overview */
.pwb .pw-grid-canvas {
  --pw-overview-pet-size:122px;
}
.pwb .pw-grid-canvas[data-fit-content=true] {
  display:grid;
  min-height:0;
  grid-template-columns:repeat(var(--pw-overview-columns), minmax(0,1fr));
  grid-template-rows:max-content max-content auto;
  gap:12px var(--pw-overview-gap);
  align-content:start;
  align-items:start;
}
.pwb .pw-overview-column {display:contents}
.pwb .pw-grid-canvas[data-pet-placement=aligned] {grid-template-rows:auto}
.pwb [data-pet-placement=aligned] > .pw-overview-column {
  display:grid;grid-row:1;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;align-content:start;row-gap:12px;min-width:0;
}
.pwb [data-pet-placement=aligned] > .pw-overview-left {grid-column:1 / span var(--pw-overview-left-columns)}
.pwb [data-pet-placement=aligned] > .pw-overview-right {grid-column:calc(var(--pw-overview-left-columns) + 1) / -1}
.pwb .pw-grid-canvas[data-fit-content=true] [data-grid-id] {position:relative}
.pwb .pw-grid-canvas[data-fit-content=true] .pw-plan {contain:layout style;align-self:start;height:auto;max-height:none}
.pwb .pw-grid-canvas[data-fit-content=true] .pw-plan :is(.pw-card-content,.pw-plan-view,.pw-card-body) {
  flex:0 0 auto;height:auto;max-height:none;overflow:visible;
}
.pwb .pw-grid-canvas[data-fit-content=true][data-grid-profile=narrow] {
  grid-template-rows:max-content auto max-content auto;
  row-gap:var(--pw-overview-gap);
}
.pwb .pw-grid-canvas[data-pet-placement=stacked] {
  grid-template-rows:max-content max-content auto max-content auto;
}
.pwb [data-fit-content=true] .pw-assistants .pw-card-head {padding-block:12px 8px}
.pwb [data-fit-content=true] .pw-brief-layout {padding-block:0 12px}
.pwb [data-fit-content=true] .pw-assistant-feed {padding-bottom:10px}
.pwb [data-fit-content=true] .pw-assistant-copy {row-gap:6px}
.pwb .pw-head {
  --pw-header-top-inset:6px;
  grid-template-columns:minmax(112px,1fr) minmax(0,auto);
  grid-template-rows:auto minmax(36px,auto);
  grid-template-areas:"plugin plugin" "title tools";
  column-gap:clamp(8px,1.5cqw,20px);
  row-gap:8px;
  align-content:start;
  padding-block:var(--pw-header-top-inset) 14px;
}
@container pw-root (max-width:520px) {
  .pwb[data-editing=true] .pw-head {padding-block-start:var(--pw-header-top-inset)}
}
.pwb .pw-head .pw-plugin-name {
  padding-block:0;
}
.pwb .pw-head .pw-head-title {align-self:center}
.pwb .pw-head .pw-head-actions,.pwb .pw-head:has(.pw-attention) .pw-head-actions {
  align-self:center;min-width:0;flex-wrap:wrap;width:auto;justify-content:flex-end;padding:0;
}
.pwb .pw-head:has(.pw-attention) .pw-refresh {margin-inline-start:0}
.pwb .pw-head .pw-refresh {
  width:auto;height:36px;min-width:76px;padding:6px 9px;gap:6px;
  font:500 12px/16px var(--pw-body);font-variant-numeric:tabular-nums;white-space:nowrap;
}
.pwb .pw-refresh[aria-busy=true] > svg {animation:pw-refresh-turn 1s linear infinite}
@keyframes pw-refresh-turn {to {transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce) {.pwb .pw-refresh[aria-busy=true] > svg {animation:none}}
.pwb .pw-head .pw-head-title h1 {font:600 clamp(22px,3.1cqw,32px)/1.15 var(--pw-display);white-space:normal}
.pwb .pw-pet.pw-overview-pet {
  grid-column:1/-1;grid-row:1;justify-self:end;
  display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px clamp(12px,1.25cqw,20px);
  width:min(100%,360px);max-width:100%;padding:10px 0;border:0;
}
.pwb [data-pet-placement=aligned] .pw-overview-pet {width:100%;padding-inline:4px}
.pwb [data-pet-placement=stacked] .pw-overview-pet {
  width:100%;padding:8px 12px;
}
.pwb [data-fit-content=false] .pw-overview-pet {position:absolute;inset:0 0 auto auto}
.pwb [data-pet-placement=bottom] .pw-overview-pet {inset-block-start:100%;padding-block-end:8px}
.pwb .pw-today-overview {
  flex:1 1 224px;min-inline-size:min(100%,224px);
  color:var(--pw-ink);font:400 13px/1.55 var(--pw-body);overflow-wrap:anywhere;
}
.pwb .pw-today-overview h2 {margin:0 0 5px;font:600 14px/20px var(--pw-body)}
.pwb .pw-today-overview p {margin:0 0 5px}
.pwb .pw-today-overview .pw-today-status {color:var(--pw-muted)}
.pwb .pw-today-overview .pw-today-attention {
  display:inline;padding:0;border:0;background:none;text-align:start;
  color:var(--pw-blue);font:600 12px/1.55 var(--pw-body);cursor:pointer;
}
.pwb .pw-today-attention:hover {text-decoration:underline}
.pwb .pw-today-attention svg {vertical-align:middle}
.pwb .pw-pet.pw-overview-pet .pw-pet-art {flex:0 0 112px;display:grid;justify-items:center;min-width:0}
/* The embedded Data widget adds its stylesheet after the workbench styles. */
.pwb .pw-pet.pw-overview-pet .hbc-home .hbc-launcher {
  --hbc-dock-size:var(--pw-overview-pet-size);
  width:var(--hbc-dock-size)!important;
}
.pwb .pw-overview-pet .pw-pet-art > .hbc-launcher {width:var(--pw-overview-pet-size)!important}
.pwb .pw-overview-pet .hbc-launcher svg {width:100%;height:auto}
.pwb .pw-overview-pet .pw-pet-art:has(> .hbc-home) {
  row-gap:3px;
}
.pwb .pw-overview-pet .hbc-home .hbc-name {
  margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  color:var(--pw-ink);font:600 13px/18px var(--pw-body);text-align:center;
}
.pwb .pw-overview-pet .hbc-state-label {
  min-height:0;max-inline-size:100%;
  color:var(--pw-muted);font:500 12px/17px var(--pw-body);text-align:center;overflow-wrap:anywhere;
}
.pwb .pw-overview-pet .hbc-dock-actions {justify-content:center;margin:0}
.pwb .pw-overview-pet .hbc-pet-actions {flex-wrap:wrap}
.pwb .pw-overview-pet .hbc-pet-actions button {padding:4px 8px;white-space:nowrap}
@container pw-root (max-width:900px) {
  .pwb .pw-head .pw-head-title h1 {font-size:22px}
}
.pwb :is(.pw-brief-copy,.pw-assistant-copy,.pw-project-heading) h3 {margin:0;font:600 var(--pw-body-size)/var(--pw-body-leading) var(--pw-body);overflow-wrap:anywhere}
.pwb .pw-dashboard-action {
  display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:4px 10px;
  color:var(--pw-blue);background:transparent;border:1px solid color-mix(in srgb,var(--pw-accent) 38%,transparent);
  font:600 var(--pw-label-size)/var(--pw-label-leading) var(--pw-body);text-decoration:none;white-space:nowrap
}
.pwb .pw-dashboard-action:hover {background:var(--pw-hover)}
.pwb .pw-dashboard-action.is-accent {background:var(--pw-accent);border-color:var(--pw-accent);color:#fff}
.pwb .pw-dashboard-action.is-accent:hover {background:#084c4e}
.pwb :is(.pw-dashboard-action,.pw-brief-layout a):focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
.pwb .pw-state[data-state=planned],.pwb .pw-state[data-state=waiting] {color:#285775;background:#e7f0f6}

.pwb .pw-card.pw-news-banner {--pw-card-inset:18px;background:var(--pw-glass);color:var(--pw-ink);box-shadow:inset 0 0 0 1px var(--pw-line)}
.pwb .pw-news-banner[data-folded=false]::before {content:none}
.pwb .pw-news-banner .pw-card-head .pw-card-title > svg,.pwb .pw-news-banner .pw-card-link {color:var(--pw-blue)}
.pwb .pw-news-banner .pw-brief-edition {color:var(--pw-muted)}
.pwb .pw-news-banner .pw-brief-date {background:var(--pw-paper);color:var(--pw-ink);border-color:var(--pw-line)}
.pwb .pw-news-banner .pw-card-link:hover,.pwb .pw-news-banner .pw-news-title:hover {color:var(--pw-blue)}
.pwb .pw-news-banner :is(button,a,select):focus-visible {outline-color:var(--pw-accent)}
.pwb .pw-brief-layout {display:grid;flex:1;min-height:0;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:20px;padding:4px var(--pw-card-inset) 12px}
.pwb .pw-brief-lead {display:flex;align-items:stretch;gap:12px;min-width:0}
.pwb .pw-brief-copy {display:flex;flex-direction:column;align-self:stretch;align-items:flex-start;gap:8px;flex:1;min-width:0}
.pwb .pw-brief-copy h3 {font-size:clamp(18px,2.5cqw,24px);line-height:1.28}
.pwb .pw-brief-layout .pw-news-title {display:block;color:var(--pw-ink);text-transform:none;text-decoration:none;letter-spacing:normal;overflow-wrap:anywhere}
.pwb .pw-brief-copy .pw-news-title {font:inherit}
.pwb .pw-brief-copy .pw-news-summary {
  color:var(--pw-muted);font:400 13px/1.55 var(--pw-body);margin:0;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden
}
.pwb .pw-brief-media {position:relative;flex:0 1 42%;min-width:0;min-height:132px;align-self:stretch}
.pwb .pw-brief-media[hidden] {display:none}
.pwb .pw-brief-media > .pw-news-image {position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:contain;object-position:right center}

.pwb .pw-brief-layout .pw-news-quick {
  display:grid;align-content:start;grid-auto-rows:40px;min-width:0;padding:0;border:0
}
.pwb .pw-brief-layout .pw-news-quick li {min-width:0;border:0}
.pwb .pw-brief-layout .pw-news-quick li > :is(a,span) {
  box-sizing:border-box;display:grid;height:100%;grid-template-columns:16px minmax(0,1fr) 12px;
  align-items:center;gap:6px;padding:0 8px;text-decoration:none;border:0;box-shadow:none;background:transparent
}
.pwb .pw-brief-layout .pw-news-quick li > span {grid-template-columns:16px minmax(0,1fr)}
.pwb .pw-brief-layout .pw-news-quick .pw-news-number {font:600 13px/18px var(--pw-body);font-variant-numeric:tabular-nums;color:var(--pw-blue)}
.pwb .pw-brief-layout .pw-news-quick li > a:is(:hover,:focus-visible) {
  background:var(--pw-hover);
  box-shadow:inset 0 1px rgba(255,255,255,.65),inset 0 -1px color-mix(in srgb,var(--pw-ink) 10%,transparent)
}
.pwb .pw-brief-layout .pw-news-quick li > a:focus-visible {outline-offset:-2px}
.pwb .pw-brief-layout .pw-news-quick svg {color:var(--pw-blue)}
.pwb .pw-brief-layout .pw-news-quick .pw-news-title {
  display:block;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
  font:500 13px/18px var(--pw-body)
}
@container pw-card (min-width:650px) {
  .pwb .pw-brief-layout[data-quick=true] {grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}
  .pwb .pw-brief-layout .pw-news-quick {padding-inline-start:8px;border:0}
}

.pwb .pw-assistant-list.pw-assistant-feed {grid-template-columns:minmax(0,1fr);gap:12px;padding-inline:var(--pw-card-inset)}
.pwb .pw-assistant-feed .pw-assistant-group {display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:12px;margin:0;padding:12px 16px}
.pwb .pw-assistant-feed .pw-assistant-avatar {display:grid;place-items:center;width:38px;height:38px;background:var(--pw-tile);color:var(--pw-blue)}
.pwb .pw-assistant-feed .pw-operations-icon {width:30px;height:30px}
.pwb .pw-assistant-copy {display:grid;gap:4px;min-width:0}
.pwb .pw-assistant-feed .pw-assistant-heading {display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;min-height:22px}
.pwb .pw-assistant-copy .pw-assistant-context {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;color:var(--pw-ink);line-height:16px}
.pwb .pw-assistant-context > span {color:var(--pw-muted)}
.pwb .pw-assistant-feed .pw-assistant-field {display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start;font:400 12px/17px var(--pw-body)}
.pwb .pw-assistant-feed .pw-assistant-review .pw-quiet-link {min-height:18px;line-height:17px}
.pwb .pw-assistant-feed .pw-assistant-review-empty {font-size:12px}
.pwb .pw-assistant-feed .pw-assistant-receipt > small {font-size:11px}
.pwb .pw-assistant-feed .pw-assistant-open {align-self:center}
@container pw-card (max-width:350px) {
  .pwb .pw-assistant-feed .pw-assistant-group {gap:8px;grid-template-columns:32px minmax(0,1fr) auto}
  .pwb .pw-assistant-feed .pw-assistant-avatar {width:32px;height:32px}
  .pwb .pw-assistant-feed .pw-assistant-open {padding-inline:6px}
  .pwb .pw-assistant-feed .pw-assistant-open > svg {display:none}
  .pwb .pw-assistant-feed .pw-assistant-field {grid-template-columns:minmax(0,1fr);gap:1px}
}

.pwb .pw-project-list.pw-project-tiles {grid-template-columns:minmax(0,1fr);align-items:start;align-content:start;gap:12px;padding-inline:var(--pw-card-inset)}
.pwb .pw-project-tiles .pw-project-row {
  display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:max-content max-content;
  grid-row:auto;gap:12px;margin:0;padding:12px 16px
}
.pwb .pw-project-tiles .pw-project-heading {
  display:grid;grid-template-columns:26px minmax(0,1fr);align-items:start;gap:5px 7px;padding:0
}
.pwb .pw-project-tiles .pw-project-meta {grid-column:1/-1;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.pwb .pw-project-tiles .pw-project-meta > .pw-state {max-width:100%;white-space:normal;overflow-wrap:anywhere}
.pwb .pw-project-tiles .pw-project-icon {width:26px;height:26px}
.pwb .pw-project-tiles .pw-project-icon.is-placeholder {background:var(--pw-tile);color:var(--pw-blue)}
.pwb .pw-project-version {font:400 11px/16px var(--pw-body);color:var(--pw-muted);overflow-wrap:anywhere}
.pwb .pw-project-tiles .pw-project-remove {flex:none;align-self:start;min-width:24px;min-height:24px;padding:0}
.pwb .pw-project-tiles .pw-project-facts {grid-column:1/-1;min-width:0;margin:0}
.pwb .pw-project-tiles .pw-project-field {grid-template-columns:4em minmax(0,1fr);gap:6px;padding:5px 0}
.pwb .pw-project-tiles .pw-project-field + .pw-project-field {border-block-start:1px solid var(--pw-line)}
.pwb .pw-project-tiles .pw-project-field-value {margin:0}
.pwb .pw-project-tiles .pw-project-enter {grid-area:1 / 2;align-self:start;gap:4px;padding-inline:7px;background:var(--pw-tile)}
.pwb .pw-project-tiles .pw-project-enter:hover {background:var(--pw-hover)}
@container pw-card (min-width:455px) {
  .pwb .pw-project-list.pw-project-tiles {grid-template-columns:repeat(2,minmax(0,1fr));row-gap:12px}
  .pwb .pw-project-tiles .pw-project-row {grid-template-rows:max-content max-content;grid-row:auto;margin-block-end:0}
}
@container pw-card (min-width:700px) {
  .pwb .pw-project-list.pw-project-tiles {grid-template-columns:repeat(3,minmax(0,1fr))}
}

.pwb .pw-grid-canvas[data-fit-content=true] .pw-projects[data-auto-height=true] :is(.pw-card-content,.pw-card-body) {flex:0 0 auto;min-height:0;height:auto;align-content:start}
.pwb .pw-grid-canvas[data-fit-content=true] {--pw-overview-gap:20px!important;column-gap:20px;row-gap:20px}
.pwb .pw-grid-canvas[data-fit-content=true] > .pw-overview-column {row-gap:20px}
@container pw-root (max-width:560px) {
 .pwb .pw-grid-canvas[data-fit-content=true] {--pw-overview-gap:16px!important;column-gap:16px;row-gap:16px}
}

/* Shared card rhythm: one source for spacing and heading size in every state. */
.pwb {--pw-card-padding:24px;--pw-card-title-size:18px;--pw-card-title-leading:24px;--pw-card-content-gap:12px;--pw-card-bottom:16px}
.pwb .pw-grid-canvas .pw-card,
.pwb .pw-grid-canvas .pw-card .pw-card-content {--pw-card-inset:var(--pw-card-padding)}
.pwb .pw-grid-canvas .pw-card .pw-card-content > .pw-card-head {
  flex:0 0 auto;min-height:44px;padding:16px var(--pw-card-inset) var(--pw-card-content-gap);gap:8px;align-items:center;flex-wrap:wrap
}
.pwb .pw-grid-canvas .pw-card .pw-card-head .pw-card-title h2,
.pwb .pw-grid-canvas .pw-plan .pw-card-head > h2 {
  margin:0;font:600 var(--pw-card-title-size)/var(--pw-card-title-leading) var(--pw-body);letter-spacing:normal
}
.pwb .pw-grid-canvas .pw-card .pw-card-head .pw-card-title {min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pwb .pw-grid-canvas .pw-news .pw-card-body,
.pwb .pw-grid-canvas :is(.pw-assistants,.pw-projects) > .pw-card-content > .pw-card-body {padding:0}
.pwb .pw-grid-canvas .pw-card :is(.pw-brief-layout,.pw-assistant-feed,.pw-project-tiles) {padding:0 var(--pw-card-inset) var(--pw-card-bottom)}
.pwb .pw-grid-canvas .pw-plan .pw-card-body {padding:0 var(--pw-card-inset) var(--pw-card-bottom)}
.pwb .pw-grid-canvas .pw-card .pw-card-foot {margin-inline:var(--pw-card-inset)}
.pwb .pw-grid-canvas .pw-news .pw-brief-date {
  width:auto;max-width:100%;min-height:26px;margin:0;padding:2px 4px;border:1px solid transparent;
  background:transparent;color:var(--pw-muted);font:400 12px/18px var(--pw-body)
}
.pwb .pw-grid-canvas .pw-news .pw-brief-date:hover {background:var(--pw-hover);color:var(--pw-ink)}
.pwb .pw-grid-canvas .pw-news .pw-brief-date:focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
@container pw-root (max-width:560px) {
  .pwb .pw-grid-canvas {--pw-card-padding:12px;--pw-card-title-size:16px}
}

/* Transparent glass material: typography and spacing remain shared above. */
.pwb {
  --pw-glass:rgba(255,255,255,.26);
  --pw-inner-surface:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,0)),rgba(38,38,38,.10);
  --pw-inner-hover:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0)),rgba(38,38,38,.13);
  --pw-inner-edge:rgba(255,255,255,.32);
  --pw-inner-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -1px 0 rgba(0,0,0,.025);
  --pw-glass-blur:blur(24px) saturate(1.12);
  --pw-glass-radius:28px;
  --pw-glass-shadow:inset 0 1px 1px rgba(255,255,255,.88),inset 0 -1px 1px rgba(255,255,255,.36),0 8px 24px -12px rgba(35,56,61,.20);
  --pw-line:rgba(68,94,98,.14);
  --pw-divider:rgba(68,94,98,.10);
  --pw-muted:#4d6466;
}
.pwb .pw-grid-canvas [data-grid-id]:not(.pw-pet) {
  border:1px solid rgba(255,255,255,.66);
  border-radius:var(--pw-glass-radius);
  background:linear-gradient(135deg,rgba(255,255,255,.36),rgba(255,255,255,.10) 46%,rgba(255,255,255,.22)),var(--pw-glass);
  box-shadow:var(--pw-glass-shadow);
  -webkit-backdrop-filter:var(--pw-glass-blur);backdrop-filter:var(--pw-glass-blur);
}
.pwb .pw-grid-canvas [data-grid-id]:not(.pw-pet)::before {content:none}
.pwb .pw-grid-canvas [data-grid-id] > .pw-card-content {border-radius:inherit}
.pwb .pw-grid-canvas :is(.pw-assistant-group,.pw-assistant-group+.pw-assistant-group,.pw-project-row,.pw-project-row:first-child) {
  --pw-muted:#405658;
  border:1px solid var(--pw-inner-edge);border-radius:16px;
  background:var(--pw-inner-surface);
  box-shadow:var(--pw-inner-shadow);
}
.pwb .pw-grid-canvas .pw-project-row:is(:hover,:focus-within) {background:var(--pw-inner-hover)}
.pwb .pw-grid-canvas :is(.pw-dashboard-action,.pw-brief-date,.pw-view-switch,.pw-calendar-nav button) {border-radius:10px}
.pwb .pw-grid-canvas :is(.pw-project-icon,.pw-assistant-avatar) {border-radius:10px}
.pwb .pw-grid-canvas .pw-news-image {border-radius:10px}
.pwb .pw-grid-canvas .pw-project-enter {background:rgba(255,255,255,.36)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet{display:grid;grid-template-columns:112px minmax(0,1fr);align-items:stretch;gap:0;box-sizing:border-box;width:100%;padding:16px;border:1px solid var(--pw-line);border-radius:20px;background:var(--pw-glass,var(--pw-paper));box-shadow:var(--pw-glass-shadow);backdrop-filter:var(--pw-glass-blur)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art{align-self:stretch;align-content:center;padding:8px 12px 8px 0;box-sizing:border-box;width:112px}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview{align-self:stretch;min-inline-size:0;margin:0;padding:8px 0 8px 16px;border-left:1px solid var(--pw-line);display:flex;flex-direction:column;justify-content:center;text-align:left}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview h2{margin:0 0 8px}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview p:last-child{margin-bottom:0}
@container pw-root (max-width:520px){.pwb .pw-grid-canvas .pw-pet.pw-overview-pet{grid-template-columns:96px minmax(0,1fr);padding:12px}.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art{width:96px;padding-right:8px}.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview{padding-left:12px}}
.pwb[data-editing=true] .pw-grid-canvas [data-grid-id] {border:1px dashed #40898b}
@supports not (backdrop-filter:blur(1px)) {
  .pwb .pw-grid-canvas [data-grid-id]:not(.pw-pet) {background:rgba(245,250,249,.94)}
}
@media (prefers-reduced-transparency:reduce) {
  .pwb .pw-grid-canvas [data-grid-id]:not(.pw-pet) {background:#edf5f3;backdrop-filter:none;-webkit-backdrop-filter:none}
}


/* Compact project entry and comfortable plan navigation. */
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter {width:32px;min-width:32px;height:32px;padding:0;gap:0}
.pwb .pw-grid-canvas .pw-plan .pw-card-content > .pw-card-head {display:grid;grid-template-columns:auto minmax(0,1fr) auto;column-gap:8px}
.pwb .pw-grid-canvas .pw-plan .pw-date-nav {justify-self:start;justify-content:flex-start;margin:0;order:0;flex-basis:auto}
.pwb .pw-grid-canvas .pw-plan .pw-segmented {justify-self:end;gap:3px;padding:3px;border-radius:12px;background:rgba(255,255,255,.24);border-color:var(--pw-line)}
.pwb .pw-grid-canvas .pw-plan .pw-segmented button {min-width:40px;min-height:36px;padding:6px 10px;font-size:13px;border-radius:9px}
.pwb .pw-grid-canvas .pw-plan .pw-date-nav button {min-width:28px;min-height:32px;border-radius:8px}
.pwb .pw-grid-canvas .pw-assistant-receipt {grid-template-columns:minmax(0,1fr)}
@container pw-card (max-width:430px) {
 .pwb .pw-grid-canvas .pw-plan .pw-card-content > .pw-card-head {grid-template-columns:minmax(0,1fr) auto}
 .pwb .pw-grid-canvas .pw-plan .pw-segmented {grid-column:2;grid-row:1}
 .pwb .pw-grid-canvas .pw-plan .pw-date-nav {grid-column:1/-1;grid-row:2}
 .pwb .pw-grid-canvas .pw-plan .pw-segmented button {min-width:44px;min-height:40px}
}


/* Both states share the same top-right slot for the disclosure button. */
.pwb .pw-news .pw-card-content > .pw-card-head {
  display:grid;grid-template-columns:minmax(0,1fr) 48px;align-items:start;
  column-gap:12px;row-gap:4px;min-height:0;padding:16px var(--pw-card-inset) 12px;
}
.pwb .pw-news .pw-card-head .pw-card-title {grid-area:1 / 1;min-height:28px}
.pwb .pw-news .pw-card-head .pw-brief-toggle {
  grid-area:1 / 2;justify-content:flex-end;min-height:28px;margin:0;padding:0;white-space:nowrap;
}
.pwb .pw-news .pw-brief-folded-headline {
  grid-column:1/-1;display:flex;align-items:center;gap:8px;min-width:0;
  font:400 13px/20px var(--pw-body);color:var(--pw-muted);
}
.pwb .pw-brief-folded-headline > span {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwb .pw-brief-folded-headline > a {flex-shrink:0}


.pwb .pw-plan .pw-card-foot .pw-plan-sync {display:inline-flex;align-items:center;gap:6px;min-height:28px;max-width:100%;color:var(--pw-muted);font:400 11px/16px var(--pw-body);text-decoration:none;white-space:normal}
.pwb .pw-plan .pw-card-foot a.pw-plan-sync {color:var(--pw-accent)}
.pwb .pw-plan .pw-card-foot a.pw-plan-sync:hover {text-decoration:underline;text-underline-offset:3px}
.pwb .pw-plan .pw-card-foot .pw-plan-sync[data-state=error] {color:var(--pw-orange)}
.pwb .pw-plan-sync .pw-sync-pulse {flex:none;width:7px;height:7px;border-radius:50%;background:currentColor;animation:pw-sync-breathe 1.4s ease-in-out infinite}
@keyframes pw-sync-breathe {0%,100%{opacity:.4;box-shadow:0 0 0 0 rgba(7,101,103,0)}50%{opacity:1;box-shadow:0 0 0 4px rgba(7,101,103,.12)}}
@media (prefers-reduced-motion:reduce) {.pwb .pw-plan-sync .pw-sync-pulse {animation:none}}

/* Shared quiet controls and whole-cell calendar selection. */
.pwb .pw-head :is(.pw-attention summary,.pw-layout-button,.pw-layout-button.is-primary,.pw-refresh) {
  min-height:36px;border:1px solid var(--pw-line);border-radius:10px;
  background:linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.18));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65);color:var(--pw-ink);
  font:500 12px/18px var(--pw-body);letter-spacing:normal;text-transform:none;
}
.pwb .pw-head :is(.pw-attention summary,.pw-layout-button,.pw-layout-button.is-primary,.pw-refresh):hover {
  background:rgba(255,255,255,.52);border-color:color-mix(in srgb,var(--pw-accent) 28%,transparent);color:var(--pw-ink);
}
.pwb[data-editing=true] .pw-head .pw-layout-button.is-primary {background:var(--pw-accent);color:#fff;border-color:transparent}
.pwb .pw-head :is(.pw-layout-button,.pw-refresh):focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px;border-radius:10px}
.pwb .pw-head .pw-attention summary > svg {color:var(--pw-muted)}
.pwb .pw-brief-copy .pw-brief-read,.pwb .pw-brief-folded-headline .pw-card-link {
  display:inline-flex;align-items:center;gap:4px;min-height:28px;padding:2px 0;
  border:0;background:transparent;box-shadow:none;color:var(--pw-muted);font:400 12px/18px var(--pw-body);text-decoration:none;
}
.pwb .pw-brief-copy .pw-brief-read:hover,.pwb .pw-brief-folded-headline .pw-card-link:hover {
  color:var(--pw-accent);background:transparent;text-decoration:underline;text-underline-offset:3px;
}
.pwb .pw-plan .pw-calendar-grid button > span {background:transparent;color:inherit;border-radius:0}
.pwb .pw-plan .pw-calendar-grid button > .pw-calendar-task-list {padding:0;text-align:left}
.pwb .pw-plan .pw-calendar-grid button.is-today > .pw-calendar-number,
.pwb .pw-plan .pw-calendar-grid button[aria-pressed=true] > .pw-calendar-number {
  background:transparent;color:var(--pw-ink);border-radius:0;
}
.pwb .pw-plan .pw-calendar-grid button.is-today > .pw-calendar-number {color:var(--pw-accent);font-weight:700}
.pwb .pw-plan .pw-calendar-grid button.is-today > .pw-calendar-number::after {
  content:'';display:inline-block;width:4px;height:4px;margin-left:3px;vertical-align:middle;border-radius:50%;background:var(--pw-accent);
}
.pwb .pw-plan .pw-calendar-grid[data-mode] button[aria-pressed=true] {
  background:color-mix(in srgb,var(--pw-accent) 9%,transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pw-accent) 28%,transparent);color:var(--pw-ink);
}
.pwb .pw-plan .pw-calendar-grid[data-mode] button:hover:not([aria-pressed=true]) {background:rgba(255,255,255,.36)}

/* Simple checkbox, visible sync status and actionable plan links. */
.pwb .pw-plan .pw-plan-check {width:16px;height:16px;min-width:16px;min-height:16px;padding:0;border:1px solid #819b9c;border-radius:3px;background:transparent;box-shadow:none}
.pwb .pw-plan .is-done .pw-plan-check {border-color:var(--pw-accent);background:var(--pw-accent);color:#fff}
.pwb .pw-plan .pw-plan-check svg {width:12px;height:12px;flex:none}
.pwb .pw-plan .pw-plan-check:focus-visible {outline:2px solid var(--pw-accent);outline-offset:3px}
.pwb .pw-plan .pw-plan-sync-row {border:0;border-top:1px solid var(--pw-divider);padding:8px 0;min-height:28px;flex:none;justify-content:flex-start}
.pwb .pw-plan-inline-link {display:inline;white-space:normal}
.pwb .pw-plan-inline-link a {display:inline-flex;align-items:baseline;gap:3px;color:var(--pw-accent);text-decoration:underline;text-underline-offset:3px;font:inherit}
.pwb .pw-plan-inline-link button {padding:2px 5px;margin-left:4px;border:0;border-radius:5px;color:var(--pw-muted);background:transparent;font:400 11px/18px var(--pw-body)}
.pwb .pw-plan-inline-link button:hover {background:var(--pw-hover);color:var(--pw-accent)}
.pwb .pw-plan-inline-link :is(a,button):focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
.pwb .pw-link-copy-status {font:400 11px/18px var(--pw-body);color:var(--pw-muted)}

.pwb .pw-credit {position:static;display:flex;align-items:center;justify-content:center;gap:0;flex:none;margin:0;padding:24px 12px 20px;text-align:center;color:var(--pw-muted);opacity:.52;font:400 10px/16px var(--pw-body);letter-spacing:.04em;white-space:nowrap}
.pwb .pw-credit::before,.pwb .pw-credit::after {content:'';flex:none;width:20px;height:1px;background:currentColor;opacity:.22;margin-inline:12px}
.pwb .pw-credit-name {font-weight:500;margin-inline-start:3px}
.pwb .pw-credit-separator {margin-inline:5px}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] {border:0;gap:0}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[data-period] {border:0;box-shadow:none}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[data-period]+button[data-period] {border-left:1px solid rgba(68,94,98,.08)}
.pwb .pw-plan .pw-calendar-grid[data-mode=week] button[aria-pressed=true] {background:color-mix(in srgb,var(--pw-accent) 7%,transparent);box-shadow:none}


/* One size for agent identities and project icons, independent of action icons. */
.pwb {--pw-entity-icon-size:32px}
.pwb .pw-assistant-feed .pw-assistant-avatar,
.pwb .pw-project-tiles .pw-project-heading .pw-project-icon {
  display:grid;place-items:center;flex:none;width:var(--pw-entity-icon-size);height:var(--pw-entity-icon-size);
  min-width:var(--pw-entity-icon-size);max-width:var(--pw-entity-icon-size);margin:0;padding:0;
  box-sizing:border-box;border:1px solid rgba(255,255,255,.65);border-radius:8px;background:rgba(255,255,255,.5);object-fit:contain;
}
.pwb .pw-assistant-feed .pw-assistant-avatar > img {display:block;width:100%;height:100%;object-fit:contain;border-radius:8px}
.pwb .pw-assistant-feed .pw-assistant-avatar > svg,
.pwb .pw-project-tiles .pw-project-icon.is-placeholder > svg {width:26px;height:26px}
.pwb .pw-project-tiles .pw-project-heading {grid-template-columns:var(--pw-entity-icon-size) minmax(0,1fr);column-gap:8px}
.pwb .pw-project-tiles .pw-project-heading .pw-project-icon.is-workbench {border-radius:8px}

.pwb .pw-project-tiles .pw-project-field {display:grid;grid-template-columns:minmax(0,1fr);gap:3px;padding:7px 0}
.pwb .pw-project-tiles .pw-project-field-label {font:400 11px/16px var(--pw-body);color:var(--pw-muted)}
.pwb .pw-project-tiles .pw-project-field-value {font:400 13px/20px var(--pw-body);color:var(--pw-ink);min-width:0}

/* Scheduled items use the same plain checklist row as every other task. */
.pwb .pw-plan .pw-plan-row.has-time {margin-block:0;padding:4px 0;border:0;border-radius:0;background:transparent;box-shadow:none}

/* The pet's backdrop is a true circle, with no separate floor highlight. */
.pwb .pw-pet .hbc-nest {width:var(--hbc-dock-size);height:var(--hbc-dock-size);aspect-ratio:1;box-sizing:border-box}
.pwb .pw-pet .hbc-home .hbc-launcher,
.pwb .pw-pet .hbc-nest,
.pwb .pw-pet .hbc-nest > .hbc-home-empty {
  background:none;border:0;box-shadow:none
}
.pwb .pw-pet .hbc-nest::before {
  inset:4%;box-sizing:border-box;border-radius:50%;corner-shape:round;border:1px solid #99753526;
  clip-path:none;box-shadow:none;transition:border-color .18s ease,opacity .18s ease
}
.pwb .pw-pet .hbc-home-ready .hbc-nest::before {border-color:#99753555}
.pwb .pw-pet .hbc-home-ready .hbc-name {visibility:hidden}
@media (prefers-reduced-motion:reduce) {
  .pwb .pw-pet .hbc-nest::before {transition:none}
}
.pwb .pw-pet .hbc-nest::after {content:none;display:none}

/* Wide overview cards align to the expanded brief. Folding keeps the pet's last height. */
.pwb .pw-grid-canvas[data-match-overview-height] .pw-news[data-folded=false] {min-height:280px}
.pwb .pw-grid-canvas[data-match-overview-height] .pw-pet.pw-overview-pet {min-height:var(--pw-expanded-overview-height,280px)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet {display:grid;grid-template-columns:128px minmax(0,1fr);gap:12px;align-items:center;padding:16px;box-sizing:border-box}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art {width:128px;padding:0;align-self:center;align-content:center;row-gap:5px}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview {align-self:stretch;display:flex;flex-direction:column;justify-content:center;min-width:0;min-inline-size:0;margin:0;padding:12px;border:1px solid var(--pw-inner-edge);border-radius:12px;background:var(--pw-inner-surface);box-shadow:var(--pw-inner-shadow)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions {display:flex;width:100%;gap:8px;flex-wrap:nowrap;margin:4px 0 0;justify-content:center}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions button {display:inline-flex;align-items:center;justify-content:center;flex:1;min-width:52px;min-height:40px;padding:6px 8px;border:1px solid var(--pw-line);border-radius:10px;background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.2));color:var(--pw-ink);font:500 12px/18px var(--pw-body);white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions button:hover {background:rgba(255,255,255,.6);border-color:color-mix(in srgb,var(--pw-accent) 28%,transparent)}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions button:focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
@container pw-root (max-width:520px) {
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet {--pw-overview-pet-size:112px;grid-template-columns:112px minmax(0,1fr);gap:8px;padding:12px}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art {width:112px;padding:0}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview {padding:10px}
}
/* Intrinsic aspect ratio gives narrow images' unused space back to the headline. */
.pwb .pw-brief-layout {--pw-brief-image-height:clamp(144px,28cqw,200px)}
.pwb .pw-brief-media {flex:0 1 auto;width:calc(var(--pw-brief-image-height) * var(--pw-brief-image-ratio,1));max-width:52%;height:var(--pw-brief-image-height);min-height:0;align-self:center}
.pwb .pw-assistant-feed .pw-assistant-receipt {display:grid;grid-template-columns:auto minmax(0,1fr);align-items:baseline;column-gap:6px;min-width:0}
.pwb .pw-assistant-feed .pw-assistant-receipt:not(:has(small)) {grid-template-columns:minmax(0,1fr)}
.pwb .pw-assistant-feed .pw-assistant-receipt small {grid-column:auto;font:400 11px/16px var(--pw-body);color:var(--pw-muted);white-space:nowrap}
.pwb .pw-assistant-feed .pw-assistant-receipt a {display:flex;align-items:baseline;gap:4px;min-width:0;max-width:100%}
.pwb .pw-assistant-feed .pw-assistant-result-name {display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pwb .pw-assistant-feed .pw-assistant-receipt a > svg {flex:none}

/* Quiet reading affordances: steady text, a small directional arrow motion. */
.pwb .pw-brief-copy .pw-brief-read {margin-top:auto;padding-top:4px}
.pwb .pw-brief-layout :is(.pw-brief-read,.pw-news-quick li > a) > svg {transition:transform 180ms cubic-bezier(.2,.7,.2,1)}
.pwb .pw-brief-layout :is(.pw-brief-read,.pw-news-quick li > a):is(:hover,:focus-visible) > svg {transform:translate(2px,-2px)}
@media (prefers-reduced-motion:reduce) {
 .pwb .pw-brief-layout :is(.pw-brief-read,.pw-news-quick li > a) > svg {transition:none!important;transform:none!important}
}

/* Group related tasks through proximity, rather than extra colors or callout boxes. */
.pwb .pw-plan .pw-plan-group + .pw-plan-group,
.pwb .pw-plan[data-density=compact] .pw-plan-group + .pw-plan-group {margin-top:24px}
.pwb .pw-plan .pw-group-title {margin:0 0 4px;color:var(--pw-muted);font:400 12px/18px var(--pw-body);letter-spacing:normal;text-transform:none}
.pwb .pw-plan-group > .pw-plan-section-label:not(:first-child) {margin-top:24px}
.pwb .pw-plan :is(.pw-plan-time,.pw-plan-meta) {margin:4px 0 0;color:var(--pw-muted);font:400 12px/18px var(--pw-body);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.pwb .pw-plan :is(.pw-plan-note,.pw-plan-note.quote,.pw-plan-note.callout) {margin:4px 0;padding:0;border:0;border-radius:0;background:transparent;color:var(--pw-muted)}

/* Owned overlays share the glass material, with a denser surface for legibility. */
.pwb {--pw-overlay-surface:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.16)),rgba(255,255,255,.68);--pw-overlay-shadow:var(--pw-glass-shadow),0 16px 40px -12px rgba(35,56,61,.22)}
.pwb .pw-head .pw-attention .pw-attention-popover,
.pwb .pw-project-dialog {
 color:var(--pw-ink);background:var(--pw-overlay-surface);border:1px solid rgba(255,255,255,.80);border-radius:16px;
 box-shadow:var(--pw-overlay-shadow);-webkit-backdrop-filter:var(--pw-glass-blur);backdrop-filter:var(--pw-glass-blur);color-scheme:light;
}
.pwb .pw-head .pw-attention .pw-attention-popover {padding:4px 20px}
.pwb .pw-attention-item {padding:12px 0}
.pwb .pw-attention-item strong {font:600 14px/20px var(--pw-body)}
.pwb .pw-attention-item p {margin-top:4px;font:400 12px/18px var(--pw-body);color:var(--pw-muted)}
.pwb .pw-attention-item .pw-quiet-link {font:400 12px/18px var(--pw-body)}
.pwb .pw-attention-tag {font:400 12px/16px var(--pw-body);color:#914734;background:#fae8e1}
.pwb .pw-modal-backdrop {background:rgba(22,48,49,.16);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);padding:20px;z-index:30}
.pwb .pw-project-dialog {padding:24px;font:400 14px/20px var(--pw-body)}
.pwb .pw-project-dialog h2 {font:600 18px/24px var(--pw-body);margin:0;overflow-wrap:anywhere}
.pwb .pw-project-dialog :is(label,summary) {font:400 12px/18px var(--pw-body);color:var(--pw-muted)}
.pwb .pw-project-dialog label {margin-top:16px}
.pwb .pw-project-dialog :is(input,select,textarea) {border-radius:10px;border:1px solid var(--pw-line);background:rgba(255,255,255,.42);padding:8px 12px;color:var(--pw-ink);font:400 14px/20px var(--pw-body)}
.pwb .pw-project-dialog :is(input,select,textarea,button):focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
.pwb .pw-project-dialog .pw-layout-button {
 min-height:36px;padding:8px 12px;border:1px solid var(--pw-line);border-radius:10px;
 background:rgba(255,255,255,.36);color:var(--pw-ink);font:500 12px/18px var(--pw-body);
}
.pwb .pw-project-dialog .pw-layout-button:hover:not(:disabled) {background:rgba(255,255,255,.64)}
.pwb .pw-project-dialog .pw-layout-button.is-primary {background:var(--pw-accent);color:#fff;border-color:transparent}
.pwb .pw-project-dialog .pw-layout-button.is-primary:hover:not(:disabled) {background:#084c4e}
.pwb .pw-project-detail header button,.pwb .pw-project-dialog .pw-requirement-controls button {min-width:32px;min-height:32px;border-radius:10px;background:rgba(255,255,255,.36);border:1px solid var(--pw-line)}
.pwb .pw-project-dialog footer {gap:8px;margin-top:20px}
.pwb .pw-project-detail .pw-requirement-row {font:400 14px/20px var(--pw-body);padding-block:12px}
.pwb .pw-project-dialog :disabled {opacity:.5;cursor:default}
.pwb .pw-brief-date {color-scheme:light}
.pwb .pw-brief-date option {background:#f4f8f7;color:var(--pw-ink)}
@container pw-root (max-width:560px) {
 .pwb .pw-head .pw-attention .pw-attention-popover {padding-inline:16px}
 .pwb .pw-modal-backdrop {padding:12px}
 .pwb .pw-project-dialog {padding:20px}
 .pwb .pw-project-dialog h2 {font-size:16px}
 .pwb .pw-attention-item-top {grid-template-columns:minmax(0,1fr);gap:4px}
 .pwb .pw-attention-tag {justify-self:start}
}
@supports not (backdrop-filter:blur(1px)) {
 .pwb .pw-head .pw-attention .pw-attention-popover,.pwb .pw-project-dialog {background:#f4f8f7}
}
@media (prefers-reduced-transparency:reduce) {
 .pwb .pw-head .pw-attention .pw-attention-popover,.pwb .pw-project-dialog {background:#f4f8f7;backdrop-filter:none;-webkit-backdrop-filter:none}
}

/* Editing instructions belong beside the controls they describe. */
.pwb .pw-head .pw-layout-edit-controls {display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:0;max-width:100%}
.pwb .pw-head .pw-layout-edit-controls .pw-layout-help {margin:0;max-width:320px;color:#40595b;font:400 12px/18px var(--pw-body);text-align:right}
.pwb .pw-head .pw-layout-edit-buttons {display:flex;align-items:center;gap:8px;flex:none}
@container pw-root (max-width:900px) {
 .pwb .pw-head .pw-layout-edit-controls {flex-direction:column-reverse;align-items:flex-end;gap:6px}
 .pwb .pw-head .pw-layout-edit-controls .pw-layout-help {max-width:250px}
}
@container pw-root (max-width:560px) {
 .pwb[data-editing=true] .pw-head {grid-template-areas:"plugin plugin" "title title" "tools tools";grid-template-rows:auto auto auto}
 .pwb[data-editing=true] .pw-head .pw-head-actions {justify-self:start;justify-content:flex-start}
 .pwb .pw-head .pw-layout-edit-controls {align-items:flex-start}
 .pwb .pw-head .pw-layout-edit-controls .pw-layout-help {text-align:left}
}

/* Shared action sizes: 40 px high; S/M/L reserve 60/96/144 px widths. */
.pwb {--pw-control-height:40px;--pw-button-s:60px;--pw-button-m:96px;--pw-button-l:144px;--pw-control-radius:10px}
.pwb :is(.pw-layout-button,.pw-dashboard-action),.pwb .pw-head :is(.pw-layout-button,.pw-refresh,.pw-attention > summary),.pwb .pw-assistant-feed .pw-assistant-open {
 box-sizing:border-box;min-height:var(--pw-control-height);border-radius:var(--pw-control-radius);font:500 12px/18px var(--pw-body);
 display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;white-space:nowrap;
}
.pwb .pw-layout-button {min-width:var(--pw-button-m)}
.pwb .pw-head :is(.pw-layout-button,.pw-refresh) {width:var(--pw-button-m);min-width:var(--pw-button-m);height:var(--pw-control-height);flex:none}
.pwb .pw-head .pw-attention > summary {width:var(--pw-button-l);height:var(--pw-control-height)}
.pwb .pw-head .pw-layout-edit-buttons .pw-layout-button {width:var(--pw-button-m);min-width:var(--pw-button-m);height:var(--pw-control-height);padding:8px 12px}
.pwb .pw-assistant-feed .pw-assistant-open {width:var(--pw-button-s);min-width:var(--pw-button-s);padding:8px;flex:none}
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter,.pwb .pw-news .pw-card-head .pw-brief-toggle {
 width:var(--pw-control-height);min-width:var(--pw-control-height);height:var(--pw-control-height);min-height:var(--pw-control-height);padding:0;gap:0;flex:none;box-sizing:border-box;
 display:inline-flex;align-items:center;justify-content:center;border-radius:var(--pw-control-radius);
}
.pwb .pw-news .pw-card-head .pw-brief-toggle {color:var(--pw-muted);background:transparent;margin-block:-6px}
.pwb .pw-news .pw-card-head .pw-brief-toggle:hover {color:var(--pw-ink);background:var(--pw-hover)}
/* Names stay on one line; the native tooltip contains the unabridged name. */
.pwb .pw-project-tiles .pw-project-heading,.pwb .pw-project-tiles .pw-project-heading > div {min-width:0}
.pwb .pw-project-tiles .pw-project-heading h3 {display:block;min-width:0;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;overflow-wrap:normal}
/* Time belongs to the title above it, with more space before the next task. */
.pwb .pw-plan :is(.pw-plan-time,.pw-plan-meta) {margin-top:2px}
.pwb .pw-plan .pw-plan-row,.pwb .pw-plan[data-density=compact] .pw-plan-row,.pwb .pw-plan .pw-plan-row.has-time {padding-block:6px}
/* The companion is a first-class grid card; only its handle moves the card. */
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet {display:block;padding:0;inset:auto;overflow:hidden;container-type:inline-size}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-content {
 display:grid;grid-template-columns:128px minmax(0,1fr);align-items:center;gap:12px;min-width:0;min-height:0;height:100%;padding:16px;box-sizing:border-box;
}
.pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions button {
 flex:none;width:var(--pw-button-s);min-width:var(--pw-button-s);height:var(--pw-control-height);min-height:var(--pw-control-height);padding:8px;box-sizing:border-box;
}
.pwb[data-editing=true] .pw-grid-canvas .pw-pet.pw-overview-pet {padding-top:28px}
.pwb[data-editing=true] .pw-pet-content {pointer-events:none}
.pwb [data-fit-content=false] .pw-pet-content {overflow:auto}
.pwb .pw-grid-canvas[data-fit-content=true] .pw-pet.pw-overview-pet .pw-pet-content {height:auto}
.pwb .pw-grid-canvas[data-match-overview-height] .pw-pet.pw-overview-pet .pw-pet-content {min-height:calc(var(--pw-expanded-overview-height,280px) - 2px)}
@container pw-root (max-width:520px) {
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-content {grid-template-columns:128px minmax(0,1fr);gap:8px;padding:12px}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art {width:128px}
}

.pwb .pw-public-cat{display:flex;flex-direction:column;align-items:center;gap:5px;width:128px;color:var(--pw-ink)}
.pwb .pw-public-cat-art{display:block;width:120px;height:120px;aspect-ratio:1;flex:none;padding:4px;border:1px solid #d3b55a55;border-radius:50%;corner-shape:round;background:linear-gradient(135deg,#fff1bc,#f7da89);cursor:pointer;overflow:hidden;box-sizing:border-box}
.pwb .pw-public-cat-art svg{width:100%;height:100%;display:block}
.pwb .pw-public-cat strong{font:600 14px/20px var(--pw-body)}
.pwb .pw-public-cat-status{font:400 12px/18px var(--pw-body);color:var(--pw-muted)}
.pwb .pw-project-captured-notes{border-top:1px solid var(--pw-line);margin-top:8px;padding-top:8px;font:400 12px/18px var(--pw-body)}
.pwb .pw-project-captured-notes p{margin:4px 0 0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.pwb .pw-plan .pw-task-form{display:flex;gap:8px;padding:12px var(--pw-card-inset) 16px;border-top:1px solid var(--pw-line)}
.pwb .pw-task-form input{min-width:0;flex:1;padding:8px;border:1px solid var(--pw-line);border-radius:10px;background:var(--pw-paper);font:400 13px/20px var(--pw-body);color:var(--pw-ink)}
.pwb .pw-task-form button{width:60px;height:40px;flex:none;border:1px solid var(--pw-line);border-radius:10px;background:var(--pw-paper);color:var(--pw-ink)}
.pwb .pw-overview-secondary{font:400 12px/18px var(--pw-body);color:var(--pw-muted)}

/* A saved three-column pet stays narrow; content reflows without changing the grid. */
@container pw-card (max-width:330px) {
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-content {grid-template-columns:minmax(0,1fr);align-content:center;gap:12px;padding:12px}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-pet-art {width:100%}
 .pwb .pw-public-cat {display:grid;grid-template-columns:72px minmax(0,1fr);grid-template-rows:auto auto auto;gap:4px 8px;align-items:center;justify-items:center;width:100%}
 .pwb .pw-public-cat-art {grid-column:1;grid-row:1 / span 2;width:72px;height:72px}
 .pwb .pw-public-cat strong {grid-column:1;grid-row:3}
 .pwb .pw-public-cat-status {grid-column:2;grid-row:1;align-self:end}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .hbc-dock-actions {grid-column:2;grid-row:2;align-self:start;margin:0}
 .pwb .pw-grid-canvas .pw-pet.pw-overview-pet .pw-today-overview {padding:10px;align-self:stretch}
}

/* Project navigation stays quiet until hovered, with a full-size hit target. */
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter {
 background:transparent;border-color:transparent;box-shadow:none;color:var(--pw-muted);
 transition:background 180ms ease,color 180ms ease;
}
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter svg {width:16px;height:16px;transition:transform 180ms ease}
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter:is(:hover,:focus-visible) {background:rgba(255,255,255,.22);color:var(--pw-accent)}
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter:is(:hover,:focus-visible) svg {transform:translate(2px,-2px)}
.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter:focus-visible {outline:2px solid var(--pw-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce) {
 .pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter,.pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter svg {transition:none}
 .pwb .pw-grid-canvas .pw-project-tiles .pw-project-enter:is(:hover,:focus-visible) svg {transform:none}
}

/* Content grows by default. Only an explicit vertical resize opts into scrolling. */
.pwb .pw-grid-canvas [data-auto-height=true] {contain:layout style;container-type:inline-size;height:auto;max-height:none}
.pwb .pw-grid-canvas [data-auto-height=true] :is(.pw-card-content,.pw-card-body,.pw-plan-view,.pw-pet-content) {flex:0 0 auto;height:auto;max-height:none;overflow:visible}
.pwb .pw-grid-canvas [data-auto-height=true] .pw-card-body {scrollbar-gutter:auto}
.pwb .pw-grid-canvas [data-fixed-height=true] > :is(.pw-card-content,.pw-pet-content) {height:100%;min-height:0;overflow:auto}
.pwb .pw-grid-canvas [data-fixed-height=true] .pw-card-body {flex:0 0 auto;overflow:visible}

`;
    function bindWorkbenchWheel(board) {
      const shell = board.closest('.pwb');
      const lastPosition = new WeakMap();

      function scrollable(element) {
        return element.scrollHeight > element.clientHeight
          && /^(auto|scroll)$/.test(window.getComputedStyle(element).overflowY);
      }

      function scrollBy(element, delta) {
        const maximum = element.scrollHeight - element.clientHeight;
        const current = Math.max(0, Math.min(maximum, element.scrollTop));
        const previous = lastPosition.get(element);
        const start = previous?.rendered === current && previous.maximum === maximum ? previous.exact : current;
        const requested = start + delta;
        const next = Math.max(0, Math.min(maximum, requested));
        element.scrollTop = next;
        // Keep subpixel trackpad movement when the engine rounds scrollTop.
        lastPosition.set(element, { rendered: element.scrollTop, exact: next, maximum });
        return requested - next;
      }

      function onWheel(event) {
        if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const mode = event.deltaMode;
        if (!event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        const target = event.target;
        if (!(target instanceof Element) || !target.closest('[data-grid-id]')
          || target.closest('select, input[type="number"]')) return;

        const chain = [];
        for (let element = target; element && element !== board; element = element.parentElement) {
          if (scrollable(element)) chain.push(element);
        }
        if (scrollable(board)) chain.push(board);
        if (shell && scrollable(shell)) chain.push(shell);
        if (!chain.length) return;

        const unit = mode === 1 ? 16 : mode === 2 ? chain[0].clientHeight : 1;
        let remaining = event.deltaY * unit;
        // Native wheel handling can consume a whole input at the inner edge.
        // Carry the unused distance to the next scroller in the same event.
        event.preventDefault();
        for (const element of chain) {
          remaining = scrollBy(element, remaining);
          if (!remaining) break;
        }
      }

      board.addEventListener('wheel', onWheel, { passive: false });
      return () => board.removeEventListener('wheel', onWheel);
    }
    const gridStorageKey='dsh-personal-workbench:layout:v2';
    function gridReadPreferences() {
      try {const raw=localStorage.getItem(gridStorageKey);if(!raw||raw.length>12000)return {};const value=JSON.parse(raw);return value?.version===2&&value.profiles&&typeof value.profiles==='object'?value.profiles:{};}catch{return {};}
    }
    function useWorkbenchGrid(collapsed=false) {
      const viewport=React.useRef(null),gesture=React.useRef(null),current=React.useRef(null);
      const editOrigin=React.useRef(null);
      const [saved,setSaved]=React.useState(gridReadPreferences),[draft,setDraft]=React.useState({}),[editing,setEditing]=React.useState(false),[active,setActive]=React.useState(null),[notice,setNotice]=React.useState('');
      const [size,setSize]=React.useState({width:0,height:0});
      const [contentSizes,setContentSizes]=React.useState({});
      const profile={...gridProfile(size.width),collapsed:collapsed&&!editing},gap=profile.key==='narrow'?8:16,row=Math.max(34,(size.height-gap*11)/12),column=(size.width+gap)/profile.cols;
      const layout=gridNormalize((editing?draft:saved)[profile.key],profile);
      const origin=editing&&editOrigin.current?.profile===profile.key?editOrigin.current:null;
      const untouched=origin&&JSON.stringify(draft[profile.key])===JSON.stringify(origin.layout);
      const fitContent = !editing && canFitOverviewContent(layout, profile);
      const narrow = profile.key === 'narrow';
      const [plan,news,activity] = layout;
      const aligned = fitContent && !narrow
        && activity.x === 0 && activity.w === plan.x && plan.x + plan.w === profile.cols;
      const petPlacement = aligned ? 'aligned' : fitContent ? 'stacked' : 'custom';
      const stacked = petPlacement === 'stacked';
      const newsRow = stacked ? 2 : 1, planRow = stacked ? 3 : 2;
      const foldedExtra = profile.collapsed && !fitContent ? Math.max(0,94-row) : 0;
      const measuredHeights={};
      for(const item of layout){const measured=contentSizes[item.id];if(measured&&Math.abs(measured.width-(item.w*column-gap))<1)measuredHeights[item.id]=measured.height;}
      const contentRects=gridContentRects(layout,{column,row,gap,foldedExtra},measuredHeights);
      current.current={profile,gap,row,column,layout,editing};
      React.useLayoutEffect(()=>{
        if(editing||fitContent)return;
        const cards=viewport.current?.querySelectorAll?.('[data-grid-id]');if(!cards?.length)return;
        const measure=()=>{const next={};for(const node of cards){const rect=node.getBoundingClientRect();next[node.dataset.gridId]={width:rect.width,height:rect.height};}
          setContentSizes(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);};
        const observer=new ResizeObserver(measure);for(const card of cards)observer.observe(card);measure();
        return()=>observer.disconnect();
      },[editing,fitContent,size.width,profile.collapsed]);
      function stopGesture(cancel=false) {
        const previous=gesture.current;if(!previous)return;
        gesture.current=null;
        if(cancel)setDraft(value=>({...value,[previous.profile.key]:previous.layout}));
        if(previous.target.hasPointerCapture?.(previous.pointerId))previous.target.releasePointerCapture(previous.pointerId);
        setActive(null);
      }
      React.useLayoutEffect(()=>{
        const element=viewport.current;if(!element)return;
        const measure=()=>{const next={width:element.clientWidth,height:element.clientHeight};setSize(previous=>previous.width===next.width&&previous.height===next.height?previous:next);};
        const observer=new ResizeObserver(()=>{stopGesture(true);measure();});observer.observe(element);measure();
        return()=>{observer.disconnect();const previous=gesture.current;gesture.current=null;if(previous?.target.hasPointerCapture?.(previous.pointerId))previous.target.releasePointerCapture(previous.pointerId);};
      },[]);
      React.useEffect(()=>{
        const onKey=event=>{if(event.key==='Escape'&&gesture.current){event.preventDefault();event.stopPropagation();stopGesture(true);}};
        const onBlur=()=>stopGesture(true);
        window.addEventListener('keydown',onKey,true);window.addEventListener('blur',onBlur);
        return()=>{window.removeEventListener('keydown',onKey,true);window.removeEventListener('blur',onBlur);};
      },[]);
      React.useEffect(()=>{
        const sync=event=>{if(event.key===gridStorageKey&&!current.current.editing)setSaved(gridReadPreferences());};
        window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
      },[]);
      function begin(event,id,mode) {
        if(!editing||event.button!==0||gesture.current)return;
        event.preventDefault();event.stopPropagation();event.currentTarget.focus();
        const state=current.current,item=state.layout.find(item=>item.id===id);
        gesture.current={...state,id,mode,item,startX:event.clientX,startY:event.clientY,scrollTop:viewport.current.scrollTop,pointerId:event.pointerId,target:event.currentTarget};
        event.currentTarget.setPointerCapture(event.pointerId);setActive(id);setNotice('');
      }
      function move(event,autoScroll=true) {
        const start=gesture.current;if(!start||event.pointerId!==start.pointerId)return;
        event.preventDefault();
        const view=viewport.current,rect=view.getBoundingClientRect();
        const moved=Math.abs(event.clientX-start.startX)+Math.abs(event.clientY-start.startY)>4;
        if(autoScroll&&moved&&event.clientY>rect.bottom-32)view.scrollTop+=18;
        else if(autoScroll&&moved&&event.clientY<rect.top+32)view.scrollTop-=18;
        const dx=Math.round((event.clientX-start.startX)/start.column),dy=Math.round((event.clientY-start.startY+view.scrollTop-start.scrollTop)/(start.row+start.gap));
        const patch=start.mode==='resize'?{w:start.item.w+dx,h:start.item.h+dy,...(dy?{fixedHeight:true}:{})}:{x:start.item.x+dx,y:start.item.y+dy};
        const next=gridArrange(start.layout,start.id,patch,start.profile);
        setDraft(value=>({...value,[start.profile.key]:next}));
      }
      function key(event,id,mode) {
        if(!editing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        const state=current.current,item=state.layout.find(item=>item.id===id),dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
        const patch=mode==='resize'?{w:item.w+dx,h:item.h+dy,...(dy?{fixedHeight:true}:{})}:{x:item.x+dx,y:item.y+dy};
        setDraft(value=>({...value,[state.profile.key]:gridArrange(state.layout,id,patch,state.profile)}));
        setNotice('布局已调整，点击“完成”保存');
      }
      function handles(id,label) {
        if(!editing)return null;
        const props=mode=>({type:'button',onPointerDown:event=>begin(event,id,mode),onPointerMove:move,onPointerUp:event=>{if(gesture.current?.pointerId===event.pointerId){move(event,false);stopGesture();}},onPointerCancel:()=>stopGesture(true),onLostPointerCapture:()=>stopGesture(true),onKeyDown:event=>key(event,id,mode),'aria-describedby':'pw-layout-help'});
        return h(React.Fragment,null,
          h('button',{...props('move'),className:'pw-grid-move','aria-label':'移动'+label,title:'拖动调整位置；方向键逐格移动'},h('span',null,'⠿'),h('span',null,label)),
          h('button',{...props('resize'),className:'pw-grid-resize','aria-label':'调整'+label+'大小',title:'拖动调整大小；方向键逐格缩放'},h('svg',{width:18,height:18,viewBox:'0 0 20 20',fill:'none','aria-hidden':true},h('path',{d:'M5 15h6a4 4 0 0 0 4-4V5',stroke:'currentColor',strokeWidth:2.5,strokeLinecap:'round'}))));
      }
      function card(id) {
        const item=layout.find(item=>item.id===id);
        if(untouched&&origin.rects[id])return {'data-grid-id':id,style:{...origin.rects[id],position:'absolute'}};
        const height = item.h * (row + gap) - gap;
        const contentRows = narrow ? {pet:1,news:newsRow, plan:planRow, activity:planRow+1, projects:planRow+2}
          : {pet:1,news:newsRow, activity:planRow, projects:planRow+1, plan:`${planRow} / span 2`};
        const naturalProjects = id === 'projects' && item.h === gridDefaults(profile).find(card => card.id === 'projects').h;
        const style = fitContent ? {
          gridColumn: aligned ? undefined : `${item.x + 1} / span ${item.w}`,
          gridRow: aligned ? undefined : contentRows[id],
          minHeight: id === 'projects' && !naturalProjects ? height : undefined
        } : {
          left:contentRects[id].left,
          top:editing?item.y*(row+gap):contentRects[id].top,
          width:contentRects[id].width,
          height:editing||item.fixedHeight?height+(id==='news'?foldedExtra:0):undefined,
          minHeight:!editing&&!item.fixedHeight?contentRects[id].minimum:undefined
        };
        return {'data-grid-id':id,'data-auto-height':!editing&&!item.fixedHeight?'true':undefined,'data-fixed-height':!editing&&item.fixedHeight?'true':undefined,'data-active':active===id?'true':undefined,style};
      }
      function edit(){
        const canvas=viewport.current?.querySelector?.('.pw-grid-canvas');
        const bounds=canvas?.getBoundingClientRect(),rects={};
        if(bounds)for(const item of layout){
          const rect=canvas.querySelector('[data-grid-id="'+item.id+'"]')?.getBoundingClientRect();
          if(rect?.width&&rect.height)rects[item.id]={left:rect.left-bounds.left,top:rect.top-bounds.top,width:rect.width,height:rect.height};
        }
        if(Object.keys(rects).length===layout.length){
          const measured=gridNormalize(layout.map(item=>{const r=rects[item.id];return {...item,x:Math.round(r.left/column),y:Math.round(r.top/(row+gap)),w:Math.round((r.width+gap)/column),h:Math.ceil((r.height+gap)/(row+gap))};}),{...profile,collapsed:false});
          editOrigin.current={profile:profile.key,layout:measured,rects,height:Math.max(...Object.values(rects).map(r=>r.top+r.height))};
          setDraft({...saved,[profile.key]:measured});
        }else {editOrigin.current=null;setDraft({...saved});}
        setNotice('');setEditing(true);
      }
      function cancel(){stopGesture(true);setEditing(false);setNotice('');}
      function reset(){stopGesture();editOrigin.current=null;setDraft(value=>({...value,[profile.key]:gridDefaults(profile)}));setNotice('已恢复当前窗口的默认布局');viewport.current.scrollTop=0;}
      function finish(){
        stopGesture();
        const committed={...draft},baseline=editOrigin.current;
        if(baseline&&JSON.stringify(committed[baseline.profile])===JSON.stringify(baseline.layout)){
          if(saved[baseline.profile])committed[baseline.profile]=saved[baseline.profile];else delete committed[baseline.profile];
        }
        const profiles={};for(const width of [390,800,1200]){const p=gridProfile(width);if(committed[p.key])profiles[p.key]=gridNormalize(committed[p.key],p);}
        setSaved(profiles);setEditing(false);
        try{localStorage.setItem(gridStorageKey,JSON.stringify({version:2,profiles}));setNotice('布局已保存');}catch{setNotice('本次布局已应用，但无法保存到此设备');}
      }
      const canvasStyle = fitContent ? {
        '--pw-overview-columns': profile.cols,
        '--pw-overview-left-columns': activity.w,
        '--pw-overview-gap': gap + 'px'
      } : {
        height: untouched?origin.height:editing?Math.max(12,...layout.map(item=>item.y+item.h))*(row+gap)-gap+foldedExtra:Math.max(...Object.values(contentRects).map(rect=>rect.top+rect.height)),
        '--pw-grid-column': column+'px',
        '--pw-grid-row': (row+gap)+'px'
      };
      return {viewport,editing,active,notice,profile,handles,card,edit,cancel,reset,finish,fitContent,petPlacement,canvasStyle};
    }
    return {inject:['slots','locale','layout'],apply(ctx) {
      ctx.effect(()=>ctx.locale.register('personalWorkbench','zh',{title:'个人主控台'}));
      ctx.effect(()=>ctx.locale.register('personalWorkbench','en',{title:'Personal home'}));
      const t=ctx.locale.bind('personalWorkbench');
      ctx.inject(['slots','locale','sessions'], ctx=>{
        const en={pet:'Pet the cat; drag to move',small:'Minimize',restore:'Show the cat',home:'Reset position',hello:'Meow. I live here now.',purr:'Purrr…',one:'I am keeping you company.',two:'A little head scratch, please.',three:'You work. I will watch.'};
        const zh={pet:'摸摸小猫；按住可拖动',small:'收起',restore:'叫出小黑猫',home:'归位',hello:'喵，我在这里陪你。',purr:'呼噜呼噜…',one:'你忙你的，我陪着。',two:'再摸一下嘛。',three:'今天也有好好陪你。'};
        Object.assign(en,{title:'Cat assistant',open:'Open personal assistant',close:'Close assistant',subtitle:'A separate conversation · Harness permissions apply',loading:'Opening your conversation…',failed:'Could not open the assistant.',retry:'Retry'});
        Object.assign(zh,{title:'猫咪助手',open:'打开个人助手',close:'关闭助手',subtitle:'独立对话 · 沿用 Harness 权限确认',loading:'正在打开助手对话…',failed:'暂时无法打开助手。',retry:'重试'});
        Object.assign(en,{settings:'Settings',role:'Role instructions',roleHint:'Applied to this assistant’s next model request. This does not change tools or permissions. Do not store passwords here.',save:'Save',saving:'Saving…',saved:'Saved. Applies on the next model request.'});
        Object.assign(zh,{settings:'助手设置',role:'角色与工作方式',roleHint:'保存后用于此助手的下一次模型请求，不改变工具或权限。请勿填写密码等敏感凭据。',save:'保存提示词',saving:'保存中…',saved:'已保存，下次模型请求生效。'});
        ctx.effect(()=>ctx.locale.register(ns,'en',en));
        ctx.effect(()=>ctx.locale.register(ns,'zh',zh));
        const t=ctx.locale.bind(ns);
        async function assistantAPI(input){
          const response=await fetch('/api/dsh-personal-workbench/assistant',{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:input?{'Content-Type':'application/json','X-Personal-UI':'1'}:undefined,body:input?JSON.stringify(input):undefined});
          const value=await response.json();if(!response.ok)throw new Error(value.error||t('failed'));return value;
        }
        function Settings(){
          const [value,setValue]=React.useState(null),[prompt,setPrompt]=React.useState(''),[status,setStatus]=React.useState(''),[saving,setSaving]=React.useState(false);
          React.useEffect(()=>{let active=true;assistantAPI().then(v=>{if(active){setValue(v);setPrompt(v.prompt);}}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[]);
          async function save(){setSaving(true);setStatus('');try{const next=await assistantAPI({action:'save',prompt,revision:value.revision});setValue(next);setStatus(t('saved'));}catch(e){setStatus(e.message);}finally{setSaving(false);}}
          return h('section',{className:'hbc-settings'},h('label',{htmlFor:'hbc-role'},t('role')),h('p',null,t('roleHint')),h('textarea',{id:'hbc-role',value:prompt,maxLength:12000,rows:10,disabled:!value||saving,onChange:e=>setPrompt(e.target.value)}),h('button',{disabled:!value||saving,onClick:save},saving?t('saving'):t('save')),status&&h('p',{role:'status'},status));
        }
        function Embedded({renderFactorySlot}) {
          return h('div',{className:'hbc-conversation-fill'},renderFactorySlot('conversation.content',{}));
        }
        function Assistant({renderSlot,SessionProvider,dockTarget,onOpenChange}) {
          React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
          const [open,setOpen]=React.useState(()=>{try{return sessionStorage.getItem(ns+'.assistantOpen')==='true';}catch{return false;}}),[reference,setReference]=React.useState(null),[error,setError]=React.useState(''),[attempt,setAttempt]=React.useState(0);
          React.useEffect(()=>{try{sessionStorage.setItem(ns+'.assistantOpen',String(open));}catch{}},[open]);
          const [settings,setSettings]=React.useState(false);
          const launcher=React.useRef(null),closeButton=React.useRef(null);
          const [loved,setLoved]=React.useState(false);React.useEffect(()=>{if(!loved)return;const t=setTimeout(()=>setLoved(false),1200);return()=>clearTimeout(t);},[loved]);
          React.useEffect(()=>{
            if(!open)return;
            const abort=new AbortController();
            let disposed=false,ref,timeout;
            setError('');setReference(null);
            (async()=>{
              let id;
              try{id=localStorage.getItem(ns+'.assistantSession');}catch{}
              const known=ctx.sessions.list.getSnapshot();
              if(id&&known.phase!=='pending'&&!list(known.ids).includes(id))id=null;
              if(!id){
                id=await ctx.sessions.create({});
                if(!sessionId.test(id||''))throw new Error('没有取得有效的助手对话。');
                try{localStorage.setItem(ns+'.assistantSession',id);}catch{}
              }
              if(disposed)return;
              await assistantAPI({action:'bind',sessionId:id});
              if(disposed)return;
              ref=ctx.sessions.retain(id,{source:'controllerOperation'});
              timeout=setTimeout(()=>abort.abort(new Error('助手对话连接超时，请重试。')),12000);
              const interrupted=new Promise((_,reject)=>{
                abort.signal.addEventListener('abort',()=>reject(abort.signal.reason),{once:true});
              });
              const binding=await Promise.race([ref.ready,interrupted]);
              if(disposed)return;
              const state=binding.session.getSnapshot();
              if(state.openState==='error')throw new Error(state.openError?.message||t('failed'));
              setReference(ref);
            })().catch(err=>{
              ref?.release();ref=null;
              if(!disposed)setError(err.message||t('failed'));
            }).finally(()=>clearTimeout(timeout));
            return()=>{disposed=true;clearTimeout(timeout);abort.abort();ref?.release();ref=null;};
          },[open,attempt]);
          React.useEffect(()=>{onOpenChange?.(open);return()=>{onOpenChange?.(false);};},[open,onOpenChange]);
          React.useEffect(()=>{if(open)closeButton.current?.focus();},[open]);
          function close(){setOpen(false);setReference(null);launcher.current?.focus();}
          return h(React.Fragment,null,h('style',null,catCss),
            h('div',{className:'pw-public-cat'},h('button',{ref:launcher,className:'pw-public-cat-art'+(loved?' hbc-loved':''),title:'摸摸 Data','aria-label':'摸摸 Data',onClick:()=>setLoved(true)},h(CatArt,{loved})),h('strong',null,'Data'),h('span',{className:'pw-public-cat-status'},loved?'呼噜呼噜…':'陪着你'),h('div',{className:'hbc-dock-actions'},h('button',{onClick:()=>setLoved(true)},'摸摸'),h('button',{'aria-label':t('open'),'aria-expanded':open,'aria-controls':'hbc-assistant-drawer',onClick:()=>{if(open)close();else setOpen(true);}},'聊聊'))),
            open&&dockTarget&&createPortal(h('aside',{id:'hbc-assistant-drawer',className:'hbc-drawer',role:'region','aria-label':t('title'),onKeyDown:e=>{if(e.key==='Escape'&&e.target===closeButton.current){e.preventDefault();close();}}},
              h('header',{className:'hbc-drawer-head'},h(CatArt,{}),h('div',null,h('strong',null,t('title')),h('p',null,t('subtitle'))),h('button',{onClick:()=>setSettings(v=>!v),'aria-expanded':settings},t('settings')),h('button',{ref:closeButton,onClick:close,'aria-label':t('close')},'×')),
              settings&&h(Settings,{}),
              h('div',{className:'hbc-drawer-body'},error?h('div',{className:'hbc-notice',role:'alert'},error,h('button',{className:'hbc-retry',onClick:()=>setAttempt(v=>v+1)},t('retry'))):reference?h(SessionProvider,{session:reference},renderSlot('dsh.personalWorkbenchCat.conversation',{})):h('p',{className:'hbc-notice',role:'status'},t('loading')))),dockTarget));
        }
        ctx.slots.registerFactory({name:'dsh.personalWorkbenchCat.assistant',scope:'root',children:{'dsh.personalWorkbenchCat.conversation':{kind:'single',scope:'session'}}},Assistant);
        ctx.slots.inject('dsh.personalWorkbenchCat.conversation',()=>ctx.slots.register({name:'dsh.personalWorkbenchCat.conversation'},Embedded));

      });
      const uiUpdates=installWorkbenchUpdates(ctx,{moduleId:"dsh-personal-workbench",endpoint:"/api/dsh-personal-workbench?action=uiRelease",petNamespace:"dsh-personal-workbench-cat",build:WORKBENCH_UI_BUILD});
      let sessionNav;
      ctx.inject?.(['uiWorkspace','sessions','workspaces'],nav=>{sessionNav=nav;nav.effect(()=>()=>{if(sessionNav===nav)sessionNav=undefined;});});
      function Panel({renderFactorySlot}={}) {
        const [assistantOpen,setAssistantOpen]=React.useState(false);
        const [assistantDock,setAssistantDock]=React.useState(null);
        const [taskTitle,setTaskTitle]=React.useState('');
        const [savingTask,setSavingTask]=React.useState(false);
        const [checks,setChecks]=React.useState(new Map()),pendingChecks=React.useRef(new Map()),planVersion=React.useRef(0);
        const [feedURL,setFeedURL]=React.useState(()=>safeReadingLink(storedValue('dsh-personal-workbench:reading-link',''))||'');
        const [editingFeed,setEditingFeed]=React.useState(false);
        const [feedDraft,setFeedDraft]=React.useState('');
        React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
        const [briefDay,setBriefDay]=React.useState(()=>restoredUI('briefDay','')),[briefArchive,setBriefArchive]=React.useState(null),[briefReadError,setBriefReadError]=React.useState(null);
        const [foldedDay,setFoldedDay]=React.useState(()=>storedValue('dsh-personal-workbench:brief-folded-day',''));
        const [lastRefreshedAt,setLastRefreshedAt]=React.useState(null);
        const refreshTime=lastRefreshedAt?new Date(lastRefreshedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}):'未同步';
        const refreshDescription=lastRefreshedAt?'最近刷新成功：'+new Date(lastRefreshedAt).toLocaleString('zh-CN',{hour12:false}):'尚未成功刷新';
        const [data,setData]=React.useState(null),[monitor,setMonitor]=React.useState(null),[loading,setLoading]=React.useState(true),[tick,setTick]=React.useState(0),[error,setError]=React.useState(''),[readError,setReadError]=React.useState('');
        const [selectedDate,setSelectedDate]=React.useState(()=>restoredUI('selectedDate','')),[calendarMode,setCalendarMode]=React.useState(()=>restoredUI('calendarMode','day')),[dayPlan,setDayPlan]=React.useState(null),[planPending,setPlanPending]=React.useState(false),[calendarData,setCalendarData]=React.useState(null),[customProjects,setCustomProjects]=React.useState(()=>projectShortcuts(storedValue(PROJECT_SHORTCUTS_KEY,[]))),[addingProject,setAddingProject]=React.useState(false),[projectForm,setProjectForm]=React.useState({title:'',version:'',progress:'',target:'',icon:'app'}),[projectError,setProjectError]=React.useState('');
        const today=data?.today||localDay(),viewDate=selectedDate||today,monthKey=viewDate.slice(0,7),newsFolded=foldedDay===today;
        React.useEffect(()=>{const abort=new AbortController();setBriefReadError(null);
          api('briefArchive',abort.signal,briefDay?{date:briefDay}:{}).then(value=>{if(!abort.signal.aborted)setBriefArchive({...value,selection:briefDay});}).catch(()=>{if(!abort.signal.aborted)setBriefReadError(briefDay);});
          return()=>abort.abort();},[briefDay,today,tick]);
        const grid=useWorkbenchGrid(newsFolded);
        const expandedOverviewHeight=React.useRef(280);
        React.useLayoutEffect(()=>{
          const canvas=grid.viewport.current?.querySelector('.pw-grid-canvas'),news=canvas?.querySelector('.pw-news');
          if(!canvas||!news)return;
          const align=()=>{
            // When the news columns stack, both cards return to natural height.
            const match=grid.fitContent&&grid.petPlacement==='aligned'&&(news.getBoundingClientRect().width>=650||Boolean(news.querySelector('.pw-empty')));
            canvas.toggleAttribute('data-match-overview-height',match);
            if(!match){canvas.style.removeProperty('--pw-expanded-overview-height');return;}
            if(!newsFolded)expandedOverviewHeight.current=Math.max(280,Math.ceil(news.getBoundingClientRect().height));
            const value=expandedOverviewHeight.current+'px';
            if(canvas.style.getPropertyValue('--pw-expanded-overview-height')!==value)canvas.style.setProperty('--pw-expanded-overview-height',value);
          };
          align();const observer=new ResizeObserver(align);observer.observe(news);
          return()=>observer.disconnect();
        },[grid.fitContent,grid.petPlacement,newsFolded]);

        React.useLayoutEffect(() => {
          const board = grid.viewport.current;
          if (board) return bindWorkbenchWheel(board);
        }, []);
        React.useLayoutEffect(()=>{
          uiUpdates.capture=()=>({selectedDate,calendarMode,briefDay,editing:grid.editing,pending:pendingChecks.current.size>0,dialog:!!document.querySelector('.pw-project-dialog,.pw-attention[open],.hbc-profile-modal,.hbc-settings'),boardScroll:grid.viewport.current?.scrollTop||0});
          return()=>{uiUpdates.capture=null;};
        });
        const updateScrollRestored=React.useRef(false);
        React.useLayoutEffect(()=>{if(!data||updateScrollRestored.current)return;updateScrollRestored.current=true;const board=grid.viewport.current;if(board)board.scrollTop=restoredUI('boardScroll',0);},[data]);
        const attentionRef=React.useRef(null);
        const root=React.useRef(null),reading=React.useRef(false),alive=React.useRef(true),openingLock=React.useRef(false);
        const [notes,setNotes]=React.useState(()=>projectNotes(storedValue(PROJECT_NOTES_KEY,{})));
        const [activeProjectId,setActiveProjectId]=React.useState(''),[progressDraft,setProgressDraft]=React.useState(''),[requirementDraft,setRequirementDraft]=React.useState('');
        const [projectNotice,setProjectNotice]=React.useState(''),[handingOff,setHandingOff]=React.useState(false);
        const projectTrigger=React.useRef(null);
        React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
        React.useEffect(()=>{
          const abort=new AbortController();
          (async()=>{
            let result=await api('projects',abort.signal);
            const legacy=projectShortcuts(storedValue(PROJECT_SHORTCUTS_KEY,[]));
            if(legacy.length){await api('projectShortcuts',abort.signal,{action:'import',items:legacy});result=await api('projects',abort.signal);localStorage.removeItem(PROJECT_SHORTCUTS_KEY);}
            if(!abort.signal.aborted){setCustomProjects(list(result.shortcuts));setNotes(result.notes||{});}
          })().catch(()=>{if(!abort.signal.aborted)setReadError('项目暂时未同步，已保留上次内容');});
          return()=>abort.abort();
        },[tick]);
        React.useEffect(()=>{if(viewDate===today){setPlanPending(false);return;}const abort=new AbortController();setPlanPending(true);const version=planVersion.current;api('plan',abort.signal,{date:viewDate}).then(value=>{if(!abort.signal.aborted&&version===planVersion.current)setDayPlan(value);}).catch(()=>{if(!abort.signal.aborted&&version===planVersion.current)setDayPlan({date:viewDate,availability:'unavailable'});}).finally(()=>{if(!abort.signal.aborted)setPlanPending(false);});return()=>abort.abort();},[viewDate,today,tick]);
        const weekStart=calendarMode==='week'?calendarDates(viewDate,'week')[0]:'';
        const calendarKey=weekStart||monthKey;
        React.useEffect(()=>{
          if(calendarMode==='day')return;
          const abort=new AbortController();
          const months=weekStart?[...new Set(calendarDates(weekStart,'week').map(date=>date.slice(0,7)))]:[calendarKey];
          for(const month of months){
            api('calendar',abort.signal,{month,...(weekStart?{week:weekStart}:{})})
              .catch(()=>({month,availability:'unavailable',days:{}}))
              .then(value=>{
                if(!abort.signal.aborted)setCalendarData(previous=>({
                  key:calendarKey,months:{...(previous?.key===calendarKey?previous.months:{}),[month]:value}
                }));
              });
          }
          return()=>abort.abort();
        },[calendarKey,calendarMode,tick]);
        React.useEffect(()=>{
          let stopped=false,busy=false,abort;
          async function refreshAssistants(){if(stopped||busy||document.hidden||!root.current?.getClientRects().length||reading.current)return;busy=true;abort=new AbortController();
            await Promise.allSettled([production(abort.signal).then(next=>{if(!stopped)setMonitor(previous=>next.availability==='unavailable'?{...previous,availability:'unavailable'}:next);}),api('assistants',abort.signal).then(next=>{if(!stopped)setData(previous=>previous?{...previous,...next}:previous);}).catch(()=>{if(!stopped)setData(previous=>previous?{...previous,automations:{...previous.automations,availability:'unavailable',items:list(previous.automations?.items).map(item=>({...item,execution:{...item.execution,running:null,known:false}}))}}:previous);})]);busy=false;}
          const timer=setInterval(refreshAssistants,15000),visible=()=>{if(!document.hidden)void refreshAssistants();};document.addEventListener('visibilitychange',visible);return()=>{stopped=true;abort?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
        },[]);
        React.useEffect(()=>{
          let frame=0;const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const painter=canvas.getContext('2d',{willReadFrequently:true});
          const sync=()=>{const el=root.current,probe=el?.querySelector('.pw-theme-probe');if(!el||!probe||!painter)return;painter.clearRect(0,0,1,1);painter.fillStyle=getComputedStyle(probe).color;painter.fillRect(0,0,1,1);const [r,g,b]=painter.getImageData(0,0,1,1).data;el.dataset.appearance=(r*.2126+g*.7152+b*.0722)<128?'dark':'light';};
          const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);};const observer=new MutationObserver(schedule);
          for(let ancestor=root.current?.parentElement;ancestor;ancestor=ancestor.parentElement)observer.observe(ancestor,{attributes:true,attributeFilter:['class','style','data-theme','data-color-scheme']});
          if(document.head)observer.observe(document.head,{childList:true,subtree:true,characterData:true});const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',schedule);sync();return()=>{observer.disconnect();cancelAnimationFrame(frame);media.removeEventListener('change',schedule);};
        },[]);
        React.useEffect(()=>{const interval=setInterval(()=>{if(!document.hidden && root.current?.getClientRects().length && !reading.current)setTick(v=>v+1);},60000);return()=>clearInterval(interval);},[]);
        React.useEffect(()=>{
          const abort=new AbortController(),version=planVersion.current;reading.current=true;setLoading(true);
          Promise.all([api('dashboard',abort.signal),production(abort.signal)]).then(([next,business])=>{if(abort.signal.aborted)return;if(!next?.tasks || !Array.isArray(next.tasks.items))throw new Error('首页暂时无法更新，请稍后刷新。');setData(previous=>version!==planVersion.current&&previous?.plan&&previous.plan.date===next.plan?.date?{...next,plan:previous.plan}:next);setMonitor(previous=>business.availability==='unavailable'?{...previous,availability:'unavailable'}:business);setLastRefreshedAt(Date.now());setReadError('');}).catch(err=>{if(!abort.signal.aborted)setReadError('更新暂时失败，当前显示上次内容');}).finally(()=>{if(!abort.signal.aborted){reading.current=false;setLoading(false);}});
          return()=>{abort.abort();};
        },[tick]);
        async function saveTask(action,input) {
          if(openingLock.current)return;
          openingLock.current=true;setSavingTask(true);setError('');
          try {
            await api(action,undefined,input);
            if(alive.current&&action==='addPlanTask')setTaskTitle('');
          } catch(error) {
            if(alive.current)setError(text(error.message)||'无法保存，请刷新查看。');
          } finally {
            openingLock.current=false;
            if(alive.current){setTick(value=>value+1);setSavingTask(false);}
          }
        }
        function saveReadingLink(event) {
          event.preventDefault();
          const href=safeReadingLink(feedDraft.trim());
          if(feedDraft.trim()&&!href){setError('请输入有效的 HTTPS 日报地址。');return;}
          try{
            localStorage.setItem('dsh-personal-workbench:reading-link',JSON.stringify(href||''));
            setFeedURL(href||'');setEditingFeed(false);setError('');
          } catch {setError('暂时无法保存日报链接。');}
        }
        async function navigate(destination) {
          try {
            setError('');
            if(destination.codex) {await api('openCodexThread',undefined,{id:destination.codex,hostId:'local'});}
            else if(destination.session) {
              const nav=sessionNav;if(!nav)throw new Error('对话入口暂未准备好，请稍后再试。');
              const sessions=nav.sessions.list.getSnapshot(),workspaces=nav.workspaces.list.getSnapshot();
              if(workspaces.state==='error')throw new Error('对话列表暂时无法读取。');
              if(sessions.phase==='pending'||workspaces.phase==='pending')throw new Error('对话正在加载，请稍后重试。');
              if(list(workspaces.archivedSessionIds).includes(destination.session))throw new Error('这段对话已经归档，请到历史对话中查看。');
              if(!list(sessions.ids).includes(destination.session))throw new Error('暂时找不到这段对话，请刷新后再试。');
              await nav.uiWorkspace.openSession(destination.session);
            } else await ctx.layout.selectPanel(destination.panel??null);
            return true;
          } catch(err){setError(text(err.message)||'暂时无法打开。');return false;}
        }
        const mergedData=data;
        const checkedFor=task=>checks.get(task.id)??Boolean(task.checked);
        const plan=viewDate===today?data?.plan:dayPlan?.date===viewDate?dayPlan:null,planItems=list(plan?.items),done=planItems.filter(checkedFor).length,attention=attentionItems(mergedData,monitor),attentionKeys=new Set(attention.map(row=>row.key)),rows=activityItems(mergedData,monitor).filter(row=>!attentionKeys.has(row.key)),completed=completedItems(monitor);
        const currentArchive=briefArchive?.selection===briefDay?briefArchive:null;
        const edition=selectBriefEdition(briefDay,currentArchive?.edition,data?.brief),news=list(edition?.items),reader=safeHTTPS(edition?.url)||(!briefDay?feedURL:null);
        const briefToday=briefArchive?.today||today;
        const shownBriefDate=briefDay||edition?.date||briefToday;
        const briefDateOptions=[...new Set([shownBriefDate,...[-2,-1,0,1].map(n=>new Date(Date.parse(briefToday)+n*86400000).toISOString().slice(0,10)),...list(briefArchive?.dates)])].sort().reverse();
        const briefEdition=h('select',{className:'pw-brief-date','aria-label':'选择日报日期',value:shownBriefDate,onChange:event=>setBriefDay(event.target.value)},briefDateOptions.map(date=>h('option',{key:date,value:date},briefDateLabel(date,briefToday))));
        const leadImage=safeHTTPS(edition?.imageUrl);

        const assistants=assistantOverview(monitor),allProjects=customProjects,threadOptions=list(data?.threads).filter(item=>sessionId.test(item.id||'')).map(item=>({...item,source:'harness'}));
        const operationReviews=useAssistantReviews(monitor?.accountId?'operations:'+monitor.accountId:null,
          completed.filter(row=>row.key?.startsWith('original:')||row.key?.startsWith('rewrite:')));
        const hasAttention=attention.length>0&&!grid.editing;
        React.useLayoutEffect(()=>{
          const details=attentionRef.current, panel=root.current;
          const button=details?.querySelector('summary');
          if(!hasAttention||!button||!panel)return;
          function alignPopover(){
            const bounds=panel.getBoundingClientRect(), trigger=button.getBoundingClientRect();
            const towardLeft=trigger.right-bounds.left-12;
            const towardRight=bounds.right-trigger.left-12;
            const rightAligned=towardLeft>=360||towardLeft>=towardRight;
            details.dataset.align=rightAligned?'right':'left';
            details.style.setProperty('--pw-attention-width',Math.max(0,Math.min(360,rightAligned?towardLeft:towardRight))+'px');
          }
          alignPopover();
          const observer=new ResizeObserver(alignPopover);
          observer.observe(panel);
          observer.observe(button);
          observer.observe(details.parentElement);
          details.addEventListener('toggle',alignPopover);
          return()=>{
            observer.disconnect();
            details.removeEventListener('toggle',alignPopover);
          };
        },[hasAttention]);
        const planConnected=plan?.availability==='connected',planEmpty=plan?.availability==='empty';
        function empty(title,description,icon='clock'){return h('div',{className:'pw-empty'},h(Icon,{name:icon,size:27}),h('strong',null,title),h('p',null,description));}
        function skeleton(){return h('div',{'aria-label':'正在读取'},[1,2,3].map(i=>h('div',{key:i,className:'pw-loading'})));}
        async function checkTask(task) {
          if(pendingChecks.current.has(task.id))return;
          const checked=!task.checked;
          pendingChecks.current.set(task.id,checked);
          planVersion.current++;
          setChecks(new Map(pendingChecks.current));
          setError('');
          try {
            const item=await api('checkPlanTask',undefined,{id:task.id,revision:task.revision,checked});
            if(item?.id!==task.id||item.status!==(checked?'done':'todo'))throw new Error('待办状态暂未确认，请刷新后重试。');
            if(alive.current){
              const update=plan=>plan?.date===item.dueDate?{...plan,items:list(plan.items).map(row=>row.id===item.id?{...row,checked,revision:item.revision}:row)}:plan;
              setData(previous=>previous?{...previous,plan:update(previous.plan)}:previous);
              setDayPlan(update);
            }
          } catch(error) {
            if(alive.current)setError(text(error.message)||'无法保存，请刷新查看。');
          } finally {
            pendingChecks.current.delete(task.id);
            planVersion.current++;
            if(alive.current){setChecks(new Map(pendingChecks.current));setTick(value=>value+1);}
          }
        }
        function planRow(task,key) {
          const content=planTaskContent(task.text||task.title),checked=checkedFor(task),saving=checks.has(task.id);
          return h('div',{key,className:'pw-plan-row'+(checked?' is-done':'')},
            h('button',{className:'pw-plan-check',type:'button',role:'checkbox','aria-label':content.title,'aria-checked':checked,'aria-busy':saving,'aria-disabled':saving,onClick:()=>void checkTask(task)},checked&&h(Icon,{name:'check',size:13})),
            h('div',{className:'pw-plan-copy'},h('p',{className:'pw-plan-text',title:content.label},planNoteContent(content.title)),content.timing&&h('p',{className:'pw-plan-meta'},planNoteContent(content.timing))));
        }
        function planNoteContent(value) {
          return text(value).split(/(https:[/][/][^\s<>]+)/g).map((part,index)=>{
            if(!part.startsWith('https://'))return part;
            const clean=part.replace(/[。，；！？、,.!?;）)\]】]+$/u,''),href=safeHTTPS(clean);
            if(!href)return part;
            const host=new URL(href).hostname;
            const label=host==='vc.feishu.cn'?'加入飞书会议':/(^|\.)zoom\.us$/.test(host)?'加入 Zoom 会议':host==='meeting.tencent.com'?'加入腾讯会议':host==='meet.google.com'?'加入 Google Meet':'打开链接';
            return h(React.Fragment,{key:index},h(PlanInlineLink,{href,label}),part.slice(clean.length));
          });
        }
        function planNodes(items,depth=0) {
          if(depth>10)return null;
          return list(items).map((node,i)=>{
            const key=node.id||node.task?.id||i;
            if(node.type==='task')return h(React.Fragment,{key},planRow(node.task||{},key),list(node.children).length>0&&h('div',{className:'pw-plan-nested'},planNodes(node.children,depth+1)));
            const isSection=node.type==='label'||(depth===0&&node.type==='note'&&/^(?:上午|下午|晚上|晚间|早晨|早上|有余力(?:再)?做|固定(?:任务|收尾))[:：]?$/u.test(text(node.text).trim()));
            if(isSection)return h('div',{key,className:'pw-plan-section-label'},node.text&&h('h3',{className:'pw-group-title'},node.text),planNodes(node.children,depth+1));
            if(node.type==='note')return h('div',{key},node.text&&h('p',{className:'pw-plan-note '+(['quote','callout'].includes(node.style)?node.style:'')},planNoteContent(node.text)),list(node.children).length>0&&h('div',{className:'pw-plan-nested'},planNodes(node.children,depth+1)));
            // The original plan owns expandable notes and editing. Preview its caption here.
            if(node.type==='toggle')return node.text?h('p',{key,className:'pw-plan-note'},planNoteContent(node.text)):null;
            return h(React.Fragment,{key},planNodes(node.children,depth+1));
          });
        }
        function planBody() {
          if((!data&&loading)||planPending)return skeleton();
          if(!planConnected&&!planEmpty)return empty('计划暂时没有同步过来','可以打开「今日计划」继续查看和安排。','calendar');
          if(!planItems.length && !list(plan?.groups).some(g=>list(g.items).length))return empty(viewDate===today?'今天还没有安排':'这天还没有安排','可以在卡片下方添加待办。','calendar');
          const groups=list(plan.groups);
          return groups.length?groups.map((group,i)=>h('div',{className:'pw-plan-group',key:i},group.title&&group.title!==plan.title&&h('h3',{className:'pw-group-title'},group.title),planNodes(list(group.items).length?group.items:list(group.tasks).map(task=>({type:'task',task}))))):planItems.map((task,i)=>planRow(task,task.id||i));
        }
        function newsBody() {
          if(!edition&&briefReadError===briefDay)return empty('日报暂未同步',null,'news');
          if(!edition&&!currentArchive)return skeleton();
          if(!news.length&&reader)return h('div',{className:'pw-brief-layout'},h('a',{className:'pw-brief-read',href:reader,target:'_blank',rel:'noopener noreferrer'},'打开已保存的日报',h(Icon,{name:'arrow',size:12})));
          if(!news.length)return empty(briefDay===briefToday?'今日尚未发布':briefDay>briefToday?'这天尚未到来':briefDay?'这天没有已发布的日报':'暂无已发布日报','跟助手说“把今天的日报放到主控台”，制作完成后即可在这里阅读。','news');
          const [lead,...quick]=news;
          function storyTitle(item) {
            const title=item.title||'今日资讯',url=safeURL(item.url);
            return url?h('a',{className:'pw-news-title',href:url,target:'_blank',rel:'noopener noreferrer','aria-label':'阅读：'+title},title)
              :h('span',{className:'pw-news-title'},title);
          }
          return h('div',{className:'pw-brief-layout','data-quick':String(quick.length>0)},
            h('article',{className:'pw-brief-lead is-lead'},
              h('div',{className:'pw-brief-copy'},h('h3',null,storyTitle(lead)),
                lead.summary&&h('p',{className:'pw-news-summary',title:lead.summary},lead.summary),
                reader&&h('a',{className:'pw-brief-read',href:reader,target:'_blank',rel:'noopener noreferrer','aria-label':'阅读原文'},'阅读全文',h(Icon,{name:'arrow',size:12}))),
              leadImage&&h('div',{className:'pw-brief-media',key:leadImage},h('img',{className:'pw-news-image',src:leadImage,alt:news[0]?.title||'日报配图',decoding:'async',
                referrerPolicy:'no-referrer',onLoad:event=>{const img=event.currentTarget;if(img.naturalWidth&&img.naturalHeight)img.parentElement.style.setProperty('--pw-brief-image-ratio',String(img.naturalWidth/img.naturalHeight));},onError:event=>{event.currentTarget.parentElement.hidden=true;}}))),
            quick.length>0&&h('ol',{className:'pw-news-quick','aria-label':'简讯'},
              quick.map((item,index)=>{
                const title=item.title||'今日资讯',url=safeURL(item.url)||reader;
                const row=[h('span',{className:'pw-news-number','aria-hidden':true},index+1),h('span',{className:'pw-news-title',title},title),url&&h(Icon,{name:'arrow',size:12})];
                return h('li',{key:item.url||index},url?h('a',{href:url,target:'_blank',rel:'noopener noreferrer','aria-label':'阅读第 '+(index+1)+' 条简讯：'+title},...row):h('span',null,...row));
              })));
        }
        function todayOverview(){
          const items=list(data?.plan?.items),remaining=items.filter(item=>!checkedFor(item));
          const high=list(data?.tasks?.items).find(item=>item.dueDate===today&&item.priority==='high'&&item.status!=='done');
          const first=high||remaining[0];
          return h('section',{className:'pw-today-overview'},h('h2',null,'今日概况'),h('p',null,first?(high?'今天重点：':'接下来：')+(first.title||first.text):items.length?'今天的计划都完成了。':'还没有安排，和我聊聊今天想做什么。'),h('p',{className:'pw-overview-secondary'},items.length?'已完成 '+(items.length-remaining.length)+' / '+items.length+' 项':'可以先说：“帮我安排今天的计划”。'));
        }
        function attentionSummary() {
          if(!attention.length)return null;
          return h('details',{className:'pw-attention',ref:attentionRef,onKeyDown:event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}},h('summary',{'aria-label':'需要你处理，'+attention.length+' 件事'},h('span',{className:'pw-attention-label'},'需要你处理 · '+attention.length),h(Icon,{name:'chevron',size:12})),h('div',{className:'pw-attention-popover'},attention.map(row=>h('article',{className:'pw-attention-item',key:row.key},h('div',{className:'pw-attention-item-top'},h('strong',null,row.title),h('span',{className:'pw-attention-tag'},row.status)),row.note&&h('p',null,row.note),row.destination?h('button',{className:'pw-quiet-link',onClick:event=>{event.currentTarget.closest('details').open=false;navigate(row.destination);}},row.action,h(Icon,{name:'arrow',size:11})):row.url?h('a',{className:'pw-quiet-link',href:row.url,target:'_blank',rel:'noopener noreferrer'},row.action,h(Icon,{name:'arrow',size:11})):null))));
        }
        function toggleBrief(){const next=newsFolded?'':today;setFoldedDay(next);try{localStorage.setItem('dsh-personal-workbench:brief-folded-day',JSON.stringify(next));}catch{setError('收起状态仅在本次打开时保留');}}
        function planViewSelector() {
          return h('div',{className:'pw-segmented',role:'group','aria-label':'计划视图'},
            [['day','日'],['week','周'],['month','月']].map(([value,label])=>h('button',{
              key:value,type:'button','aria-pressed':calendarMode===value,onClick:()=>setCalendarMode(value)
            },label)));
        }
        function shiftCalendar(direction) {
          const date=new Date(viewDate+'T12:00:00Z');
          if(calendarMode==='month'){
            date.setUTCDate(1);
            date.setUTCMonth(date.getUTCMonth()+direction);
          }else date.setUTCDate(date.getUTCDate()+direction*(calendarMode==='week'?7:1));
          const value=date.toISOString().slice(0,10);
          if(/^20/.test(value))setSelectedDate(value===today?'':value);
        }
        function planDateNav() {
          const unit={day:'天',week:'周',month:'月'}[calendarMode];
          const monthAndDay=date=>[Number(date.slice(5,7)),Number(date.slice(8))];
          const fullDay=date=>monthAndDay(date).join('月')+'日';
          let label=fullDay(viewDate),description=viewDate;
          if(calendarMode==='week'){
            const days=calendarDates(viewDate,'week');
            label=monthAndDay(days[0]).join('/')+'–'+monthAndDay(days[6]).join('/');
            description=days[0]+' 至 '+days[6];
          }else if(calendarMode==='month'){
            label=monthKey.slice(0,4)+'年'+Number(monthKey.slice(5))+'月';
            description=label;
          }
          return h('div',{className:'pw-date-nav',role:'group','aria-label':'计划日期'},
            h('button',{type:'button',onClick:()=>shiftCalendar(-1),'aria-label':'前一'+unit},h(Icon,{name:'left',size:14})),
            h('span',{'aria-live':'polite',title:description},label),
            h('button',{type:'button',onClick:()=>shiftCalendar(1),'aria-label':'下一'+unit},h(Icon,{name:'chevron',size:14})),
            h('button',{type:'button',className:'pw-today',onClick:()=>setSelectedDate(''),disabled:viewDate===today,'aria-label':'回到今天'},'今天'));
        }
        function calendarBody() {
          if(calendarMode==='day')return null;
          const days=calendarDates(viewDate,calendarMode),monthView=calendarMode==='month';
          const months=calendarData?.key===calendarKey?calendarData.months:{};
          const activeMonth=months[monthKey];
          return h('div',{className:'pw-calendar'},
            h('div',{className:'pw-calendar-grid','data-mode':calendarMode,role:'group','aria-label':monthView?'月历':'本周日期'},
              ['一','二','三','四','五','六','日'].map(value=>h('span',{key:value,className:'pw-week-label','aria-hidden':true},value)),
              days.map(date=>{
                const selected=date===viewDate,isToday=date===today,past=date<today,dateMonth=date.slice(0,7);
                const outside=monthView&&dateMonth!==monthKey,month=months[dateMonth];
                let record=outside?null:month?.days?.[date];
                if(selected&&(planConnected||planEmpty)&&!plan?.coverage?.truncated){
                  record={count:planItems.length,done,first:planItems[0]&&{title:planItems[0].title,checked:checkedFor(planItems[0])}};
                }else if(isToday&&['connected','empty'].includes(data?.plan?.availability)&&!data.plan.coverage?.truncated){
                  const items=list(data.plan.items);
                  record={count:items.length,done:items.filter(item=>item.checked).length,first:items[0]};
                }
                const counted=Number.isInteger(record?.count);
                const knownEmpty=counted?record.count===0:!record&&month?.availability==='connected';
                const number=Number(date.slice(8));
                const title=taskText(record?.first?.title).title;
                const summary=counted&&record.count>0
                  ? (past||isToday?'完成 '+record.done+'/'+record.count:'已安排 '+record.count+' 项')
                  :knownEmpty?(past?'无记录':'未安排'):record?'有计划，详情待同步':'待同步';
                const weekStatus=isToday?'今天':summary;
                const state=isToday?'today':past?'past':'future';
                return h('button',{
                  key:date,type:'button','aria-label':date+(isToday?'，今天':'')+(outside?'，相邻月份':'，'+summary)+(title?'，'+title:''),
                  'aria-pressed':selected,'aria-current':isToday?'date':undefined,
                  className:(outside?'is-outside ':'')+(isToday?'is-today':''),
                  'data-period':state,'data-has-record':String(!outside&&Boolean(record)&&!knownEmpty),
                  title:outside?undefined:title?title+' · '+summary:summary,
                  onClick:()=>setSelectedDate(date)
                },h('span',{className:'pw-calendar-number'},number),
                  monthView
                    ? !outside&&h(React.Fragment,null,title&&h('small',{className:'pw-calendar-preview','data-checked':String(record.first.checked)},title),
                      record&&!knownEmpty&&h('small',{className:'pw-calendar-marker'},counted?'共 '+record.count+' 项':'有计划'))
                    : h('small',{className:'pw-calendar-week-status'},weekStatus));
              })),
            monthView&&activeMonth?.availability!=='connected'&&h('p',{className:'pw-calendar-status',role:'status'},
              activeMonth?'本月安排暂未同步，可点日期单独查看':'正在读取本月安排…'));
        }
        function badge(state,label,title) {
          return h('span',{className:'pw-state','data-state':state,title},label);
        }
        function assistantBody() {
          const operations=assistants.operation;
          const openOperations=()=>navigate({panel:'redflow-workbench'});
          function receipt(row) {
            const {title,url,key}=row, when=row.deliveredAt||row.updatedAt;
            const date=assistantDate(when||row.date,assistants.today,Boolean(when));
            return h('div',{className:'pw-assistant-receipt',key},
              date&&h('small',null,date),
              h('a',{className:'pw-quiet-link',href:safeHTTPS(url),target:'_blank',rel:'noopener noreferrer',title,
                'aria-label':'查看结果：'+title},h('span',{className:'pw-assistant-result-name'},title),h(Icon,{name:'arrow',size:11}))); 
          }
          function assistantCard({name,icon,status,detail,next,reviews,open,action='打开'}) {
            const result=reviews.latest;
            return h('section',{className:'pw-assistant-group','aria-label':name},
              h('span',{className:'pw-assistant-avatar','aria-hidden':true},icon),
              h('div',{className:'pw-assistant-copy'},
                h('div',{className:'pw-assistant-heading'},h('h3',null,name),status),
                detail&&h('p',{className:'pw-assistant-context',title:detail.hint},h('span',null,detail.label+'：'),detail.text),
                next&&h('div',{className:'pw-assistant-field'},h('span',{className:'pw-assistant-label'},'下一次'),h('span',null,next)),
                h('div',{className:'pw-assistant-field'},h('span',{className:'pw-assistant-label'},'上次结果'),
                  h('div',{className:'pw-assistant-review'},
                    result?receipt(result):h('span',{className:'pw-assistant-review-empty'},reviews.unavailable?'结果待同步':'暂无结果')))),
              open&&h('button',{className:'pw-dashboard-action pw-assistant-open',type:'button','aria-label':'打开'+name,onClick:open},action,h(Icon,{name:'chevron',size:11})));
          }
          const primary=operations[0];
          const operation=monitor?.availability!=='not_connected'&&assistantCard({
            name:'运营助手',icon:h('img',{className:'pw-operations-icon',src:operationsIcon,alt:''}),
            status:primary?badge(primary.state,primary.label,primary.state==='failed'?primary.detail:undefined):
              badge('unknown',assistants.synced?'暂无新任务':monitor?.availability==='not_connected'?'未连接':'待同步'),
            detail:primary&&!primary.stale&&primary.state!=='done'&&{label:primary.state==='failed'?'原因':'当前任务',
              text:primary.state==='failed'&&primary.detail?primary.detail:[primary.title,primary.timing].filter(Boolean).join(' · '),
              hint:primary.detail||primary.title},
            reviews:{...operationReviews,unavailable:monitor?.resultsUnavailable||monitor?.availability==='unavailable'},open:openOperations,action:'查看'
          });
          const jobs=list(data?.automations?.items);
          const seen=new Set(jobs.map(job=>job.sessionId));
          const agents=jobs.map(job=>({id:job.id,name:job.name,sessionId:job.sessionId,execution:job.execution,schedule:job.status==='paused'?'已暂停':job.scheduleLabel,result:job.result,lastRun:job.lastRun}));
          for(const session of list(data?.ai?.items))if(!seen.has(session.id)&&(session.running===true||pending(session.pendingInput)||queued(session.queue)))agents.push({id:session.id,name:session.title,sessionId:session.id,execution:session});
          const cards=agents.slice(0,6).map(agent=>{
            const state=agent.execution,waiting=pending(state?.pendingInput),running=state?.running===true;
            const label=waiting?inputLabel(state.pendingInput):running?'进行中':queued(state?.queue)?'排队中':state?.running===false?'等待开始':'状态待同步';
            return h('section',{className:'pw-assistant-group',key:agent.id,'aria-label':agent.name},h('span',{className:'pw-assistant-avatar'},h(Icon,{name:'activity',size:22})),
              h('div',{className:'pw-assistant-copy'},h('div',{className:'pw-assistant-heading'},h('h3',null,agent.name),badge(running?'active':'unknown',label)),
                agent.schedule&&h('div',{className:'pw-assistant-field'},h('span',{className:'pw-assistant-label'},'排期'),h('span',null,agent.schedule)),
                h('div',{className:'pw-assistant-field'},h('span',{className:'pw-assistant-label'},'上次结果'),h('div',{className:'pw-assistant-receipt'},agent.result&&h('small',null,assistantDate(agent.result.createdAt||agent.lastRun,today,true)),agent.result?h('button',{className:'pw-quiet-link',title:agent.result.text,onClick:()=>navigate({session:agent.sessionId})},h('span',{className:'pw-assistant-result-name'},agent.result.text.split('\n').find(Boolean)),h(Icon,{name:'arrow',size:11})):h('span',null,'暂无结果')))),
              agent.sessionId&&h('button',{className:'pw-dashboard-action pw-assistant-open','aria-label':'打开'+agent.name,onClick:()=>navigate({session:agent.sessionId})},'打开',h(Icon,{name:'arrow',size:11})));
          });
          return operation||cards.length?h('div',{className:'pw-assistant-list pw-assistant-feed'},operation,cards):empty('暂时没有进行中的任务','开始对话或建立自动化后，进度会出现在这里。','activity');
        }

        const activeProject=allProjects.find(project=>project.id===activeProjectId);
        function projectDestination(project) {
          return project.source==='codex'?{codex:project.threadId}:{session:project.threadId};
        }
        function projectProgress(project) {
          return notes[project.id]?.progress??project.progress??'';
        }
        function openProject(project,event) {
          projectTrigger.current=event.currentTarget;
          setActiveProjectId(project.id);
          setProgressDraft(projectProgress(project));
          setRequirementDraft('');
          setProjectNotice('');
        }
        function closeProject() {
          setActiveProjectId('');
          requestAnimationFrame(()=>projectTrigger.current?.focus());
        }
        function saveProjectNotes(patch) {
          const next=projectNotes({...notes,[activeProject.id]:{progress:projectProgress(activeProject),requirements:[],...notes[activeProject.id],...patch}});
          try {
            localStorage.setItem(PROJECT_NOTES_KEY,JSON.stringify(next));
            setNotes(next);
            setProjectNotice('');
            return true;
          } catch {
            setProjectNotice('保存失败，内容仍在输入框里。');
            return false;
          }
        }
        async function handoff(project,requirements) {
          if(handingOff)return;
          setHandingOff(true);
          setProjectNotice('');
          try {
            const progress=projectProgress(project);
            const message=[
              '继续开发「'+project.title+'」'+(project.version?'（v'+project.version+'）':'')+'。',
              progress&&'当前进展：'+progress,
              '按下列顺序推进。先从第 1 项开始，其余保留为后续任务。',
              ...requirements.map((item,index)=>(index+1)+'. '+item.title),
            ].filter(Boolean).join('\n');
            await navigator.clipboard.writeText(message);
            if(await navigate(projectDestination(project)))closeProject();
            else if(alive.current)setProjectNotice('已复制需求，请手动打开开发对话并粘贴。');
          } catch {
            if(alive.current)setProjectNotice('暂时无法复制，请选中文字手动复制。');
          } finally {
            if(alive.current)setHandingOff(false);
          }
        }
        function projectDetail() {
          if(!activeProject)return null;
          const requirements=list(notes[activeProject.id]?.requirements),pending=requirements.filter(item=>!item.done);
          return h('div',{className:'pw-modal-backdrop'},h('section',{className:'pw-project-dialog pw-project-detail',role:'dialog','aria-modal':true,'aria-labelledby':'pw-project-detail-title',onKeyDown:event=>{if(event.key==='Escape')closeProject();}},
            h('header',null,h('h2',{id:'pw-project-detail-title'},activeProject.title),h('button',{autoFocus:true,type:'button','aria-label':'关闭项目',onClick:closeProject},'×')),
            h('p',null,projectProgress(activeProject)||'还没有记录开发进展。'),
            requirements.length>0&&h('ul',null,requirements.map(item=>h('li',{key:item.id,style:{textDecoration:item.done?'line-through':undefined}},item.title))),
            projectNotice&&h('p',{role:'status'},projectNotice),
            h('footer',null,h('button',{type:'button',className:'pw-layout-button',onClick:async()=>{if(await navigate(projectDestination(activeProject)))closeProject();}},'打开对话'),pending.length>0&&h('button',{type:'button',className:'pw-layout-button',disabled:handingOff,onClick:()=>void handoff(activeProject,pending)},'复制记录并打开'))));
        }
        function projectBody() {
          if(!allProjects.length)return empty('把项目放在手边','在聊天中说“把这个项目加入主控台”，之后可直接回到开发对话。','grid');
          const field=(key,label,value)=>h('div',{className:'pw-project-field','data-field':key},
            h('dt',{className:'pw-project-field-label'},label),
            h('dd',{className:'pw-project-field-value',title:value||undefined},value||'—'));
          return h('div',{className:'pw-project-list pw-project-tiles'},allProjects.map(project=>{
            const event=list(project.github?.value?.history)[0],pull=project.github?.value?.pull;
            const progress=event?.label||pull?.label||projectProgress(project),version=project.version?['v'+project.version]:[];
            const phase=pull?.state||event?.state||(project.repositoryState==='ambiguous'?'待确认仓库':'进展待同步');
            return h('article',{className:'pw-project-row',key:project.id},
              h('div',{className:'pw-project-heading'},
                project.icon?.startsWith('data:image/png;base64,')?h('img',{className:'pw-project-icon',src:project.icon,alt:''}):h('span',{className:'pw-project-icon is-placeholder'},h(Icon,{name:project.icon==='writing'?'news':project.id==='today-plan'?'calendar':'grid',size:21})),
                h('div',null,h('h3',{title:project.title},project.title),version.length>0&&h('p',{className:'pw-project-version',title:version.join(' · ')},version[0])),
                h('div',{className:'pw-project-meta'},badge(phase.includes('发布')?'done':'unknown',phase))),
              h('button',{className:'pw-dashboard-action pw-project-enter',type:'button',onClick:event=>openProject(project,event),
                'aria-label':'进入项目：'+project.title,title:'进入项目：'+project.title},h(Icon,{name:'arrow',size:17})),
              h('dl',{className:'pw-project-facts'},
                field('progress','最近进展',progress||'尚未同步开发进展')),
              list(notes[project.id]?.requirements).length>0&&h('div',{className:'pw-project-captured-notes'},h('small',null,'已记录 '+notes[project.id].requirements.length+' 条'),h('p',null,notes[project.id].requirements.filter(item=>!item.done).slice(0,2).map(item=>item.title).join(' · ')||'记录已完成')));
          }));
        }
        async function saveProject(event){
          event.preventDefault();const selected=threadOptions.find(item=>item.source+':'+item.id===projectForm.target);
          if(!selected||!projectForm.title.trim()){setProjectError('填写项目名称，并选择一个已有对话。');return;}
          try{await api('projectShortcuts',undefined,{action:'create',title:projectForm.title,version:projectForm.version,progress:projectForm.progress,icon:projectForm.icon,source:selected.source,threadId:selected.id});
            setCustomProjects(list((await api('projects')).shortcuts));setAddingProject(false);setProjectError('');
          }catch{setProjectError('保存失败，请稍后再试。');}
        }
        function projectDialog(){if(!addingProject)return null;return h('div',{className:'pw-modal-backdrop'},h('form',{className:'pw-project-dialog',role:'dialog','aria-modal':true,'aria-labelledby':'pw-add-title',onSubmit:saveProject,onKeyDown:event=>{if(event.key==='Escape')setAddingProject(false);}},h('h2',{id:'pw-add-title'},'添加项目'),h('p',null,'给已有对话留一个入口，下次直接接着做。'),h('label',null,'项目名称',h('input',{autoFocus:true,maxLength:50,required:true,value:projectForm.title,onChange:e=>setProjectForm(value=>({...value,title:e.target.value}))})),h('label',null,'关联对话',h('select',{required:true,value:projectForm.target,onChange:e=>{const selected=threadOptions.find(item=>item.source+':'+item.id===e.target.value);setProjectForm(value=>({...value,target:e.target.value,title:value.title||selected?.title||''}));}},h('option',{value:''},threadOptions.length?'选择一个已有对话':'请先在 Harness 创建对话'),threadOptions.map(item=>h('option',{key:item.source+':'+item.id,value:item.source+':'+item.id},item.title)))),h('label',null,'当前版本（选填）',h('input',{maxLength:40,value:projectForm.version,placeholder:'例如 0.1.0',onChange:e=>setProjectForm(value=>({...value,version:e.target.value.replace(/^v/,'' )}))})),h('label',null,'当前进展（选填）',h('input',{maxLength:120,value:projectForm.progress,onChange:e=>setProjectForm(value=>({...value,progress:e.target.value}))})),h('label',null,'图标',h('select',{value:projectForm.icon,onChange:e=>setProjectForm(value=>({...value,icon:e.target.value}))},h('option',{value:'app'},'应用'),h('option',{value:'writing'},'内容'))),projectError&&h('p',{role:'alert',className:'pw-footer-message'},projectError),h('footer',null,h('button',{type:'button',className:'pw-layout-button',onClick:()=>setAddingProject(false)},'取消'),h('button',{type:'submit',className:'pw-layout-button is-primary',disabled:!threadOptions.length},'添加'))));}
        const contentProps={className:'pw-card-content',ref:node=>{if(node)node.toggleAttribute('inert',grid.editing);}};
        return h('div',{className:'pw-assistant-frame',style:{display:'flex',flex:1,minWidth:0,minHeight:0,height:'100%',overflow:'hidden'}},h('div',{className:'pwb','data-ui-build':WORKBENCH_UI_BUILD,ref:root,'data-editing':String(grid.editing),style:{flex:'1 1 0',minWidth:0}},h('span',{className:'pw-theme-probe','aria-hidden':true}),h('style',null,css),h('div',{className:'pw-shell',ref:node=>{if(node)node.toggleAttribute('inert',addingProject||!!activeProject);}},
          h('header',{className:'pw-head'},h('p',{className:'pw-plugin-name',title:'dsh-personal-workbench'},'dsh-personal-workbench'),h('div',{className:'pw-head-title'},h('h1',null,'个人主控台')),h('div',{className:'pw-head-actions'},grid.editing?h('div',{className:'pw-layout-edit-controls'},h('p',{className:'pw-layout-help',id:'pw-layout-help'},'拖动顶部换位置，拉动右下角调整大小'),h('div',{className:'pw-layout-edit-buttons'},h('button',{className:'pw-layout-button is-quiet',onClick:grid.reset},'恢复默认'),h('button',{className:'pw-layout-button',onClick:grid.cancel},'取消'),h('button',{className:'pw-layout-button is-primary',onClick:grid.finish},'完成'))):h(React.Fragment,null,attentionSummary(),h('button',{className:'pw-layout-button',onClick:grid.edit},h(Icon,{name:'grid',size:13}),'编辑布局'),h('button',{className:'pw-refresh',title:refreshDescription,'aria-label':'刷新首页，'+refreshDescription,'aria-busy':loading,disabled:loading,onClick:()=>setTick(v=>v+1)},h(Icon,{name:'refresh',size:16}),h('span',{className:'pw-refresh-time'},lastRefreshedAt?refreshTime:loading?'同步中':'未同步'))))),
          h('main',{className:'pw-homeboard',ref:grid.viewport,'aria-label':'每日概览'},h('div',{className:'pw-grid-canvas','data-fit-content':grid.fitContent,'data-grid-profile':grid.profile.key,'data-pet-placement':grid.petPlacement,style:grid.canvasStyle},
            h('div',{className:'pw-overview-column pw-overview-left'},
            h('section',{...grid.card('news'),className:'pw-card pw-news pw-news-banner','data-folded':String(newsFolded&&!grid.editing),'aria-label':'每日 AI 日报'},grid.handles('news','每日 AI 日报'),h('div',contentProps,
              h('header',{className:'pw-card-head'},
                h('div',{className:'pw-card-title'},h('h2',null,'每日 AI 日报'),briefEdition),
                h('button',{className:'pw-card-link pw-brief-toggle',type:'button',onClick:toggleBrief,
                  'aria-expanded':!newsFolded,'aria-label':newsFolded?'展开日报':'收起日报',title:newsFolded?'展开日报':'收起日报'},
                  h(Icon,{name:newsFolded?'down':'up',size:16})),
                newsFolded&&!grid.editing&&(news[0]?.title||reader)&&h('div',{className:'pw-brief-folded-headline'},
                  news[0]?.title&&h('span',{title:news[0].title},news[0].title),
                  reader&&h('a',{className:'pw-card-link',href:reader,target:'_blank',rel:'noopener noreferrer','aria-label':'阅读原文'},
                    '阅读原文',h(Icon,{name:'arrow',size:11})))),
              !newsFolded||grid.editing?h('div',{className:'pw-card-body'},newsBody()):null)),
            h('section',{...grid.card('activity'),className:'pw-card pw-activity pw-assistants','aria-label':'AI 助手'},grid.handles('activity','AI 助手'),h('div',contentProps,h('header',{className:'pw-card-head'},h('div',{className:'pw-card-title'},h('h2',null,'AI Agents'))),h('div',{className:'pw-card-body'},assistantBody()))),
            h('section',{...grid.card('projects'),className:'pw-card pw-projects','aria-label':'我的项目'},grid.handles('projects','我的项目'),h('div',contentProps,h('header',{className:'pw-card-head'},h('div',{className:'pw-card-title'},h('h2',null,'我的项目'))),h('div',{className:'pw-card-body'},projectBody())))),
            h('div',{className:'pw-overview-column pw-overview-right'},
            h('section',{...grid.card('pet'),className:'pw-card pw-pet pw-overview-pet','aria-label':'猫咪个人助手'},grid.handles('pet','Data 助手'),h('div',{...contentProps,className:'pw-pet-content'},h('div',{className:'pw-pet-art'},typeof renderFactorySlot==='function'?renderFactorySlot('dsh.personalWorkbenchCat.assistant',{dockTarget:assistantDock,onOpenChange:setAssistantOpen}):h('span',null,'助手连接中')),todayOverview())),
            h('section',{...grid.card('plan'),className:'pw-card pw-plan','data-density':planItems.length>9?'compact':'normal','aria-labelledby':'pw-plan-title'},grid.handles('plan','今日计划'),h('div',contentProps,
              h('header',{className:'pw-card-head'},h('h2',{id:'pw-plan-title'},'今日计划'),planDateNav(),planViewSelector()),
              h('div',{className:'pw-plan-view','data-mode':calendarMode},calendarBody(),
                calendarMode!=='day'&&h('h3',{className:'pw-selected-plan'},viewDate===today?'今天的安排':Number(viewDate.slice(5,7))+' 月 '+Number(viewDate.slice(8))+' 日'+(viewDate<today?' · 计划记录':' · 计划安排')),
                h('div',{className:'pw-progress'},h('div',{className:'pw-progress-track',role:'progressbar','aria-label':'计划完成进度','aria-valuemin':0,'aria-valuemax':Math.max(planItems.length,1),'aria-valuenow':done},h('div',{className:'pw-progress-value',style:{width:planItems.length?Math.round(done/planItems.length*100)+'%':'0%'}})),h('span',{className:'pw-progress-count'},planConnected||planEmpty?calendarMode==='day'?(planItems.length-done)+' 项待办':done+' / '+planItems.length:'—')),
                h('div',{className:'pw-card-body'},planBody())),
              h('form',{className:'pw-card-foot pw-task-form',onSubmit:event=>{event.preventDefault();if(taskTitle.trim())void saveTask('addPlanTask',{title:taskTitle,date:viewDate});}},
                h('input',{'aria-label':'新待办',placeholder:'添加这天的待办…',value:taskTitle,maxLength:200,onChange:event=>setTaskTitle(event.target.value)}),
                h('button',{type:'submit',disabled:savingTask||!taskTitle.trim()},'添加')))))),
          h('footer',{className:'pw-credit','aria-label':'设计署名'},h('span',null,'Designed by '),h('span',{className:'pw-credit-name'},'玄清'),h('span',{className:'pw-credit-separator','aria-hidden':true},' · '),h('span',null,'© 2026'))),
          h('div',{className:readError||error||grid.notice.includes('无法保存')?'pw-footer pw-footer-message':'pw-layout-live',role:'status'},readError || error || grid.notice)),projectDialog(),projectDetail()),h('div',{ref:setAssistantDock,className:'pw-assistant-dock',style:{display:assistantOpen?'flex':'none',flex:assistantOpen?'0 1 480px':'0 0 0',width:assistantOpen?'42%':0,minWidth:0,minHeight:0,overflow:'hidden'}}));
      }
      ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'personal-workbench',order:-10,label:()=>t('title')},()=>h(Icon,{name:'grid',size:20})));
      ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'personal-workbench'},Panel));
    }};
  }
});
