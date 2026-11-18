import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { compactId, createNotionAPI, dateColumn, dateOf, nextDate, richText, validId } from './notion-api.js';
import { dates, todayLabel } from './planning.js';
import { fromNotion } from './weekly-plan.js';

const execute = promisify(execFile);
const maxPages = 10;
const pageSize = 100;
const fieldId = /^fld[a-z\d_]{1,90}$/i;
const recordId = /^rec[a-z\d_]{1,90}$/i;
const baseToken = /^[a-z\d]{5,100}$/i;

function officialLink(location, domains, message) {
  let url;
  try { url = new URL(location); } catch { throw Error(message); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !domains.some(domain => url.hostname === domain || url.hostname.endsWith('.'+domain))) throw Error(message);
  return url;
}

function notionLocation(location) {
  if (validId(location)) return { id: location, databaseFirst: false };
  const message = '请复制 Notion 数据库链接，或在「管理数据源」中复制数据源 ID。';
  const url = officialLink(location, ['notion.so', 'notion.site'], message);
  const last = url.pathname.split('/').filter(Boolean).at(-1) || '';
  const id = last.match(/(?:^|-)([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i)?.[1];
  if (!id) throw Error(message);
  return { id, databaseFirst: true };
}

async function notionPlan(config, span, options) {
  const { id, databaseFirst } = notionLocation(config.location || config.url);
  const env = options.env || process.env;
  const token = (config.token || env.DSH_WORKBENCH_NOTION_TOKEN || '').trim();
  if (!token) throw Error('请添加能读取这张表的 Notion 集成令牌，再把数据库共享给该连接。');
  const deadline = Date.now() + 20000;
  const apiFor = source => createNotionAPI({ id: source, token, fetchImpl: options.fetchImpl, timeoutMs: Math.max(1, deadline - Date.now()) });
  let api = apiFor(id), schema;
  async function fromDatabase() {
    const db = await api.database();
    if (db.data_sources.length !== 1 || !validId(db.data_sources[0]?.id)) throw Error('请在 Notion 的「管理数据源」中复制要连接的数据源 ID。');
    api = apiFor(db.data_sources[0].id);
    return api.schema();
  }
  try { schema = databaseFirst ? await fromDatabase() : await api.schema(); }
  catch (error) {
    if (![400,404].includes(error.status)) throw error;
    api = apiFor(id);
    schema = databaseFirst ? await api.schema() : await fromDatabase();
  }
  const field = dateColumn(schema, config.dateField);
  // Include intervals that start before the requested range and remain active in it.
  const pages = await api.pages({ property: field, date: { on_or_before: nextDate(span.end) } });
  const items = [];
  for (const { start, end, item } of fromNotion(pages, schema, field)) {
    if (!start || start > span.end || end < span.start) continue;
    const last = end < span.end ? end : span.end;
    for (let day = start > span.start ? start : span.start; day <= last; day = nextDate(day)) {
      if (items.length >= 6000) throw Error('这段日期的计划过多，请缩小日期范围。');
      items.push({ id: 'notion:'+compactId(item.id)+':'+day, title: item.title, dueDate: day,
        status: item.checked ? 'done' : 'todo', url: item.url, source:'notion', canCheck:false });
    }
  }
  return { label: richText(schema.title) || 'Notion 计划', items };
}

function feishuLocation(location) {
  const message = '请在飞书多维表格中选中计划表，再复制带 table 参数的链接。';
  const url = officialLink(location, ['feishu.cn', 'larksuite.com'], message);
  const match = url.pathname.match(/^\/(base|wiki)\/([a-z\d]{5,100})\/?$/i);
  const table = url.searchParams.get('table'), view = url.searchParams.get('view');
  if (!match || !/^tbl[a-z\d]{1,90}$/i.test(table || '') || (view && !/^vew[a-z\d]{1,90}$/i.test(view))) throw Error(message);
  return { origin:url.origin, kind:match[1], token:match[2], table, view };
}

async function runLark(args, timeout) {
  // GUI apps may not inherit the terminal PATH. The npm binary is also a Win32 executable.
  const commands = process.platform === 'win32' ? ['lark-cli.exe', ...(process.env.APPDATA ? [join(process.env.APPDATA, 'npm', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli.exe')] : [])] :
    ['lark-cli', join(homedir(), '.local', 'lib', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli'), '/opt/homebrew/bin/lark-cli', '/usr/local/bin/lark-cli'];
  for (const command of commands) {
    try {
      const { stdout } = await execute(command, args, { timeout, maxBuffer: 2*1024*1024, windowsHide:true });
      return JSON.parse(stdout);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw Error('飞书读取失败。请确认本人已登录、能打开该表，并授权字段和记录读取。知识库链接还需节点读取权限。');
    }
  }
  throw Error('请先在本机安装官方飞书 CLI（lark-cli）并登录自己的账号。');
}

function feishuDay(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return todayLabel(new Date(value));
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}(?::\d{2})?)?$/.test(value) && dates.day(value.slice(0,10))) return value.slice(0,10);
  return dateOf(value);
}

function chooseFields(fields, configured) {
  const dateFields = fields.filter(f => ['datetime', 'date', 'date_time'].includes(f.type));
  const date = configured ? dateFields.find(f => f.name === configured) : dateFields.length === 1 ? dateFields[0] : null;
  if (!date) throw Error(dateFields.length ? '请在连接设置中填写计划使用的日期列名。' : '该表需要一个日期类型的列，再试一次。');
  const texts = fields.filter(f => f.type === 'text');
  const title = texts.find(f => /^(任务名称|计划名称|任务|计划|标题|名称|task|title|name)$/i.test(f.name)) || texts[0];
  if (!title) throw Error('请选择含任务标题文本列的飞书表格。');
  const status = fields.find(f => ['checkbox','select'].includes(f.type) && /^(状态|任务状态|完成情况|完成状态|已完成|完成|status|done|completed)$/i.test(f.name));
  if (![title,date,...(status?[status]:[])].every(f => fieldId.test(f.id))) throw Error('飞书返回的字段信息不完整。');
  return { title, date, status };
}

async function feishuPlan(config, span, options) {
  const link = feishuLocation(config.location || config.url);
  const deadline = Date.now() + 25000;
  async function command(args) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw Error('飞书读取超时，请稍后再试。');
    return (options.runLark || runLark)(args, Math.min(10000,remaining));
  }
  async function asUser(args) {
    const result = await command([...args,'--as','user']);
    if (result?.ok !== true || result.identity !== 'user' || !result.data) throw Error('请使用已授权且可访问此表的飞书个人账号。');
    return result.data;
  }
  const auth = await command(['auth','status']);
  if (auth?.identity !== 'user' || auth.identities?.user?.available === false) throw Error('请先在官方飞书 CLI 登录个人账号并授权，再回来连接。');
  let token = link.token, label = '飞书计划';
  if (link.kind === 'wiki') {
    const node = await asUser(['wiki','+node-get','--node-token',link.origin+'/wiki/'+token]);
    if (node.obj_type !== 'bitable' || !baseToken.test(node.obj_token)) throw Error('请选择知识库中的多维表格并复制链接。');
    token = node.obj_token;
    if (typeof node.title === 'string' && node.title.trim()) label = node.title.trim().slice(0,150);
  }
  const target = ['--base-token',token,'--table-id',link.table];
  const schema = await asUser(['base','+field-list',...target,'--limit','200']);
  if (!Array.isArray(schema.fields) || schema.total > schema.fields.length) throw Error('飞书返回的字段过多或不完整。');
  const { title, date, status } = chooseFields(schema.fields, config.dateField);
  const selected = [title, date, ...(status ? [status] : [])];
  const args = ['base','+record-list',...target,'--format','json','--limit',String(pageSize),...selected.flatMap(f => ['--field-id',f.id])];
  if (link.view) args.push('--view-id',link.view);
  let offset = 0;
  const items = new Map();
  for (let n=0; n<maxPages; n++) {
    const page = await asUser([...args,'--offset',String(offset)]);
    const rows = page.data || page.records?.rows;
    const ids = page.record_id_list || page.records?.record_ids;
    const columns = page.field_id_list || page.fields || page.records?.schema;
    if (!Array.isArray(rows) || !Array.isArray(ids) || ids.length !== rows.length || !Array.isArray(columns) || rows.length > pageSize) throw Error('飞书返回的记录不完整。');
    const positions = selected.map(f => columns.includes(f.id) ? columns.indexOf(f.id) : columns.indexOf(f.name));
    if (positions.includes(-1) && rows.length) throw Error('飞书表格的标题、日期或状态列无法读取。');
    for (const [i,row] of rows.entries()) {
      if (!recordId.test(ids[i]) || !Array.isArray(row)) throw Error('飞书记录格式无效。');
      const dueDate = feishuDay(row[positions[1]]);
      if (!dueDate || dueDate < span.start || dueDate > span.end) continue;
      const titleText = row[positions[0]];
      if (titleText != null && typeof titleText !== 'string') throw Error('飞书标题列需要文本格式。');
      const done = row[positions[2]];
      items.set(ids[i], { id:'feishu:'+ids[i],title:titleText?.trim().slice(0,1500) || '未命名任务',dueDate,
        status:done===true || /^(完成|已完成|done|complete|completed)$/i.test(done || '') ? 'done' : 'todo',source:'feishu',canCheck:false });
    }
    offset += rows.length;
    const hasMore = typeof page.has_more === 'boolean' ? page.has_more : Number.isInteger(page.total) ? offset < page.total : rows.length === pageSize;
    if (!hasMore) return { label, items:[...items.values()] };
    if (!rows.length) break;
  }
  throw Error('飞书计划超过单次读取上限，请在表格中打开只含所需计划的视图，再复制视图链接。');
}

export async function readServicePlan(config, span, options={}) {
  if (!dates.day(span?.start) || !dates.day(span.end) || span.end < span.start || (Date.parse(span.end)-Date.parse(span.start))/86400000 > 62) throw Error('请选择最多 63 天的有效日期范围。');
  if (config?.provider === 'notion') return notionPlan(config, span, options);
  if (config?.provider === 'feishu') return feishuPlan(config, span, options);
  throw Error('请选择 Notion 或飞书计划表。');
}

export async function probeServicePlan(config, options={}) {
  const today = todayLabel(options.now ? new Date(options.now()) : new Date());
  const { label, items } = await readServicePlan(config, {start:today,end:today}, options);
  return {label, count:items.length};
}
