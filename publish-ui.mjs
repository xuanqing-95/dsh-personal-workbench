import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=dirname(fileURLToPath(import.meta.url));
const target=process.argv[2]&&resolve(process.argv[2]);
if(!target)throw Error('Usage: node publish-ui.mjs /absolute/installed/plugin [expected-client-sha256]');
const pkg=JSON.parse(await readFile(join(target,'package.json'),'utf8'));
const own=JSON.parse(await readFile(join(source,'package.json'),'utf8'));
if(pkg.name!==own.name)throw Error('Installed plugin identity mismatch');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=await readFile(join(target,'client.js'));
const expected=process.argv[3];
if(expected&&sha(before)!==expected)throw Error('Installed UI changed concurrently');
let code=await readFile(join(source,'client.js'),'utf8');
const helper=(await readFile(join(source,'ui-update-client.js'),'utf8')).replaceAll('export function ','function ');
if(!code.includes('// BEGIN SAFE UI UPDATER'))throw Error('Missing updater boundaries');
code=code.replace(/\/\/ BEGIN SAFE UI UPDATER[\s\S]*?\/\/ END SAFE UI UPDATER/,()=> '// BEGIN SAFE UI UPDATER\n'+helper+'// END SAFE UI UPDATER');
const build='ui-'+new Date().toISOString().replace(/[^0-9]/g,'')+'-'+sha(code).slice(0,10);
if(!code.includes('const WORKBENCH_UI_BUILD = '))throw Error('Safe updater is not installed in source');
code=code.replace(/const WORKBENCH_UI_BUILD = "[^"]*";/,'const WORKBENCH_UI_BUILD = '+JSON.stringify(build)+';');
const temp=join(target,'.client-publish-'+process.pid+'.js');
const marker=join(target,'.ui-release-'+process.pid+'.json');
try {
await writeFile(temp,code,{mode:0o600});
execFileSync(process.execPath,['--check',temp],{stdio:'pipe'});
if(sha(await readFile(join(target,'client.js')))!==sha(before))throw Error('Installed UI changed during publish');
// One bounded rollback slot, not a new backup directory for every edit.
await mkdir(join(target,'.ui-rollback'),{recursive:true,mode:0o700});
await writeFile(join(target,'.ui-rollback/client.js'),before,{mode:0o600});
try{await writeFile(join(target,'.ui-rollback/ui-release.json'),await readFile(join(target,'ui-release.json')),{mode:0o600});}catch(e){if(e.code!=='ENOENT')throw e;}
await rename(temp,join(target,'client.js'));
const release={protocol:1,moduleId:pkg.name,build,sha256:sha(code),publishedAt:new Date().toISOString()};
await writeFile(marker,JSON.stringify(release)+'\n',{mode:0o600});
await rename(marker,join(target,'ui-release.json'));
console.log(JSON.stringify({published:true,build,sha256:release.sha256,note:'Published; actual UI acknowledgement still required.'}));

} finally {await Promise.all([temp,marker].map(file=>unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;})));}
