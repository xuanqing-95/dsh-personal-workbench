import {z} from 'zod';
import {createAssistantService, DEFAULT_PROMPT} from './assistant-service.js';
import {isHarnessSession, validUIWrite} from './request.js';

export async function attachAssistant(ctx) {
  let disposed = false;
  ctx.effect(() => () => { disposed = true; });
  const domain = await ctx.storageDomain.open({
    name:'dsh_personal_workbench_assistant',version:1,
    tables:{sessions:{valueSchema:z.object({bound:z.literal(true)}).strict()}},
    global:{schema:z.object({revision:z.number().int().positive(),prompt:z.string().max(12000)}).strict(),initial:{revision:1,prompt:DEFAULT_PROMPT}},
  });
  if (disposed) { await domain.close(); return; }
  ctx.effect(() => () => domain.close());
  const attached = new WeakSet();
  function attach(agent) {
    if (attached.has(agent) || !domain.table('sessions').get(agent.id)) return;
    attached.add(agent);
    const dispose = agent.ctx.inject(['systemPrompt'], child => {
      const remove = child.systemPrompt.section({name:'dsh-personal-workbench-assistant',order:950,interpolate:false,text:()=>domain.global.get().prompt});
      child.effect(() => remove);
    });
    ctx.effect(() => () => { attached.delete(agent); dispose?.(); });
  }
  const service = createAssistantService({domain:async()=>domain,resolveAgent:id=>ctx.sessionController.resolveAgent(id),attach});
  ctx.on('agent/created', ({agent}) => attach(agent));
  for (const agent of ctx.agents.list()) attach(agent);
  ctx.effect(() => ctx.connection.fetch.register({
    path:'/api/dsh-personal-workbench/assistant',methods:['GET','POST'],requestBody:'buffered',async fetch(request) {
      const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
      try {
        if (request.method === 'GET') return new Response(JSON.stringify(await service.operation({action:'read'})),{headers});
        if (!validUIWrite(request)) return new Response(JSON.stringify({error:'请通过主控台设置助手。'}),{headers,status:403});
        const raw = await request.text();
        if(raw.length > 16000) throw new Error('提示词过长。');
        const input = JSON.parse(raw);
        if (input?.action === 'bind' && !isHarnessSession(input.sessionId)) throw new Error('Invalid session');
        return new Response(JSON.stringify(await service.operation(input)),{headers});
      } catch {
        return new Response(JSON.stringify({error:'暂时无法加载或保存助手设置。请核对对话和当前提示词。'}),{headers,status:400});
      }
    },
  }));
}
