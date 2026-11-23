import test from 'node:test';
import assert from 'node:assert/strict';
import {createReleaseCheck} from './release-status.js';

const index=version=>({plugins:[{name:'dsh-xuanqing-personal-workbench',versions:[{version}]}]});
test('update notice compares the installed version to the published stable index',async()=>{
  for(const [version,latest,expected] of [
    ['0.9.9','0.10.0','0.10.0'],['0.10.0-beta.2','0.10.0','0.10.0'],
    ['0.10.0','0.10.0',null],['1.0.0','0.10.0',null],['0.9.9','1.0.0-beta.1',null],
    ['0.9.9','latest',null]
  ]){
    const check=createReleaseCheck({version,request:async()=>index(latest)});
    assert.equal((await check()).available,expected);
  }
});
test('concurrent opens share a check; a network failure can recover',async()=>{
  let calls=0,time=1;
  const check=createReleaseCheck({version:'0.8.3',now:()=>time,request:async()=>{
    calls++;if(calls===1)throw Error('offline');return index('0.10.0');
  }});
  assert.deepEqual(await Promise.all([check(),check()]),[{available:null},{available:null}]);
  assert.equal((await check()).available,null);assert.equal(calls,1);
  time+=3600_000;assert.equal((await check()).available,'0.10.0');
  assert.equal((await check()).available,'0.10.0');assert.equal(calls,2);
});
