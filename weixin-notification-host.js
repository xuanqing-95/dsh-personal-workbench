import {createNotificationQueue,createWeixinSender,initialNotificationState,notificationEnabled} from './weixin-notifications.js';
import {enqueueDueMeetings,readMeetings} from './weixin-meetings.js';

export function installWeixinNotifications(ctx,{env=process.env,send=createWeixinSender(env)}={}){
  if(!notificationEnabled(env))return {status:async()=>({enabled:false,entries:[]})};
  let stopped=false,domainPromise,meetingError=null,reading=false,nonce=0;
  const active=new Set(),timers=new Set();
  function domain(){
    if(!domainPromise)domainPromise=(async()=>{
      const {z}=await import('zod');
      const schema=z.object({
        entries:z.array(z.object({id:z.string(),kind:z.enum(['approval','question','failure','meeting']),meeting:z.object({start:z.number(),url:z.string()}).strict().optional(),expiresAt:z.number(),createdAt:z.number(),state:z.enum(['pending','sending','accepted','failed','unknown','cancelled','expired']),attemptedAt:z.number().optional()}).strict()).max(100),
        attempts:z.array(z.number())
      }).strict();
      const opened=await ctx.storageDomain.open({name:'dsh_personal_workbench_weixin_notifications',version:1,tables:{},global:{initial:initialNotificationState(),schema}});
      const initial=structuredClone(opened.global.get());
      for(const row of initial.entries){
        if(row.state==='pending')row.state='cancelled';else if(row.state==='sending')row.state='unknown';
      }
      await opened.global.set(initial);return opened;
    })().catch(error=>{domainPromise=null;throw error;});
    return domainPromise;
  }
  const queue=createNotificationQueue({readState:async()=>(await domain()).global.get(),writeState:async value=>(await domain()).global.set(value),
    async send(kind,meeting){
      if(!notificationEnabled(env))return {state:'failed'};
      if(kind==='meeting'){
        const authorized=await readMeetings(env.DSH_WORKBENCH_MEETINGS_FILE);
        if(!authorized.some(row=>row.start===meeting.start&&row.url===meeting.url))return {state:'failed'};
      }
      return send(kind,meeting);
    }
  });
  function track(job){const p=job.catch(()=>{});active.add(p);p.finally(()=>active.delete(p));}
  function pending(kind,request,next){
    const key=kind+':'+request.agent?.id+':'+(request.callId||request.wait?.callId||++nonce);
    let settled=false;
    const timer=setTimeout(()=>{
      timers.delete(timer);
      if(!stopped&&!settled&&!request.signal?.aborted)track(queue.enqueue({key,kind}).then(()=>queue.drain()));
    },15000);
    timers.add(timer);
    return Promise.resolve().then(next).finally(()=>{
      settled=true;clearTimeout(timer);timers.delete(timer);if(!stopped)track(queue.cancel(key));
    });
  }
  ctx.on('approval/request',(r,next)=>pending('approval',r,next));
  ctx.on('user-questions/request',(r,next)=>pending('question',r,next));
  ctx.on('agent/error',({agent,turn})=>{if(!stopped)track(queue.enqueue({key:'failure:'+agent.id+':'+turn,kind:'failure'}).then(()=>queue.drain()));});
  async function poll(){
    if(reading||stopped)return;reading=true;
    try{
      try{
        const meetings=await readMeetings(env.DSH_WORKBENCH_MEETINGS_FILE);
        meetingError=null;
        if(!stopped)await enqueueDueMeetings(queue,meetings);
      }catch{meetingError='无法读取指定的会议文件。';}
      if(!stopped)await queue.drain();
    }finally{reading=false;}
  }
  ctx.effect(()=>{
    const tick=setInterval(()=>track(poll()),30000);tick.unref?.();
    return async()=>{
      stopped=true;clearInterval(tick);for(const t of timers)clearTimeout(t);timers.clear();
      await Promise.all([...active]);await queue.close();if(domainPromise)await(await domainPromise).close();
    };
  });
  return {async status(){return {...await queue.status(),...(meetingError?{meetingError}:{})};}};
}
