import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {access, lstat, open, realpath} from 'node:fs/promises';
import path from 'node:path';
import {parseTodayPlanFile} from './local-plan-file.js';
import {dates} from './planning.js';

const dayMs = 86400000;
const maxMarkdownBytes = 2 * 1024 * 1024;
const maxBytesPerRead = 50 * 1024 * 1024;

function externalRow(key, title, dueDate, checked, details = {}) {
  const hash = createHash('sha256').update(JSON.stringify(key)).digest('hex').slice(0,32);
  return {id:'file-'+hash, title, dueDate, status:checked?'done':'todo', checked, canCheck:false, source:'external-file', ...details};
}

// In a daily-note folder, YYYY-MM-DD.md is the day's list, matching the way the
// user opens it in Obsidian. We only open names for the dates on screen.
function markdownRows(content, file, journalDay, start, end) {
  let date = journalDay, dateLevel = 0, group = '', fence = null, frontMatter = false;
  const rows = [], occurrences = new Map();
  const lines = content.replace(/^\uFEFF/,'').replace(/<!--[^]*?(?:-->|$)|%%[^]*?(?:%%|$)/g,'').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (index === 0 && line.trim() === '---') {frontMatter = true; continue;}
    if (frontMatter) {if (/^(---|\.\.\.)\s*$/.test(line)) frontMatter = false; continue;}
    const fenceMark = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceMark) {
      const [, mark, remainder] = fenceMark;
      if (!fence) fence = mark;
      else if (mark[0] === fence[0] && mark.length >= fence.length && !remainder.trim()) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = /^\s{0,3}(#{1,6})\s+(.+)/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const headingDay = heading[2].match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
      if (headingDay) {
        date = journalDay ?? (dates.day(headingDay) ? headingDay : null);
        dateLevel = level;
        group = '';
      } else {
        if (level <= dateLevel) {date = journalDay; dateLevel = 0;}
        group = heading[2].trim().slice(0,100);
      }
      continue;
    }
    const task = /^\s*(?:[-+*]|\d+[.)])\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
    if (!task) continue;
    const marker = /(?:📅\s*(20\d{2}-\d{2}-\d{2})|\[due::\s*(20\d{2}-\d{2}-\d{2})\s*\]|(?:^|\s)@(20\d{2}-\d{2}-\d{2})\b)/i.exec(task[2]);
    const day = journalDay ?? (marker ? marker[1] || marker[2] || marker[3] : date);
    if (!dates.day(day) || day < start || day > end) continue;
    const title = (marker ? task[2].replace(marker[0],' ') : task[2]).trim().slice(0,2000);
    if (!title) continue;
    const identity = JSON.stringify([day, group, title]);
    const n = (occurrences.get(identity) || 0) + 1;
    occurrences.set(identity,n);
    rows.push(externalRow([file,identity,n], title, day, task[1]!==' ', group ? {group} : {}));
  }
  return rows;
}

function jsonRows(value, file, start, end) {
  if (value?.format === 'today-plan-local') {
    return parseTodayPlanFile(value)
      .filter(task => task.dueDate >= start && task.dueDate <= end)
      .map(task => externalRow([file, task.id], task.title, task.dueDate, task.checked, {group:task.group,note:task.note}));
  }
  const tasks = Array.isArray(value) ? value : value?.tasks;
  if (!Array.isArray(tasks) || tasks.length > 100000)
    throw Error('请选择今日计划 v1 的 JSON 文件，或包含 tasks 数组的计划文件。');
  const rows = [], ids = new Set(), occurrences = new Map();
  for (const task of tasks) {
    if (!task || typeof task !== 'object') throw Error('计划列表中有格式不正确的待办。');
    const title = task.title ?? task.text;
    const day = task.dueDate ?? task.date;
    if (!dates.day(day) || typeof title !== 'string' || !title.trim() || title.length > 2000)
      throw Error('每条待办都需要填写标题和有效日期（YYYY-MM-DD）。');
    if (task.checked !== undefined && typeof task.checked !== 'boolean')
      throw Error('待办的 checked 字段需要为 true 或 false。');
    if (task.status !== undefined && !['done','todo','doing','waiting'].includes(task.status))
      throw Error('待办状态支持 todo、doing、waiting 或 done。');
    if (task.id !== undefined && (typeof task.id !== 'string' || !task.id.trim() || task.id.length > 200 || ids.has(task.id)))
      throw Error('计划文件中的待办编号无效或重复。');
    if (task.id !== undefined) ids.add(task.id);
    if (day < start || day > end || task.deletedAt || task.archived) continue;
    const details = {};
    if (typeof task.group === 'string' && task.group.trim()) details.group = task.group.trim().slice(0,100);
    if (typeof task.note === 'string' && task.note.trim()) details.note = task.note.trim().slice(0,1500);
    if (task.checked === undefined && task.status) details.status = task.status;
    let key = [file, task.id];
    if (task.id === undefined) {
      const identity = JSON.stringify([day, details.group, title.trim()]);
      const occurrence = (occurrences.get(identity) || 0) + 1;
      occurrences.set(identity, occurrence);
      key = [file, identity, occurrence];
    }
    rows.push(externalRow(key, title.trim(), day, task.checked ?? task.status === 'done', details));
  }
  return rows;
}

async function readDocument(file, limit, budget) {
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0);
  const before = await lstat(file);
  if (!before.isFile()) throw Error('请选择实际的计划文件，不能使用快捷方式或符号链接。');
  const handle = await open(file, flags);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.ino !== before.ino || stat.dev !== before.dev) throw Error('计划文件已变动，请重新打开。');
    if (stat.size > limit || stat.size > budget.left) throw Error('当前选定的计划文件过大，请选择较小的日记或导出文件。');
    budget.left -= stat.size;
    const bytes = Buffer.alloc(stat.size);
    let pos = 0;
    while (pos < bytes.length) {
      const {bytesRead} = await handle.read(bytes,pos,bytes.length-pos,pos);
      if (!bytesRead) throw Error('计划文件正在更新，请稍后重试。');
      pos += bytesRead;
    }
    const after = await handle.stat();
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs)
      throw Error('计划文件正在更新，请稍后重试。');
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  } finally {await handle.close();}
}

export async function readFilePlan(connection, {start, end}) {
  if (!dates.day(start) || !dates.day(end) || end < start || Date.parse(end)-Date.parse(start) > 366*dayMs)
    throw Error('请选择一年以内的有效计划日期。');
  const selection = connection?.path;
  if (!['obsidian','file'].includes(connection?.provider) || typeof selection !== 'string' || !path.isAbsolute(selection)
      || selection.length > 4096 || selection.includes('\0')) throw Error('请选择计划文件或日记文件夹。');
  const selectedPath = path.resolve(selection);
  const budget = {left:maxBytesPerRead};
  try {
    const selected = await lstat(selectedPath);
    if (selected.isSymbolicLink()) throw Error('请选择实际文件或文件夹，不能使用符号链接。');
    const canonical = await realpath(selectedPath);
    const sourceName = path.basename(canonical);
    if (selected.isDirectory()) {
      await access(canonical,constants.R_OK|constants.X_OK);
      const items = [];
      let filesRead = 0;
      for (let time=Date.parse(start); time<=Date.parse(end); time+=dayMs) {
        const day = new Date(time).toISOString().slice(0,10);
        const file = path.join(canonical,day+'.md');
        let content;
        try {content = await readDocument(file,maxMarkdownBytes,budget);}
        catch (error) {if (error.code === 'ENOENT') continue; throw error;}
        filesRead++;
        for (const row of markdownRows(content,file,day,start,end)) items.push(row);
      }
      const verified = await lstat(canonical);
      if (!verified.isDirectory() || verified.ino !== selected.ino || verified.dev !== selected.dev || await realpath(canonical) !== canonical)
        throw Error('日记文件夹已变动，请重新选择。');
      return {items,filesRead,sourceName};
    }
    const ext = path.extname(canonical).toLowerCase();
    if (!selected.isFile() || !['.md','.markdown','.json'].includes(ext) || (connection.provider === 'obsidian' && ext === '.json'))
      throw Error('请选择 Markdown 日记、日记文件夹或 JSON 计划文件。');
    const content = await readDocument(canonical,ext==='.json'?maxBytesPerRead:maxMarkdownBytes,budget);
    let items;
    if (ext === '.json') {
      let value;
      try {value = JSON.parse(content);}
      catch {throw Error('计划文件不是有效的 JSON。');}
      items = jsonRows(value,canonical,start,end);
    } else {
      const dateFromName = path.basename(canonical, path.extname(canonical));
      items = markdownRows(content,canonical,dates.day(dateFromName)?dateFromName:null,start,end);
    }
    return {items,filesRead:1,sourceName};
  } catch (error) {
    if (['ENOENT','ENOTDIR'].includes(error.code)) throw Error('找不到这个文件或文件夹，请重新选择。');
    if (['EACCES','EPERM'].includes(error.code)) throw Error('当前工作台没有读取这个文件夹或文件的权限。');
    if (error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') throw Error('计划文件需要使用 UTF-8 文本编码。');
    if (error.code) throw Error('暂时无法读取计划文件，请重新选择或稍后重试。');
    throw error;
  }
}
