import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const start=source.indexOf('    const actualPattern ='),end=source.indexOf('    async function api(',start);
assert(start>=0&&end>start);
const box={text:value=>String(value||'')};
vm.runInNewContext(source.slice(start,end)+';globalThis.format=planTaskContent;',box);
const format=value=>JSON.parse(JSON.stringify(box.format(value)));
test('scheduled task keeps title first and combines estimate and actual timing without losing intervals',()=>{
 const label='22:00–23:00 真人模拟训练（1h）';
 assert.deepEqual(format(label+'（实际 22:05–22:30、22:35–22:55｜专注 45m）'),{
 title:'真人模拟训练',timing:'计划 22:00–23:00 · 预计 1h · 实际 22:05–22:30、22:35–22:55 · 专注 45m',label});
});
test('single time, estimate-only and actual-only tasks all use the timing row',()=>{
 assert.equal(format('10：00 项目沟通').timing,'计划 10：00');
 assert.equal(format('修改文章并发布（2h）').timing,'预计 2h');
 assert.equal(format('学习 (1小时30分钟)').title,'学习');
 assert.equal(format('学习 (1.5h)').timing,'预计 1.5h');
 assert.equal(format('完成复盘（实际 21:00–21:15｜专注 15m）').timing,'实际 21:00–21:15 · 专注 15m');
});
test('ordinary parentheses, untimed tasks and meeting links remain intact',()=>{
 for(const title of ['工作台（第一版）','读书','学习（1h 复习）','https://meet.google.com/abc-defg-hij','25:30 不是有效时段'])assert.deepEqual(format(title),{title,timing:'',label:title});
 assert.equal(format('09:30 会议 https://vc.feishu.cn/j/123').title,'会议 https://vc.feishu.cn/j/123');
 assert.equal(format('（1h）').title,'（1h）');
});
