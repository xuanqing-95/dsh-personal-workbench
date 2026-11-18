import {dates,todayLabel} from './planning.js';

export const validId = value => typeof value==='string' && /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.test(value);
export const compactId = id => validId(id) ? id.replaceAll('-','').toLowerCase() : '';
export const pageURL = id => 'https://www.notion.so/'+compactId(id);
export const richText = rich => (Array.isArray(rich)?rich:[]).map(p=>p?.plain_text || p?.text?.content || '').join('').slice(0,1500);
export const nextDate = (day,n=1) => new Date(Date.parse(day)+n*86400000).toISOString().slice(0,10);
export function dateOf(value) {
  if(dates.day(value))return value;
  if(typeof value==='string' && dates.day(value.slice(0,10)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)))return todayLabel(new Date(value));
  throw Error('计划中有无法识别的日期。');
}
export function dateColumn(schema,configured) {
  const fields=Object.entries(schema.properties||{}).filter(([,p])=>p.type==='date').map(([k])=>k);
  if(configured && fields.includes(configured))return configured;
  if(!configured && fields.length===1)return fields[0];
  throw Error('请在连接设置中指定日期字段。');
}
export function createNotionAPI({id,token,fetchImpl=fetch,timeoutMs=20000}) {
  if(!validId(id) || !token?.trim())throw Error('请配置 Notion 连接和数据源。');
  const signal=AbortSignal.timeout(timeoutMs);
  let requests=0;
  async function request(route,method='GET',body) {
    if(++requests>80)throw Error('本次计划读取超过上限。');
    const response=await fetchImpl('https://api.notion.com/v1/'+route,{
      method,redirect:'error',signal,
      headers:{Authorization:'Bearer '+token,'Notion-Version':'2025-09-03','Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    if(!response.ok){await response.body?.cancel();throw Object.assign(Error('Notion 连接暂时不可用，请检查授权和网络。'),{status:response.status});}
    const reader=response.body.getReader(), chunks=[];let bytes=0;
    try{
      for(;;){
        const item=await reader.read();if(item.done)break;
        bytes+=item.value.byteLength;
        if(bytes>2*1024*1024)throw Error('计划数据超过读取上限。');
        chunks.push(item.value);
      }
    }finally{await reader.cancel().catch(()=>{});}
    return JSON.parse(Buffer.concat(chunks).toString());
  }
  async function list(getPage) {
    const entries=[],seen=new Set();let cursor;
    for(let i=0;i<10;i++){
      const page=await getPage(cursor);
      if(!Array.isArray(page.results)||typeof page.has_more!=='boolean')throw Error('Notion 返回的数据不完整。');
      entries.push(...page.results);
      if(!page.has_more)return entries;
      cursor=page.next_cursor;
      if(typeof cursor!=='string'||!cursor||cursor.length>300||seen.has(cursor))break;
      seen.add(cursor);
    }
    throw Error('计划分页读取不完整。');
  }
  return {
    async database(){
      const database=await request('databases/'+id);
      if(database?.object!=='database'||compactId(database.id)!==compactId(id)||!Array.isArray(database.data_sources))throw Error('Notion 数据库不匹配。');
      return database;
    },
    async schema(){
      const schema=await request('data_sources/'+id);
      if(schema?.object!=='data_source'||compactId(schema.id)!==compactId(id))throw Error('Notion 数据源不匹配。');
      return schema;
    },
    async pages(filter){
      const pages=await list(cursor=>request('data_sources/'+id+'/query','POST',{page_size:100,...(filter?{filter}:{}),...(cursor?{start_cursor:cursor}:{})}));
      const unique=new Map();
      for(const page of pages){
        if(!validId(page.id)||page.object!=='page'||compactId(page.parent?.data_source_id)!==compactId(id))throw Error('Notion 数据源不匹配。');
        if(!page.archived&&!page.in_trash)unique.set(compactId(page.id),page);
      }
      return [...unique.values()];
    },
    async children(parent){
      if(!validId(parent))throw Error('计划区块无效。');
      return list(cursor=>request('blocks/'+parent+'/children?page_size=100'+(cursor?'&start_cursor='+encodeURIComponent(cursor):'')));
    },
    checkBlock(id,checked) {
      if(!validId(id)||typeof checked!=='boolean')throw Error('待办信息无效。');
      return request('blocks/'+id,'PATCH',{to_do:{checked}});
    }
  };
}
