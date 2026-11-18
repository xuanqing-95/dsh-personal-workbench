import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, readFile, rm, symlink, truncate, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createLocalPlanFile} from './local-plan-file.js';
import {readFilePlan} from './plan-file-connection.js';

const week = {start:'2026-11-16',end:'2026-11-22'};

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(),'workbench-diary-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  return root;
}

test('daily-note folder only opens notes for the requested days and observes later edits', async t => {
  const root = await fixture(t);
  const file = path.join(root,'2026-11-16.md');
  const connection = {provider:'obsidian',path:root};
  const draft = '# 工作\n- [ ] 准备演示\n- [ ] 准备演示\n个人笔记\n';
  await writeFile(file,draft);
  await writeFile(path.join(root,'2026-11-22.md'),'- [X] 复盘');
  await writeFile(path.join(root,'2026-11-23.md'),'- [ ] 下周计划');
  await writeFile(path.join(root,'private.md'),'- [ ] 不属于当天 📅 2026-11-19');
  await mkdir(path.join(root,'private-folder'));
  await writeFile(path.join(root,'private-folder','2026-11-19.md'),'- [ ] 私人笔记');
  const result = await readFilePlan(connection,week);
  assert.equal(result.filesRead,2);
  assert.equal(result.sourceName,path.basename(root));
  assert.deepEqual(result.items.map(row => [row.title,row.dueDate,row.status,row.group]), [
    ['准备演示','2026-11-16','todo','工作'],['准备演示','2026-11-16','todo','工作'],['复盘','2026-11-22','done',undefined]
  ]);
  assert.equal(new Set(result.items.map(row=>row.id)).size,3);
  assert.ok(result.items.every(row => row.source === 'external-file' && row.canCheck === false));
  assert.equal(await readFile(file,'utf8'),draft);
  await writeFile(file,draft.replace('- [ ]','- [x]'));
  const day = await readFilePlan(connection,{start:week.start,end:week.start});
  assert.equal(day.items[0].id,result.items[0].id);
  assert.equal(day.items[0].checked,true);
  assert.deepEqual((await readFilePlan(connection,{start:'2026-12-01',end:'2026-12-31'})).items,[]);
});

test('one Markdown file imports dated sections and explicit due markers, excluding notes, examples and comments', async t => {
  const file = path.join(await fixture(t),'my-plan.md');
  await writeFile(file,[
    '---','- [ ] private 📅 2026-11-20','---','- [ ] 无日期待办',
    '# 计划','## 2026-11-19','### 上午','- [x] 写稿','    - [ ] 核对数据',
    '~~~markdown','- [ ] example','~~~','<!--','- [ ] hidden','-->',
    '%%','- [ ] comment','%%','## 长期计划','- [ ] 无日期',
    '- [ ] 拍摄 📅 2026-11-22','- [ ] 发布 [due:: 2026-11-22]','- [ ] 整理 @2026-11-16',
    '## 2026-11-40','- [ ] 无效日期','## 2026-12-01','- [ ] 下月',
  ].join('\n'));
  const {items,filesRead} = await readFilePlan({provider:'file',path:file},week);
  assert.equal(filesRead,1);
  assert.deepEqual(items.map(row=>[row.title,row.dueDate]), [
    ['写稿','2026-11-19'],['核对数据','2026-11-19'],['拍摄','2026-11-22'],['发布','2026-11-22'],['整理','2026-11-16']
  ]);
  assert.deepEqual([items[0].group,items[0].checked],['上午',true]);
});

test('Today Plan v1 parsing matches the existing reader and rejects duplicate IDs', async t => {
  const file = path.join(await fixture(t),'today-plan.json');
  const task = {id:'local-a',date:week.start,text:'  完成草稿  ',checked:true,group:'下午',note:'尽早完成'};
  const save = tasks => writeFile(file,JSON.stringify({format:'today-plan-local',version:1,tasks}));
  const connection = {provider:'file',path:file};
  await save([task,{...task,id:'local-b',deletedAt:'2026-11-16T10:00:00Z'}]);
  const ownedRows = await createLocalPlanFile(file)();
  const external = await readFilePlan(connection,week);
  assert.equal(ownedRows.length,1);
  assert.equal(external.items.length,1);
  const {title,dueDate,group,note,status} = external.items[0];
  assert.deepEqual({title,dueDate,group,note,status},{title:ownedRows[0].title,dueDate:week.start,group:'下午',note:'尽早完成',status:'done'});
  await save([task,task]);
  await assert.rejects(readFilePlan(connection,week),/格式/);
});

test('generic JSON supports a task array or tasks object and returns only known task fields', async t => {
  const file = path.join(await fixture(t),'tasks.json');
  const connection = {provider:'file',path:file};
  const tasks = [
    {id:'a',text:'草稿',dueDate:'2026-11-17',status:'doing',privateField:'private'},
    {title:'周复盘',date:'2026-11-22',checked:true},{title:'以后',date:'2026-12-01'},{title:'移除',date:week.start,archived:true}
  ];
  for (const value of [tasks,{tasks}]) {
    await writeFile(file,JSON.stringify(value));
    const {items} = await readFilePlan(connection,week);
    assert.deepEqual(items.map(row=>row.status),['doing','done']);
    assert.equal(JSON.stringify(items).includes('private'),false);
    assert.equal(items[0].checked,false);
  }
  for (const value of [ {tasks:[{title:'坏日期',date:'2026-02-31'}]}, {tasks:[{title:'错误',date:week.start,checked:'false'}]}, {tasks:null} ]) {
    await writeFile(file,JSON.stringify(value));
    await assert.rejects(readFilePlan(connection,week));
  }
});

test('rejects missing sources, symlinks, oversize and invalid UTF-8, while accepting a genuine empty date range', async t => {
  const root = await fixture(t);
  const dir = path.join(root,'journal');
  await mkdir(dir);
  const connection = {provider:'obsidian',path:dir};
  assert.equal((await readFilePlan(connection,week)).filesRead,0);
  await assert.rejects(readFilePlan({...connection,path:'relative.md'},week),/选择/);
  await assert.rejects(readFilePlan({...connection,path:path.join(root,'missing')},week),/找不到/);
  await assert.rejects(readFilePlan(connection,{start:week.end,end:week.start}),/日期/);
  const file = path.join(root,'other.md');
  await writeFile(file,'- [ ] private');
  await symlink(file,path.join(dir,'2026-11-19.md'));
  await assert.rejects(readFilePlan(connection,week),/符号链接/);
  const linked = path.join(root,'linked');
  await symlink(dir,linked);
  await assert.rejects(readFilePlan({...connection,path:linked+path.sep},week),/符号链接/);
  await truncate(file,2*1024*1024+1);
  await assert.rejects(readFilePlan({...connection,path:file},week),/过大/);
  await writeFile(file,Buffer.from([0xc0,0xaf]));
  await assert.rejects(readFilePlan({...connection,path:file},week),/UTF-8/);
});
