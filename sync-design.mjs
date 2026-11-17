import {readFile,writeFile} from 'node:fs/promises';
const client=new URL('./client.js',import.meta.url);
const css=await readFile(new URL('./workbench-design.css',import.meta.url),'utf8');
const source=await readFile(client,'utf8');
const pattern=/\/\* BEGIN SHARED DESIGN SYSTEM \*\/[\s\S]*?\/\* END SHARED DESIGN SYSTEM \*\//;
if(!pattern.test(source))throw Error('Missing shared design boundaries');
const generated=source.replace(pattern,()=> '/* BEGIN SHARED DESIGN SYSTEM */\n'+css+'\n/* END SHARED DESIGN SYSTEM */');
if(process.argv.includes('--check')) {
  if(generated!==source)throw Error('Shared design changed. Run npm run sync:design before previewing.');
} else await writeFile(client,generated);
