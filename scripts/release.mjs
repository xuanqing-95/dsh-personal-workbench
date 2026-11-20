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
  if(release.build!=='release-'+pkg.version||!Number.isFinite(Date.parse(release.publishedAt)))throw Error('Seal this version before generating its installation page');
  const locales=Object.fromEntries(await Promise.all(['zh','en'].map(async lang=>{
    const {meta}=JSON.parse(await readFile('locale/'+lang+'.json','utf8'));
    if(!meta?.title||!meta.description)throw Error('Missing plugin locale: '+lang);
    return [lang,meta];
  })));
  const repository=pkg.repository.url.replace(/^git\+/,'').replace(/\.git$/,'');
  const author=typeof pkg.author==='string'?pkg.author:pkg.author.name;
  const titles={en:locales.en.title,zh:locales.zh.title},descriptions={en:locales.en.description,zh:locales.zh.description};
  const tag='v'+pkg.version;
  const filename=pkg.name.replace(/^@/,'').replace('/','-')+'-'+pkg.version+'.tgz';
  const releaseUrl=repository+'/releases/tag/'+encodeURIComponent(tag);
  const packageUrl=repository+'/releases/download/'+encodeURIComponent(tag)+'/'+encodeURIComponent(filename);
  const indexUrl=new URL('index.json',pkg.homepage.replace(/\/?$/,'/')).href;
  const index={format:1,title:{en:'Personal AI Workspace plugins',zh:'个人 AI 工作台插件索引'},description:{en:'Install the personal workspace for plans, AI progress and project results in DeepSeek Harness.',zh:'在 DeepSeek Harness 安装个人 AI 工作台，查看今日计划、AI 进展和项目成果。'},plugins:[{
    name:pkg.name,title:titles,description:descriptions,author,icon:'icons/workbench.svg',homepage:pkg.homepage,repository:{url:repository},metadata:{keywords:pkg.keywords},
    versions:[{version:pkg.version,publishTimestamp:Math.floor(Date.parse(release.publishedAt)/1000),source:{type:'git',url:repository,commit},engines:{dsh:pkg.engines.dsh}}]
  }]};
  const installUrl=pkg.version.includes('-')?packageUrl:repository+'/releases/latest/download/'+pkg.name+'.tgz';
  const fields={installUrl,titleZh:titles.zh,titleEn:titles.en,descriptionZh:descriptions.zh,author,version:pkg.version,repository,packageUrl,releaseUrl,indexUrl,engines:pkg.engines.dsh};
  const entities={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const template=await readFile('site/index.html','utf8');
  const html=template.replace(/\{\{(\w+)\}\}/g,(_,key)=>{
    if(!Object.hasOwn(fields,key))throw Error('Unknown installation page field: '+key);
    return fields[key].replace(/[&<>"']/g,char=>entities[char]);
  });
  const output='dist/site';
  await Promise.all([mkdir(output+'/icons',{recursive:true}),mkdir('site/icons',{recursive:true})]);
  await Promise.all([
    writeFile('site/index.json',JSON.stringify(index,null,2)+'\n'),copyFile('icon.svg','site/icons/workbench.svg'),writeFile('site/.nojekyll',''),
    writeFile(output+'/index.json',JSON.stringify(index,null,2)+'\n'),
    writeFile(output+'/index.html',html), writeFile(output+'/.nojekyll',''),
    copyFile('site/preview.png',output+'/preview.png'),copyFile('icon.svg',output+'/icons/workbench.svg'),
  ]);
  console.log('Installation page: '+output+'/index.html');
  console.log('Package: '+packageUrl);
}else throw Error('Unknown release action');
