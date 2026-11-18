import path from 'node:path';
import {constants} from 'node:fs';
import {open,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dates} from './planning.js';

const maxBytes=8*1024*1024;
const extensions=/\.(?:avif|gif|jpe?g|png|webp)$/i;

function rasterMime(bytes){
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(/^GIF8[79]a$/.test(bytes.toString('ascii',0,6)))return 'image/gif';
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(bytes.toString('ascii',4,8)==='ftyp'&&['avif','avis'].includes(bytes.toString('ascii',8,12)))return 'image/avif';
  return null;
}
function remoteURL(figure){
  for(const value of [figure.platform_url,figure.remote_url,figure.original_image_url,figure.original_url,figure.src]){
    if(typeof value!=='string')continue;
    try{
      const url=new URL(value);
      if(url.protocol==='https:'&&!url.username&&!url.password&&extensions.test(url.pathname))return url.href;
    }catch{}
  }
  return null;
}
function within(dir,file){
  const rest=path.relative(dir,file);
  return rest.length>0&&rest!=='..'&&!rest.startsWith('..'+path.sep)&&!path.isAbsolute(rest);
}
async function fromFile(root,date,candidate,includeData){
  if(typeof candidate!=='string'||!candidate||candidate.length>4096||candidate.includes('\0')||!extensions.test(candidate))return null;
  const roots=[path.join(root,'assets',date),path.join(root,'issues','tests',date)];
  const target=path.resolve(root,candidate);
  if(!roots.some(dir=>within(dir,target)))return null;
  const file=await realpath(target);
  if(!roots.some(dir=>within(dir,file))||!extensions.test(file))return null;
  const handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0)|(constants.O_NONBLOCK||0));
  try{
    const info=await handle.stat();
    if(!info.isFile()||info.size<12||info.size>maxBytes)return null;
    const buffer=Buffer.alloc(includeData?info.size:Math.min(info.size,32));
    let offset=0;
    while(offset<buffer.length){
      const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,offset);if(!bytesRead)return null;
      offset+=bytesRead;
    }
    const after=await handle.stat(),mime=rasterMime(buffer);
    if(!mime||info.size!==after.size||info.ctimeMs!==after.ctimeMs||info.mtimeMs!==after.mtimeMs)return null;
    const revision=createHash('sha256').update(JSON.stringify([date,path.relative(root,file),info.ino,info.size,info.ctimeMs,info.mtimeMs])).digest('hex').slice(0,16);
    return {revision,...(includeData?{data:buffer,mime}:{})};
  }finally{await handle.close();}
}

// Only the issue metadata chooses a file. The HTTP request carries a date and an opaque revision.
export async function readEditionFigure(dir,date,issue,{archive=false,includeData=false}={}){
  const none={leadImage:null,imageUrl:null};
  if(!dir||!dates.day(date)||!issue?.items?.[0]?.[0]||!Array.isArray(issue.figures))return none;
  const root=path.dirname(await realpath(dir));
  for(const figure of issue.figures){
    if(!figure||typeof figure!=='object'||(figure.item_index!=null&&figure.item_index!==0))continue;
    const imageUrl=remoteURL(figure);
    for(const candidate of [figure.local_image,figure.local_path]){
      let match;try{match=await fromFile(root,date,candidate,includeData);}catch{continue;}
      if(match){
        const alt=[figure.caption,figure.desc].find(v=>typeof v==='string'&&v.trim())?.slice(0,300)||'重点资讯配图';
        return {imageUrl,leadImage:{revision:match.revision,alt,archive},...(includeData?{data:match.data,mime:match.mime}:{})};
      }
    }
    if(imageUrl)return {...none,imageUrl};
  }
  return none;
}
