import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export const initialNotificationState=()=>({entries:[],attempts:[]});
export function safeMeeting(value){
  if(!value || !Number.isFinite(value.start) || typeof value.url!=='string')throw Error('会议设置无效。');
  const url=new URL(value.url);
  if(!['https://vc.feishu.cn','https://vc.larksuite.com'].includes(url.origin) || !/^\/j\/\d+$/.test(url.pathname) || url.search || url.hash || url.username || url.password)throw Error('会议地址无效。');
  return {start:value.start,url:url.href};
}
export function notificationEnabled(env){
  return env.DSH_WORKBENCH_WEIXIN_ENABLED==='1' && /^weixin:[A-Za-z0-9@_.-]{1,160}$/.test(env.DSH_WORKBENCH_WEIXIN_TARGET||'');
}
export function createWeixinSender(env=process.env,execute=promisify(execFile)){
  return async function send(kind,meeting){
    if(!notificationEnabled(env))return {state:'failed'};
    const labels={approval:'有一项操作等待你确认。',question:'助手有一个问题需要你回复。',failure:'有任务执行失败，需要你检查。'};
    let message;
    if(kind==='meeting'){
      const {start,url}=safeMeeting(meeting);
      message='【会议提醒】'+new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(start)+' 的会议即将开始。入会：'+url;
    }else if(Object.hasOwn(labels,kind)){
      message='【个人 AI 工作台】'+labels[kind]+'请打开电脑上的「需要你处理」查看。';
    }else throw Error('提醒类型无效。');
    try{
      const {stdout}=await execute(env.DSH_WORKBENCH_HERMES_BIN||'hermes',['send','--to',env.DSH_WORKBENCH_WEIXIN_TARGET,'--json',message],{shell:false,timeout:30000,maxBuffer:65536});
      return {state:JSON.parse(stdout).success===true?'accepted':'failed'};
    }catch(error){return {state:error.code==='ENOENT'?'failed':'unknown'};}
  };
}
export function createNotificationQueue({readState,writeState,send,now=Date.now}){
  let chain=Promise.resolve();
  const serial=fn=>{const result=chain.then(fn);chain=result.catch(()=>{});return result;};
  const hash=key=>createHash('sha256').update(key).digest('hex');
  return {
    enqueue({key,kind,meeting,expiresAt=now()+600000}){
      return serial(async()=>{
        if(!['approval','question','failure','meeting'].includes(kind) || typeof key!=='string')throw Error('提醒类型无效。');
        if(kind==='meeting'){meeting=safeMeeting(meeting);expiresAt=Math.min(expiresAt,meeting.start);}
        const state=structuredClone(await readState()),id=hash(key);
        if(state.entries.some(e=>e.id===id))return;
        state.entries.push({id,kind,expiresAt,createdAt:now(),state:'pending',...(kind==='meeting'?{meeting}:{})});
        state.entries=state.entries.slice(-100);await writeState(state);
      });
    },
    cancel(key){
      return serial(async()=>{
        const state=structuredClone(await readState()),row=state.entries.find(e=>e.id===hash(key)&&e.state==='pending');
        if(row){row.state='cancelled';await writeState(state);}
      });
    },
    drain(){
      return serial(async()=>{
        const state=structuredClone(await readState()),time=now(),attempts=state.attempts.filter(t=>t>time-3600000);
        let changed=attempts.length!==state.attempts.length;state.attempts=attempts;
        for(const row of state.entries){if(row.state==='pending'&&row.expiresAt<=time){row.state='expired';changed=true;}}
        const row=state.entries.find(e=>e.state==='pending'&&e.expiresAt>time);
        if(!row||attempts.length>=6||attempts.some(t=>t>time-120000)){if(changed)await writeState(state);return;}
        // Reserve before delivery. An interrupted attempt must never be sent twice.
        row.state='sending';attempts.push(time);await writeState(structuredClone(state));
        let result;try{result=await send(row.kind,row.meeting);}catch{result={state:'unknown'};}
        row.state=['accepted','failed','unknown'].includes(result?.state)?result.state:'unknown';row.attemptedAt=time;await writeState(state);
      });
    },
    async status(){
      await chain;const {entries}=await readState();
      return {enabled:true,entries:entries.map(({kind,state,createdAt,attemptedAt})=>({kind,state,createdAt,...(attemptedAt?{attemptedAt}:{})})),limits:{minimumIntervalSeconds:120,maximumPerHour:6},receiptMeaning:'accepted 表示发送端已接受请求。'};
    },
    async close(){await chain;}
  };
}
