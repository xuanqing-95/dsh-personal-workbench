import {createLocalPlanFile} from './local-plan-file.js';
import {dates} from './planning.js';
import {createNotionAPI,dateColumn,dateOf,nextDate,pageURL,richText,validId} from './notion-api.js';

export function validateWeek(week) {
  if(!dates.day(week)||new Date(week).getUTCDay()!==1)throw Object.assign(Error('请选择有效的周一日期。'),{code:'INVALID_WEEK'});
  return week;
}
export function fromNotion(pages,schema,dateField) {
  const entries=Object.entries(schema.properties||{});
  const titleField=entries.find(([,p])=>p.type==='title')?.[0];
  if(!titleField)throw Error('Notion 缺少标题字段。');
  const statusField=entries.find(([,p])=>p.type==='status')||entries.find(([n,p])=>p.type==='select'&&['状态','完成情况','Status'].includes(n))||
    entries.find(([name,p])=>p.type==='checkbox'&&/^(完成|已完成|done|completed)$/i.test(name));
  const statusConfig=statusField?.[1]?.status;
  const completeIds=new Set(statusConfig?.groups?.filter(g=>g.name==='Complete').flatMap(g=>g.option_ids||[])||[]);
  return pages.map(page=>{
    const props=page.properties||{},date=props[dateField];
    if(date?.type!=='date'||props[titleField]?.type!=='title')throw Error('Notion 计划格式已变化。');
    const value=statusField?props[statusField[0]]?.[statusField[1].type]:null;
    const status=value?.name||null, checked=value===true||completeIds.has(value?.id)||['done','complete','completed','完成','已完成'].includes(status?.toLowerCase());
    const start=date.date===null?null:dateOf(date.date?.start);
    const end=date.date?.end?dateOf(date.date.end):start;
    if(end<start)throw Error('Notion 日期范围有误。');
    return {start,end,item:{id:page.id,title:richText(props[titleField].title)||'未命名任务',url:pageURL(page.id),status,checked,source:'notion'}};
  });
}
export function createWeeklyPlanReader({listTasks,readConnection,env=process.env,fetchImpl=fetch,now=Date.now}={}) {
  let cache,inflight;
  const fileTasks=createLocalPlanFile(env.DSH_WORKBENCH_LOCAL_PLAN_FILE);
  const id=env.DSH_WORKBENCH_NOTION_DATA_SOURCE_ID;
  async function readNotion(){
    if(cache&&now()-cache.at<(cache.error?3000:15000)){if(cache.error)throw cache.error;return cache.rows;}
    if(!inflight)inflight=(async()=>{
      try{
        const api=createNotionAPI({id,token:env.DSH_WORKBENCH_NOTION_TOKEN,fetchImpl});
        const schema=await api.schema(),dateField=dateColumn(schema,env.DSH_WORKBENCH_NOTION_DATE_PROPERTY);
        const rows=fromNotion(await api.pages(),schema,dateField);
        cache={at:now(),rows,sourceURL:validId(schema.parent?.database_id)?pageURL(schema.parent.database_id):null};return rows;
      }catch(error){cache={at:now(),error};throw error;}
      finally{inflight=null;}
    })();
    return inflight;
  }
  return async function weeklyPlan(week){
    validateWeek(week);
    const days=Object.fromEntries(Array.from({length:7},(_,i)=>[nextDate(week,i),[]])),unscheduled=[];
    const local=await listTasks(),rows=(local?.items||local||[]).filter(t=>!t.archived);
    const connection=await readConnection?.(week,nextDate(week,6));
    let fileIssue=false;
    if(connection)rows.push(...connection.rows);
    else try{rows.push(...await fileTasks());}catch{fileIssue=true;}
    for(const t of rows){
      const item={id:t.id,title:t.title,url:null,status:t.status,checked:t.status==='done',revision:t.revision,source:t.source||'profile',canCheck:t.canCheck};
      if(!t.dueDate)unscheduled.push(item);else if(days[t.dueDate])days[t.dueDate].push(item);
    }
    const base={week,days,unscheduled,source:'profile',availability:'connected',checkedAt:new Date(now()).toISOString()};
    if(connection)return {...base,source:'connection',...(connection.issue?{reason:connection.issue,availability:rows.length?'partial':'unavailable'}:{})};
    if(!id)return fileIssue?{...base,availability:rows.length?'partial':'unavailable',reason:'本地计划文件暂不可读。'}:base;
    try{
      for(const {start,end,item} of await readNotion()){
        if(!start)unscheduled.push(item);else for(const day of Object.keys(days))if(day>=start&&day<=end)days[day].push(item);
      }
      return {...base,source:rows.length?'mixed':'notion',sourceURL:cache.sourceURL,...(fileIssue?{availability:'partial',reason:'本地计划文件暂不可读。'}:{})};
    }catch{
      const present=unscheduled.length+Object.values(days).flat().length;
      return {...base,availability:present?'partial':'unavailable',reason:'Notion 周计划暂未读到。请检查连接、日期字段和网络。'};
    }
  };
}
