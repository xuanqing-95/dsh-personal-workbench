import {open} from 'node:fs/promises';
import {safeMeeting} from './weixin-notifications.js';

export async function readMeetings(file){
  if(!file)return [];
  const handle=await open(file,'r');
  try{
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size>256*1024)throw Error('会议文件太大或格式不正确。');
    const bytes=Buffer.alloc(stat.size+1);
    const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
    if(bytesRead!==stat.size)throw Error('会议文件正被修改。');
    const raw=JSON.parse(bytes.subarray(0,bytesRead).toString()),rows=Array.isArray(raw)?raw:raw?.meetings;
    if(!Array.isArray(rows)||rows.length>500)throw Error('会议文件格式不正确。');
    return rows.map(row=>{
      if(typeof row?.id!=='string'||!row.id.trim()||row.id.length>160)throw Error('会议标识无效。');
      const start=typeof row.start==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(row.start)?Date.parse(row.start):row.start;
      return {id:row.id,...safeMeeting({start,url:row.url})};
    });
  }finally{await handle.close();}
}
export async function enqueueDueMeetings(queue,meetings,now=Date.now()){
  for(const {id,start,url} of meetings){
    if(start>now&&start-now<=300000)await queue.enqueue({key:'meeting:'+id+':'+start,kind:'meeting',meeting:{start,url},expiresAt:start});
  }
}
