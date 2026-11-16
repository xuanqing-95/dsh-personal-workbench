import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
const geometry = source.split('/* GRID_GEOMETRY_START */')[1].split('/* GRID_GEOMETRY_END */')[0];
const hook = source.slice(source.indexOf("    const gridStorageKey="), source.indexOf("    return {inject:['slots'"));
const KEY = 'dsh-personal-workbench:layout:v2';
const plain = value => JSON.parse(JSON.stringify(value));

// A small state/effect scheduler executes the production hook, without a DOM
// library or mocking its layout calculations. Browser pointer geometry is also
// checked manually in the preview; these tests cover state transitions/storage.
function harness({ width = 1200, height = 700, initial, failWrite = false, rects } = {}) {
  const states = [], effects = [], observers = [], listeners = new Map(), values = new Map();
  if (initial) values.set(KEY, JSON.stringify(initial));
  let cursor = 0, dirty = true, pending = [], output;
  const viewport = { clientWidth: width, clientHeight: height, scrollTop: 0,
    getBoundingClientRect() { return { top: 100, bottom: 100 + this.clientHeight }; } };
  if(rects)viewport.querySelector=()=>({getBoundingClientRect:()=>({left:0,top:100}),querySelector:selector=>{
    const id=selector.match(/data-grid-id="([^"]+)"/)?.[1]||'pet',r=rects[id];
    return r?{getBoundingClientRect:()=>({...r,left:r.left,top:r.top+100})}:null;
  }});
  const effect = (callback, deps) => {
    const index = cursor++, previous = effects[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
      pending.push(() => { previous?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; });
    }
  };
  const React = {
    Fragment: 'fragment',
    useRef(value) { const index = cursor++; return states[index] ||= { current: value }; },
    useState(value) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof value === 'function' ? value() : value;
      return [states[index], update => { const next = typeof update === 'function' ? update(states[index]) : update; if (next !== states[index]) { states[index] = next; dirty = true; } }];
    },
    useEffect: effect, useLayoutEffect: effect,
  };
  const sandbox = { React, h: (type, props, ...children) => ({ type, props, children }),
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (failWrite) throw new Error('Blocked storage'); values.set(key, value); } },
    ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} },
    window: { addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); }, removeEventListener(type, callback) { listeners.get(type)?.delete(callback); } },
  };
  vm.runInNewContext(geometry + hook + '\nglobalThis.run=useWorkbenchGrid;', sandbox);
  function flush() {
    let runs = 0;
    while (dirty) {
      assert.ok(++runs < 30, 'hook settles without an effect loop');
      dirty = false; cursor = 0; output = sandbox.run(); output.viewport.current = viewport;
      const callbacks = pending; pending = []; callbacks.forEach(callback => callback());
    }
    return output;
  }
  flush();
  return {
    get ui() { return output; }, viewport, values,
    act(callback) { callback(output); return flush(); },
    resize(nextWidth, nextHeight = height) { viewport.clientWidth = nextWidth; viewport.clientHeight = nextHeight; observers.forEach(observer => observer.callback()); return flush(); },
    emit(type, event = {}) { listeners.get(type)?.forEach(callback => callback(event)); return flush(); },
    control(id, mode = 'move') {
      const props = output.handles(id, id).children[mode === 'move' ? 0 : 1].props;
      const captured = new Set();
      const target = { focus() {}, setPointerCapture(id) { captured.add(id); }, hasPointerCapture: id => captured.has(id), releasePointerCapture(id) { captured.delete(id); props.onLostPointerCapture?.({ pointerId: id }); } };
      const event = patch => ({ button: 0, pointerId: 1, clientX: 100, clientY: 200, currentTarget: target, preventDefault() {}, stopPropagation() {}, ...patch });
      return {
        down: patch => { props.onPointerDown(event(patch)); flush(); },
        move: patch => { props.onPointerMove(event(patch)); flush(); },
        up: patch => { props.onPointerUp(event(patch)); flush(); },
        cancel: () => { props.onPointerCancel(event()); flush(); },
        key: key => { props.onKeyDown(event({ key })); flush(); },
        captured,
      };
    },
    stored() { return values.has(KEY) ? JSON.parse(values.get(KEY)) : undefined; },
  };
}

test('pointer edits save only on Done and survive a newly mounted dashboard', () => {
  const app = harness();
  app.act(ui => ui.edit());
  const control = app.control('plan', 'resize');
  control.down(); control.move({ clientX: 302 }); control.up({ clientX: 302 });
  assert.equal(app.stored(), undefined);
  assert.equal(control.captured.size, 0, 'pointer capture is released');
  const editedWidth = app.ui.card('plan').style.width;
  app.act(ui => ui.finish());
  assert.equal(app.stored().profiles.wide[0].w, 7);
  assert.equal(app.ui.editing, false);
  const reopened = harness({ initial: app.stored() });
  assert.equal(reopened.ui.card('plan').style.width, editedWidth);
});

test('default plan grows with content at every breakpoint while editing retains resize geometry', () => {
  for (const width of [390, 800, 1440]) {
    const app = harness({ width });
    assert.equal(app.ui.fitContent, true);
    assert.equal(app.ui.card('plan').style.height, undefined);
    assert.equal(app.ui.card('plan').style.maxHeight, undefined);
    app.act(ui => ui.edit());
    assert.ok(app.ui.card('plan').style.height > 0);
    app.act(ui => ui.cancel());
    assert.equal(app.ui.card('plan').style.height, undefined);
    assert.equal(app.ui.card('plan').style.maxHeight, undefined);
  }
});

test('saved default projects still fit content; an intentional taller project card survives reopening', () => {
  for (const width of [390, 800, 1440]) {
    const app = harness({ width });
    app.act(ui => ui.edit());
    app.act(ui => ui.finish());
    const saved = app.stored();
    const restored = harness({ width, initial: saved });
    assert.equal(restored.ui.card('projects').style.height, undefined);
    assert.equal(restored.ui.card('projects').style.maxHeight, undefined);
    restored.act(ui => ui.edit());
    restored.control('projects', 'resize').key('ArrowDown');
    restored.act(ui => ui.finish());
    const reopened = harness({ width, initial: restored.stored() });
    assert.ok(reopened.ui.card('projects').style.height > 0);
    const legacy=reopened.stored();
    for(const rows of Object.values(legacy.profiles))for(const row of rows)delete row.fixedHeight;
    const legacyRestored=harness({width,initial:legacy});
    assert.equal(legacyRestored.ui.card('projects').style.height,undefined);
    assert.equal(legacyRestored.ui.card('projects')['data-auto-height'],'true');
  }
});

test('entering editing preserves rendered card bounds and Done without changes preserves the content layout',()=>{
  const rects={news:{left:0,top:0,width:685,height:208},activity:{left:0,top:220,width:685,height:245},projects:{left:0,top:477,width:685,height:280},plan:{left:701,top:150,width:499,height:1400},pet:{left:701,top:0,width:499,height:138}};
  const app=harness({rects});
  app.act(ui=>ui.edit());
  for(const id of ['news','activity','projects','plan','pet']){
    const actual=plain(app.ui.card(id).style);delete actual.position;assert.deepEqual(actual,rects[id]);
  }
  assert.equal(app.ui.card('pet').style.top,0);
  app.act(ui=>ui.finish());
  assert.equal(app.ui.fitContent,true);
  assert.equal(app.ui.card('plan').style.maxHeight,undefined);
  assert.equal(app.stored().profiles.wide,undefined);
});

test('cancel discards this edit session while pointercancel discards only the latest gesture', () => {
  const app = harness();
  const original = plain(app.ui.card('plan').style);
  app.act(ui => ui.edit());
  app.control('plan', 'resize').key('ArrowRight');
  const beforeGesture = plain(app.ui.card('plan').style);
  const control = app.control('plan', 'resize');
  control.down(); control.move({ clientX: 400 });
  assert.notEqual(app.ui.card('plan').style.width, beforeGesture.width);
  control.cancel();
  assert.deepEqual(plain(app.ui.card('plan').style), beforeGesture);
  assert.equal(app.ui.active, null);
  app.act(ui => ui.cancel());
  assert.deepEqual(plain(app.ui.card('plan').style), original);
  assert.equal(app.stored(), undefined);
});

test('wide and narrow edits stay independent across viewport changes and completion', () => {
  const app = harness();
  app.act(ui => ui.edit());
  app.control('plan', 'resize').key('ArrowRight');
  const wide = plain(app.ui.card('plan').style);
  app.resize(390);
  assert.equal(app.ui.profile.key, 'narrow');
  app.control('plan', 'resize').key('ArrowDown');
  app.resize(1200);
  assert.deepEqual(plain(app.ui.card('plan').style), wide);
  app.act(ui => ui.finish());
  assert.equal(app.stored().profiles.wide[0].w, 6);
  assert.equal(app.stored().profiles.narrow[0].h, 7);
  assert.equal(app.stored().profiles.medium, undefined, 'unvisited defaults need not be persisted');
});

test('viewport resize cancels an unfinished drag but preserves already committed draft edits', () => {
  const app = harness();
  app.act(ui => ui.edit());
  app.control('plan', 'resize').key('ArrowRight');
  const control = app.control('plan', 'resize');
  control.down(); control.move({ clientX: 400 });
  app.resize(390); app.resize(1200);
  app.act(ui => ui.finish());
  assert.equal(app.stored().profiles.wide[0].w, 6);
  assert.equal(control.captured.size, 0);
});

test('Escape and loss of window focus cancel a gesture without discarding prior changes', () => {
  for (const type of ['keydown', 'blur']) {
    const app = harness(); app.act(ui => ui.edit());
    app.control('plan', 'resize').key('ArrowRight');
    const control = app.control('plan', 'resize');
    control.down(); control.move({ clientX: 400 });
    app.emit(type, { key: 'Escape', preventDefault() {}, stopPropagation() {} });
    app.act(ui => ui.finish());
    assert.equal(app.stored().profiles.wide[0].w, 6);
    assert.equal(control.captured.size, 0);
  }
});

test('reset affects only the currently visible breakpoint and Cancel can undo the reset', () => {
  const app = harness(); app.act(ui => ui.edit());
  app.control('plan', 'resize').key('ArrowRight');
  app.resize(390); app.control('plan', 'resize').key('ArrowDown');
  app.act(ui => ui.finish());
  app.act(ui => ui.edit()); app.act(ui => ui.reset()); app.act(ui => ui.cancel());
  app.act(ui => ui.edit()); app.act(ui => ui.finish());
  assert.equal(app.stored().profiles.narrow[0].h, 7, 'cancel undoes resetting narrow');
  app.act(ui => ui.edit()); app.act(ui => ui.reset()); app.act(ui => ui.finish());
  assert.equal(app.stored().profiles.narrow[0].h, 6);
  assert.equal(app.stored().profiles.wide[0].w, 6);
});

test('blocked persistence keeps the applied layout and clearly reports that it was not saved', () => {
  const app = harness({ failWrite: true }); app.act(ui => ui.edit());
  app.control('plan', 'resize').key('ArrowRight');
  const changed = plain(app.ui.card('plan').style);
  app.act(ui => ui.finish());
  assert.equal(app.ui.card('plan').style.width,changed.width);
  assert.equal(app.ui.card('plan').style.minHeight,changed.height);
  assert.equal(app.ui.card('plan')['data-auto-height'],'true');
  assert.match(app.ui.notice, /无法保存/);
  assert.equal(app.stored(), undefined);
});

test('clicking a handle near the scroll edge does not move the viewport or change geometry', () => {
  const app = harness(); app.act(ui => ui.edit());
  const before = plain(app.ui.card('plan').style), control = app.control('plan', 'resize');
  control.down({ clientY: 790 }); control.move({ clientY: 790 }); control.up({ clientY: 790 });
  assert.equal(app.viewport.scrollTop, 0);
  assert.deepEqual(plain(app.ui.card('plan').style), before);
});

test('a drag at the bottom scrolls on movement but pointerup does not add another scroll jump', () => {
  const app = harness(); app.act(ui => ui.edit());
  const control = app.control('plan', 'resize');
  control.down({ clientY: 750 }); control.move({ clientY: 790 });
  assert.ok(app.viewport.scrollTop > 0);
  const duringDrag = app.viewport.scrollTop;
  control.up({ clientY: 790 });
  assert.equal(app.viewport.scrollTop, duringDrag);
});


test('pet move and resize use the same save, cancel, and reopen lifecycle as other cards',()=>{
 const app=harness();app.act(ui=>ui.edit());
 const initial=plain(app.ui.card('pet').style);
 const handle=app.control('pet');handle.down();handle.move({clientX:0,clientY:320});handle.up({clientX:0,clientY:320});
 app.control('pet','resize').key('ArrowDown');
 const moved=plain(app.ui.card('pet').style);assert.notDeepEqual(moved,initial);assert(moved.height>initial.height);
 assert.equal(app.stored(),undefined);app.act(ui=>ui.finish());
 const reopened=harness({initial:app.stored()});assert.deepEqual(plain(reopened.ui.card('pet').style),moved);
 reopened.act(ui=>ui.edit());reopened.control('pet').key('ArrowDown');reopened.act(ui=>ui.cancel());
 assert.deepEqual(plain(reopened.ui.card('pet').style),moved);
});

test('upgrading a saved 9/3 layout preserves pet position through edit, viewport changes and reopening',()=>{
 const wide=[{id:'plan',x:7,y:4,w:5,h:8},{id:'news',x:0,y:0,w:9,h:4},{id:'activity',x:0,y:4,w:7,h:4},{id:'projects',x:0,y:8,w:7,h:4},{id:'pet',x:9,y:0,w:3,h:4}];
 const initial={version:2,profiles:{wide}},app=harness({initial});
 const pet=plain(app.ui.card('pet').style),plan=plain(app.ui.card('plan').style);
 assert.equal(pet.top,0);assert.equal(pet.width,288);assert.equal(pet.left,912);
 assert.equal(plan.top,Math.max(34,(700-16*11)/12)*4+16*4);
 app.act(ui=>ui.edit());app.act(ui=>ui.cancel());
 assert.deepEqual(plain(app.ui.card('pet').style),pet);
 app.resize(800);app.resize(1200);
 assert.deepEqual(plain(app.ui.card('pet').style),pet);
 app.act(ui=>ui.edit());app.act(ui=>ui.finish());
 assert.deepEqual(app.stored(),initial);
 const reopened=harness({initial:app.stored()});
 assert.deepEqual(plain(reopened.ui.card('pet').style),pet);
 assert.deepEqual(plain(reopened.ui.card('plan').style),plan);
});

test('horizontal resize keeps automatic height; only a vertical resize persists fixed height',()=>{
 const app=harness();app.act(ui=>ui.edit());app.control('news','resize').key('ArrowLeft');app.act(ui=>ui.finish());
 assert.equal(app.stored().profiles.wide.find(r=>r.id==='news').fixedHeight,undefined);
 assert.equal(app.ui.card('news')['data-auto-height'],'true');
 app.act(ui=>ui.edit());app.control('news','resize').key('ArrowDown');app.act(ui=>ui.finish());
 assert.equal(app.stored().profiles.wide.find(r=>r.id==='news').fixedHeight,true);
 const reopened=harness({initial:app.stored()});assert.equal(reopened.ui.card('news')['data-fixed-height'],'true');
 assert.equal(reopened.ui.card('activity')['data-auto-height'],'true');
});
