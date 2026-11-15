import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {mkdtemp,rm,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {normalizeRepository,createRepositoryResolver} from './project-repository.js';
import {createProjectShortcuts} from './project-shortcuts.js';
import {createProjectTracking} from './project-tracking.js';
import {projectShortcutTool} from './project-tools.js';
const threadId='01a07634-8bc1-7f00-958a-d6a52a69b313',otherId='01a07634-8bc1-7f00-958a-d6a52a69b314';
const entry={id:threadId,title:'演示项目',source:'codex',threadId};
const run=promisify(execFile);
function owner(resolveRepository){let value={items:[],retired:[]};return createProjectShortcuts({z,resolveRepository,store:{read:async()=>structuredClone(value),write:async next=>{value=structuredClone(next);}}});}
test('repository normalization accepts only plain GitHub identities, never credential URLs or other hosts',()=>{
 for(const input of ['Owner/Repo','https://github.com/Owner/Repo.git','git@github.com:Owner/Repo.git','ssh://git@github.com/Owner/Repo.git'])assert.equal(normalizeRepository(input),'owner/repo');
 for(const input of ['https://evil.test/owner/repo','https://token@github.com/o/r','https://github.com/o/r?token=secret','o/../r','../r','o/r#fragment','-o/r'])assert.equal(normalizeRepository(input),null);
});
test('explicit repository avoids all local inspection; remotes prefer origin and never guess among multiple candidates',async()=>{
 const calls=[];let remotes='remote.origin.url git@github.com:me/repo.git\nremote.upstream.url https://github.com/team/repo';
 const resolve=createRepositoryResolver({readContext:async()=>'/workspace/project',canonicalize:async value=>value,run:async(...args)=>{calls.push(args);return{stdout:args[1].includes('rev-parse')?'/workspace/project':remotes};}});
 assert.equal((await resolve({...entry,repository:'me/explicit'})).repository,'me/explicit');assert.equal(calls.length,0);
 assert.equal((await resolve(entry)).repository,'me/repo');
 assert.deepEqual(calls[1][1],['-C','/workspace/project','config','--local','--get-regexp','^remote\\..*\\.url$']);
 remotes='remote.first.url https://github.com/a/one\nremote.second.url https://github.com/b/two';
 const ambiguous=await resolve(entry);assert.equal(ambiguous.repositoryState,'ambiguous');assert.equal(ambiguous.repository,undefined);
});
test('Codex directory lookup is exact, bounded and does not read chat text',async()=>{
 const queries=[];
 const resolve=createRepositoryResolver({canonicalize:async v=>v,run:async(command,args)=>{queries.push({command,args});return {stdout:command.includes('sqlite3')?JSON.stringify([{cwd:'/work/project'}]):args.includes('rev-parse')?'/work/project':'remote.origin.url https://github.com/me/project'};}});
 assert.equal((await resolve(entry)).repository,'me/project');assert.match(queries[0].args.at(-1),/^SELECT cwd FROM threads WHERE id = '[a-f0-9-]+' AND archived = 0 LIMIT 1$/);
 queries.length=0;assert.equal((await resolve({...entry,threadId:"x' OR 1=1"})).repositoryState,'missing');assert.equal(queries.length,0);
});
test('AI create persists discovered repository; continuing the same repo retains project identity and user notes key',async()=>{
 const store=owner(async()=>({repository:'me/repo',projectPath:'/work/repo'}));
 const first=await store.run('create',{title:'原有标题',source:'codex',threadId,progress:'已有进展'});
 const second=await store.run('create',{title:'新对话标题',source:'codex',threadId:otherId});
 assert.equal(second.id,first.id);assert.equal(second.threadId,otherId);assert.equal(second.title,'原有标题');assert.equal(second.progress,'已有进展');assert.equal(second.revision,2);assert.equal((await store.list()).items.length,1);
 await assert.rejects(store.run('update',{id:first.id,expectedRevision:1,patch:{repository:'me/other'}}),{code:'REVISION_CONFLICT'});
});
test('distinct subprojects in one repository keep separate entries',async()=>{
 const store=owner();const first=await store.run('create',{title:'one',source:'codex',threadId,repository:'me/repo',projectPath:'/repo/one'});
 const second=await store.run('create',{title:'two',source:'codex',threadId:otherId,repository:'me/repo',projectPath:'/repo/two'});
 assert.notEqual(first.id,second.id);
});
test('a project created before its Git remote is automatically recognized later without another create/update',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'pwb-autolink-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await run('git',['init','--quiet',directory]);
 const resolve=createRepositoryResolver({readContext:async()=>directory});const store=owner(resolve);
 const saved=await store.run('create',{title:'还没建远程仓库',source:'codex',threadId});assert.equal(saved.repository,undefined);assert.equal(saved.projectPath,await realpath(directory));
 let time=Date.now(),reads=0;
 const track=createProjectTracking({resolveRepository:resolve,now:()=>time,readGitHub:async()=>{reads++;return{pull:null,history:[{id:'commit:1',label:'首次提交',date:'2026-11-15T00:00:00Z',state:'代码已更新'}]};}});
 assert.equal((await track([saved]))[0].repositoryState,'missing');
 await run('git',['-C',directory,'remote','add','origin','https://github.com/demo/new-project.git']);time+=61000;
 const result=(await track([saved]))[0];assert.equal(result.repository,'demo/new-project');assert.equal(result.github.value.history[0].label,'首次提交');assert.equal(reads,1);
});
test('tracking coalesces requests, preserves last success offline, and never reuses another repository snapshot',async()=>{
 let time=1000000,online=true,reads=0;const snapshots=new Map();
 const options={now:()=>time,resolveRepository:async e=>({repository:e.repository,repositoryState:'linked'}),loadSnapshot:key=>snapshots.get(key),saveSnapshot:(key,value)=>snapshots.set(key,value),readGitHub:async spec=>{reads++;if(!online)throw new Error('offline private details');return {pull:null,history:[{id:'commit:1',label:spec.repo,date:'2026-11-15T00:00:00Z',state:'代码已更新'}]};}};
 const track=createProjectTracking(options),rows=[{...entry,repository:'one/repo'},{...entry,id:otherId,repository:'one/repo'}];
 await Promise.all([track(rows),track(rows)]);assert.equal(reads,1);
 online=false;time+=301000;const offline=(await createProjectTracking(options)(rows))[0];assert.equal(offline.github.value.history[0].label,'one/repo');assert.equal(offline.github.availability,'unavailable');
 const changed=(await track([{...entry,repository:'two/repo'}]))[0];assert.equal(changed.github.value,undefined);assert.ok(!JSON.stringify(changed).includes('private details'));
});
test('agent tool creates a tracked project and lists the same durable record',async()=>{
 const store=owner(async()=>({repository:'owner/demo'}));
 const track=createProjectTracking({readGitHub:async()=>({pull:{state:'等待合并',label:'新的功能'},history:[]})});
 const tool=projectShortcutTool({owner:async()=>store,track});
 const created=await tool.execute({action:'create',input:{title:'demo',source:'codex',threadId}});
 assert.equal(created.repository,'owner/demo');assert.equal(created.github.value.pull.state,'等待合并');
 const listed=await tool.execute({action:'list'});assert.equal(listed.items[0].id,created.id);
});
test('multiple subprojects require a specific choice rather than silently moving the first project',async()=>{
 const store=owner();await store.run('create',{title:'one',source:'codex',threadId,repository:'me/repo',projectPath:'/repo/one'});
 await store.run('create',{title:'two',source:'codex',threadId:otherId,repository:'me/repo',projectPath:'/repo/two'});
 await assert.rejects(store.run('create',{title:'ambiguous',source:'harness',threadId,repository:'me/repo'}),{code:'AMBIGUOUS_PROJECT'});
 await assert.rejects(store.run('create',{title:'changed repo',source:'codex',threadId,repository:'me/other'}),{code:'REPOSITORY_CONFLICT'});
 assert.equal((await store.list()).items.length,2);
});
test('a new folder inside another repository is not silently associated with its parent',async()=>{
 const resolve=createRepositoryResolver({canonicalize:async value=>value,readContext:async()=>'/workspace/new-project',run:async(_cmd,args)=>({stdout:args.includes('rev-parse')?'/workspace':'remote.origin.url https://github.com/owner/parent'})});
 const value=await resolve(entry);assert.equal(value.repository,undefined);assert.equal(value.repositoryState,'ambiguous');
});
