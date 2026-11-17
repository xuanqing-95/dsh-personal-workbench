import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('    /* BEGIN FLOW BACKGROUND */'),source.indexOf('    /* END FLOW BACKGROUND */'));
test('background pauses when hidden, offscreen, static or reduced-motion and releases all listeners',()=>{
 let effect,intersection,mutation,disconnected=0;
 const events=new Map(),preferences=new Map(),attrs=new Set(),node={dataset:{}};
 const media={matches:false,addEventListener:(k,f)=>preferences.set(k,f),removeEventListener:k=>preferences.delete(k)};
 const doc={hidden:false,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const root={current:{hasAttribute:name=>attrs.has(name)}};
 const box={React:{useRef:()=>({current:node}),useId:()=>':flow:',useEffect:fn=>{effect=fn;}},h:()=>null,
 window:{matchMedia:()=>media},document:doc,
 IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}disconnect(){disconnected++;}},
 MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){disconnected++;}}};
 vm.runInNewContext(code+';globalThis.render=FlowBackground;',box);
 box.render({root});const cleanup=effect();assert.equal(node.dataset.paused,'false');
 doc.hidden=true;events.get('visibilitychange')();assert.equal(node.dataset.paused,'true');
 doc.hidden=false;events.get('visibilitychange')();assert.equal(node.dataset.paused,'false');
 intersection([{isIntersecting:false}]);assert.equal(node.dataset.paused,'true');
 intersection([{isIntersecting:true}]);assert.equal(node.dataset.paused,'false');
 for(const name of ['data-custom-background','data-still-background']){attrs.add(name);mutation();assert.equal(node.dataset.paused,'true');attrs.clear();mutation();assert.equal(node.dataset.paused,'false');}
 media.matches=true;preferences.get('change')();assert.equal(node.dataset.paused,'true');
 cleanup();assert.equal(disconnected,2);assert.equal(events.size,0);assert.equal(preferences.size,0);
});
