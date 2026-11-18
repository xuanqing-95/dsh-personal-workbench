import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');

test('public host entry renders the whole first-run dashboard without optional connections',()=>{
  let plugin,Panel;
  const noop=()=>{};
  const react={
    createElement:(type,props,...children)=>({type,props,children}),
    useState:initial=>[typeof initial==='function'?initial():initial,noop],
    useRef:current=>({current}),useId:()=>'test-id',
    useEffect:noop,useLayoutEffect:noop,useSyncExternalStore:(_,read)=>read()
  };
  const storage={getItem:()=>null};
  const win={__ModuleLoader__:{load(module){plugin=module.factory(()=>react);}}};
  vm.runInNewContext(source,{window:win,localStorage:storage,Date,Intl,URL,URLSearchParams,document:{hidden:false,addEventListener:noop},crypto:globalThis.crypto});
  const zh=new Map();
  const ctx={effect:setup=>setup(),inject:noop,locale:{
    register:(namespace,locale,strings)=>{if(locale==='zh')zh.set(namespace,strings);},
    bind:namespace=>key=>zh.get(namespace)?.[key]||key,getSnapshot:()=>'zh'
  },slots:{
    inject:(_,setup)=>setup(),register:(slot,component)=>{if(slot.name==='main')Panel=component;}
  }};
  plugin.apply(ctx);
  const rendered=Panel();
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
  assert.deepEqual(cards.sort(),['activity','news','pet','plan','projects','quota','usage']);
  for(const title of ['个人 AI 工作台','AI每日精选','AI 助手任务进展','项目进展','今日计划','今日用量','剩余额度','XUANQING','连接我的计划'])assert.ok(labels.includes(title),title);
  for(const name of ['新待办','添加项目','开始使用'])assert.ok(names.includes(name),name);
});
