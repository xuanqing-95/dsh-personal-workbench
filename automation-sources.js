import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import { open, readdir, realpath, stat } from 'node:fs/promises';
import { dates, todayLabel } from './planning.js';
import {readEditionFigure} from './brief-image.js';

const MAX_JSON = 1024 * 1024;
const validDate = dates.day;
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
function https(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
async function boundedFile(file, root, limit = MAX_JSON) {
  const [actual, directory] = await Promise.all([realpath(file), realpath(root)]);
  const relative = path.relative(directory, actual);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !relative || relative === '..') throw Error('无效的文件位置');
  const handle = await open(actual, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw Error('文件过大或无法读取');
    const buffer = Buffer.alloc(info.size + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await handle.read(buffer, count, buffer.length - count, count);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > limit || count !== info.size) throw Error('文件正在更新');
    return buffer.toString('utf8', 0, count);
  } finally { await handle.close(); }
}
function scheduleLabel(value) {
  if (typeof value !== 'string') return '时间未提供';
  const cron = value.trim().match(/^(\d{1,2}) ([\d,]+) \* \* \*$/);
  if (cron) return '每天 ' + cron[2].split(',').map(hour => `${hour.padStart(2, '0')}:${cron[1].padStart(2, '0')}`).join('、');
  const hour = value.match(/(?:^|;)BYHOUR=(\d+)/)?.[1], minute = value.match(/(?:^|;)BYMINUTE=(\d+)/)?.[1] || '0';
  if (hour) {
    const days = value.match(/(?:^|;)BYDAY=([A-Z,]+)/)?.[1];
    const weekdays = { MO: '一', TU: '二', WE: '三', TH: '四', FR: '五', SA: '六', SU: '日' };
    const prefix = days ? '每周' + days.split(',').map(x => weekdays[x] || x).join('、') : value.includes('FREQ=DAILY') ? '每天' : '每周';
    return `${prefix} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  return text(value, 150) || '时间未提供';
}
function tomlString(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*(\"(?:[^\"\\\\]|\\\\.)*\")\\s*$`, 'm'));
  try { return match ? JSON.parse(match[1]) : null; } catch { return null; }
}


// Display a bounded, redacted explanation rather than exporting raw scheduler logs.
function dailyFailure(value) {
  if(typeof value!=='string'||!value.trim())return null;
  const clean=value.slice(0,8000)
    .replace(/Bearer\s+\S+|\b(?:sk-|ghp_)[A-Za-z0-9_-]+/gi,'[已隐藏]')
    .replace(/((?:api[_-]?key|token|password|secret|cookie|authorization)["']?\s*[:=]\s*)[^\s,;，；]+/gi,'$1[已隐藏]')
    .replace(/https?:\/\/[^\s)]+/g,'[链接]')
    .replace(/\/(?:Users|home)\/[^\s，；。]+/g,'[本地路径]')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g,'').replace(/[*#`]/g,'');
  const lines=clean.split(/\n+/).map(s=>s.trim().replace(/^[-•]\s*/,'' )).filter(Boolean);
  const channels={};
  for(const [key,name] of [['wechat','微信'],['feishu','飞书'],['xiaobot','小报童']]){
    const line=lines.find(s=>new RegExp(name+'[：:][^。\\n]*(?:失败|拒绝|未恢复)').test(s))
      ||lines.find(s=>new RegExp(name+'(?:发送|推送)?(?:仍未恢复|尚未恢复|失败|被拒绝)').test(s));
    if(!line||/不再失败|没有失败|未失败/.test(line))continue;
    channels[key]=line.slice(line.indexOf(name)+name.length).replace(/^[：:，,\s]+/,'').slice(0,280);
  }
  return {summary:lines[0]?.slice(0,500)||'执行未完成，未提供具体原因。',channels};
}


// Query only the existing scheduler ledger, using the same read-only statement on Node and Bun.
export async function readHermesExecutions(dir,{loadSQLite=()=>import('node:sqlite'),run=promisify(execFile)}={}) {
  const db = path.join(dir, 'executions.db');
  if (path.dirname(await realpath(db)) !== await realpath(dir)) throw Error('无效的执行记录位置');
  const info = await stat(db);
  if (!info.isFile() || info.size > 64 * MAX_JSON) throw Error('执行记录暂时无法读取');
  const sql='SELECT id, job_id, status, started_at, finished_at, delivery_outcome, progress_at, substr(error,1,8000) AS error FROM executions ORDER BY claimed_at DESC LIMIT 200';
  const sqlite=await loadSQLite().catch(()=>null);
  if(sqlite?.DatabaseSync){
    const connection=new sqlite.DatabaseSync(db,{readOnly:true});
    try { return connection.prepare(sql).all(); } finally { connection.close(); }
  }
  const {stdout}=await run('sqlite3',['-readonly','-json',db,sql],{shell:false,timeout:4000,maxBuffer:2*MAX_JSON});
  const records=JSON.parse(stdout.trim()||'[]');
  if(!Array.isArray(records)||records.length>200||records.some(row=>!row||typeof row!=='object'))throw Error('执行记录格式无效');
  return records;
}

export function createExternalSources({env=process.env,home=os.homedir(),now=()=>new Date(),executions=readHermesExecutions,platform=process.platform,run=promisify(execFile)}={}) {
  const dailyDir = path.isAbsolute(env.DSH_WORKBENCH_BRIEF_DIR || '') ? env.DSH_WORKBENCH_BRIEF_DIR : null;
  const hermesDir = path.isAbsolute(env.HERMES_HOME || '') ? env.HERMES_HOME : path.join(home,'.hermes');
  const codexDir = path.join(path.isAbsolute(env.CODEX_HOME || '') ? env.CODEX_HOME : path.join(home,'.codex'),'automations');
  async function readBriefIssue(date) {
    try {
      if (!dailyDir || !validDate(date)) return null;
      const issue = JSON.parse(await boundedFile(path.join(dailyDir, date + '.json'), dailyDir));
      if (issue?.date !== date || !Array.isArray(issue.items)) return null;
      const items = issue.items.slice(0, 20).filter(item => Array.isArray(item) && text(item[0]).trim())
        .map(item => ({ title: text(item[0], 500), body: text(item[1], 12000), url: https(item[2]), summary: text(item[4], 2000) }));
      return items.length ? { issue, items, date } : null;
    } catch { return null; }
  }

  async function briefDates(suffix, before) {
    if (!dailyDir) return [];
    let names;
    try { names = await readdir(dailyDir); }
    catch { return []; }
    return names.filter(name => name.slice(10) === suffix).map(name => name.slice(0, 10))
      .filter(date => date < before && validDate(date)).sort().reverse();
  }

  async function latestBriefIssue(today) {
    const current = await readBriefIssue(today);
    if (current) return current;
    for (const date of (await briefDates('.json', today)).slice(0,366)) {
      const archived = await readBriefIssue(date);
      if (archived) return archived;
    }
    return null;
  }

  async function readBriefStatus(date) {
    try {
      if (!dailyDir || !validDate(date)) return {};
      const value = JSON.parse(await boundedFile(path.join(dailyDir, date + '.status.json'), dailyDir));
      if (value.date === date) return value;
    } catch {}
    return {};
  }

  function verifiedPublicationReceipt(status) {
    const url = https(status.verified_reader_url);
    if (!url || !timestamp(status.published_at)) return false;
    const reader = new URL(url);
    return reader.origin === 'https://xiaobot.net'
      && /^\/post\/[a-z0-9-]+\/?$/i.test(reader.pathname)
      && (/^已发布[，,]\s*读者页核验通过[。.]?$/.test(text(status.xiaobot).trim())
        || (/^已发布(?:[，,]|$)/.test(text(status.xiaobot).trim())
          && !!timestamp(status.reader_verified_at)
          && Date.parse(status.reader_verified_at) >= Date.parse(status.published_at)));
  }

  function briefReview(date, status, title) {
    const url = https(status.verified_reader_url);
    if (!url || !timestamp(status.published_at) || (status.publication_complete !== true && status.xiaobot !== '已发布' && !verifiedPublicationReceipt(status))) return null;
    return { key: 'brief:' + date, date, title, url, deliveredAt: timestamp(status.published_at) };
  }

  async function previousBriefReview(before) {
    for (const date of (await briefDates('.status.json', before)).slice(0, 14)) {
      const status = await readBriefStatus(date);
      if (!briefReview(date, status, '')) continue;
      const issue = await readBriefIssue(date);
      if (issue) return briefReview(date, status, issue.items[0].title);
    }
    return null;
  }

  async function readBrief() {
    const today = todayLabel(now()), base = { availability: 'unavailable', date: today, title: 'AI 每日精选', items: [], publicationComplete: false, submissionComplete: false, readerVerified: false };
    const latest = await latestBriefIssue(today);
    if (!latest) return { ...base, reason: '暂时没有可读取的日报。日报生成后会自动出现在这里。' };
    const { issue, items, date } = latest;
    const status = await readBriefStatus(date);
    const receiptVerified = verifiedPublicationReceipt(status);
    const figure=await readEditionFigure(dailyDir,date,issue);
    const review = briefReview(date, status, items[0].title);
    const previousReview = await previousBriefReview(date);
    return { ...base, date, availability: 'connected', title: text(issue.title, 500) || base.title, items,
      review, previousReview,
      ...figure,
      publicationComplete: Boolean(review), submissionComplete: status.business_submission_complete === true,
      readerVerified: status.reader_verified === true || receiptVerified, url: https(status.verified_reader_url), outcome: text(status.run_outcome, 200),
      updatedAt: timestamp(status.updated_at),
      channels: { xiaobot: text(status.xiaobot, 300), feishu: text(status.feishu, 300), wechat: text(status.wechat, 300) },
      ...(Object.keys(status).length ? {} : { reason: '定稿已就绪，尚无可验证的发布回执。' }),
    };
  }

  async function readBriefArchive(requestedDate) {
    const today = todayLabel(now());
    if (requestedDate && (!validDate(requestedDate) || requestedDate > today)) throw new Error('请选择有效刊期。');
    const publishedIssue = async date => {
      const status = await readBriefStatus(date);
      if (!briefReview(date, status, '')) return null;
      const item = await readBriefIssue(date);
      if (!item) return null;
      const figure=await readEditionFigure(dailyDir,date,item.issue,{archive:true});
      return { date, items:item.items, url:https(status.verified_reader_url),
        title:text(item.issue.title, 180)||item.items[0].title, ...figure };
    };
    if (requestedDate) return {today, edition:await publishedIssue(requestedDate)};
    const days = [today,...(await briefDates('.status.json',today)).slice(0,29)];
    const published = await Promise.all(days.map(async date => {
      const status = await readBriefStatus(date);
      return briefReview(date,status,'')?date:null;
    }));
    const dates = published.filter(Boolean);
    for (const date of dates) {
      const edition = await publishedIssue(date);
      if (edition) return {today, dates, edition};
    }
    return {today,dates,edition:null};
  }

  async function readBriefImage(date,revision,archive=false) {
    if(!dailyDir||!validDate(date)||!(/^[a-f0-9]{16}$/.test(revision||'')))return null;
    const today=todayLabel(now());
    if(date>today)return null;
    try {
      if(archive&&!briefReview(date,await readBriefStatus(date),''))return null;
      const record=archive?await readBriefIssue(date):await latestBriefIssue(today);
      if(record?.date!==date)return null;
      const figure=await readEditionFigure(dailyDir,date,record.issue,{archive,includeData:true});
      return figure.leadImage?.revision===revision?{data:figure.data,mime:figure.mime}:null;
    }catch{return null;}
  }

  async function readExternalAutomations() {
    const items = [];
    const configured = env.DSH_WORKBENCH_HERMES_PROFILE;
    let profiles = [];
    if (configured && ID.test(configured)) profiles = [configured];
    if (!configured) {
      profiles.push('');
      try {
        const entries = await readdir(path.join(hermesDir,'profiles'),{withFileTypes:true});
        profiles.push(...entries.filter(e=>e.isDirectory()&&ID.test(e.name)).map(e=>e.name).sort().slice(0,16));
      } catch {}
    }
    for (const profile of profiles) {
      const cronDir = profile ? path.join(hermesDir, 'profiles', profile, 'cron') : path.join(hermesDir,'cron');
      try {
        const document = JSON.parse(await boundedFile(path.join(cronDir,'jobs.json'),hermesDir));
        const jobs = Array.isArray(document) ? document : document.jobs;
        let records = [], recordError = false;
        try { records = await executions(cronDir); } catch { recordError = true; }
        for (const job of (Array.isArray(jobs) ? jobs : []).slice(0, 50)) {
          if (typeof job?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(job.id)) continue;
          const jobRecords = records.filter(record => record.job_id === job.id);
          const current = jobRecords[0], running = current && ['claimed', 'running'].includes(current.status);
          const lastOutcome = jobRecords.find(record => !['claimed', 'running'].includes(record.status));
          const lastStatus = current?.status || job.last_status;
          const failure = !running && ['failed','error'].includes(lastStatus) ? dailyFailure(current?.error || (!current ? job.last_error : '')) : null;
          const status = running ? 'running' : job.enabled === false ? 'paused' : ['failed', 'error'].includes(lastStatus) ? 'failed' : job.state === 'completed' ? 'completed' : recordError ? 'unknown' : 'scheduled';
          const isDailyBrief = env.DSH_WORKBENCH_HERMES_JOB_ID ? job.id===env.DSH_WORKBENCH_HERMES_JOB_ID : /日报|daily[ -]+(?:brief|digest|report)/iu.test(text(job.name));
          items.push({ id: `hermes:${profile || 'default'}:${job.id}`, sourceId: job.id, profile,
            isDailyBrief,hermesNavigation:isDailyBrief&&platform==='darwin',
            url:https(env.DSH_WORKBENCH_HERMES_URL), name: text(job.name, 300) || 'Hermes 自动化', status,
            timeZone:text(job.schedule?.timezone||job.schedule?.timeZone||job.timezone||job.timeZone,80)||undefined,
            scheduleLabel: scheduleLabel(job.schedule?.expr || job.schedule?.display), source: 'hermes', canRun: false, canToggle: false,
            lastRun: { id: text(current?.id, 100), status: text(lastStatus, 50), startedAt: timestamp(current?.started_at || job.last_run_at), finishedAt: timestamp(current?.finished_at), deliveryOutcome: text(current?.delivery_outcome, 100), ...(failure ? {failure} : {}) },
            lastOutcome: lastOutcome?{status:text(lastOutcome.status,50),at:timestamp(lastOutcome.finished_at||lastOutcome.started_at)}:null,
            nextRunAt: timestamp(job.next_run_at),
            execution: { running: Boolean(running), pendingInput: [], queue: [], id: text(current?.id, 100), status: text(current?.status, 50),
              startedAt: timestamp(current?.started_at), finishedAt: timestamp(current?.finished_at), progressAt: timestamp(current?.progress_at), known: !recordError && Boolean(current) },
            result: { text: running ? '正在执行，请等待本轮结果。' : ['failed', 'error'].includes(lastStatus) ? '最近执行报告失败；请查看日报各渠道回执。'
              : lastStatus === 'completed' || lastStatus === 'success' ? '最近执行结束；业务成果请查看对应回执。' : '尚无已确认的执行结果。', createdAt: timestamp(current?.finished_at || job.last_run_at) },
            ...(recordError ? { error: '执行记录暂时无法读取，当前运行状态未验证。' } : {}),
          });
        }
      } catch {}
    }
    try {
      const dir = codexDir, entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries.filter(entry => entry.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(entry.name)).slice(0, 50)) {
        try {
          const source = await boundedFile(path.join(dir, entry.name, 'automation.toml'), dir, 512 * 1024);
          const id = tomlString(source, 'id');
          if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) continue;
          items.push({ id: `codex:${id}`, sourceId: id, name: text(tomlString(source, 'name'), 300) || 'Codex 自动化',
            status: tomlString(source, 'status') === 'ACTIVE' ? 'scheduled' : tomlString(source, 'status') === 'PAUSED' ? 'paused' : 'unknown',
            scheduleLabel: scheduleLabel(tomlString(source, 'rrule')), source: 'codex', canRun: false, canToggle: false,
            result: { text: '此处显示计划配置；运行结果请在 Codex 查看。' },
          });
        } catch {}
      }
    } catch {}
    return { items };
  }
  const opening=new Map();
  async function openHermesDaily(input) {
    if (!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||typeof input.id!=='string')
      throw Error('请选择已关联的日报任务。');
    if(platform!=='darwin')throw Error('此入口需要本机 macOS Hermes 应用。');
    const {id}=input;
    if(opening.has(id))return opening.get(id);
    const request=(async()=>{
      const item=(await readExternalAutomations()).items.find(row=>row.id===id&&row.hermesNavigation);
      if(!item)throw Error('找不到对应的 Hermes 日报任务。');
      const profile=item.profile?path.join(hermesDir,'profiles',item.profile):hermesDir;
      const db=path.join(profile,'state.db');
      let thread;
      try {
        if(path.dirname(await realpath(db))!==await realpath(profile))throw Error();
        const configured=env.DSH_WORKBENCH_HERMES_SESSION_ID;
        if(configured&&!ID.test(configured))throw Error();
        // Only resolve an explicitly selected session or the unique Bot Chat in this profile.
        const where=configured?`id='${configured}'`:"title='Bot Chat'";
        const found=await run('/usr/bin/sqlite3',['-readonly',db,`SELECT id FROM sessions WHERE ${where} AND archived=0 LIMIT 2`],
          {shell:false,timeout:4000,maxBuffer:4096});
        const rows=found.stdout.trim().split(/\r?\n/);
        if(rows.length!==1||!/^[-a-zA-Z0-9_]{1,160}$/.test(rows[0]))throw Error();
        thread=rows[0];
      } catch {throw Error('暂时找不到此日报任务的唯一 Hermes 对话，请在 Hermes 中确认。');}
      try {
        await run('/usr/bin/open',['-a','Hermes','hermes://open/'+encodeURIComponent(thread)],{shell:false,timeout:5000,maxBuffer:4096});
      } catch {throw Error('无法打开日报对话，请确认本机已安装 Hermes。');}
      return {opened:true,application:'hermes',id:thread};
    })().finally(()=>opening.delete(id));
    opening.set(id,request);
    return request;
  }
  return {readBrief, readBriefArchive, readBriefImage, readExternalAutomations, openHermesDaily};
}
