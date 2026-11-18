import {open} from 'node:fs/promises';
import {dates} from './planning.js';

export function parseTodayPlanFile(value) {
  if (value?.format !== 'today-plan-local' || value.version !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 100000) {
    throw Error('请选择今日计划 v1 本地数据文件。');
  }
  const ids = new Set();
  const rows = [];
  for (const task of value.tasks) {
    if (typeof task?.id !== 'string' || !/^local-[a-z\d-]{1,100}$/i.test(task.id) || ids.has(task.id) ||
        !dates.day(task.date) || typeof task.text !== 'string' || !task.text.trim() || task.text.length > 2000 ||
        typeof task.checked !== 'boolean') {
      throw Error('本机计划数据格式不正确。');
    }
    ids.add(task.id);
    if (task.deletedAt) continue;
    const title = task.text.trim();
    rows.push({
      id: task.id, title, text: title, dueDate: task.date, checked: task.checked,
      group: typeof task.group === 'string' ? task.group.slice(0,100) : '',
      note: typeof task.note === 'string' ? task.note.slice(0,1500) : '',
      status: task.checked ? 'done' : 'todo', source: 'local', canCheck: false,
    });
  }
  return rows;
}

// Read the user's selected Today Plan v1 file. Only the owning app edits this file.
export function createLocalPlanFile(file){
  let previous;
  return async function records(){
    if(!file)return [];
    const handle=await open(file,'r');
    try{
      const stat=await handle.stat();
      if(!stat.isFile()||stat.size>50*1024*1024)throw Error('本机计划文件太大或格式不正确。');
      if(previous?.ino===stat.ino&&previous.size===stat.size&&previous.mtime===stat.mtimeMs)return previous.rows;
      const bytes=Buffer.alloc(stat.size+1);
      const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
      if(bytesRead!==stat.size)throw Error('本机计划文件正在更新。');
      const value=JSON.parse(bytes.subarray(0,bytesRead).toString());
      const rows=parseTodayPlanFile(value);
      previous={ino:stat.ino,size:stat.size,mtime:stat.mtimeMs,rows};return rows;
    }finally{await handle.close();}
  };
}
