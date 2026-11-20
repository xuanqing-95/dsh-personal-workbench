import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');

function loadPanel({dashboard,fetch}={}){
  let plugin,Panel,cursor=0;
  const state=[];
  const noop=()=>{};
  const react={
    createElement:(type,props,...children)=>({type,props,children}),createPortal:child=>child,
    useState(initial){
      const index=cursor++;
      if(!(index in state))state[index]=index===0&&dashboard?dashboard:typeof initial==='function'?initial():initial;
      return [state[index],next=>{state[index]=typeof next==='function'?next(state[index]):next;}];
    },
    useRef:current=>({current}),useMemo:fn=>fn(),useId:()=>'test-id',
    useEffect:noop,useLayoutEffect:noop,useSyncExternalStore:(_,read)=>read()
  };
  const storage={getItem:()=>null};
  const win={__ModuleLoader__:{load(module){plugin=module.factory(()=>react);}}};
  vm.runInNewContext(source,{window:win,localStorage:storage,fetch,Date,Intl,URL,URLSearchParams,document:{hidden:false,addEventListener:noop},crypto:globalThis.crypto});
  const zh=new Map();
  const ctx={effect:setup=>setup(),inject:noop,locale:{
    register:(namespace,locale,strings)=>{if(locale==='zh')zh.set(namespace,strings);},
    bind:namespace=>key=>zh.get(namespace)?.[key]||key,getSnapshot:()=>'zh'
  },slots:{
    inject:(_,setup)=>setup(),register:(slot,component)=>{if(slot.name==='main')Panel=component;}
  }};
  plugin.apply(ctx);
  return ()=>{cursor=0;return Panel();};
}

function locate(node,predicate){
  if(!node||typeof node!=='object')return;
  if(predicate(node))return node;
  for(const child of Array.isArray(node)?node:node.children||[]){
    const match=locate(child,predicate);
    if(match)return match;
  }
}

test('public host entry renders the whole first-run dashboard without optional connections',()=>{
  const rendered=loadPanel()();
  assert.ok(rendered,'the registered main panel returns a dashboard');
  const labels=[],cards=[],names=[];
  function visit(node){
    if(typeof node==='string'){labels.push(node);return;}
    if(Array.isArray(node)){node.forEach(visit);return;}
    if(!node||typeof node!=='object')return;
    if(node.type==='section'&&node.props?.['data-grid-id'])cards.push(node.props['data-grid-id']);
    if(node.props?.['aria-label'])names.push(node.props['aria-label']);
    visit(node.children);
  }
  visit(rendered);
  assert.equal(names.includes('开始使用'),false);
  assert.equal(names.includes('示例体验'),false);
  assert.deepEqual(cards.sort(),['activity','news','pet','plan','projects','quota','usage']);
  for(const title of ['个人 AI 工作台','AI每日精选','AI 助手任务进展','项目进展','今日计划','今日用量','剩余额度','玄清'])assert.ok(labels.includes(title),title);
  assert.ok(!labels.includes('连接我的计划'));
  assert.ok(!locate(rendered,node=>node.props?.className==='pw-plan-prompt'));
  for(const name of ['新待办','添加项目'])assert.ok(names.includes(name),name);
});

test('appearance sections keep the shared gutters between the fixed header and footer',()=>{
  const panel=loadPanel()();
  const identity=locate(panel,node=>node.type?.name==='WorkbenchIdentity');
  const view=identity.type({...identity.props,root:{current:{}},open:true});
  const dialog=locate(view,node=>node.props?.['aria-labelledby']==='pw-appearance-title');
  const [header,body,footer]=dialog.children;
  assert.deepEqual(dialog.children.map(child=>child.type),['header','div','footer']);
  assert.equal(body.props.className,'pw-dialog-body');
  assert.deepEqual(body.children.map(section=>section.props['aria-labelledby']),['pw-avatar-title','pw-background-title']);
  assert.ok(locate(header,node=>node.props?.id==='pw-appearance-title'));
  assert.ok(locate(footer,node=>node.props?.className==='pw-appearance-save'));
});


test('example control stays in the header and returns an existing user to their own plan',async()=>{
  const date='2026-11-20',realTitle='我的验收清单',requests=[];
  const render=loadPanel({dashboard:{
    today:date,onboarding:{showExamples:false},
    plan:{date,availability:'connected',items:[{id:'my-item',title:realTitle,checked:false}]}
  },fetch:async(url,options)=>{requests.push(options.body);throw new Error('unexpected request');}});
  const hasText=(root,value)=>locate(root,node=>node.children?.includes(value)||node.props?.title===value);
  const toggle=root=>locate(locate(root,node=>node.props?.className==='pw-head-actions'),
    node=>node.props?.className?.includes('pw-example-toggle'));
  let tree=render();
  assert.ok(hasText(tree,realTitle));
  assert.equal(toggle(tree).children[0],'查看示例');
  toggle(tree).props.onClick();
  tree=render();
  assert.equal(toggle(tree).children[0],'退出示例');
  assert.ok(hasText(tree,'Kimi让AI的网页工作能看见、能接手、能交付'));
  assert.ok(!hasText(tree,realTitle));
  assert.ok(!locate(tree,node=>node.props?.['aria-label']==='新待办'));
  const checkbox=locate(tree,node=>node.props?.role==='checkbox'&&!node.props['aria-checked']);
  assert.ok(checkbox);
  await checkbox.props.onClick();
  const checked=locate(render(),node=>node.props?.['aria-label']===checkbox.props['aria-label']&&node.props?.role==='checkbox');
  assert.equal(checked.props['aria-checked'],true);
  toggle(render()).props.onClick();
  tree=render();
  assert.equal(toggle(tree).children[0],'查看示例');
  assert.ok(hasText(tree,realTitle));
  assert.ok(!hasText(tree,'Kimi让AI的网页工作能看见、能接手、能交付'));
  assert.deepEqual(requests,[]);
});

test('a first installation exits its examples from the header and can reopen locally',async()=>{
  const requests=[];
  const date='2026-11-20';
  const render=loadPanel({dashboard:{
    today:date,onboarding:{showExamples:true},plan:{date,availability:'empty',items:[],groups:[]}
  },fetch:async(url,options)=>{
    requests.push(JSON.parse(options.body).action);
    return {ok:true,json:async()=>({value:{showExamples:false}})};
  }});
  function control(){
    const header=locate(render(),node=>node.props?.className==='pw-head-actions');
    return locate(header,node=>node.props?.className?.includes('pw-example-toggle'));
  }
  assert.equal(control().children[0],'清除示例');
  control().props.onClick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(control().children[0],'查看示例');
  control().props.onClick();
  assert.equal(control().children[0],'退出示例');
  control().props.onClick();
  assert.equal(control().children[0],'查看示例');
  assert.deepEqual(requests,['dismissExamples']);
});

test('example usage charts reconcile to their totals while measured usage including zero takes precedence',()=>{
  const start=source.indexOf('function firstRunUsage('),end=source.indexOf('const exampleProjectCards',start);
  const applyUsage=vm.runInNewContext('('+source.slice(start,end).trim()+')',{list:value=>Array.isArray(value)?value:[]});
  const day={date:'2026-01-01',sources:['Codex','Harness'].map(source=>({source,total:null,buckets:[
    {start:'2026-01-01T00:00:00Z',end:'2026-01-01T00:30:00Z',total:null},
    {start:'2126-01-01T00:30:00Z',end:'2126-01-01T01:00:00Z',total:null}
  ]}))};
  const live={state:'ready',day,history:[day],sources:[],quotas:[]};
  const example=applyUsage(live);
  assert.ok(example.example);
  for(const row of example.day.sources){
    assert.equal(row.total,row.buckets[0].total);assert.equal(row.buckets[1].total,null);
    assert.equal(row.projects.reduce((n,project)=>n+project.total,0),row.total);
    assert.equal(row.models[0].total,row.total);
  }
  assert.equal(live.day.sources[0].total,null);
  day.sources[0].total=0;
  assert.equal(applyUsage(live),live);
});

test('the personal assistant list contains only sourced or explicitly followed assistants',()=>{
  const date='2026-11-20';
  const dashboard={today:date,onboarding:{showExamples:false},brief:{items:[]},ai:{items:[]},automations:{items:[]}};
  const groups=root=>{
    const names=[];
    function visit(node){
      if(!node||typeof node!=='object')return;
      if(node.props?.className==='pw-assistant-group')names.push(node.props['aria-label']);
      for(const child of Array.isArray(node)?node:node.children||[])visit(child);
    }
    visit(root);return names;
  };
  const emptyPanel=loadPanel({dashboard})();
  assert.deepEqual(groups(emptyPanel),[]);
  assert.ok(locate(emptyPanel,node=>node.children?.some(child=>typeof child==='string'&&child.includes('把这个助手加入个人 AI 工作台'))));
  assert.deepEqual(groups(loadPanel({dashboard:{...dashboard,ai:{items:[{id:'chat',title:'排版助手',running:false,followed:true}]}}})()),['排版助手']);
  const render=loadPanel({dashboard:{...dashboard,
    ai:{items:[{id:'real',title:'我的校对助手',running:true}]},
    automations:{items:[{id:'job',name:'晨间日报',source:'harness'}]}}});
  assert.deepEqual(groups(render()),[]);
  const checkbox=locate(render(),node=>node.type==='input'&&node.props?.type==='checkbox');
  checkbox.props.onChange({target:{checked:true}});
  assert.deepEqual(groups(render()),['晨间日报']);
  const sessionOption=locate(render(),node=>node.type==='label'&&node.children?.includes('我的校对助手'));
  sessionOption.children[0].props.onChange({target:{checked:true}});
  assert.deepEqual(groups(render()),['晨间日报','我的校对助手']);
});
