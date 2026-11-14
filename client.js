window.__ModuleLoader__.load({
  id: 'dsh-personal-workbench',
  factory(require) {
    const React = require('react'), h = React.createElement;
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
    const localDay = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const dateLabel = day => {const date = new Date(day+'T12:00:00');return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(date) : day;};
    const clock = value => {const date = new Date(value);return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'}).format(date) : '';};
    const actualPattern = /^(.*?)(（实际\s+(.+?)｜(专注|合计)\s+(\d+h(?:\d+m)?(?:\d+s)?|\d+m(?:\d+s)?|\d+s)）)$/u;
    function taskText(value) {
      const raw = text(value).trim(), match = raw.match(actualPattern);
      return match ? {title:match[1].trimEnd(),note:'实际 '+match[3]+' · 专注 '+match[5]} : {title:raw,note:''};
    }
    async function api(action, signal, input={}) {
      const opening = ['addPlanTask','checkPlanTask'].includes(action);
      const response = await fetch('/api/dsh-personal-workbench'+(opening?'':'?'+new URLSearchParams({action,...input})),{method:opening?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,headers:opening?{'Content-Type':'application/json','X-Personal-UI':'1'}:undefined,body:opening?JSON.stringify({action,input}):undefined});
      const result = await response.json();
      if(!response.ok || result.error) throw new Error(text(result.error) || '暂时无法读取，请稍后再试。');
      return Object.prototype.hasOwnProperty.call(result,'value') ? result.value : result;
    }
    const productionCache=new Map();
    async function production(signal) {
      async function read(args) {
        const response = await fetch('/api/redflow-workbench?'+new URLSearchParams(args),{credentials:'same-origin',cache:'no-store',signal});
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
          if(run.status!=='done'||!source||!uuid.test(run.result_id||'')||!recent(run.updated_at))continue;
          const key=source[1]+':'+run.result_id.toLowerCase();if(!candidates.has(key))candidates.set(key,{run,source,key});
        }
        let resultsUnavailable=false;
        const results=(await Promise.all([...candidates.values()].slice(0,6).map(async({run,source,key})=>{
          try {
            const cache=productionCache.get(key+':'+run.updated_at);
            const record=cache&&Date.now()-cache.at<60000?cache.record:await read({action:'detail',kind:source[0],id:run.result_id});
            if(!record||text(record.id).toLowerCase()!==run.result_id.toLowerCase())return null;
            productionCache.set(key+':'+run.updated_at,{at:Date.now(),record});if(productionCache.size>30)productionCache.delete(productionCache.keys().next().value);
            return {key,title:text(record.title).trim().slice(0,150)||'已生成内容',status:'已生成',updatedAt:run.updated_at,url:'https://www.pipeline.xin/workspace/task-pool/'+source[1]+'/'+run.result_id.toLowerCase()};
          } catch(error){if(signal.aborted)throw error;resultsUnavailable=true;return null;}
        }))).filter(Boolean);
        return {availability:'connected',items,results,resultsUnavailable,checkedAt:new Date().toISOString()};
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
    function dayDigest(plan,today){
      if(!plan||plan.date!==today||!['connected','empty'].includes(plan.availability))return {headline:'今天，先从一件小事开始',body:'计划还在同步。等安排就绪后，我会在这里帮你梳理。',goal:'你的每日安排，会成为今天的行动方向。'};
      const items=list(plan.items),remaining=items.filter(item=>!item.checked),first=remaining[0];
      return {headline:items.length?remaining.length?'今天还有 '+remaining.length+' 件安排':'今天的计划都已完成':'今天想做些什么？',body:remaining.slice(0,2).map(item=>taskText(item.title||item.text).title).join('；')||'给自己留一点休息，也可以安排下一步。',goal:first?'先把「'+taskText(first.title||first.text).title+'」往前推进。':'按自己的节奏，安排今天最重要的事。'};
    }
    function assistantOverview(monitor,now=Date.now()){
      const synced=monitor?.availability==='connected'&&(!monitor.checkedAt||now-Date.parse(monitor.checkedAt)<45000),runs=list(monitor?.items).filter(run=>recent(run.updated_at,now)).sort((a,b)=>Number(activeStatus(b.status))-Number(activeStatus(a.status))||Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,5);
      const clean=value=>text(value).replace(/(?:sk-|Bearer\s+)[A-Za-z0-9_-]{10,}/g,'[已隐藏]').slice(0,180);
      const operation=runs.map(run=>({id:run.id,title:runLabel(run),state:!synced?'unknown':activeStatus(run.status)?'active':['error','failed','interrupted'].includes(run.status)?'failed':run.status==='done'?'done':'unknown',label:!synced?'待同步':run.status==='done'?'执行完成':run.status==='error'||run.status==='failed'?'失败':run.status==='interrupted'?'已中断':['queued','pending'].includes(run.status)?'排队中':activeStatus(run.status)?'进行中':'待确认',detail:clean(run.error_message||run.message)||(!synced?'暂时无法核对最新状态':'等待下一次进展'),updatedAt:run.updated_at}));
      return {operation,synced};
    }
    const PROJECT_SHORTCUTS_KEY='dsh-personal-workbench:project-shortcuts:v1';
    const PROJECT_NOTES_KEY='dsh-personal-workbench:project-notes:v1';
    function projectShortcuts(value){return list(value).slice(0,20).filter(item=>item&&typeof item.title==='string'&&item.title.trim()&&sessionId.test(item.threadId||'')&&item.source==='harness').map(item=>({id:uuid.test(item.id||'')?item.id:item.threadId,title:item.title.trim().slice(0,50),version:text(item.version).slice(0,40),progress:text(item.progress).trim().slice(0,120),threadId:item.threadId.toLowerCase(),source:item.source,icon:['app','code','design','writing'].includes(item.icon)?item.icon:'app'}));}
    function projectNotes(value) {
      if(!value||typeof value!=='object')return {};
      return Object.fromEntries(Object.entries(value).filter(([id,note])=>/^[\w-]{1,80}$/.test(id)&&note&&typeof note==='object').map(([id,note])=>[id,{
        progress:text(note.progress).trim().slice(0,120),
        requirements:list(note.requirements).slice(0,100).filter(item=>item&&uuid.test(item.id||'')&&text(item.title).trim())
          .map(item=>({id:item.id,title:item.title.trim().slice(0,400),done:item.done===true})),
      }]));
    }
    /* GRID_GEOMETRY_START */
    // Geometry stays independent of DOM pixels. Persisted values are untrusted;
    // only known cards and bounded integer grid coordinates are accepted.
    function gridProfile(width) {
      return width>=1000?{key:'wide',cols:12,minW:4,rows:12}:width>=640?{key:'medium',cols:8,minW:4,rows:12}:{key:'narrow',cols:4,minW:4,rows:12};
    }
    function gridDefaults(profile) {
      const folded=profile.collapsed===true;
      if(profile.cols===4)return [{id:'plan',x:0,y:folded?4:6,w:4,h:6},{id:'news',x:0,y:0,w:4,h:folded?1:3},{id:'activity',x:0,y:folded?10:12,w:4,h:4},{id:'pet',x:0,y:folded?1:3,w:4,h:3},{id:'projects',x:0,y:folded?14:16,w:4,h:3}];
      const left=profile.cols===12?7:4,right=profile.cols-left;
      return [{id:'plan',x:left,y:4,w:right,h:8},{id:'news',x:0,y:0,w:left,h:folded?1:4},{id:'activity',x:0,y:folded?1:4,w:left,h:4},{id:'pet',x:left,y:0,w:right,h:4},{id:'projects',x:0,y:folded?5:8,w:left,h:4}];
    }
    function gridBound(value,fallback,min,max) {
      return Math.max(min,Math.min(max,typeof value==='number'&&Number.isFinite(value)?Math.round(value):fallback));
    }
    function gridCard(value,fallback,profile) {
      const w=gridBound(value?.w,fallback.w,profile.minW,profile.cols);
      return {id:fallback.id,x:gridBound(value?.x,fallback.x,0,profile.cols-w),y:gridBound(value?.y,fallback.y,0,160),w,h:profile.collapsed&&fallback.id==='news'?1:gridBound(value?.h,fallback.h,['news','pet','projects'].includes(fallback.id)?3:4,24)};
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
      const defaults=gridDefaults(profile),rows=Array.isArray(value)?value:[],seen=new Set(),byId=new Map();
      for(const row of rows.slice(0,32))if(row&&typeof row==='object'&&defaults.some(card=>card.id===row.id)&&!seen.has(row.id)){seen.add(row.id);byId.set(row.id,row);}
      const cards=defaults.map(card=>gridCard(byId.get(card.id),card,profile)),placed=[];
      const ordered=[...cards].sort((a,b)=>a.y-b.y||a.x-b.x||defaults.findIndex(d=>d.id===a.id)-defaults.findIndex(d=>d.id===b.id));
      for(const card of ordered){const next=gridPlace(card,placed,profile);if(!next){placed.length=0;for(const row of ordered)placed.push(gridPlace({...row,y:0},placed,profile));break;}placed.push(next);}
      if(profile.collapsed)for(const card of [...placed].filter(item=>item.id!=='news').sort((a,b)=>a.y-b.y)){while(card.y>0&&gridFits({...card,y:card.y-1},placed.filter(item=>item!==card)))card.y--;}
      return defaults.map(card=>placed.find(row=>row.id===card.id));
    }
    function gridArrange(value,id,patch,profile) {
      const base=gridNormalize(value,profile),old=base.find(card=>card.id===id);
      if(!old)return base;
      const active=gridCard({...old,...(patch&&typeof patch==='object'?patch:{})},old,profile);
      if(['x','y','w','h'].every(key=>old[key]===active[key]))return base;
      const placed=[active],others=base.filter(card=>card.id!==id).sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const card of others){const next=gridPlace(card,placed,profile);if(!next){placed.splice(1);for(const row of others)placed.push(gridPlace({...row,y:0},placed,profile));break;}placed.push(next);}
      // Fill vertical gaps left by moving/shrinking a card. Only passive cards
      // compact; the card the person is holding always remains at their target.
      const passive=placed.filter(card=>card.id!==id).sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const card of passive){const occupied=placed.filter(other=>other!==card);while(card.y>0&&gridFits({...card,y:card.y-1},occupied))card.y--;}
      return base.map(card=>placed.find(row=>row.id===card.id));
    }
    /* GRID_GEOMETRY_END */
    function Icon({name='grid',size=18}) {
      const paths={grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',calendar:'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7 2v4M17 2v4M3 10h18M7 14h3M14 14h3',check:'m5 12 4 4L19 6',news:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5M8 18h7',refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M18 18a8 8 0 0 1-13-2',arrow:'M7 17 17 7M7 7h10v10',chevron:'m9 5 7 7-7 7',activity:'M3 12h4l3-8 4 16 3-8h4',chat:'M21 11a8 8 0 0 1-8 8H5l-4 3V11a10 10 0 0 1 20 0z',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z'};
      return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.grid}));
    }
    const css=`
.pwb{--pw-bg:#f5f5f7;--pw-paper:#fff;--pw-ink:#1d1d1f;--pw-muted:#787880;--pw-line:rgba(60,60,67,.10);--pw-blue:#007aff;--pw-hover:rgba(0,122,255,.045);--pw-plan:#fffcf3;--pw-plan-ink:#35352d;--pw-plan-muted:#8d887a;--pw-olive:#77866b;--pw-plan-line:#e7e1d2;--pw-news:#f2f6fd;--pw-orange:#b76b16;height:100%;min-height:0;position:relative;isolation:isolate;z-index:0;overflow:hidden;background:var(--pw-bg);color:var(--pw-ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","PingFang SC",sans-serif;-webkit-font-smoothing:antialiased;container-type:inline-size;container-name:pw-root;color-scheme:light}
.pwb[data-appearance=dark]{--pw-bg:#1c1c1e;--pw-paper:#2c2c2e;--pw-ink:#f5f5f7;--pw-muted:#a1a1a6;--pw-line:rgba(235,235,245,.11);--pw-blue:#5aa7ff;--pw-hover:rgba(90,167,255,.06);--pw-plan:#2e3029;--pw-plan-ink:#eeeee2;--pw-plan-muted:#b4b1a0;--pw-olive:#adbfa0;--pw-plan-line:#47493c;--pw-news:#292f39;--pw-orange:#e7b165;color-scheme:dark}
.pwb,.pwb *{box-sizing:border-box}.pwb h1,.pwb h2,.pwb h3,.pwb p{margin:0}.pwb button,.pwb a{font:inherit;color:inherit}.pwb button{border:0;background:none;padding:0;cursor:pointer}.pwb a{text-decoration:none}.pwb svg{flex-shrink:0}.pwb button:disabled{opacity:.5;cursor:default}.pwb :is(button,a):focus-visible{outline:3px solid var(--pw-blue);outline-offset:3px;border-radius:5px}.pwb .pw-theme-probe{position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--dsw-alias-bg-base,#f5f5f7)}
.pwb .pw-shell{--pw-gutter:28px;max-width:1380px;height:100%;margin:auto;padding:0 var(--pw-gutter);display:flex;flex-direction:column;min-height:0}.pwb .pw-head{flex-shrink:0;min-height:92px;display:flex;align-items:center;gap:16px;justify-content:space-between}.pwb .pw-head h1{font-size:23px;line-height:1.25;font-weight:650;letter-spacing:-.6px}.pwb .pw-date{color:var(--pw-muted);font-size:12px;margin-top:5px}.pwb .pw-refresh{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;color:var(--pw-muted);-webkit-app-region:no-drag}.pwb .pw-refresh:hover{background:var(--pw-line);color:var(--pw-ink)}
.pwb .pw-homeboard{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1.35fr) minmax(0,1fr);gap:20px}.pwb .pw-card{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:20px;box-shadow:0 2px 10px rgba(20,20,30,.025);overflow:hidden}.pwb .pw-plan{grid-row:1/3;background:var(--pw-plan);color:var(--pw-plan-ink);border-color:var(--pw-plan-line)}.pwb .pw-news{grid-column:2;grid-row:1}.pwb .pw-activity{grid-column:2;grid-row:2}.pwb .pw-card-head{padding:21px 24px 13px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0}.pwb .pw-card-title{display:flex;align-items:center;gap:9px;min-width:0}.pwb .pw-card-title h2{font-size:17px;letter-spacing:-.35px;font-weight:650}.pwb .pw-card-title>svg{color:var(--pw-muted);width:17px;height:17px}.pwb .pw-card-link{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;color:var(--pw-muted);font-size:11px;min-height:26px}.pwb .pw-card-link:hover{color:var(--pw-blue)}.pwb .pw-count{font-size:11px;color:var(--pw-muted);font-variant-numeric:tabular-nums;white-space:nowrap}.pwb .pw-card-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent}.pwb .pw-card-foot{flex-shrink:0;margin:0 24px;padding:11px 0 13px;border-top:1px solid var(--pw-line);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:var(--pw-muted)}
.pwb .pw-plan .pw-card-head{padding:25px 27px 12px;align-items:flex-end}.pwb .pw-plan h2{font:600 32px/1.2 "Songti SC","STSong","Noto Serif CJK SC",serif;letter-spacing:1px}.pwb .pw-plan .pw-card-link{color:var(--pw-plan-muted)}.pwb .pw-progress{display:flex;align-items:center;gap:12px;padding:5px 27px 17px;color:var(--pw-plan-muted);font-size:12px;flex-shrink:0}.pwb .pw-progress-track{height:5px;background:var(--pw-plan-line);border-radius:5px;overflow:hidden;flex:1}.pwb .pw-progress-value{height:100%;background:var(--pw-olive);border-radius:inherit}.pwb .pw-plan .pw-card-body{padding:0 27px 8px}.pwb .pw-plan-group+.pw-plan-group{margin-top:19px}.pwb .pw-group-title{font-size:12px;font-weight:600;color:var(--pw-plan-muted);margin:4px 0 7px;line-height:1.6}.pwb .pw-plan-row{display:flex;gap:11px;align-items:flex-start;padding:8px 0;min-width:0}.pwb .pw-plan-check{border:1.5px solid var(--pw-plan-muted);border-radius:5px;width:17px;height:17px;display:flex;align-items:center;justify-content:center;margin-top:2px;flex-shrink:0}.pwb .pw-plan-row.is-done .pw-plan-check{background:var(--pw-olive);border-color:var(--pw-olive);color:var(--pw-plan)}.pwb .pw-plan-copy{min-width:0;flex:1}.pwb .pw-plan-text{font-size:14px;line-height:1.55;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pwb .is-done .pw-plan-text{color:var(--pw-plan-muted);text-decoration:line-through;text-decoration-thickness:1px}.pwb .pw-plan[data-density=compact] .pw-plan-row{padding:5px 0}.pwb .pw-plan[data-density=compact] .pw-plan-text{font-size:13px}.pwb .pw-plan[data-density=compact] .pw-plan-group+.pw-plan-group{margin-top:14px}.pwb .pw-plan-meta{font-size:10px;color:var(--pw-olive);margin-top:3px}.pwb .pw-plan-note{color:var(--pw-plan-muted);font-size:11px;line-height:1.65;margin:7px 0;white-space:pre-line;overflow-wrap:anywhere}.pwb .pw-plan-note.quote{border-left:2px solid var(--pw-olive);padding-left:10px}.pwb .pw-plan-note.callout{background:color-mix(in srgb,var(--pw-olive) 9%,transparent);padding:9px 11px;border-radius:8px;color:var(--pw-plan-ink)}.pwb .pw-plan-nested{padding-left:28px}.pwb .pw-plan-nested .pw-plan-text{font-size:12px}.pwb .pw-plan .pw-card-foot{margin:0 27px;border-color:var(--pw-plan-line);color:var(--pw-plan-muted)}.pwb .pw-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--pw-olive);margin-right:6px;vertical-align:1px}
.pwb .pw-news-list{padding:0 24px 6px}.pwb .pw-news-entry{display:block;padding:6px 0;border-top:1px solid var(--pw-line)}.pwb .pw-news-entry:first-child{border-top:0;padding-top:1px}.pwb .pw-news-entry.is-lead{background:var(--pw-news);border-radius:10px;padding:12px 14px;margin-bottom:7px}.pwb .pw-news-entry.is-lead+.pw-news-entry{border-top:0}.pwb .pw-news-entry a{display:flex;align-items:flex-start;gap:10px;min-width:0}.pwb .pw-news-entry a:hover .pw-news-title{color:var(--pw-blue)}.pwb .pw-news-number{flex-shrink:0;width:14px;font-size:10px;color:var(--pw-muted);font-variant-numeric:tabular-nums;line-height:21px}.pwb .pw-news-title{font-size:12px;line-height:1.65;font-weight:500;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.pwb .is-lead .pw-news-title{font-size:15px;line-height:1.4;font-weight:600;-webkit-line-clamp:2;letter-spacing:-.2px}.pwb .pw-news-summary{font-size:11px;line-height:1.65;color:var(--pw-muted);margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pwb .pw-news-entry:not(.is-lead) .pw-news-arrow{margin-left:auto;color:var(--pw-muted);align-self:center;width:11px}.pwb .pw-news-entry>div{min-width:0}.pwb .pw-news-date{font-size:10px;color:var(--pw-muted);white-space:nowrap}
.pwb .pw-activity-list{padding:0 24px 5px}.pwb .pw-activity-row{display:flex;align-items:center;gap:11px;min-width:0;width:100%;text-align:left;padding:10px 0;border-top:1px solid var(--pw-line);color:var(--pw-ink)}.pwb .pw-activity-row:first-child{border-top:0}.pwb button.pw-activity-row:hover .pw-activity-title{color:var(--pw-blue)}.pwb .pw-activity-icon{width:30px;height:30px;border-radius:9px;background:var(--pw-news);color:var(--pw-blue);display:flex;align-items:center;justify-content:center;flex-shrink:0}.pwb .pw-activity-icon.is-waiting{background:color-mix(in srgb,var(--pw-orange) 9%,transparent);color:var(--pw-orange)}.pwb .pw-activity-copy{min-width:0;flex:1}.pwb .pw-activity-title{font-size:12px;line-height:1.55;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pwb .pw-activity-status{font-size:10px;color:var(--pw-muted);margin-top:3px;display:flex;gap:8px;align-items:center}.pwb .pw-activity-status .is-waiting{color:var(--pw-orange)}.pwb .pw-activity-status .pw-running{color:var(--pw-blue)}.pwb .pw-activity-owner{border-right:1px solid var(--pw-line);padding-right:8px}.pwb .pw-row-arrow{color:var(--pw-muted);width:12px}.pwb .pw-quiet-link{font-size:11px;display:inline-flex;align-items:center;gap:5px;color:var(--pw-muted);min-height:24px}.pwb .pw-quiet-link:hover{color:var(--pw-blue)}
.pwb .pw-partial{padding:0 24px 8px;font-size:10px;color:var(--pw-orange)}.pwb .pw-empty{height:100%;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:7px;padding:18px;color:var(--pw-muted)}.pwb .pw-empty>svg{opacity:.55;margin-bottom:5px}.pwb .pw-empty strong{font-size:13px;font-weight:500;color:var(--pw-ink)}.pwb .pw-empty p{font-size:11px;line-height:1.65;max-width:240px}.pwb .pw-footer{min-height:35px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px;color:var(--pw-muted)}.pwb .pw-footer-message{color:var(--pw-orange);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pwb .pw-loading{background:linear-gradient(90deg,var(--pw-line),transparent,var(--pw-line));height:9px;border-radius:4px;margin:16px 24px;max-width:70%}.pwb .pw-loading:nth-child(2){max-width:90%}.pwb .pw-loading:nth-child(3){max-width:45%}
.pwb .pw-head-title{flex-shrink:0}.pwb .pw-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:14px;min-width:0;flex:1}.pwb .pw-attention{position:relative;min-width:0;max-width:360px}.pwb .pw-attention summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:9px 13px;border:1px solid color-mix(in srgb,var(--pw-orange) 15%,transparent);border-radius:12px;background:color-mix(in srgb,var(--pw-orange) 6%,var(--pw-paper));-webkit-app-region:no-drag}.pwb .pw-attention summary::-webkit-details-marker{display:none}.pwb .pw-attention summary:focus-visible{outline:3px solid var(--pw-blue);outline-offset:3px}.pwb .pw-attention-label{font-size:12px;font-weight:600;color:var(--pw-orange);white-space:nowrap}.pwb .pw-attention-preview{font-size:11px;color:var(--pw-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:165px}.pwb .pw-attention summary>svg{color:var(--pw-orange);transform:rotate(90deg)}.pwb .pw-attention[open] summary>svg{transform:rotate(-90deg)}.pwb .pw-attention-popover{position:absolute;right:0;top:calc(100% + 9px);width:360px;max-width:calc(100cqw - 24px);max-height:min(440px,65vh);overflow:auto;padding:8px 17px;background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:15px;box-shadow:0 12px 40px rgba(0,0,0,.17);z-index:10}.pwb .pw-attention-item{padding:12px 0;border-top:1px solid var(--pw-line)}.pwb .pw-attention-item:first-child{border-top:0}.pwb .pw-attention-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pwb .pw-attention-item strong{font-size:12px;font-weight:550}.pwb .pw-attention-item p{font-size:11px;line-height:1.6;color:var(--pw-muted);margin-top:5px}.pwb .pw-attention-item .pw-quiet-link{color:var(--pw-blue);margin-top:5px}.pwb .pw-attention-tag{font-size:10px;white-space:nowrap;color:var(--pw-orange)}
.pwb .pw-progress-sections{flex:1;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);padding:0 24px 5px}.pwb .pw-progress-section{min-height:0;display:flex;flex-direction:column}.pwb .pw-progress-section+.pw-progress-section{border-top:1px solid var(--pw-line);padding-top:8px;margin-top:3px}.pwb .pw-section-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}.pwb .pw-section-heading h3{font-size:11px;font-weight:550;color:var(--pw-muted)}.pwb .pw-section-heading span{font-size:10px;color:var(--pw-muted)}.pwb .pw-progress-section .pw-card-body{padding:0}.pwb .pw-progress-section .pw-activity-list{padding:0}.pwb .pw-progress-section .pw-activity-row{padding:6px 0;gap:9px;min-height:42px}.pwb .pw-progress-section .pw-activity-icon{width:27px;height:27px}.pwb .pw-progress-section .pw-activity-status{margin-top:1px}.pwb .pw-section-empty{font-size:11px;line-height:1.6;color:var(--pw-muted);padding:9px 0}.pwb .pw-result-row:hover .pw-activity-title{color:var(--pw-blue)}.pwb .pw-activity-icon.is-result{color:var(--pw-olive);background:color-mix(in srgb,var(--pw-olive) 10%,transparent)}
html[data-platform="darwin"] .pwb .pw-head{padding-inline-start:max(0px,calc(var(--dsh-frame-leading-clearance,0px) - var(--pw-gutter) - max(0px,calc((100cqw - 1380px)/2))))}
@container pw-root (max-width:1050px){.pwb .pw-shell{--pw-gutter:22px}.pwb .pw-homeboard{gap:16px;grid-template-columns:minmax(0,1.04fr) minmax(0,1fr)}.pwb .pw-card-head{padding:18px 19px 11px}.pwb .pw-news-list,.pwb .pw-activity-list{padding-inline:19px}.pwb .pw-card-foot{margin-inline:19px}.pwb .pw-plan .pw-card-head{padding:23px 23px 12px}.pwb .pw-plan .pw-card-body{padding-inline:23px}.pwb .pw-progress{padding-inline:23px}.pwb .pw-plan .pw-card-foot{margin-inline:23px}}
@container pw-root (max-width:720px){.pwb .pw-shell{--pw-gutter:16px}.pwb .pw-head{min-height:78px}.pwb .pw-head h1{font-size:20px}.pwb .pw-homeboard{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1.25fr) minmax(0,1fr) minmax(0,.85fr);gap:12px}.pwb .pw-plan,.pwb .pw-news,.pwb .pw-activity{grid-column:1;grid-row:auto}.pwb .pw-card{border-radius:15px}.pwb .pw-card-head,.pwb .pw-plan .pw-card-head{padding:12px 17px 7px}.pwb .pw-card-title h2{font-size:15px}.pwb .pw-plan h2{font-size:23px}.pwb .pw-progress{padding:3px 17px 8px;gap:9px;font-size:10px}.pwb .pw-plan .pw-card-body{padding:0 17px 3px}.pwb .pw-plan-row{padding:5px 0}.pwb .pw-plan-text{font-size:12px}.pwb .pw-plan-check{width:14px;height:14px}.pwb .pw-group-title{font-size:10px}.pwb .pw-plan-note{font-size:10px}.pwb .pw-card-foot,.pwb .pw-plan .pw-card-foot{margin-inline:17px;padding:5px 0 6px;font-size:10px}.pwb .pw-card-link{font-size:10px}.pwb .pw-news-list,.pwb .pw-activity-list{padding-inline:17px}.pwb .pw-news-entry{padding:6px 0}.pwb .is-lead .pw-news-title{font-size:13px}.pwb .pw-news-summary{-webkit-line-clamp:1;font-size:10px}.pwb .pw-news-entry.is-lead{padding:8px 10px}.pwb .pw-activity-row{padding:7px 0}.pwb .pw-activity-icon{width:25px;height:25px}.pwb .pw-activity-title{font-size:11px}.pwb .pw-empty{padding:10px;gap:3px}.pwb .pw-empty>svg{display:none}.pwb .pw-empty strong{font-size:12px}.pwb .pw-empty p{font-size:10px}.pwb .pw-footer{min-height:28px}.pwb .pw-activity .pw-card-foot{display:none}}
@container pw-root (max-width:430px){.pwb .pw-shell{--pw-gutter:12px}.pwb .pw-head h1{font-size:17px;letter-spacing:-.4px}.pwb .pw-date{font-size:10px}.pwb .pw-head{gap:6px}.pwb .pw-refresh{width:28px;height:28px}.pwb .pw-card-title h2{font-size:14px}}
.pwb .pw-progress-sections{padding:16px 24px 5px;grid-template-rows:minmax(0,.8fr) minmax(0,1.2fr)}.pwb .pw-section-heading h2{font-size:13px;font-weight:600;letter-spacing:-.2px}.pwb .pw-section-heading{padding-bottom:5px}.pwb .pw-progress-section .pw-activity-copy{display:flex;align-items:center;gap:9px}.pwb .pw-progress-section .pw-activity-title{flex:1;min-width:0;font-size:11px}.pwb .pw-progress-section .pw-activity-status{flex-shrink:0;white-space:nowrap;margin:0;gap:6px}.pwb .pw-progress-section .pw-activity-row{min-height:29px;padding:3px 0}.pwb .pw-progress-section .pw-activity-icon{width:23px;height:23px}.pwb .pw-progress-section .pw-activity-owner{padding-right:6px}.pwb .pw-activity .pw-card-foot{padding:5px 0}
.pwb .pw-codex-status{padding:0 24px 5px;color:var(--pw-muted);font-size:10px}.pwb .pw-codex-status.is-stale{color:var(--pw-orange)}.pwb .pw-activity-status .is-unknown{color:var(--pw-muted)}
@container pw-root (max-width:1050px){.pwb .pw-progress-sections{padding-inline:19px}.pwb .pw-attention-preview{max-width:120px}}
@container pw-root (max-width:720px){.pwb .pw-attention-preview{display:none}.pwb .pw-head-actions{gap:6px}.pwb .pw-attention summary{padding:7px 9px;gap:5px}.pwb .pw-attention-label{font-size:10px}.pwb .pw-progress-sections{padding:11px 17px 9px}.pwb .pw-progress-section+.pw-progress-section{padding-top:5px}.pwb .pw-progress-section .pw-activity-row{padding:3px 0;min-height:29px}.pwb .pw-progress-section .pw-activity-status{font-size:9px}.pwb .pw-partial{padding:0 17px 5px}.pwb .pw-section-heading h2{font-size:12px}}
@container pw-root (max-width:520px){.pwb .pw-head{flex-wrap:wrap;gap:0;align-content:center;padding-top:9px;padding-bottom:8px}.pwb .pw-head-title{flex:1;min-width:0}.pwb .pw-head-actions{flex:0 0 auto}.pwb .pw-attention{position:static}.pwb .pw-attention summary{padding:5px 7px}.pwb .pw-attention-label{font-size:10px}.pwb .pw-attention-popover{right:12px;top:78px}.pwb .pw-head:has(.pw-attention){min-height:102px}.pwb .pw-head:has(.pw-attention) .pw-head-title{flex:0 0 100%}.pwb .pw-head h1{white-space:nowrap}.pwb .pw-head:has(.pw-attention) .pw-head-actions{flex-basis:100%;justify-content:flex-start;padding-top:6px}.pwb .pw-head:has(.pw-attention) .pw-refresh{margin-left:auto}.pwb .pw-head:has(.pw-attention) .pw-attention-popover{top:101px}}
@media(max-height:590px){.pwb{overflow:auto}.pwb .pw-shell{min-height:570px}}
@media(prefers-reduced-motion:reduce){.pwb *{scroll-behavior:auto!important}}
.pwb .pw-homeboard{display:block;position:relative;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent;scrollbar-gutter:stable}
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
.pwb .pw-assistant-list{padding:0 21px 8px}.pwb .pw-assistant-group+.pw-assistant-group{border-top:1px solid var(--pw-line);padding-top:10px;margin-top:9px}.pwb .pw-assistant-heading{display:flex;align-items:center;gap:8px}.pwb .pw-assistant-heading strong{font-size:12px;font-weight:600}.pwb .pw-assistant-heading .pw-quiet-link{margin-left:auto;font-size:10px}.pwb .pw-assistant-avatar{width:25px;height:25px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--pw-news);color:var(--pw-blue);flex-shrink:0}.pwb .pw-assistant-avatar.is-news{color:var(--pw-olive);background:var(--pw-plan)}.pwb .pw-mini-meta{font-size:9px;color:var(--pw-muted)}.pwb button.pw-assistant-task{display:block;width:100%;text-align:left;padding:5px 0 2px 33px}.pwb .pw-assistant-task>div{display:flex;align-items:center;gap:8px;font-size:11px}.pwb .pw-assistant-task p,.pwb .pw-assistant-detail,.pwb .pw-assistant-empty{font-size:10px;color:var(--pw-muted);line-height:1.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwb .pw-assistant-detail,.pwb .pw-assistant-empty{padding-left:33px;margin-top:3px}.pwb .pw-state{font-size:9px;line-height:1.5;border-radius:5px;padding:1px 5px;background:var(--pw-line);color:var(--pw-muted);white-space:nowrap}.pwb .pw-state[data-state=active]{color:var(--pw-blue);background:color-mix(in srgb,var(--pw-blue) 9%,transparent)}.pwb .pw-state[data-state=done]{color:var(--pw-olive);background:color-mix(in srgb,var(--pw-olive) 12%,transparent)}.pwb .pw-state[data-state=failed],.pwb .pw-state[data-state=attention]{color:var(--pw-orange);background:color-mix(in srgb,var(--pw-orange) 10%,transparent)}.pwb .pw-assistant-more{margin-top:10px;font-size:10px;color:var(--pw-muted)}.pwb .pw-assistant-more summary{cursor:pointer;padding:3px 0}.pwb .pw-assistant-more .pw-activity-list{padding:5px 0}.pwb .pw-assistant-results{padding-top:5px;border-top:1px solid var(--pw-line)}.pwb .pw-assistants .pw-card-foot{display:flex}
.pwb .pw-project-list{padding:0 21px}.pwb .pw-project-row{display:flex;align-items:center;border-top:1px solid var(--pw-line)}.pwb .pw-project-row:first-child{border-top:0}.pwb .pw-project-open{display:flex;align-items:center;gap:12px;width:100%;min-width:0;text-align:left;padding:10px 0}.pwb .pw-project-icon{width:37px;height:37px;object-fit:contain;flex-shrink:0;border-radius:10px}.pwb .pw-project-icon.is-placeholder{display:flex;align-items:center;justify-content:center;color:var(--pw-blue);background:var(--pw-news)}.pwb .pw-project-copy{flex:1;min-width:0}.pwb .pw-project-copy strong{font-weight:550;font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwb .pw-project-copy small{color:var(--pw-muted);font-size:10px;display:block;margin-top:3px}.pwb .pw-project-open>svg{color:var(--pw-muted)}.pwb .pw-project-remove{padding:8px;color:var(--pw-muted)}
.pwb .pw-plan .pw-card-head{padding:20px 23px 10px}.pwb .pw-plan h2{font-size:27px}.pwb .pw-plan .pw-card-body{padding-inline:23px}.pwb .pw-plan .pw-progress{padding:9px 23px 13px}.pwb .pw-plan .pw-card-foot{margin-inline:23px}.pwb .pw-calendar{padding:0 23px;flex-shrink:0}.pwb .pw-calendar-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px}.pwb .pw-segmented{display:flex;padding:2px;border-radius:8px;background:var(--pw-plan-line);gap:1px}.pwb .pw-segmented button{font-size:11px;min-width:27px;padding:3px 6px;border-radius:6px;color:var(--pw-plan-muted)}.pwb .pw-segmented button[aria-pressed=true]{background:var(--pw-paper);color:var(--pw-ink);box-shadow:0 1px 3px #0001}.pwb .pw-date-nav{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--pw-plan-muted)}.pwb .pw-date-nav button{min-width:23px;min-height:26px;border-radius:6px;font-size:18px}.pwb .pw-date-nav button:hover{background:var(--pw-plan-line)}.pwb .pw-date-nav .pw-today{font-size:10px}.pwb .pw-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin-top:9px}.pwb .pw-week-label{text-align:center;color:var(--pw-plan-muted);font-size:9px;padding-bottom:3px}.pwb .pw-calendar-grid button{border-radius:7px;min-height:25px;font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}.pwb .pw-calendar-grid button i{width:3px;height:3px;border-radius:50%;background:transparent}.pwb .pw-calendar-grid button i.has-plan{background:var(--pw-olive)}.pwb .pw-calendar-grid button.is-today{color:var(--pw-blue);font-weight:650}.pwb .pw-calendar-grid button.is-outside{opacity:.4}.pwb .pw-calendar-grid button[aria-pressed=true]{background:var(--pw-olive);color:var(--pw-paper)}.pwb .pw-calendar-grid button[aria-pressed=true] i.has-plan{background:var(--pw-paper)}.pwb .pw-calendar-status{font-size:9px;color:var(--pw-plan-muted);padding-top:5px}
.pwb .pw-modal-backdrop{position:absolute;inset:0;z-index:30;background:#0005;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}.pwb .pw-project-dialog{background:var(--pw-paper);border:1px solid var(--pw-line);border-radius:20px;padding:24px;width:390px;max-width:100%;max-height:95%;overflow:auto;box-shadow:0 20px 70px #0003}.pwb .pw-project-dialog h2{font-size:20px}.pwb .pw-project-dialog>p{font-size:12px;color:var(--pw-muted);margin:7px 0 18px}.pwb .pw-project-dialog label{display:block;font-size:12px;margin-top:13px}.pwb .pw-project-dialog input,.pwb .pw-project-dialog select{display:block;width:100%;margin-top:6px;padding:9px 10px;background:var(--pw-bg);border:1px solid var(--pw-line);border-radius:8px;color:var(--pw-ink);font:inherit}.pwb .pw-project-dialog footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}
@container pw-card (max-width:400px){.pwb .pw-calendar{padding-inline:16px}.pwb .pw-date-nav{gap:3px;font-size:10px}.pwb .pw-pet-main{padding:12px;gap:4px}.pwb .pw-pet-art{flex-basis:80px}.pwb .pw-pet .hbc-launcher{width:80px!important}.pwb .pw-pet .hbc-launcher svg{width:78px;height:78px}.pwb .pw-pet-copy h2{font-size:15px}.pwb .pw-card .pw-card-title h2{font-size:15px}.pwb .pw-news-banner .pw-folded-summary{display:none}.pwb .pw-assistant-list,.pwb .pw-project-list{padding-inline:16px}.pwb .pw-project-copy strong{font-size:12px}}

/* Match the warm paper background in the HOSHI ONE reference. */
.pwb,.pwb[data-appearance=dark] {
  --pw-bg:#f2f0e8;
  --pw-paper:#fbfaf6;
  --pw-glass:rgba(255,255,255,.62);
  --pw-glass-edge:rgba(255,255,255,.82);
  --pw-ink:#111;
  --pw-muted:#625d54;
  --pw-line:rgba(17,17,17,.15);
  --pw-accent:#d81b1e;
  --pw-blue:#b31719;
  --pw-hover:rgba(17,17,17,.055);
  --pw-plan:var(--pw-glass);
  --pw-plan-ink:var(--pw-ink);
  --pw-plan-muted:var(--pw-muted);
  --pw-plan-line:var(--pw-line);
  --pw-olive:var(--pw-accent);
  --pw-news:rgba(17,17,17,.045);
  --pw-orange:#7c4a04;
  --pw-gold:#e9a514;
  --pw-tile:rgba(255,255,255,.30);
  --pw-on-accent:#fff;
  --pw-display:"Oswald","Arial Narrow","PingFang SC",-apple-system,sans-serif;
  color-scheme:light;
  font-family:"Inter","PingFang SC",-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--pw-bg);
}
.pwb .pw-head-title h1 {font-family:var(--pw-display);font-size:34px;font-weight:700;line-height:1.1;letter-spacing:-.025em}
.pwb .pw-head-title {position:relative;padding-inline-start:14px}
.pwb .pw-head-title::before {
  content:"";
  position:absolute;
  inset:3px auto 3px 0;
  width:3px;
  border-radius:2px;
  background:var(--pw-accent);
}
.pwb .pw-date {font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}
.pwb .pw-card {
  border-radius:16px;
  background:
    linear-gradient(145deg,rgba(255,255,255,.045),transparent 55%),
    var(--pw-glass);
  border-color:var(--pw-glass-edge);
  box-shadow:0 8px 24px rgba(30,25,15,.065);
  backdrop-filter:blur(12px);
}
.pwb .pw-card-title h2 {font-size:18px;font-weight:680}
.pwb .pw-card-title>svg {color:var(--pw-blue)}
.pwb .pw-card-foot {font-size:11px}
.pwb .pw-layout-button {border-radius:6px;font-weight:600}
.pwb .pw-layout-button.is-primary {background:var(--pw-accent);border-color:var(--pw-accent);color:var(--pw-on-accent)}
.pwb .pw-layout-button.is-primary:hover {background:#c71619}
.pwb .pw-assistant-avatar,.pwb .pw-attention summary,.pwb .pw-segmented,.pwb .pw-calendar-grid button {border-radius:6px}
.pwb .pw-project-dialog,.pwb .pw-attention-popover {border-radius:16px}
.pwb .pw-project-dialog :is(input,select,textarea) {border-radius:6px}
.pwb .pw-card-link,.pwb .pw-layout-button,.pwb .pw-quiet-link {
  transition:color 150ms ease,background-color 150ms ease,border-color 150ms ease;
}
@media(prefers-reduced-motion:reduce) {
  .pwb .pw-card-link,.pwb .pw-layout-button,.pwb .pw-quiet-link {transition:none}
}

.pwb .pw-news-banner .pw-card-content {position:relative;isolation:isolate}
.pwb .pw-news-banner .pw-card-title h2 {font-size:16px;font-weight:650}
.pwb .pw-news-banner .pw-card-title>svg {width:16px;height:16px;color:var(--pw-blue)}
.pwb .pw-news-banner .pw-card-link {color:var(--pw-ink)}
.pwb .pw-news-banner .pw-card-link:hover {color:var(--pw-blue)}
.pwb .pw-news-banner .pw-news-copy {min-width:0}
.pwb .pw-news-banner .pw-news-entry.is-lead {margin-bottom:3px;padding-bottom:7px}
.pwb .pw-news-banner .is-lead .pw-news-title {font-size:clamp(17px,4.2cqw,25px);font-weight:690;line-height:1.35}
.pwb .pw-news-banner .pw-news-summary {font-size:12px}
.pwb .pw-news-banner .pw-news-entry:not(.is-lead) {padding-block:5px}
.pwb .pw-news-banner .pw-news-entry:not(.is-lead) .pw-news-title {color:var(--pw-muted)}
.pwb .pw-news-banner .pw-news-entry a:hover .pw-news-title {color:var(--pw-blue)}
.pwb .pw-news-banner :is(a,button):focus-visible {outline-color:var(--pw-blue);outline-offset:-2px}
.pwb .pw-news-actions {display:flex;align-items:center;gap:clamp(6px,2cqw,16px);flex-shrink:0}

.pwb .pw-pet {
  background:transparent;
  border-color:transparent;
  box-shadow:none;
  backdrop-filter:none;
}
.pwb .pw-pet-art {display:grid;place-items:center}
.pwb .pw-pet .pw-card-foot {border-top-color:transparent}
.pwb[data-editing=true] .pw-pet {
  border:1px dashed color-mix(in srgb,var(--pw-blue) 55%,transparent);
  box-shadow:none;
}
.pwb .pw-pet-copy h2 {font-size:19px;line-height:1.3}
.pwb .pw-pet-copy p {font-size:12px;line-height:1.55}
.pwb .pw-pet-copy .pw-pet-goal {font-size:11px;line-height:1.45}
.pwb .pw-assistant-list {display:grid;gap:6px}
.pwb .pw-assistant-group {
  min-width:0;
  padding:7px 10px;
  border:1px solid var(--pw-line);
  border-radius:6px;
  background:var(--pw-tile);
}
.pwb .pw-assistant-group+.pw-assistant-group {margin-top:0;padding-top:7px}
.pwb .pw-assistant-avatar.is-news {color:var(--pw-orange);background:color-mix(in srgb,var(--pw-gold) 24%,var(--pw-paper))}
.pwb .pw-assistant-heading .pw-quiet-link {padding-inline:3px;color:var(--pw-blue);white-space:nowrap}
.pwb .pw-state {border-radius:99px;padding:2px 6px;font-size:10px}
.pwb .pw-state[data-state=failed] {background:rgba(216,26,29,.17);color:var(--pw-blue)}
.pwb .pw-assistant-more {margin-top:0}

.pwb .pw-project-list {display:grid;gap:7px;padding-bottom:5px}
.pwb .pw-project-row,.pwb .pw-project-row:first-child {
  min-width:0;
  border:1px solid var(--pw-line);
  border-radius:6px;
  background:var(--pw-tile);
}
.pwb .pw-project-row:focus-within,.pwb .pw-project-row:hover {background:var(--pw-hover)}
.pwb .pw-project-open {padding:8px 10px;gap:9px}
.pwb .pw-project-open:focus-visible {outline-offset:-3px}
.pwb .pw-project-open>svg {color:var(--pw-blue)}
.pwb .pw-project-icon {width:33px;height:33px}
.pwb .pw-project-copy .pw-project-progress {white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
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
  .pwb .pw-project-list,.pwb .pw-assistant-list {grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .pwb .pw-project-list>:first-child:not(.pw-project-row),.pwb .pw-assistant-more {grid-column:1/-1}
  .pwb .pw-project-open {min-height:76px;padding:12px}
  .pwb .pw-project-icon {width:39px;height:39px}
}

.pwb .pw-plan h2 {font:700 25px/1.2 var(--pw-display);letter-spacing:-.5px}
.pwb .pw-plan .pw-card-link {color:var(--pw-blue)}
.pwb .pw-plan-view {display:flex;flex:1;min-height:0;flex-direction:column}
.pwb .pw-plan-view[data-mode=month] {overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--pw-line) transparent}
.pwb .pw-plan-view[data-mode=month]>.pw-card-body {flex:0 0 auto;overflow:visible}
.pwb .pw-segmented {background:var(--pw-tile);border:1px solid var(--pw-line);border-radius:10px}
.pwb .pw-segmented button {min-height:24px}
.pwb .pw-segmented button[aria-pressed=true] {background:var(--pw-accent);color:var(--pw-on-accent);box-shadow:none}
.pwb .pw-date-nav>span {color:var(--pw-ink);font-weight:650;white-space:nowrap}
.pwb .pw-date-nav .pw-today {padding:0 5px;color:var(--pw-blue)}
.pwb .pw-calendar-grid {row-gap:4px}
.pwb .pw-calendar-grid button {gap:1px;border-radius:8px;min-height:26px}
.pwb .pw-calendar-grid button > span {min-width:23px;padding:2px;text-align:center;border-radius:50%}
.pwb .pw-calendar-grid button:hover {background:var(--pw-hover)}
.pwb .pw-calendar-grid button[aria-pressed=true] {background:transparent;color:var(--pw-ink);font-weight:700}
.pwb .pw-calendar-grid button[aria-pressed=true] > span {background:var(--pw-olive);color:var(--pw-on-accent)}
.pwb .pw-calendar-grid button.is-today:not([aria-pressed=true]) > span {background:var(--pw-gold);color:#111}
.pwb .pw-calendar-grid button[aria-pressed=true] i.has-plan {background:var(--pw-blue)}
.pwb .pw-calendar-grid button.is-outside {color:var(--pw-muted);opacity:.72}
.pwb .pw-week-label {font-size:10px;font-weight:600}
.pwb .pw-plan .pw-progress {padding-block:8px 10px}
.pwb .pw-progress-value {background:var(--pw-olive)}
.pwb .pw-plan-row.is-done .pw-plan-check {color:var(--pw-on-accent)}
.pwb .pw-group-title {color:var(--pw-muted);font-weight:650}
.pwb .pw-plan-note.quote {background:var(--pw-tile);border-radius:0 6px 6px 0;padding-block:3px}
@container pw-root (max-width:520px) {
  .pwb .pw-head-title h1 {font-size:21px}
}
@container pw-card (max-width:399px) {
  .pwb .pw-plan h2 {font-size:21px}
  .pwb .pw-pet-copy h2 {font-size:16px}
  .pwb .pw-pet-copy p {font-size:11px}
  .pwb .pw-assistant-heading {gap:5px;flex-wrap:wrap}
  .pwb .pw-date-nav button {min-width:19px}
  .pwb .pw-news-banner .pw-card-head {padding-inline:17px}
  .pwb .pw-news-banner .pw-news-list {padding-inline:17px}
}
.pwb .pw-task-form {gap:8px;padding-block:9px}
.pwb .pw-task-form input,.pwb .pw-release-form input {width:100%;min-width:0;border:1px solid var(--pw-line);border-radius:9px;background:var(--pw-tile);color:var(--pw-ink);padding:7px 9px;font:inherit}
.pwb .pw-task-form button,.pwb .pw-release-form button {padding:6px 10px;background:var(--pw-blue);color:var(--pw-on-accent);border-radius:8px;white-space:nowrap}
.pwb .pw-card .pw-plan-check {border:1.5px solid var(--pw-plan-muted);border-radius:5px}
.pwb .pw-card .is-done .pw-plan-check {border-color:var(--pw-olive);background:var(--pw-olive);color:var(--pw-on-accent)}
.pwb .pw-release-form {display:grid;gap:8px;padding:0 21px 8px}
.pwb .pw-release-form input {display:block;margin-top:5px;color:var(--pw-ink);background:var(--pw-paper)}
.pwb .pw-release-form div {display:flex;justify-content:flex-end;gap:8px}
.pwb .pw-release-form button {color:var(--pw-on-accent)}
.pwb .pw-release-reading-link {display:inline-flex;align-items:center;gap:8px;text-decoration:underline;font-size:18px;font-weight:650}
.pwb .pw-footer .pw-footer-message {font-size:12px}

`;
    const gridStorageKey='dsh-personal-workbench:layout:v2';
    function gridReadPreferences() {
      try {const raw=localStorage.getItem(gridStorageKey);if(!raw||raw.length>12000)return {};const value=JSON.parse(raw);return value?.version===2&&value.profiles&&typeof value.profiles==='object'?value.profiles:{};}catch{return {};}
    }
    function useWorkbenchGrid(collapsed=false) {
      const viewport=React.useRef(null),gesture=React.useRef(null),current=React.useRef(null);
      const [saved,setSaved]=React.useState(gridReadPreferences),[draft,setDraft]=React.useState({}),[editing,setEditing]=React.useState(false),[active,setActive]=React.useState(null),[notice,setNotice]=React.useState('');
      const [size,setSize]=React.useState({width:0,height:0});
      const profile={...gridProfile(size.width),collapsed:collapsed&&!editing},gap=profile.key==='narrow'?12:16,row=Math.max(24,(size.height-gap*11)/12),column=(size.width+gap)/profile.cols;
      const layout=gridNormalize((editing?draft:saved)[profile.key],profile);
      current.current={profile,gap,row,column,layout,editing};
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
        const patch=start.mode==='resize'?{w:start.item.w+dx,h:start.item.h+dy}:{x:start.item.x+dx,y:start.item.y+dy};
        const next=gridArrange(start.layout,start.id,patch,start.profile);
        setDraft(value=>({...value,[start.profile.key]:next}));
      }
      function key(event,id,mode) {
        if(!editing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        const state=current.current,item=state.layout.find(item=>item.id===id),dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
        const patch=mode==='resize'?{w:item.w+dx,h:item.h+dy}:{x:item.x+dx,y:item.y+dy};
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
        return {'data-grid-id':id,'data-active':active===id?'true':undefined,style:{left:item.x*column,top:item.y*(row+gap),width:Math.max(0,item.w*column-gap),height:item.h*row+(item.h-1)*gap}};
      }
      function edit(){setDraft({...saved});setNotice('');setEditing(true);}
      function cancel(){stopGesture(true);setEditing(false);setNotice('');}
      function reset(){stopGesture();setDraft(value=>({...value,[profile.key]:gridDefaults(profile)}));setNotice('已恢复当前窗口的默认布局');viewport.current.scrollTop=0;}
      function finish(){
        stopGesture();
        const profiles={};for(const width of [390,800,1200]){const p=gridProfile(width);if(draft[p.key])profiles[p.key]=gridNormalize(draft[p.key],p);}
        setSaved(profiles);setEditing(false);
        try{localStorage.setItem(gridStorageKey,JSON.stringify({version:2,profiles}));setNotice('布局已保存');}catch{setNotice('本次布局已应用，但无法保存到此设备');}
      }
      return {viewport,editing,active,notice,profile,handles,card,edit,cancel,reset,finish,canvasStyle:{height:Math.max(12,...layout.map(item=>item.y+item.h))*(row+gap)-gap,'--pw-grid-column':column+'px','--pw-grid-row':(row+gap)+'px'}};
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
          const [open,setOpen]=React.useState(false),[reference,setReference]=React.useState(null),[error,setError]=React.useState(''),[attempt,setAttempt]=React.useState(0);
          const [settings,setSettings]=React.useState(false);
          const launcher=React.useRef(null),closeButton=React.useRef(null);
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
            h('button',{ref:launcher,className:'hbc-launcher',style:{position:'relative',right:'auto',top:'auto',width:76,padding:'0 6px 4px',flexShrink:0},'aria-label':t('open'),'aria-expanded':open,'aria-controls':'hbc-assistant-drawer',onClick:()=>{if(open)close();else{setReference(null);setOpen(true);}}},h(CatArt,{}),h('span',null,t('title'))),
            open&&dockTarget&&createPortal(h('aside',{id:'hbc-assistant-drawer',className:'hbc-drawer',role:'region','aria-label':t('title'),onKeyDown:e=>{if(e.key==='Escape'&&e.target===closeButton.current){e.preventDefault();close();}}},
              h('header',{className:'hbc-drawer-head'},h(CatArt,{}),h('div',null,h('strong',null,t('title')),h('p',null,t('subtitle'))),h('button',{onClick:()=>setSettings(v=>!v),'aria-expanded':settings},t('settings')),h('button',{ref:closeButton,onClick:close,'aria-label':t('close')},'×')),
              settings&&h(Settings,{}),
              h('div',{className:'hbc-drawer-body'},error?h('div',{className:'hbc-notice',role:'alert'},error,h('button',{className:'hbc-retry',onClick:()=>setAttempt(v=>v+1)},t('retry'))):reference?h(SessionProvider,{session:reference},renderSlot('dsh.personalWorkbenchCat.conversation',{})):h('p',{className:'hbc-notice',role:'status'},t('loading')))),dockTarget));
        }
        ctx.slots.registerFactory({name:'dsh.personalWorkbenchCat.assistant',scope:'root',children:{'dsh.personalWorkbenchCat.conversation':{kind:'single',scope:'session'}}},Assistant);
        ctx.slots.inject('dsh.personalWorkbenchCat.conversation',()=>ctx.slots.register({name:'dsh.personalWorkbenchCat.conversation'},Embedded));

      });
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
        const [foldedDay,setFoldedDay]=React.useState(()=>storedValue('dsh-personal-workbench:brief-folded-day',''));
        const [data,setData]=React.useState(null),[monitor,setMonitor]=React.useState(null),[loading,setLoading]=React.useState(true),[tick,setTick]=React.useState(0),[error,setError]=React.useState(''),[readError,setReadError]=React.useState('');
        const [selectedDate,setSelectedDate]=React.useState(''),[calendarMode,setCalendarMode]=React.useState('day'),[dayPlan,setDayPlan]=React.useState(null),[planPending,setPlanPending]=React.useState(false),[monthData,setMonthData]=React.useState(null),[customProjects,setCustomProjects]=React.useState(()=>projectShortcuts(storedValue(PROJECT_SHORTCUTS_KEY,[]))),[addingProject,setAddingProject]=React.useState(false),[projectForm,setProjectForm]=React.useState({title:'',version:'',progress:'',target:'',icon:'app'}),[projectError,setProjectError]=React.useState('');
        const today=data?.today||localDay(),viewDate=selectedDate||today,monthKey=viewDate.slice(0,7),newsFolded=foldedDay===today;
        const grid=useWorkbenchGrid(newsFolded);
        const root=React.useRef(null),reading=React.useRef(false),alive=React.useRef(true),openingLock=React.useRef(false);
        const [notes,setNotes]=React.useState(()=>projectNotes(storedValue(PROJECT_NOTES_KEY,{})));
        const [activeProjectId,setActiveProjectId]=React.useState(''),[progressDraft,setProgressDraft]=React.useState(''),[requirementDraft,setRequirementDraft]=React.useState('');
        const [projectNotice,setProjectNotice]=React.useState(''),[handingOff,setHandingOff]=React.useState(false);
        const projectTrigger=React.useRef(null);
        React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
        React.useEffect(()=>{if(viewDate===today){setPlanPending(false);return;}const abort=new AbortController();setPlanPending(true);const version=planVersion.current;api('plan',abort.signal,{date:viewDate}).then(value=>{if(!abort.signal.aborted&&version===planVersion.current)setDayPlan(value);}).catch(()=>{if(!abort.signal.aborted&&version===planVersion.current)setDayPlan({date:viewDate,availability:'unavailable'});}).finally(()=>{if(!abort.signal.aborted)setPlanPending(false);});return()=>abort.abort();},[viewDate,today,tick]);
        React.useEffect(()=>{if(calendarMode==='day')return;const abort=new AbortController();setMonthData(null);api('calendar',abort.signal,{month:monthKey}).then(value=>{if(!abort.signal.aborted)setMonthData(value);}).catch(()=>{if(!abort.signal.aborted)setMonthData({month:monthKey,availability:'unavailable',days:{}});});return()=>abort.abort();},[monthKey,calendarMode,tick]);
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
          Promise.all([api('dashboard',abort.signal),production(abort.signal)]).then(([next,business])=>{if(abort.signal.aborted)return;if(!next?.tasks || !Array.isArray(next.tasks.items))throw new Error('首页暂时无法更新，请稍后刷新。');setData(previous=>version!==planVersion.current&&previous?.plan&&previous.plan.date===next.plan?.date?{...next,plan:previous.plan}:next);setMonitor(business);setReadError('');}).catch(err=>{if(!abort.signal.aborted)setReadError('更新暂时失败，当前显示上次内容');}).finally(()=>{if(!abort.signal.aborted){reading.current=false;setLoading(false);}});
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
            if(destination.session) {
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
        const plan=viewDate===today?data?.plan:dayPlan?.date===viewDate?dayPlan:null,planItems=list(plan?.items),done=planItems.filter(checkedFor).length,attention=attentionItems(mergedData,monitor),attentionKeys=new Set(attention.map(row=>row.key)),rows=activityItems(mergedData,monitor).filter(row=>!attentionKeys.has(row.key)),completed=completedItems(monitor),reader=feedURL;
        const digest=dayDigest(data?.plan&&{...data.plan,items:list(data.plan.items).map(task=>({...task,checked:checkedFor(task)}))},today),assistants=assistantOverview(monitor),allProjects=customProjects,threadOptions=list(data?.threads).filter(item=>sessionId.test(item.id||'')).map(item=>({...item,source:'harness'}));
        const planConnected=plan?.availability==='connected',planEmpty=plan?.availability==='empty';
        const activityUnavailable=!data || ['unavailable','partial'].includes(data.ai?.availability) || list(data.ai?.items).some(s=>s.running===null && !pending(s.pendingInput)) || ['unavailable','partial'].includes(data.automations?.availability) || monitor?.availability==='unavailable';
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
          const content=taskText(task.text||task.title),checked=checkedFor(task),saving=checks.has(task.id);
          return h('div',{key,className:'pw-plan-row'+(checked?' is-done':'')},
            h('button',{className:'pw-plan-check',type:'button',role:'checkbox','aria-label':content.title,'aria-checked':checked,'aria-busy':saving,'aria-disabled':saving,onClick:()=>void checkTask(task)},checked&&h(Icon,{name:'check',size:13})),
            h('div',{className:'pw-plan-copy'},h('p',{className:'pw-plan-text',title:content.title},content.title),content.note&&h('p',{className:'pw-plan-meta'},content.note)));
        }
        function planNodes(items,depth=0) {
          if(depth>10)return null;
          return list(items).map((node,i)=>{
            const key=node.id||node.task?.id||i;
            if(node.type==='task')return h(React.Fragment,{key},planRow(node.task||{},key),list(node.children).length>0&&h('div',{className:'pw-plan-nested'},planNodes(node.children,depth+1)));
            if(node.type==='note'||node.type==='label')return h('div',{key},node.text&&h('p',{className:'pw-plan-note '+(['quote','callout'].includes(node.style)?node.style:'')},node.text),list(node.children).length>0&&h('div',{className:'pw-plan-nested'},planNodes(node.children,depth+1)));
            // The original plan owns expandable notes and editing. Preview its caption here.
            if(node.type==='toggle')return node.text?h('p',{key,className:'pw-plan-note'},node.text):null;
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
          if(editingFeed)return h('form',{className:'pw-release-form',onSubmit:saveReadingLink},
            h('label',null,'日报链接',h('input',{type:'url',value:feedDraft,maxLength:2048,placeholder:'https://…',onChange:event=>setFeedDraft(event.target.value)})),
            h('div',null,h('button',{type:'button',onClick:()=>setEditingFeed(false)},'取消'),h('button',{type:'submit'},'保存')));
          return reader?null:empty('把常看的 AI 日报放在这里','添加公开阅读链接。','news');
        }
        function activityBody() {
          if(!data&&loading)return skeleton();
          if(!rows.length)return h('p',{className:'pw-section-empty'},activityUnavailable?'进展尚未全部同步':attention.length?'等待处理的事项已列在上方':'暂时没有正在进行的事');
          return h('div',{className:'pw-activity-list'},rows.map(row=>h(row.destination?'button':'div',{key:row.key,className:'pw-activity-row',onClick:row.destination?()=>navigate(row.destination):undefined,'aria-label':row.destination?row.title+'，'+(row.destination.session?'打开对话':row.destination.panel==='redflow-workbench'?'打开内容工作台':'打开自动化任务'):undefined},h('span',{className:'pw-activity-icon'+(row.waiting?' is-waiting':'')},h(Icon,{name:row.waiting?'chat':'activity',size:15})),h('div',{className:'pw-activity-copy'},h('p',{className:'pw-activity-title',title:row.title},row.title),h('p',{className:'pw-activity-status'},h('span',{className:'pw-activity-owner'},row.owner),h('span',{className:row.waiting?'is-waiting':row.unknown?'is-unknown':'pw-running'},row.status))),row.destination&&h(Icon,{name:'chevron',size:12}))));
        }
        function resultsBody() {
          if(!data&&loading)return skeleton();
          if(!completed.length)return h('p',{className:'pw-section-empty'},monitor?.resultsUnavailable||monitor?.availability==='unavailable'?'成果暂时未能全部同步':'有可查看的成果时，会出现在这里');
          return completed.map(row=>h('a',{key:row.key,className:'pw-activity-row pw-result-row',href:row.url,target:'_blank',rel:'noopener noreferrer','aria-label':'查看成果：'+row.title},h('span',{className:'pw-activity-icon is-result'},h(Icon,{name:'check',size:14})),h('div',{className:'pw-activity-copy'},h('p',{className:'pw-activity-title',title:row.title},row.title),h('p',{className:'pw-activity-status'},row.status)),h(Icon,{name:'arrow',size:12})));
        }
        function attentionSummary() {
          if(!attention.length)return null;
          return h('details',{className:'pw-attention',onKeyDown:event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}},h('summary',{'aria-label':'需要你处理，'+attention.length+' 件事'},h('span',{className:'pw-attention-label'},'需要你处理 · '+attention.length),h('span',{className:'pw-attention-preview'},attention[0].title),h(Icon,{name:'chevron',size:12})),h('div',{className:'pw-attention-popover'},attention.map(row=>h('article',{className:'pw-attention-item',key:row.key},h('div',{className:'pw-attention-item-top'},h('strong',null,row.title),h('span',{className:'pw-attention-tag'},row.status)),row.note&&h('p',null,row.note),row.destination?h('button',{className:'pw-quiet-link',onClick:event=>{event.currentTarget.closest('details').open=false;navigate(row.destination);}},row.action,h(Icon,{name:'arrow',size:11})):row.url?h('a',{className:'pw-quiet-link',href:row.url,target:'_blank',rel:'noopener noreferrer'},row.action,h(Icon,{name:'arrow',size:11})):null))));
        }
        function toggleBrief(){const next=newsFolded?'':today;setFoldedDay(next);try{localStorage.setItem('dsh-personal-workbench:brief-folded-day',JSON.stringify(next));}catch{setError('收起状态仅在本次打开时保留');}}
        function shiftDate(direction){const date=new Date(viewDate+'T12:00:00Z');if(calendarMode==='month'){date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+direction);}else date.setUTCDate(date.getUTCDate()+direction*(calendarMode==='week'?7:1));const value=date.toISOString().slice(0,10);if(/^20/.test(value))setSelectedDate(value);}
        function calendarHeader(){
          const days=calendarDates(viewDate,calendarMode),known=monthData?.month===monthKey&&monthData.availability==='connected';
          return h('div',{className:'pw-calendar'},
            h('div',{className:'pw-calendar-toolbar'},h('div',{className:'pw-segmented','aria-label':'计划视图'},[['day','日'],['week','周'],['month','月']].map(([value,label])=>h('button',{key:value,'aria-pressed':calendarMode===value,onClick:()=>setCalendarMode(value)},label))),h('div',{className:'pw-date-nav'},h('button',{onClick:()=>shiftDate(-1),'aria-label':'上一'+(calendarMode==='month'?'月':calendarMode==='week'?'周':'天')},'‹'),h('span',null,calendarMode==='month'?monthKey.replace('-',' 年 ')+' 月':viewDate.slice(5).replace('-','月')+'日'),h('button',{onClick:()=>shiftDate(1),'aria-label':'下一'+(calendarMode==='month'?'月':calendarMode==='week'?'周':'天')},'›'),h('button',{className:'pw-today',onClick:()=>setSelectedDate('')},'今天'))),
            h('div',{className:'pw-calendar-grid','data-mode':calendarMode},
              ['一','二','三','四','五','六','日'].map(value=>h('span',{key:value,className:'pw-week-label'},value)),
              days.map(date=>{
                const hasPlan=calendarMode!=='day'&&known&&monthData.days?.[date]?.status==='available';
                return h('button',{
                  key:date,'aria-label':date+(hasPlan?'，有计划':''),'aria-pressed':date===viewDate,
                  className:(date.slice(0,7)!==monthKey?'is-outside ':'')+(date===today?'is-today':''),
                  onClick:()=>setSelectedDate(date),title:hasPlan?'有计划，点击查看':'查看这天的计划'
                },h('span',null,Number(date.slice(8))),h('i',{className:hasPlan?'has-plan':''}));
              })),
            calendarMode!=='day'&&h('p',{className:'pw-calendar-status'},!monthData?'正在读取月份安排…':!known?'月份标记暂未同步，仍可逐日查看':'圆点表示当天有待办'));
        }
        function assistantBody(){
          return h('div',{className:'pw-assistant-list'},
            h('section',{className:'pw-assistant-group'},h('div',{className:'pw-assistant-heading'},h('span',{className:'pw-assistant-avatar'},h(Icon,{name:'activity',size:15})),h('strong',null,'运营助手'),h('span',{className:'pw-mini-meta'},assistants.synced?(assistants.operation.filter(row=>row.state==='active').length+' 进行中 · '+assistants.operation.filter(row=>row.state==='failed').length+' 失败'):'状态待同步'),assistants.synced&&h('button',{className:'pw-quiet-link',onClick:()=>navigate({panel:'redflow-workbench'})},'查看',h(Icon,{name:'arrow',size:10}))),assistants.operation.length?assistants.operation.slice(0,1).map(row=>h('button',{key:row.id,className:'pw-assistant-task',onClick:()=>navigate({panel:'redflow-workbench'}),title:row.detail},h('div',null,h('span',null,row.title),h('span',{className:'pw-state','data-state':row.state},row.label)),h('p',null,row.detail))):h('p',{className:'pw-assistant-empty'},monitor?.availability==='not_connected'?'先在小红书内容生成中连接账号':assistants.synced?'最近没有内容生产任务':'连接小红书内容生成后，可在这里查看制作进度')),
            h('section',{className:'pw-assistant-group'},h('div',{className:'pw-assistant-heading'},h('span',{className:'pw-assistant-avatar is-news'},h(Icon,{name:'activity',size:15})),h('strong',null,'Harness 助手'),h('span',{className:'pw-state','data-state':rows.length?'active':'unknown'},rows.length?rows.length+' 项近期进展':'暂时没有进展')),h('p',{className:'pw-assistant-detail'},'查看下方进展进入原对话。')),
            (rows.length>0||completed.length>0||assistants.operation.length>1)&&h('details',{className:'pw-assistant-more'},h('summary',null,'其他进展与成果 · 点击展开'),assistants.operation.slice(1).map(row=>h('button',{key:row.id,className:'pw-assistant-task',onClick:()=>navigate({panel:'redflow-workbench'}),title:row.detail},h('div',null,h('span',null,row.title),h('span',{className:'pw-state','data-state':row.state},row.label)),h('p',null,row.detail))),rows.length>0&&activityBody(),completed.length>0&&h('div',{className:'pw-assistant-results'},resultsBody())));
        }
        const activeProject=allProjects.find(project=>project.id===activeProjectId);
        function projectDestination(project) {
          return {session:project.threadId};
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
          const requirements=list(notes[activeProject.id]?.requirements),pending=requirements.filter(item=>!item.done),finished=requirements.filter(item=>item.done);
          const update=(id,done)=>saveProjectNotes({requirements:requirements.map(item=>item.id===id?{...item,done}:item)});
          function move(index,offset) {
            const next=[...pending],target=index+offset;
            if(target<0||target>=next.length)return;
            [next[index],next[target]]=[next[target],next[index]];
            saveProjectNotes({requirements:[...next,...finished]});
          }
          function addRequirement(event) {
            event.preventDefault();
            const title=requirementDraft.trim();
            if(!title)return;
            if(requirements.length>=100){setProjectNotice('需求清单已满，请先移除不再需要的条目。');return;}
            if(saveProjectNotes({requirements:[...requirements,{id:crypto.randomUUID(),title,done:false}]}))setRequirementDraft('');
          }
          return h('div',{className:'pw-modal-backdrop'},
            h('section',{className:'pw-project-dialog pw-project-detail',role:'dialog','aria-modal':true,'aria-labelledby':'pw-project-detail-title',onKeyDown:event=>{if(event.key==='Escape')closeProject();}},
              h('header',null,h('h2',{id:'pw-project-detail-title'},activeProject.title),h('button',{type:'button','aria-label':'关闭项目',onClick:closeProject},'×')),
              h('form',{onSubmit:event=>{event.preventDefault();if(saveProjectNotes({progress:progressDraft.trim()}))setProjectNotice('进展已保存。');}},
                h('label',null,'当前进展',h('input',{maxLength:120,value:progressDraft,onChange:event=>setProgressDraft(event.target.value),placeholder:'一句话记下做到哪了'})),
                h('button',{type:'submit',className:'pw-layout-button',disabled:progressDraft.trim()===projectProgress(activeProject)},'保存进展')),
              h('form',{onSubmit:addRequirement},
                h('label',null,'待开发需求',h('textarea',{autoFocus:true,value:requirementDraft,maxLength:400,onChange:event=>setRequirementDraft(event.target.value),placeholder:'记下想新增或修改的功能'})),
                h('button',{type:'submit',className:'pw-layout-button',disabled:!requirementDraft.trim()},'记下需求')),
              pending.length>0&&h('ol',{'aria-label':'按开发顺序排列的需求'},pending.map((item,index)=>h('li',{key:item.id,className:'pw-requirement-row'},
                h('span',null,(index+1)+'. '+item.title),h('div',{className:'pw-requirement-controls'},
                  h('button',{type:'button',disabled:index===0,'aria-label':'上移：'+item.title,onClick:()=>move(index,-1)},'↑'),
                  h('button',{type:'button',disabled:index===pending.length-1,'aria-label':'下移：'+item.title,onClick:()=>move(index,1)},'↓'),
                  h('button',{type:'button','aria-label':'标记已完成：'+item.title,onClick:()=>update(item.id,true)},'✓'))))),
              finished.length>0&&h('details',null,h('summary',null,'已完成 · '+finished.length),h('ul',null,finished.map(item=>h('li',{key:item.id,className:'pw-requirement-row'},h('span',null,item.title),h('div',{className:'pw-requirement-controls'},
                h('button',{type:'button',onClick:()=>update(item.id,false)},'恢复'),
                h('button',{type:'button','aria-label':'移除：'+item.title,onClick:()=>saveProjectNotes({requirements:requirements.filter(row=>row.id!==item.id)})},'×')))))),
              projectNotice&&h('p',{role:'status',className:'pw-footer-message'},projectNotice),
              h('footer',null,
                h('button',{type:'button',className:'pw-layout-button',onClick:async()=>{if(await navigate(projectDestination(activeProject)))closeProject();else setProjectNotice('暂时无法打开关联对话。');}},'打开开发对话'),
                pending.length>0&&h('button',{type:'button',className:'pw-layout-button is-primary',disabled:handingOff,onClick:()=>void handoff(activeProject,pending)},'复制待办并打开对话'))));
        }
        function projectBody() {
          if(!allProjects.length)return empty('把项目放在手边','添加项目后，可以直接回到它的开发对话。','grid');
          return h('div',{className:'pw-project-list'},allProjects.map(project=>{
            const count=list(notes[project.id]?.requirements).filter(item=>!item.done).length,progress=projectProgress(project);
            return h('div',{className:'pw-project-row',key:project.id},
              h('button',{className:'pw-project-open',onClick:event=>openProject(project,event),'aria-label':'查看项目：'+project.title},
                project.icon?.startsWith('data:image/png;base64,')?h('img',{className:'pw-project-icon',src:project.icon,alt:''}):h('span',{className:'pw-project-icon is-placeholder'},h(Icon,{name:project.icon==='writing'?'news':'grid',size:21})),
                h('span',{className:'pw-project-copy'},h('strong',null,project.title),
                  (project.version||count>0)&&h('small',null,[project.version?'v'+project.version:'',count?count+' 项待开发':''].filter(Boolean).join(' · ')),
                  progress&&h('small',{className:'pw-project-progress',title:progress},progress)),
                h(Icon,{name:'chevron',size:13})),
              project.source&&h('button',{className:'pw-project-remove','aria-label':'移除项目入口：'+project.title,onClick:()=>removeProject(project)},'×'));
          }));
        }
        function removeProject(project) {
          if(notes[project.id]?.requirements.length&&!confirm('这个项目有已记录的需求。确定移除项目入口？'))return;
          const next=customProjects.filter(item=>item.id!==project.id);
          try {
            localStorage.setItem(PROJECT_SHORTCUTS_KEY,JSON.stringify(next));
            setCustomProjects(next);
          } catch {setError('项目入口暂时无法保存');}
        }
        function saveProject(event){event.preventDefault();const selected=threadOptions.find(item=>item.source+':'+item.id===projectForm.target);if(!selected||!projectForm.title.trim()){setProjectError('填写项目名称，并选择一个已有对话。');return;}if(customProjects.length>=20){setProjectError('最多保存 20 个自定义项目入口。');return;}const next=projectShortcuts([...customProjects,{id:crypto.randomUUID(),title:projectForm.title,version:projectForm.version,progress:projectForm.progress,icon:projectForm.icon,source:selected.source,threadId:selected.id}]);try{localStorage.setItem(PROJECT_SHORTCUTS_KEY,JSON.stringify(next));setCustomProjects(next);setAddingProject(false);setProjectError('');}catch{setProjectError('保存失败，请稍后再试。');}}
        function projectDialog(){if(!addingProject)return null;return h('div',{className:'pw-modal-backdrop'},h('form',{className:'pw-project-dialog',role:'dialog','aria-modal':true,'aria-labelledby':'pw-add-title',onSubmit:saveProject,onKeyDown:event=>{if(event.key==='Escape')setAddingProject(false);}},h('h2',{id:'pw-add-title'},'添加项目'),h('p',null,'给已有对话留一个入口，下次直接接着做。'),h('label',null,'项目名称',h('input',{autoFocus:true,maxLength:50,required:true,value:projectForm.title,onChange:e=>setProjectForm(value=>({...value,title:e.target.value}))})),h('label',null,'关联对话',h('select',{required:true,value:projectForm.target,onChange:e=>{const selected=threadOptions.find(item=>item.source+':'+item.id===e.target.value);setProjectForm(value=>({...value,target:e.target.value,title:value.title||selected?.title||''}));}},h('option',{value:''},threadOptions.length?'选择一个已有对话':'请先在 Harness 创建对话'),threadOptions.map(item=>h('option',{key:item.source+':'+item.id,value:item.source+':'+item.id},item.title)))),h('label',null,'当前版本（选填）',h('input',{maxLength:40,value:projectForm.version,placeholder:'例如 0.1.0',onChange:e=>setProjectForm(value=>({...value,version:e.target.value.replace(/^v/,'' )}))})),h('label',null,'当前进展（选填）',h('input',{maxLength:120,value:projectForm.progress,onChange:e=>setProjectForm(value=>({...value,progress:e.target.value}))})),h('label',null,'图标',h('select',{value:projectForm.icon,onChange:e=>setProjectForm(value=>({...value,icon:e.target.value}))},h('option',{value:'app'},'应用'),h('option',{value:'writing'},'内容'))),projectError&&h('p',{role:'alert',className:'pw-footer-message'},projectError),h('footer',null,h('button',{type:'button',className:'pw-layout-button',onClick:()=>setAddingProject(false)},'取消'),h('button',{type:'submit',className:'pw-layout-button is-primary',disabled:!threadOptions.length},'添加'))));}
        const contentProps={className:'pw-card-content',ref:node=>{if(node)node.toggleAttribute('inert',grid.editing);}};
        return h('div',{className:'pw-assistant-frame',style:{display:'flex',flex:1,minWidth:0,minHeight:0,height:'100%',overflow:'hidden'}},h('div',{className:'pwb',ref:root,'data-editing':String(grid.editing),style:{flex:'1 1 0',minWidth:0}},h('span',{className:'pw-theme-probe','aria-hidden':true}),h('style',null,css),h('div',{className:'pw-shell',ref:node=>{if(node)node.toggleAttribute('inert',addingProject||!!activeProject);}},
          h('header',{className:'pw-head'},h('div',{className:'pw-head-title'},h('h1',null,'个人主控台'),grid.editing?h('p',{className:'pw-layout-help',id:'pw-layout-help'},'拖动顶部换位置，拉动右下角调整大小'):h('p',{className:'pw-date'},dateLabel(today))),h('div',{className:'pw-head-actions'},grid.editing?h(React.Fragment,null,h('button',{className:'pw-layout-button is-quiet',onClick:grid.reset},'恢复默认'),h('button',{className:'pw-layout-button',onClick:grid.cancel},'取消'),h('button',{className:'pw-layout-button is-primary',onClick:grid.finish},'完成')):h(React.Fragment,null,attentionSummary(),h('button',{className:'pw-layout-button',onClick:grid.edit},h(Icon,{name:'grid',size:13}),'编辑布局'),h('button',{className:'pw-refresh',title:'刷新','aria-label':'刷新首页',disabled:loading,onClick:()=>setTick(v=>v+1)},h(Icon,{name:'refresh',size:18}))))),
          h('main',{className:'pw-homeboard',ref:grid.viewport,'aria-label':'每日概览'},h('div',{className:'pw-grid-canvas',style:grid.canvasStyle},
            h('section',{...grid.card('news'),className:'pw-card pw-news pw-news-banner','data-folded':String(newsFolded&&!grid.editing),'aria-label':'每日 AI 日报'},grid.handles('news','每日 AI 日报'),h('div',contentProps,
              h('header',{className:'pw-card-head'},h('div',{className:'pw-card-title'},h(Icon,{name:'news'}),h('h2',null,'每日 AI 日报')),h('div',{className:'pw-news-actions'},
                reader&&h('a',{className:'pw-card-link',href:reader,target:'_blank',rel:'noopener noreferrer','aria-label':'阅读原文'},'原文',h(Icon,{name:'arrow',size:11})),
                h('button',{className:'pw-card-link',onClick:()=>{setFeedDraft(reader);setEditingFeed(true);if(newsFolded)toggleBrief();}},reader?'修改链接':'添加链接'),
                h('button',{className:'pw-card-link',onClick:toggleBrief,'aria-expanded':!newsFolded,'aria-label':newsFolded?'展开日报':'收起日报'},newsFolded?'展开':'收起',h('span',{'aria-hidden':true},newsFolded?'⌄':'⌃')))),
              h('div',{className:'pw-card-body'},newsBody()))),
            h('section',{...grid.card('pet'),className:'pw-card pw-pet','aria-label':'猫咪个人助手'},grid.handles('pet','猫咪助手'),h('div',contentProps,h('div',{className:'pw-pet-main'},h('div',{className:'pw-pet-art'},typeof renderFactorySlot==='function'?renderFactorySlot('dsh.personalWorkbenchCat.assistant',{dockTarget:assistantDock,onOpenChange:setAssistantOpen}):h('span',{className:'pw-pet-placeholder'},'猫咪助手连接中')),h('div',{className:'pw-pet-copy'},h('span',{className:'pw-eyebrow'},'你的小管家'),h('h2',null,digest.headline),h('p',null,digest.body),h('p',{className:'pw-pet-goal'},h('span',null,'今天的方向'),digest.goal))),h('footer',{className:'pw-card-foot'},h('span',null,'根据今日计划整理'),h('span',null,'点猫咪，继续聊')))),
            h('section',{...grid.card('activity'),className:'pw-card pw-activity pw-assistants','aria-label':'AI 助手'},grid.handles('activity','AI 助手'),h('div',contentProps,h('header',{className:'pw-card-head'},h('div',{className:'pw-card-title'},h(Icon,{name:'activity'}),h('h2',null,'AI 助手')),h('span',{className:'pw-count'},'帮你盯着进度')),h('div',{className:'pw-card-body'},assistantBody()),h('footer',{className:'pw-card-foot'},h('span',null,'近期内容任务与 Harness 对话'),h('span',null,assistants.synced?'同步于 '+clock(monitor?.checkedAt):'内容平台未连接或暂不可用')))),
            h('section',{...grid.card('projects'),className:'pw-card pw-projects','aria-label':'我的项目'},grid.handles('projects','我的项目'),h('div',contentProps,h('header',{className:'pw-card-head'},h('div',{className:'pw-card-title'},h(Icon,{name:'grid'}),h('h2',null,'我的项目')),h('button',{className:'pw-card-link',onClick:()=>{setProjectForm({title:'',version:'',progress:'',target:'',icon:'app'});setProjectError('');setAddingProject(true);}},'+ 添加项目')),h('div',{className:'pw-card-body'},projectBody()),h('footer',{className:'pw-card-foot'},h('span',null,'点项目，回到对应对话'),h('span',null,'自定义项目入口')))),
            h('section',{...grid.card('plan'),className:'pw-card pw-plan','data-density':planItems.length>9?'compact':'normal','aria-labelledby':'pw-plan-title'},grid.handles('plan','今日计划'),h('div',contentProps,
              h('header',{className:'pw-card-head'},h('h2',{id:'pw-plan-title'},viewDate===today?'今日计划':'每日计划'),h('span',{className:'pw-count'},'我的待办')),
              h('div',{className:'pw-plan-view','data-mode':calendarMode},calendarHeader(),
                h('div',{className:'pw-progress'},h('div',{className:'pw-progress-track',role:'progressbar','aria-label':'计划完成进度','aria-valuemin':0,'aria-valuemax':Math.max(planItems.length,1),'aria-valuenow':done},h('div',{className:'pw-progress-value',style:{width:planItems.length?Math.round(done/planItems.length*100)+'%':'0%'}})),h('span',null,planConnected||planEmpty?done+' / '+planItems.length:'—')),
                h('div',{className:'pw-card-body'},planBody())),
              h('form',{className:'pw-card-foot pw-task-form',onSubmit:event=>{event.preventDefault();if(taskTitle.trim())void saveTask('addPlanTask',{title:taskTitle,date:viewDate});}},
                h('input',{'aria-label':'新待办',placeholder:'添加这天的待办…',value:taskTitle,maxLength:200,onChange:event=>setTaskTitle(event.target.value)}),
                h('button',{type:'submit',disabled:savingTask||!taskTitle.trim()},'添加')))))),
          h('footer',{className:'pw-footer'},h('span',{className:readError||error?'pw-footer-message':'',role:readError||error?'status':undefined,title:readError||error||undefined},readError || error || grid.notice || (loading?'正在更新…':data?'更新于 '+clock(data.checkedAt):'等待同步')),h('span',null,grid.editing?'自动对齐网格':'进度自动更新')),h('span',{className:'pw-layout-live',role:'status','aria-live':'polite'},grid.notice)),projectDialog(),projectDetail()),h('div',{ref:setAssistantDock,className:'pw-assistant-dock',style:{display:assistantOpen?'flex':'none',flex:assistantOpen?'0 1 480px':'0 0 0',width:assistantOpen?'42%':0,minWidth:0,minHeight:0,overflow:'hidden'}}));
      }
      ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'personal-workbench',order:-10,label:()=>t('title')},()=>h(Icon,{name:'grid',size:20})));
      ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'personal-workbench'},Panel));
    }};
  }
});
