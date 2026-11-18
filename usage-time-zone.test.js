import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const moduleURL=new URL('./usage-core.js',import.meta.url).href;
function readZone(zone,instant,stamps=[]){
  const script=`
    import {usageDay,usageHistory} from ${JSON.stringify(moduleURL)};
    const now=Date.parse(${JSON.stringify(instant)});
    const events=${JSON.stringify(stamps)}.map(stamp=>({at:Date.parse(stamp),model:'test',input:1,output:1,cached:0,calls:1}));
    const args=[[{source:'Codex',rows:[],events}],[],new Map(),[{source:'Codex',state:'connected'}],now];
    const day=usageDay(...args),history=usageHistory(...args),source=day.sources[0];
    console.log(JSON.stringify({day:day.date,start:day.start,end:day.end,zone:day.timeZone,buckets:source.buckets.length,total:source.total,
      days:history.map(d=>d.date),align:history.every((d,i)=>i===0||d.end===history[i-1].start)}));
  `;
  return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:zone},encoding:'utf8'}));
}
test('same instant falls on the next China date and the prior American date',()=>{
  const instant='2026-11-19T16:15:00Z',stamps=['2026-11-19T15:59:59Z','2026-11-19T16:00:00Z'];
  const china=readZone('Asia/Shanghai',instant,stamps),us=readZone('America/New_York',instant,stamps);
  assert.deepEqual([china.day,china.start,china.buckets,china.total],['2026-11-20','2026-11-19T16:00:00.000Z',48,2]);
  assert.deepEqual([us.day,us.start,us.buckets,us.total],['2026-11-19','2026-11-19T05:00:00.000Z',48,4]);
  assert.equal(china.zone,'Asia/Shanghai');assert.equal(us.zone,'America/New_York');
});
test('spring and fall time changes use continuous 23/25-hour days and seven distinct calendar dates',()=>{
  for(const [instant,day,buckets] of [['2026-03-09T03:59:59Z','2026-03-08',46],['2026-11-02T04:59:59Z','2026-11-01',50]]){
    const result=readZone('America/New_York',instant);
    assert.equal(result.day,day);assert.equal(result.buckets,buckets);assert.equal(result.align,true);assert.equal(new Set(result.days).size,7);
  }
});
