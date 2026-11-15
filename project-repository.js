import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {realpath} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const exec=promisify(execFile);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function normalizeRepository(value){
  if(typeof value!=='string'||value.length>300)return null;
  let name=value.trim().replace(/^https:\/\/github\.com\//i,'').replace(/^git@github\.com:/i,'').replace(/^ssh:\/\/git@github\.com\//i,'').replace(/\/$/,'').replace(/\.git$/i,'');
  if(!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(name)||name.split('/').some(x=>x==='.'||x==='..'))return null;
  return name.toLowerCase();
}
// Inspect only the exact conversation's directory, never scan other projects or chat bodies.
export function createRepositoryResolver({run=exec,canonicalize=realpath,home=os.homedir(),readContext}={}){
  const context=readContext|| (async entry=>{
    if(entry.source!=='codex'||!uuid.test(entry.threadId))return null;
    const {stdout}=await run('/usr/bin/sqlite3',['-readonly','-json',path.join(home,'.codex','state_5.sqlite'),
      `SELECT cwd FROM threads WHERE id = '${entry.threadId.toLowerCase()}' AND archived = 0 LIMIT 1`],{timeout:2500,maxBuffer:16384});
    const rows=JSON.parse(stdout||'[]');return rows[0]?.cwd;
  });
  return async entry=>{
    if(entry.repository){const repository=normalizeRepository(entry.repository);return repository?{repository,repositoryState:'linked'}:{repositoryState:'invalid'};}
    try{
      const raw=entry.projectPath||await context(entry);
      if(typeof raw!=='string'||!path.isAbsolute(raw)||raw.length>2048||/[\u0000-\u001f]/.test(raw))return {repositoryState:'missing'};
      const directory=await canonicalize(raw);
      let stdout,repositoryRoot;
      try{const result=await run('git',['-C',directory,'rev-parse','--show-toplevel'],{timeout:2500,maxBuffer:4096});
        repositoryRoot=await canonicalize(result.stdout.trim());
        ({stdout}=await run('git',['-C',directory,'config','--local','--get-regexp','^remote\\..*\\.url$'],{timeout:2500,maxBuffer:65536,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}}));}
      catch(error){if(error.code===1||error.code===128)return {repositoryState:'missing',projectPath:directory};throw error;}
      const all=[],origins=[];
      for(const line of stdout.split('\n')){
        const match=/^remote\.([^\s]+)\.url\s+(.+)$/.exec(line);if(!match)continue;
        const repo=normalizeRepository(match[2]);if(!repo)continue;
        all.push(repo);if(match[1]==='origin')origins.push(repo);
      }
      const candidates=[...new Set(origins.length?origins:all)];
      if(candidates.length&&repositoryRoot!==directory)return {repositoryState:'ambiguous',projectPath:directory,repositoryCandidates:candidates.slice(0,5)};
      if(candidates.length===1)return {repository:candidates[0],repositoryState:'linked',projectPath:directory};
      return candidates.length>1?{repositoryState:'ambiguous',projectPath:directory,repositoryCandidates:candidates.slice(0,5)}:{repositoryState:'missing',projectPath:directory};
    }catch{return {repositoryState:'unavailable'};}
  };
}
