import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import vm from'node:vm';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const start=source.indexOf('function planNoteContent('),end=source.indexOf('function planNodes(',start);
const box={URL,React:{Fragment:'fragment'},PlanInlineLink:'link',text:v=>String(v||''),safeHTTPS:v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null;}catch{return null;}},h:(type,props,...children)=>({type,props,children})};
vm.runInNewContext(source.slice(start,end)+';globalThis.parse=planNoteContent;',box);
const links=value=>box.parse(value).filter(x=>x?.type==='fragment').map(x=>x.children[0].props);
test('meeting links preserve destination and exclude trailing Chinese punctuation',()=>{
 const result=links('会议：https://vc.feishu.cn/j/123456。');assert.equal(result.length,1);assert.equal(result[0].href,'https://vc.feishu.cn/j/123456');assert.equal(result[0].label,'加入飞书会议');
});
test('query strings survive and multiple links remain separate',()=>{
 const result=links('https://example.com/notes?a=1&b=2 https://meet.google.com/abc-defg-hij');assert.equal(result.length,2);assert.equal(result[0].href,'https://example.com/notes?a=1&b=2');assert.equal(result[1].label,'加入 Google Meet');
});
test('untrusted schemes stay plain text',()=>{assert.equal(links('javascript:alert(1) data:text/html,test file:///private/test').length,0);});
test('host lookalikes never receive a trusted meeting label',()=>{assert.equal(links('https://vc.feishu.cn.evil.example/j/123')[0].label,'打开链接');});
