import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Only an atomically published, fully written UI build may become visible.
export function createUIReleaseReader({directory,moduleId,modules,read=readFile}) {
  let accepted;
  return async function readRelease() {
    let marker;
    try { marker=JSON.parse(await read(new URL('ui-release.json',directory),'utf8')); }
    catch(error) {if(error.code==='ENOENT')return {available:false};throw error;}
    if(marker.protocol!==1||marker.moduleId!==moduleId||!/^\w[\w.-]{0,99}$/.test(marker.build||'')||!/^[a-f0-9]{64}$/.test(marker.sha256||''))throw Error('Invalid UI release');
    const owner=modules();
    if(!owner)return {available:false};
    if(accepted?.sha256!==marker.sha256) {
      const bytes=await read(new URL('client.js',directory));
      if(createHash('sha256').update(bytes).digest('hex')!==marker.sha256)return {available:false};
      if(!bytes.toString().includes('const WORKBENCH_UI_BUILD = '+JSON.stringify(marker.build)+';'))throw Error('UI build does not match release');
      const rev=owner.rebuilt(moduleId);
      if(!rev)return {available:false};
      accepted={...marker,rev};
    }
    return {available:true,build:accepted.build,rev:accepted.rev,moduleId};
  };
}
