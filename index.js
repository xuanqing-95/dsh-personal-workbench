import {createUIReleaseReader} from './ui-update-host.js';
import {attachContent} from './content.js';
import {planTool} from './plan-tools.js';
import {createCodexThreadOpener} from './project-navigation.js';
import {attachProjects} from './project-service.js';
import { z } from 'zod';
import { createTasks } from './tasks.js';
import { createHarnessAdapter } from './harness.js';
import { validUIWrite } from './request.js';
import { attachAssistant } from './assistant-host.js';
import { calendarMonth, dates, planDay } from './planning.js';

export const inject = ['connection', 'storageDomain', 'tools'];
const title = '个人主控台';

export function apply(ctx) {

  let uiModules;
  ctx.inject?.(['clientModules'],child=>{uiModules=child.clientModules;child.effect(()=>()=>{uiModules=undefined;});});
  const readUIRelease=createUIReleaseReader({directory:new URL('./',import.meta.url),moduleId:"dsh-personal-workbench",modules:()=>uiModules});
  const projects=attachProjects(ctx);
  const content=attachContent(ctx,projects);
  const openCodexThread=createCodexThreadOpener();
  let pendingStore;
  function store() {
    if (!pendingStore) {
      const record = z.object({
        id: z.string().uuid(), title: z.string().min(1).max(400),
        status: z.enum(['todo', 'doing', 'waiting', 'done']), priority: z.enum(['high', 'normal', 'low']),
        owner: z.enum(['human', 'ai']), dueDate: z.string().nullable(), link: z.null(),
        revision: z.number().int().positive(), createdAt: z.number().int(), updatedAt: z.number().int(), archived: z.boolean(),
      }).strict();
      const attempt = ctx.storageDomain.open({
        name: 'dsh_personal_workbench_tasks', version: 1, tables: {},
        global: { schema: z.object({version: z.literal(1), tasks: z.array(record).max(500)}).strict(), initial: {version: 1, tasks: []} },
      });
      pendingStore = attempt;
      attempt.catch(() => { if (pendingStore === attempt) pendingStore = undefined; });
    }
    return pendingStore;
  }
  ctx.effect(() => async () => { if (pendingStore) await (await pendingStore.catch(() => null))?.close(); });
  const tasks = createTasks({store: {
    async read() { return (await store()).global.get(); },
    async write(value) { await (await store()).global.set(value); return {ok: true}; },
  }});
  ctx.effect(()=>ctx.tools.register(planTool(tasks)));
  let schedule, controller;
  ctx.inject(['schedule'], child => { schedule = child.schedule; child.effect(() => () => { schedule = undefined; }); });
  ctx.inject(['sessionController'], child => { controller = child.sessionController; child.effect(() => () => { controller = undefined; }); });
  ctx.inject(['agents','sessionController'], child => { void attachAssistant(child).catch(() => {}); });
  const live = createHarnessAdapter({schedule: () => schedule, controller: () => controller});
  async function assistants() {
    const {ai, automations} = await live.snapshot();
    // Only distribute the display fields and latest result excerpt used by this profile dashboard.
    const state = ({running, pendingInput, queue}) => ({running, pendingInput, queue});
    return {
      ai: {availability:ai.availability, items:ai.items.map(item=>({id:item.id,title:item.title,...state(item)}))},
      automations: {availability:automations.availability, items:automations.items.map(item=>({
        id:item.id,name:item.name,source:item.source,sessionId:item.sessionId,
        status:item.status,scheduleLabel:item.scheduleLabel,lastRun:item.lastRun,
        result:item.result,execution:item.execution && state(item.execution),
      }))},
    };
  }
  async function dashboard() {
    const [records, activity, brief] = await Promise.all([tasks.list(), assistants(), content.archive()]);
    return {today:records.today, checkedAt:new Date().toISOString(), tasks:records,
      plan:planDay(records.items,records.today), brief:brief.edition, threads:activity.ai.items.map(({id,title})=>({id,title})), ...activity};
  }
  async function change(input) {
    const request = z.discriminatedUnion('action', [
      z.object({action:z.literal('addPlanTask'),input:z.object({title:z.string().trim().min(1).max(200),date:z.string().refine(dates.day)}).strict()}).strict(),
      z.object({action:z.literal('checkPlanTask'),input:z.object({id:z.string().uuid(),revision:z.number().int().positive(),checked:z.boolean()}).strict()}).strict(),
    ]).safeParse(input);
    if (!request.success) throw new Error('请检查任务名称、日期和当前状态。');
    const {action, input: value} = request.data;
    if (action === 'addPlanTask') return tasks.create({title:value.title, dueDate:value.date, priority:'normal'});
    return tasks.update({id:value.id, expectedRevision:value.revision, patch:{status:value.checked?'done':'todo'}});
  }
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const reply = (value,status=200) => new Response(JSON.stringify(value),{status,headers});
  ctx.effect(() => ctx.connection.fetch.register({
    path:'/api/dsh-personal-workbench',methods:['GET','POST'],requestBody:'buffered',async fetch(request) {
      try {
        if (request.method === 'POST') {
          if (!validUIWrite(request)) return reply({error:'请从主控台内操作。'},403);
          const raw = await request.text();
          if (raw.length > 16384) return reply({error:'任务内容过长。'},413);
          const body=JSON.parse(raw);
          return reply({value:body.action==='projectShortcuts'?await projects.change(body.input):body.action==='openCodexThread'?await openCodexThread(body.input):await change(body)});
        }
        const query = new URL(request.url).searchParams;
        switch (query.get('action')) {
          case 'uiRelease': return reply({value:await readUIRelease()});
          case 'projects': return reply({value:{...await projects.read(),notes:await content.projectNotes()}});
          case 'briefArchive': return reply({value:await content.archive(query.get('date')||undefined)});
          case 'export': return reply({value:{format:1,exportedAt:new Date().toISOString(),tasks:await tasks.list(),projects:await projects.read(),content:await content.export()}});
          case 'dashboard': return reply({value:await dashboard()});
          case 'assistants': return reply({value:await assistants()});
          case 'plan': return reply({value:planDay((await tasks.list()).items,query.get('date'))});
          case 'calendar': return reply({value:calendarMonth((await tasks.list()).items,query.get('month'))});
          default: return reply({error:'未知的读取操作。'},400);
        }
      } catch (error) {
        if (error.code === 'REVISION_CONFLICT') return reply({error:'任务刚刚有变化，请刷新后再试。'},409);
        if (['STORE_WRITE_UNKNOWN','STORE_WRITE_BLOCKED'].includes(error.code)) return reply({error:'保存结果待核对，请刷新查看，避免重复添加。'},503);
        return reply({error:'暂时无法读取或保存，请检查输入后重试。'},400);
      }
    },
  }));
  ctx.effect(() => ctx.tools.register({
    name:'personal_home',description:'读取此 Harness 配置中的个人主控台、指定日期的计划或月份安排。只读。',
    parameters:{type:'object',properties:{view:{enum:['today','plan','calendar','projects']},date:{type:'string'},month:{type:'string'}},required:['view'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute(args) {
      if (args.view === 'today') return dashboard();
      if (args.view === 'projects') return projects.read();
      const {items} = await tasks.list();
      if (args.view === 'plan') return planDay(items,args.date);
      if (args.view === 'calendar') return calendarMonth(items,args.month);
      throw new Error(`${title}：未知的读取操作。`);
    },
  }));
}

