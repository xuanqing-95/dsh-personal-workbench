import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarMonth,planDay} from './planning.js';
test('calendar previews reflect durable task state and stay bounded without losing totals',()=>{
 const records=Array.from({length:8},(_,i)=>({id:String(i),title:'计划 '+i,dueDate:'2026-11-17',status:i<2?'done':'todo',revision:1,archived:false}));
 records.push({...records[0],id:'archived',archived:true},{...records[0],id:'other-month',dueDate:'2026-12-17'});
 const day=calendarMonth(records,'2026-11').days['2026-11-17'];
 assert.equal(day.count,8);assert.equal(day.done,2);assert.equal(day.items.length,5);assert.equal(day.items[0].checked,true);
 records[2].status='done';const updated=calendarMonth(records,'2026-11').days['2026-11-17'];
 assert.equal(updated.done,3);assert.equal(updated.items[2].checked,planDay(records,'2026-11-17').items[2].checked);
 assert.deepEqual(calendarMonth(records,'2026-10').days,{});
});
