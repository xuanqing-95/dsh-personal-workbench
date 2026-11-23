import {createReleaseCheck} from './release-status.js';
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
import {attachPlanConnection,pickPlanLocation} from './plan-connection.js';
import { dates } from './planning.js';
import {attachBriefConnection} from './brief-connection.js';
import { createPlanReader } from './notion-plans.js';
import { createWeeklyPlanReader, validateWeek } from './weekly-plan.js';
import {attachQuotaConnections} from './quota-connections.js';
import { createUsageReader } from './usage.js';
import { installWeixinNotifications } from './weixin-notification-host.js';
import { attachPersonalOrganization } from './organization-host.js';
import {attachAssistantFollowing} from './assistant-follow.js';
import {attachFirstRun} from './first-run.js';

export const inject = ['connection', 'storageDomain', 'tools'];
const title = '个人 AI 工作台';

export function apply(ctx) {

  let uiModules;
  ctx.inject?.(['clientModules'],child=>{uiModules=child.clientModules;child.effect(()=>()=>{uiModules=undefined;});});
  const readUIRelease=createUIReleaseReader({directory:new URL('./',import.meta.url),moduleId:"dsh-personal-workbench-xuanqing",modules:()=>uiModules});
  const checkRelease=createReleaseCheck();
  const projects=attachProjects(ctx);
  const firstRun=attachFirstRun(ctx);
  const following=attachAssistantFollowing(ctx);
  const briefs=attachBriefConnection(ctx);
  const external=briefs.external;
  const content=attachContent(ctx,projects,external);
  const notifications=installWeixinNotifications(ctx);
  const openCodexThread=createCodexThreadOpener();
  let pendingStore;
  function store() {
    if (!pendingStore) {
      const record = z.object({
        id: z.string().uuid(), title: z.string().min(1).max(400),
        status: z.enum(['todo', 'doing', 'waiting', 'done']), priority: z.enum(['high', 'normal', 'low']),
        owner: z.enum(['human', 'ai']), dueDate: z.string().nullable(), link:z.object({kind:z.enum(['redflow-run','redflow-original','redflow-rewrite']),id:z.string().uuid()}).strict().nullable(),
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
  const organization = attachPersonalOrganization(ctx,tasks);
  const listTasks = () => tasks.list();
  const connection=attachPlanConnection(ctx);
  ctx.effect(()=>ctx.tools.register({
    name:'personal_plan_source',
    description:'管理工作台的计划来源。普通待办用 personal_plan 添加。用户明确希望持续同步一份已有计划时，先用 status 核对已有连接，再根据用户给的链接或路径识别来源并 connect。仅使用用户指定的位置。断开须由用户提出。凭证通过本机配置，不在聊天中索取。',
    parameters:{type:'object',properties:{action:{enum:['status','connect','disconnect']},provider:{enum:['notion','feishu','obsidian','file']},location:{type:'string'},dateField:{type:'string'}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute({action,provider,location,dateField}){
      if(action==='status')return connection.status();
      if(action==='disconnect')return connection.disconnect();
      if(action==='connect')return connection.connect({provider,location,dateField});
      throw Error('未知计划来源操作。');
    },
    isConcurrencySafe:()=>false
  }));
  const plans = createPlanReader({listTasks,readConnection:connection.read, updateTask: input => tasks.update(input)});
  const weeklyPlan = createWeeklyPlanReader({listTasks,readConnection:connection.read});
  const usage = createUsageReader();
  const readUsage=async()=>usage.read((await projects.change({action:'list'})).items);
  const quotas=attachQuotaConnections(ctx,{readUsage});
  ctx.effect(() => () => usage.close());
  let schedule, controller;
  ctx.inject(['schedule'], child => { schedule = child.schedule; child.effect(() => () => { schedule = undefined; }); });
  ctx.inject(['sessionController'], child => { controller = child.sessionController; child.effect(() => () => { controller = undefined; }); });
  ctx.inject(['agents','sessionController'], child => { void attachAssistant(child).catch(() => {}); });
  const live = createHarnessAdapter({schedule: () => schedule, controller: () => controller});
  async function assistants() {
    const [{ai, automations}, remote, brief] = await Promise.all([
      following.list().then(ids=>live.snapshot(ids)), external.readExternalAutomations(), content.readBrief(),
    ]);
    const local = automations.items.map(({prompt, ...display}) => display);
    return {
      ai: {...ai, items:ai.items.map(({result, ...display}) => display)},
      automations: {...automations, items:[...local, ...remote.items],
        availability:automations.availability === 'unavailable' && remote.items.length ? 'partial' : automations.availability},
      brief,
    };
  }
  async function dashboard() {
    const [records, archived, activity, plan, organized] = await Promise.all([
      tasks.list(), tasks.list({view:'archived'}), assistants(), plans.readPlan(), organization.list(),
    ]);
    const onboarding=await firstRun.status(async()=>{
      if(activity.ai.items.some(session=>session.followed)||records.items.length||archived.items.length||plan.items?.length||plan.groups?.some(group=>group.tasks?.length||group.items?.length)||activity.brief.items?.length||organized.projects?.length)return true;
      const [savedProjects,savedContent,planConnection,briefConnection]=await Promise.all([
        projects.change({action:'list'}),content.export(),connection.status(),briefs.status(),
      ]);
      return Boolean(savedProjects.items.length||savedContent.editions.length||Object.keys(savedContent.notes).length||planConnection.provider||briefConnection.provider);
    });
    return {today:records.today, checkedAt:new Date().toISOString(), onboarding, tasks:{...records,archived:archived.items},
      plan, organization:organized, canOpenTodayPlan:organized.canOpenTodayPlan,
      threads:activity.ai.items.map(({id,title})=>({id,title})), ...activity};
  }
  const newTask = z.object({title:z.string().trim().min(1).max(200),date:z.string().refine(dates.day)}).strict();
  async function change(body) {
    if (!body || typeof body !== 'object' || Object.keys(body).some(key=>!['action','input'].includes(key))) throw Error('操作格式有误。');
    const input=body.input;
    switch(body.action) {
      case 'unfollowAssistant': return following.change(input?.id,false);
      case 'dismissExamples': return firstRun.dismiss();
      case 'connectQuota': return quotas.connect(input);
      case 'disconnectQuota': return quotas.disconnect(input);
      case 'connectPlan': return connection.connect(input);
      case 'disconnectPlan': return connection.disconnect();
      case 'pickPlanLocation': return pickPlanLocation(input);
      case 'connectBrief': return briefs.connect(input);
      case 'disconnectBrief': return briefs.disconnect();
      case 'addPlanTask': {
        const value=newTask.parse(input);
        return tasks.create({title:value.title,dueDate:value.date,priority:'normal'});
      }
      case 'checkPlanTask': return plans.checkPlanTask(input);
      case 'projectShortcuts': return projects.change(input);
      case 'projectNotes': return content.changeProjectNotes(input);
      case 'openCodexThread': return openCodexThread(input);
      case 'openHermesDaily': return external.openHermesDaily(input);
      case 'openTodayPlan': return organization.openTodayPlan(input);
      default: throw Error('未知操作。');
    }
  }
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const reply = (value,status=200) => new Response(JSON.stringify(value),{status,headers});
  ctx.effect(() => ctx.connection.fetch.register({
    path:'/api/dsh-personal-workbench',methods:['GET','POST'],requestBody:'buffered',async fetch(request) {
      try {
        if (request.method === 'POST') {
          if (!validUIWrite(request)) return reply({error:'请从工作台内操作。'},403);
          const raw = await request.text();
          if (raw.length > 65536) return reply({error:'任务内容过长。'},413);
          const body=JSON.parse(raw);
          return reply({value:await change(body)});
        }
        const query = new URL(request.url).searchParams;
        switch (query.get('action')) {
          case 'quotaConnections': return reply({value:await quotas.status()});
          case 'planConnection': return reply({value:await connection.status()});
          case 'briefConnection': return reply({value:await briefs.status()});
          case 'releaseStatus': return reply({value:await checkRelease()});
          case 'uiRelease': return reply({value:await readUIRelease()});
          case 'usage': return reply({value:await readUsage()});
          case 'projectNotes': return reply({value:await content.changeProjectNotes({action:'list'})});
          case 'organization': return reply({value:await organization.list()});
          case 'notificationStatus': return reply({value:await notifications.status()});
          case 'weeklyPlan': return reply({value:await weeklyPlan(validateWeek(query.get('week')))});
          case 'briefImage': {
            const image=await external.readBriefImage(query.get('date'),query.get('v'),query.get('archive')==='1');
            return image ? new Response(image.data,{headers:{'Content-Type':image.mime,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}}) : new Response(null,{status:404});
          }
          case 'projects': return reply({value:{...await projects.read(),notes:await content.projectNotes()}});
          case 'briefArchive': return reply({value:await content.archive(query.get('date')||undefined)});
          case 'export': return reply({value:{format:1,exportedAt:new Date().toISOString(),tasks:await tasks.list(),projects:await projects.read(),content:await content.export()}});
          case 'dashboard': return reply({value:await dashboard()});
          case 'assistants': return reply({value:await assistants()});
          case 'plan': return reply({value:await plans.readPlan(query.get('date') || undefined)});
          case 'calendar': return reply({value:await plans.readCalendar(query.get('month'),query.get('week'))});
          default: return reply({error:'未知的读取操作。'},400);
        }
      } catch (error) {
        if (error.code?.startsWith('QUOTA_')||error.code==='BRIEF_CONNECTION')return reply({error:error.message},400);
        if (error.code?.startsWith('PLAN_')) return reply({error:error.message},
          error.code==='PLAN_CHECK_PERMISSION' ? 403 : error.code==='PLAN_CHECK_CONFLICT' ? 409 : error.code==='PLAN_CHECK_UNKNOWN' ? 503 : 400);
        if (['APP_OPEN_FAILED','APP_UNAVAILABLE'].includes(error.code)) return reply({error:error.message},400);
        if (error.code === 'REVISION_CONFLICT') return reply({error:'任务刚刚有变化，请刷新后再试。'},409);
        if (['STORE_WRITE_UNKNOWN','STORE_WRITE_BLOCKED'].includes(error.code)) return reply({error:'保存结果待核对，请刷新查看，避免重复添加。'},503);
        return reply({error:'暂时无法读取或保存，请检查输入后重试。'},400);
      }
    },
  }));
  ctx.effect(() => ctx.tools.register({
    name:'dsh_personal_home',description:'读取此 Harness 配置中的个人 AI 工作台、指定日期的计划或月份安排。只读。',
    parameters:{type:'object',properties:{view:{enum:['today','plan','calendar','projects']},date:{type:'string'},month:{type:'string'}},required:['view'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute(args) {
      if (args.view === 'today') return dashboard();
      if (args.view === 'projects') return projects.read();
      if (args.view === 'plan') return plans.readPlan(args.date);
      if (args.view === 'calendar') return plans.readCalendar(args.month);
      throw new Error(`${title}：未知的读取操作。`);
    },
  }));
}

