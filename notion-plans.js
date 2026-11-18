import {dates,planDay,calendarMonth,todayLabel} from './planning.js';
import {createNotionAPI,dateColumn,dateOf,nextDate,pageURL,richText,validId,compactId} from './notion-api.js';
import {parsePlanCheck,applyNotionCheck,planCheckError} from './notion-plan-check.js';
import {createLocalPlanFile} from './local-plan-file.js';
import {validateWeek} from './weekly-plan.js';

const heading=block=>Number(/^heading_([1-3])$/.exec(block?.type)?.[1]||0);
function section(blocks,name){
  const at=blocks.findIndex(b=>heading(b)&&richText(b[b.type]?.rich_text).trim()===name);
  const level=at<0?0:heading(blocks[at]),found=[];
  for(const block of blocks.slice(at+1)){
    if(heading(block)&&heading(block)<= (level||3))break;
    found.push(block);
  }
  return {heading:at<0?null:blocks[at],found};
}
function blockText(rich){
  return richText((rich||[]).map(part=>{
    const label=part.plain_text||part.text?.content||'',destination=part.href||part.text?.link?.url;
    try{
      const url=new URL(destination);
      if(url.protocol==='https:'&&!url.username&&!url.password&&!label.includes(url.href))return {plain_text:label+' '+url.href+' '};
    }catch{}
    return {plain_text:label};
  }));
}
async function buildDay(api,page,date,title,canCheck){
  const base={date,source:'notion',title,availability:'empty',canCheck:false,items:[],groups:[]};
  if(!page)return base;
  const blocks=await api.children(page.id),scope=section(blocks,title),seen=new Set(),items=[];
  const visible=scope.heading?.has_children?[...await api.children(scope.heading.id),...scope.found]:scope.found;
  async function walk(block,depth){
    if(depth>10||seen.size>=1500)throw Error('计划层级或条目过多。');
    if(!validId(block?.id)||seen.has(compactId(block.id))||block.archived||block.in_trash)return null;
    seen.add(compactId(block.id));
    // Never follow linked views, child pages, databases or transclusions into unrelated pages.
    const type=block.type;
    if(!['heading_1','heading_2','heading_3','toggle','to_do','paragraph','quote','callout','bulleted_list_item','numbered_list_item','column','column_list'].includes(type))return null;
    const data=block[type]||{},text=blockText(data.rich_text),children=[];
    const task=type==='to_do'?{id:block.id,title:text,text,checked:data.checked===true,source:'notion'}:null;
    if(task)items.push(task);
    if(block.has_children)for(const child of await api.children(block.id)){const node=await walk(child,depth+1);if(node)children.push(node);}
    if(task)return {type:'task',task,children};
    return {type:heading(block)?'label':type==='toggle'?'toggle':type.startsWith('column')?'container':'note',style:type,id:block.id,text,children};
  }
  const nodes=[];
  for(const block of visible){const node=await walk(block,0);if(node)nodes.push(node);}
  return {...base,url:pageURL(page.id),items,groups:nodes.length?[{title,tasks:items,items:nodes}]:[],canCheck,availability:nodes.length?'connected':'empty'};
}
export function createPlanReader({listTasks,updateTask,env=process.env,fetchImpl=fetch,now=Date.now}={}) {
  const id=env.DSH_WORKBENCH_NOTION_DAILY_SOURCE_ID, token=env.DSH_WORKBENCH_NOTION_TOKEN;
  const sectionTitle=env.DSH_WORKBENCH_NOTION_DAILY_SECTION?.trim()||'今日计划';
  const allowWrite=env.DSH_WORKBENCH_NOTION_CHECKBOX_WRITE==='1';
  const pending=new Map(),cache=new Map();let writeChain=Promise.resolve(),version=0;
  const fileTasks=createLocalPlanFile(env.DSH_WORKBENCH_LOCAL_PLAN_FILE);
  async function local(){
    const value=await listTasks(),profile=(value?.items||value||[]).map(t=>({...t,source:'profile'}));
    try{return {rows:[...profile,...await fileTasks()],issue:null};}
    catch{return {rows:profile,issue:'无法读取选定的今日计划文件。'};}
  }
  function addLocal(day,localData) {
    const {rows,issue}=localData;
    const base=planDay(rows,day.date);
    const lookup=new Map(rows.map(r=>[r.id,r]));
    const groups=new Map();
    const items=base.items.map(item=>{
      const record=lookup.get(item.id);
      const source=record.source;
      const groupTitle=source==='local'?(record.group||'本机计划'):'工作台待办';
      const projected={...item,text:item.title,source,canCheck:source==='profile'};
      if(!groups.has(groupTitle))groups.set(groupTitle,{title:groupTitle,tasks:[],items:[]});
      const group=groups.get(groupTitle);group.tasks.push(projected);
      group.items.push({type:'task',task:projected,children:record.note?[{type:'note',id:record.id+'-note',text:record.note,children:[]}]:[]});
      return projected;
    });
    const hasRemote=day.source==='notion'&&(day.groups.length>0||day.items.length>0);
    const source=hasRemote&&items.length?'mixed':hasRemote?day.source:items.some(t=>t.source==='local')?'local':items.length?'profile':day.source;
    const showGroups=hasRemote||items.some(t=>t.source==='local');
    return {...day,source,availability:items.length?'connected':issue&&!hasRemote?'unavailable':day.availability,
      items:[...day.items,...items],groups:[...day.groups,...(showGroups?[...groups.values()]:[])],
      ...(issue?{reason:[day.reason,issue].filter(Boolean).join(' ')}:{})};
  }
  function memo(key,load){
    const cached=cache.get(key);
    if(cached && now()-cached.at<15000)return Promise.resolve(structuredClone(cached.value));
    if(pending.has(key))return pending.get(key);
    const generation=version;
    const job=load().then(value=>{
      if(version===generation){
        cache.set(key,{at:now(),value});if(cache.size>75)cache.delete(cache.keys().next().value);
      }
      return value;
    }).finally(()=>{if(pending.get(key)===job)pending.delete(key);});
    pending.set(key,job);return job;
  }
  function api(){return createNotionAPI({id,token,fetchImpl,timeoutMs:30000});}
  async function indexes(api,start,end){
    const field=dateColumn(await api.schema(),env.DSH_WORKBENCH_NOTION_DAILY_DATE_PROPERTY);
    const pages=await api.pages({and:[{property:field,date:{on_or_after:start}},{property:field,date:{before:end}}]});
    const indexed=new Map();
    for(const page of pages){
      const day=dateOf(page.properties?.[field]?.date?.start);
      if(day<start||day>=end)continue;
      const old=indexed.get(day);
      if(!old||String(page.last_edited_time||'')>String(old.last_edited_time||''))indexed.set(day,page);
    }
    return indexed;
  }
  async function remoteDay(conn,date){
    const pages=await indexes(conn,date,nextDate(date));
    return buildDay(conn,pages.get(date),date,sectionTitle,allowWrite);
  }
  async function readPlan(date=todayLabel()){
    if(!dates.day(date))throw Error('请选择有效日期。');
    const loaded=await local();
    let day={...planDay([],date),canCheck:true};
    if(id){
      try{day=await memo(date,()=>remoteDay(api(),date));}
      catch{day={...day,availability:'unavailable',reason:'Notion 日计划暂时无法读取，仅显示本机待办。'};}
    }
    return addLocal(day,loaded);
  }
  async function readCalendar(month,week=null){
    if(!dates.month(month))throw Error('请选择有效月份。');
    let start=month+'-01',end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)).toISOString().slice(0,10);
    if(week!=null){
      validateWeek(week);if(week>=end||nextDate(week,7)<=start)throw Error('请选择当月的一周。');
      start=start>week?start:week;end=end<nextDate(week,7)?end:nextDate(week,7);
    }
    const localMonth=async()=>{
      const {rows,issue}=await local(), summary=calendarMonth(rows,month);
      summary.days=Object.fromEntries(Object.entries(summary.days).filter(([day])=>day>=start&&day<end));
      if(issue){summary.availability=Object.keys(summary.days).length?'partial':'unavailable';summary.reason=issue;}
      return summary;
    };
    if(!id)return localMonth();
    const localData=await localMonth();
    try{
      const remote=await memo(month+':'+(week||''),async()=>{
        const conn=api(),pages=await indexes(conn,start,end),days={};let incomplete=false;
        for(const [date,page] of pages){
          try{
            const {items}=await buildDay(conn,page,date,sectionTitle,false);
            days[date]={status:'available',count:items.length,done:items.filter(t=>t.checked).length,first:items[0]||null,items:items.slice(0,5)};
          }catch{days[date]={status:'available'};incomplete=true;}
        }
        return {month,source:'notion',availability:incomplete?'partial':'connected',days};
      });
      const merged=structuredClone(remote);
      if(Object.keys(localData.days).length)merged.source='mixed';
      if(localData.reason){merged.availability='partial';merged.reason=localData.reason;}
      for(const [day,summary] of Object.entries(localData.days)){
        const original=merged.days[day];
        if(!original)merged.days[day]=summary;
        else{
          const items=[...(original.items||[]),...summary.items].slice(0,5);
          merged.days[day]={...original,items,first:items[0]||null};
          if(original.count!==undefined){merged.days[day].count=original.count+summary.count;merged.days[day].done=original.done+summary.done;}
        }
      }
      return merged;
    }catch{
      return {...localData,availability:Object.keys(localData.days).length?'partial':'unavailable',reason:'Notion 计划暂未同步，仅显示本机待办。'};
    }
  }
  async function checkPlanTask(raw){
    if(raw?.revision!==undefined){
      if(!raw || !validId(raw.id) || typeof raw.checked!=='boolean' || !Number.isSafeInteger(raw.revision) || raw.revision<1 || (raw.date!==undefined&&!dates.day(raw.date)) || Object.keys(raw).some(k=>!['id','revision','checked','date'].includes(k)))throw Error('待办信息无效。');
      return updateTask({id:raw.id,expectedRevision:raw.revision,patch:{status:raw.checked?'done':'todo'}});
    }
    const change=parsePlanCheck(raw);
    if(!id || !allowWrite)throw planCheckError('PLAN_CHECK_PERMISSION','此 Notion 连接仅供查看。');
    const job=writeChain.then(async()=>{
      const conn=api();let patchStarted=false;
      try{
        const day=await remoteDay(conn,change.date);
        const result=await applyNotionCheck(day,change,(id,checked)=>{patchStarted=true;return conn.checkBlock(id,checked);});
        return addLocal(result,await local());
      }catch(error){
        if(error.code?.startsWith('PLAN_'))throw error;
        if([401,403].includes(error.status))throw planCheckError('PLAN_CHECK_PERMISSION','Notion 没有授予更新这条待办的权限。');
        throw planCheckError(patchStarted?'PLAN_CHECK_UNKNOWN':'PLAN_CHECK_UNAVAILABLE',patchStarted?'Notion 尚未确认结果，请刷新核对。':'无法核对原待办，请刷新计划。');
      }finally{version++;cache.clear();pending.clear();}
    });
    writeChain=job.catch(()=>{});return job;
  }
  return {readPlan,readCalendar,checkPlanTask};
}
