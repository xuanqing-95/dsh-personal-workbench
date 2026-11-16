import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const sandbox={};vm.runInNewContext(source.split('/* GRID_GEOMETRY_START */')[1].split('/* GRID_GEOMETRY_END */')[0]+'\nglobalThis.api={gridProfile,gridDefaults,gridNormalize,gridArrange,gridContentRects};',sandbox);
const {gridProfile,gridDefaults,gridNormalize,gridArrange,gridContentRects}=sandbox.api;
const plain=v=>JSON.parse(JSON.stringify(v));
const ids=['plan','news','activity','projects','pet'];
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function valid(layout,p){assert.deepEqual(plain(layout.map(x=>x.id)),ids);for(const r of layout){for(const k of ['x','y','w','h'])assert.ok(Number.isInteger(r[k]));assert.ok(r.x>=0&&r.x+r.w<=p.cols);assert.ok(r.w>=(r.id==='pet'&&p.key==='wide'?3:p.minW)&&r.y>=0&&r.y<=160);assert.ok(r.h>=(p.collapsed&&r.id==='news'?1:r.id==='plan'||(r.id==='activity'&&p.key!=='medium')?4:3)&&r.h<=24);}for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)assert.ok(!overlap(layout[i],layout[j]));}
test('news and pet share the top row, with independent plan and left-column stacks',()=>{
 for(const width of [390,640,999,1000,1280]){
  const p=gridProfile(width),l=gridDefaults(p);valid(l,p);const [plan,news,activity,projects,pet]=l;
  assert.equal(pet.y,0);assert.equal(news.w,p.key==='wide'?7:4);
  assert.equal(plan.y,p.key==='narrow'?pet.h+news.h:pet.h);
  assert.equal(news.y,p.key==='narrow'?pet.h:0);
  assert.equal(activity.y,p.key==='narrow'?plan.y+plan.h:news.h);
  assert.equal(projects.y,activity.y+activity.h);
  assert.deepEqual(plain(gridNormalize(l,p)),plain(l));
 }
});
test('unknown and corrupted saved data cannot hide any of the five areas',()=>{const p=gridProfile(1280);for(const v of [null,{},[],[{id:'other'}]])assert.deepEqual(plain(gridNormalize(v,p)),plain(gridDefaults(p)));valid(gridNormalize(ids.map(id=>({id,x:Infinity,y:99999,w:-1,h:NaN,unsafe:'ignored'})),p),p);});
test('five full-width maximum cards fit after collision repair even near the boundary',()=>{const p=gridProfile(390);valid(gridNormalize(ids.map(id=>({id,x:0,y:160,w:4,h:24})),p),p);});
test('shrinking daily news compacts the left column while preserving the original saved layout',()=>{const p=gridProfile(1280),base=gridDefaults(p),before=plain(base),folded=gridNormalize(base,{...p,collapsed:true});valid(folded,{...p,collapsed:true});assert.equal(folded.find(r=>r.id==='news').h,2);assert.equal(folded.find(r=>r.id==='activity').y,2);assert.equal(folded.find(r=>r.id==='projects').y,8);assert.equal(folded.find(r=>r.id==='plan').y,5);assert.deepEqual(plain(folded.find(r=>r.id==='pet')),plain(base.find(r=>r.id==='pet')));assert.equal(folded.find(r=>r.id==='plan').h,12);assert.deepEqual(plain(base),before);assert.deepEqual(plain(gridNormalize(base,p)),before);});
test('active resize stays anchored and does not change the dimensions of neighboring areas',()=>{const p=gridProfile(1280),base=gridDefaults(p),next=gridArrange(base,'news',{w:12,h:9},p);valid(next,p);assert.equal(next[1].w,12);assert.equal(next[1].h,9);for(const r of next.filter(x=>x.id!=='news')){const old=base.find(x=>x.id===r.id);assert.equal(r.w,old.w);assert.equal(r.h,old.h);assert.ok(r.y>=9);}});
test('a dragged area does not snap back while other areas fill its previous space',()=>{const p=gridProfile(390),next=gridArrange(gridDefaults(p),'news',{y:30},p);valid(next,p);assert.equal(next[1].y,30);assert.equal(next.find(x=>x.id==='pet').y,0);});
test('reopening preserves intentional gaps and unknown edits are a no-op',()=>{const p=gridProfile(1280),base=gridDefaults(p).map(r=>({...r,y:r.y+10}));assert.deepEqual(plain(gridNormalize(base,p)),plain(base));for(const id of ['other','plan'])assert.deepEqual(plain(gridArrange(base,id,{},p)),plain(base));});
test('invalid dimensions and positions clamp without horizontal overflow',()=>{for(const width of [390,800,1280]){const p=gridProfile(width),next=gridArrange(gridDefaults(p),'plan',{x:999,y:-99,w:999,h:999,id:'wrong'},p);valid(next,p);assert.equal(next[0].w,p.cols);assert.equal(next[0].h,24);assert.equal(next[0].id,'plan');}});
test('1200 continuous drag/resize operations preserve all cards, immutability, and reopen positions',()=>{let seed=71641;const rand=n=>((seed=(seed*1664525+1013904223)>>>0)%n);for(const width of [390,800,1280]){const p=gridProfile(width);let current=gridDefaults(p);for(let i=0;i<400;i++){const id=ids[rand(ids.length)],patch={x:rand(18)-3,y:rand(180)-8,w:rand(18),h:rand(32)},before=plain(current),next=gridArrange(current,id,patch,p);valid(next,p);assert.deepEqual(plain(current),before);assert.deepEqual(plain(next),plain(gridArrange(current,id,patch,p)));assert.deepEqual(plain(gridNormalize(next,p)),plain(next));current=next;}}});
test('legacy four-card defaults migrate, while a customized layout retains all existing geometry',()=>{
 const p=gridProfile(1280),legacy=[{id:'plan',x:7,y:5,w:5,h:12},{id:'news',x:0,y:0,w:12,h:5},{id:'activity',x:0,y:5,w:7,h:6},{id:'projects',x:0,y:11,w:7,h:6}];
 assert.deepEqual(plain(gridNormalize(legacy,p)),plain(gridDefaults(p)));
 legacy[3].y=15;const migrated=gridNormalize(legacy,p);valid(migrated,p);
 for(const original of legacy)assert.deepEqual(plain(migrated.find(row=>row.id===original.id)),original);
 assert(migrated.some(row=>row.id==='pet'));
});
test('folding a custom news card does not move or resize the pet',()=>{
 const p=gridProfile(1280),custom=gridArrange(gridDefaults(p),'pet',{y:20,h:7},p);
 assert.deepEqual(plain(gridNormalize(custom,{...p,collapsed:true}).find(row=>row.id==='pet')),plain(custom.find(row=>row.id==='pet')));
});

// A supported, persisted 9/3 split must not be widened into an overlap on upgrade.
const savedNineThree = [
 {id:'plan',x:7,y:4,w:5,h:8}, {id:'news',x:0,y:0,w:9,h:4},
 {id:'activity',x:0,y:4,w:7,h:4}, {id:'projects',x:0,y:8,w:7,h:4},
 {id:'pet',x:9,y:0,w:3,h:4}
];
test('saved nine-column news and three-column pet retain every position on upgrade',()=>{
 for(const width of [1000,1200,1512]){
  const p=gridProfile(width),before=plain(savedNineThree),next=gridNormalize(savedNineThree,p);
  valid(next,p);assert.deepEqual(plain(next),before);
  assert.deepEqual(plain(gridNormalize(next,p)),before);
  assert.deepEqual(plain(gridArrange(next,'pet',{},p)),before);
  assert.deepEqual(plain(gridNormalize(next,{...p,collapsed:true}).find(r=>r.id==='pet')),before.find(r=>r.id==='pet'));
  assert.deepEqual(plain(savedNineThree),before);
 }
});
test('a companion can be resized back to three columns without changing other card sizes',()=>{
 const p=gridProfile(1512),wider=gridArrange(savedNineThree,'pet',{w:4},p);
 const next=gridArrange(wider,'pet',{x:9,y:0,w:3},p);valid(next,p);
 assert.deepEqual(plain(next),savedNineThree);
 for(const width of [390,800]){
  const profile=gridProfile(width),pet=gridArrange(gridDefaults(profile),'pet',{w:3},profile).find(r=>r.id==='pet');
  assert.equal(pet.w,4,'medium and narrow cards retain their safe minimum');
 }
});

test('automatic content growth pushes only cards beneath its columns and leaves stored intent unchanged',()=>{
 const base=plain(savedNineThree),metrics={column:100,row:50,gap:16};
 const before=gridContentRects(base,metrics),expanded=gridContentRects(base,metrics,{news:500,activity:300});
 assert.equal(expanded.news.height,500);assert.equal(expanded.pet.top,0);
 assert.equal(expanded.activity.top,516);assert.equal(expanded.plan.top,516);
 assert.equal(expanded.projects.top,832);assert.deepEqual(base,savedNineThree);
 assert.deepEqual(plain(gridContentRects(base,metrics)),plain(before),'content shrinking restores positions without a saved-layout write');
});
test('an explicitly fixed card keeps its height while neighboring automatic content can grow',()=>{
 const p=gridProfile(1512),base=savedNineThree.map(r=>r.id==='news'?{...r,fixedHeight:true}:r);
 const next=gridNormalize(base,p);assert.equal(next.find(r=>r.id==='news').fixedHeight,true);
 const rects=gridContentRects(next,{column:100,row:50,gap:16},{news:800,activity:400});
 assert.equal(rects.news.height,248);assert.equal(rects.activity.height,400);
 assert.equal(rects.pet.top,0);assert.equal(rects.projects.top,680);
});


test('folded custom news hugs content and compacts only dependent columns without saving over expanded intent',()=>{
 const base=plain(savedNineThree),metrics={column:100,row:80,gap:16};
 const before=gridContentRects(base,metrics,{news:450});
 const folded=gridContentRects(base,{...metrics,collapsed:true},{news:92});
 assert.equal(folded.news.minimum,0);assert.equal(folded.news.height,92);
 assert.equal(folded.activity.top,108);assert.equal(folded.projects.top,492);
 assert.deepEqual(plain(folded.pet),plain(before.pet));
 assert.equal(folded.plan.top,before.pet.top+before.pet.height+16,'spanning cards still clear the pet');
 assert.deepEqual(base,savedNineThree);
 assert.deepEqual(plain(gridContentRects(base,metrics,{news:450})),plain(before));
 const fixed=base.map(r=>r.id==='news'?{...r,fixedHeight:true}:r);
 assert.equal(gridContentRects(fixed,{...metrics,collapsed:true},{news:92}).news.height,92);
 assert.equal(gridContentRects(fixed,metrics).news.height,368,'expanding restores manual height');
 const gap=base.map(r=>r.id==='activity'?{...r,y:r.y+1}:r);
 assert.equal(gridContentRects(gap,{...metrics,collapsed:true},{news:92}).activity.top,204,'intentional gap is preserved');
});
