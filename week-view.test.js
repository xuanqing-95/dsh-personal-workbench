import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
function section(start,end) {
  const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
  assert.ok(from>=0&&to>from,start);
  return source.slice(from,to);
}
const render=new vm.Script([
  section('function calendarDates(','function statusTone('),
  section('const weekSource=','React.useEffect('),
  section('const selectedWeekItems=','function newsBody('),
  section('function weeklyBody(','function calendarBody('),
  '({plannedWeeks,board:calendarMode==="week"?weeklyBody():null,detail:planBody()})'
].join('\n'));

const today='2026-11-19',daily={id:'daily',title:'改脚本',source:'profile'},weekly={id:'span',title:'录视频',url:'https://example.com/plan',source:'notion'};
function view({date=today,monday='2026-11-16',mode='week',days={[date]:[weekly]},availability='connected',dayPlanFallback=false}={}){
  const weekStart=mode==='week'?monday:'';
  return render.runInNewContext({
    today,viewDate:date,monthKey:date.slice(0,7),weekStart,calendarKey:monday,calendarMode:mode,hoverWeekDay:-1,
    weeklyPlan:{[monday]:{days,unscheduled:[],availability,dayPlanFallback}},
    calendarData:{key:monday,months:{[date.slice(0,7)]:{availability:'connected',days:{[date]:{items:[daily],count:1}}}}},
    plan:{source:'profile',items:[daily]},planItems:[daily],planConnected:true,planEmpty:false,data:{},planPending:false,connection:null,
    futureSource:()=>null,Icon:'icon',list:value=>Array.isArray(value)?value:[],safeHTTPS:value=>typeof value==='string'?value:null,
    h:(type,props,...children)=>({type,props,children}),planRow:task=>task.title,empty:title=>title
  });
}
function labels(root,result=[]){
  if(typeof root==='string')result.push(root);
  else if(Array.isArray(root))root.forEach(node=>labels(node,result));
  else if(root?.children)labels(root.children,result);
  return result;
}

test('week grid and selected detail use the weekly source across past, present and future dates',()=>{
  for(const [date,monday] of [['2026-11-10','2026-11-09'],['2026-11-18','2026-11-16'],[today,'2026-11-16'],['2026-11-20','2026-11-16']]){
    const result=view({date,monday});
    assert.equal(result.plannedWeeks,monday);
    for(const part of [result.board,result.detail]){
      assert.ok(labels(part).includes('录视频'));
      assert.ok(!labels(part).includes('改脚本'));
    }
  }
  assert.deepEqual(labels(view({mode:'day'}).detail),['改脚本']);
});

test('a cross-day weekly item remains one span and empty or unavailable weeks do not import daily tasks',()=>{
  const {board}=view({days:{'2026-11-18':[weekly],[today]:[weekly],'2026-11-20':[weekly]}});
  assert.equal(labels(board).filter(label=>label==='录视频').length,1);
  const empty=view({days:{}});
  assert.deepEqual(labels(empty.detail),['今天还没有安排']);
  const offline=view({days:{},availability:'unavailable'});
  assert.ok(labels(offline.board).some(label=>label.includes('周计划暂未同步')));
  assert.ok(!labels(offline.detail).includes('改脚本'));
});

test('a legacy daily-only account keeps its daily tasks in the week grid and detail',()=>{
  const result=view({days:{},dayPlanFallback:true});
  assert.ok(labels(result.board).includes('改脚本'));
  assert.deepEqual(labels(result.detail),['改脚本']);
});
