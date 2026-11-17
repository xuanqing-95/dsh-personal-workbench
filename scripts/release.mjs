import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const action=process.argv[2]||'verify';
if(action==='seal'){
  execFileSync(process.execPath,['sync-design.mjs'],{stdio:'inherit'});
  let code=await readFile('client.js','utf8');
  const helper=(await readFile('ui-update-client.js','utf8')).replaceAll('export function ','function ');
  code=code.replace(/\/\/ BEGIN SAFE UI UPDATER[\s\S]*?\/\/ END SAFE UI UPDATER/,()=> '// BEGIN SAFE UI UPDATER\n'+helper+'// END SAFE UI UPDATER');
  const build='release-'+pkg.version;
  code=code.replace(/const WORKBENCH_UI_BUILD = "[^"]*";/,'const WORKBENCH_UI_BUILD = '+JSON.stringify(build)+';');
  await writeFile('client.js',code);
  await writeFile('ui-release.json',JSON.stringify({protocol:1,moduleId:pkg.name,build,sha256:sha(code),publishedAt:new Date().toISOString()})+'\n');
}else if(action==='verify'){
  execFileSync(process.execPath,['sync-design.mjs','--check'],{stdio:'inherit'});
  if((await readFile('icon.svg')).byteLength>256*1024)throw Error('Plugin icon exceeds host limit of 256 KiB');
  const code=await readFile('client.js','utf8'),release=JSON.parse(await readFile('ui-release.json','utf8'));
  if(release.sha256!==sha(code)||release.build!=='release-'+pkg.version)throw Error('Unsealed client: run npm run release:seal before tagging');
  const files=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}))[0].files;
  const allowed=new Set([...pkg.files.filter(p=>!p.includes('*')),'README.md','package.json','locale/zh.json','locale/en.json']);
  for(const file of files){
    if(!allowed.has(file.path))throw Error('Unexpected packed file: '+file.path);
    const body=await readFile(file.path,'utf8');
    if(/\/Users\/|\bghp_[A-Za-z0-9_]{30,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(body))throw Error('Private path or credential pattern in '+file.path);
  }
  for(const required of ['LICENSE','PRIVACY.md','content.js','plan-tools.js','ui-release.json'])if(!files.some(f=>f.path===required))throw Error('Missing package file: '+required);
  console.log(`Verified ${files.length} package files; UI marker and version match.`);
}else if(action==='site'){
  const commit=process.argv[3];if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('Pass the full released commit');
  const release=JSON.parse(await readFile('ui-release.json','utf8'));
  await mkdir('site/icons',{recursive:true});await copyFile('icon.svg','site/icons/workbench.svg');
  const index={format:1,title:{en:'Xuanqing Plugins',zh:'玄清的插件'},description:{en:'Personal tools designed by Xuanqing',zh:'由玄清设计的个人效率工具'},plugins:[{
    name:pkg.name,title:{en:'Personal Workbench',zh:'个人主控台'},description:{en:'A personal home for plans, AI briefs, agents and projects.',zh:pkg.description},author:'玄清',icon:'icons/workbench.svg',homepage:pkg.homepage,repository:{url:pkg.repository.url.replace(/^git\+/,'').replace(/\.git$/,'')},metadata:{keywords:pkg.keywords},
    versions:[{version:pkg.version,publishTimestamp:Math.floor(Date.parse(release.publishedAt)/1000),source:{type:'git',url:'https://github.com/xuanqing-95/dsh-personal-workbench',commit},engines:{dsh:pkg.engines.dsh}}]
  }]};
  await writeFile('site/index.json',JSON.stringify(index,null,2)+'\n');
  await writeFile('site/.nojekyll','');
}else throw Error('Unknown release action');
