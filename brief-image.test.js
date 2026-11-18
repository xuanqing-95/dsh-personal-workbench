import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,symlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createExternalSources} from './automation-sources.js';
import {createContent} from './content.js';

const today='2026-11-19',yesterday='2026-11-18';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNWbWAAAAABJRU5ErkJggg==','base64');
async function fixture(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'dsh-brief-art-')),dir=path.join(root,'issues');
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const day of [today,yesterday])await mkdir(path.join(root,'assets',day),{recursive:true});
  await mkdir(dir);
  const now=()=>new Date(today+'T12:00:00Z');
  const api=createExternalSources({env:{DSH_WORKBENCH_BRIEF_DIR:dir},home:root,now});
  const content=createContent({external:api,now,read:async()=>({editions:[],notes:{}}),write:async()=>{}});
  const report=(date,figures)=>writeFile(path.join(dir,date+'.json'),JSON.stringify({date,items:[['头条']],figures}));
  const publish=date=>writeFile(path.join(dir,date+'.status.json'),JSON.stringify({date,publication_complete:true,published_at:date+'T00:00:00Z',verified_reader_url:'https://example.org/issue'}));
  return {root,dir,api,content,report,publish};
}
test('validated local lead art works on current and published archive routes without exposing paths',async t=>{
  const {root,api,content,report,publish}=await fixture(t);
  for(const day of [today,yesterday]){
    const local=path.join('assets',day,'main.png');await writeFile(path.join(root,local),png);
    await report(day,[{local_image:local,caption:'讲解步骤',item_index:0}]);
  }
  await publish(yesterday);
  const current=await content.readBrief(),history=await content.archive(yesterday);
  const a=current.leadImage,b=history.edition.leadImage;
  assert.equal(a.alt,'讲解步骤');assert.equal(a.archive,false);assert.equal(b.archive,true);
  assert.match(a.revision,/^[0-9a-f]{16}$/);assert.ok(!JSON.stringify(current).includes(root));
  const img=await api.readBriefImage(yesterday,b.revision,true);
  assert.equal(img.mime,'image/png');assert.deepEqual(img.data,png);
  assert.deepEqual((await api.readBriefImage(today,a.revision,false)).data,png);
  assert.equal(await api.readBriefImage(yesterday,b.revision,false),null);
  assert.equal(await api.readBriefImage(today,a.revision,true),null);
  assert.equal(await api.readBriefImage(today,'0'.repeat(16),false),null);
  await writeFile(path.join(root,'assets',today,'main.png'),Buffer.concat([png,Buffer.from([0])]));
  assert.equal(await api.readBriefImage(today,a.revision,false),null);
});
test('escaping paths, cross-issue files, mimetype confusion and oversized art yield no local response',async t=>{
  const {root,api,report}=await fixture(t),allowed=path.join(root,'assets',today);
  await writeFile(path.join(root,'outside.png'),png);await symlink(path.join(root,'outside.png'),path.join(allowed,'link.png'));
  await writeFile(path.join(root,'assets',yesterday,'other.png'),png);
  await writeFile(path.join(allowed,'wrong.png'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(path.join(allowed,'large.png'),Buffer.alloc(8*1024*1024+1));
  for(const candidate of [path.join(root,'outside.png'),path.join(allowed,'link.png'),path.join(allowed,'wrong.png'),path.join(allowed,'large.png'),path.join(root,'assets',yesterday,'other.png')]){
    await report(today,[{local_path:candidate,remote_url:'https://example.org/figure.jpg'}]);
    const item=await api.readBrief();assert.equal(item.leadImage,null);assert.equal(item.imageUrl,'https://example.org/figure.jpg');
  }
});
