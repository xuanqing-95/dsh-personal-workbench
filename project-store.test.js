import test from 'node:test';
import assert from 'node:assert/strict';
import {readProjectStore, createProjectStoreTracker, projectStoreStatus} from './project-store.js';
import {shortcutSchema} from './project-shortcuts.js';
import {z} from 'zod';
const binding={publisherId:'example-publisher',itemId:'a'.repeat(32)};
test('only a linked store item uses this plugin’s own opt-in grant', async()=>{
  const calls=[];
  const result=await readProjectStore(binding,{run:async(cmd,args)=>{calls.push(args);throw Object.assign(new Error(),{code:44});},
    request:()=>assert.fail('no authorization, no remote call')});
  assert.equal(result.availability,'authorization_required');
  assert.ok(calls[0].includes('dsh-personal-workbench.chrome-store.readonly'));
  await assert.rejects(readProjectStore({...binding,publisherId:'../../etc'},{run:()=>assert.fail('reject input first')}));
});
test('store response must belong to the tracked entry and review does not imply publication',()=>{
  const value={itemId:binding.itemId,submittedItemRevisionStatus:{state:'PENDING_REVIEW',distributionChannels:[{crxVersion:'1.0.1'}]},
    publishedItemRevisionStatus:{state:'PUBLISHED',distributionChannels:[{crxVersion:'1.0.0'}]}};
  const status=projectStoreStatus(value,binding);
  assert.equal(status.stage,'PENDING_REVIEW');
  assert.deepEqual(status.submittedVersions,['1.0.1']);assert.deepEqual(status.publishedVersions,['1.0.0']);
  assert.throws(()=>projectStoreStatus({...value,itemId:'another'},binding));
  assert.equal(shortcutSchema(z).fields.chromeStore.safeParse({...binding,itemId:'not-an-extension'}).success,false);
});
test('optional project store cache shares requests without mixing user project IDs',async()=>{
  let count=0;
  const track=createProjectStoreTracker({readStore:async()=>{count++;return {availability:'connected',status:{stage:'PUBLISHED',label:'商店已发布',submittedVersions:[],publishedVersions:['1.2.0']}};}});
  assert.deepEqual(await track(undefined),{});
  const [first,second]=await Promise.all([track(binding),track(binding)]);
  assert.equal(count,1);assert.equal(first.store.value.label,second.store.value.label);
  assert.equal(first.store.value.history.length,1);assert.ok(first.storeURL.endsWith(binding.itemId+'/edit'));
  await track({...binding,itemId:'b'.repeat(32)});assert.equal(count,2);
});
