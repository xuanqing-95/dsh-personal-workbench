import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import {normalizeRepository} from './project-repository.js';
const exec=promisify(execFile);
const github=existsSync('/opt/homebrew/bin/gh')?'/opt/homebrew/bin/gh':'gh';
const clean = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
  .replace(/\b(?:gh[pousr]_[a-z0-9_]+|github_pat_[a-z0-9_]+|sk-[a-z0-9_-]{12,}|Bearer\s+\S+)/gi, '[已隐藏]').trim().slice(0, 180) : '';
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
export async function readProjectGitHub(spec, { run = exec } = {}) {
  const repo = normalizeRepository(spec.repo);
  if(!repo)throw new Error('Invalid GitHub repository');
  const base = 'https://github.com/' + repo;
  const read = async endpoint => {
    const result = await run(github, ['api', '--hostname', 'github.com', 'repos/'+repo+'/'+endpoint],
      {timeout:7500,maxBuffer:1024*1024,cwd:'/',env:{...process.env,GH_PROMPT_DISABLED:'1'}});
    const value = JSON.parse(result.stdout);
    if (!Array.isArray(value)) throw new Error('GitHub response unavailable');
    return value;
  };
  const [pulls,releases,commits] = await Promise.all([
    read('pulls?state=all&sort=updated&direction=desc&per_page=20'),
    read('releases?per_page=20'),
    spec.includeCommits && !spec.chromeOnly ? read('commits?per_page=12') : [],
  ]);
  const eligible = pulls.filter(pull=>Number.isSafeInteger(pull.number)&&pull.number>0
    && (!spec.chromeOnly || pull.head?.repo?.full_name===repo
      && /(?:^|[/-])(?:browser-only|chrome-extension|chrome-store|web-store)(?:[/-]|$)/i.test(pull.head?.ref||'')));
  const changes = eligible.filter(pull=>timestamp(pull.merged_at)&&clean(pull.title)).map(pull=>({
    id:'pr:'+pull.number, label:clean(pull.title), date:timestamp(pull.merged_at),
    state:'已合并',url:base+'/pull/'+pull.number,
  }));
  for (const release of releases) {
    const tag = release.tag_name;
    if (release.draft || !timestamp(release.published_at) || typeof tag!=='string' ||
      !(spec.chromeOnly ? /^(?:chrome|browser)-v\d[\w.-]*$/ : /^v\d[\w.-]*$/).test(tag) || tag.length>80) continue;
    changes.push({id:'release:'+tag, label:clean(release.name)||tag, date:timestamp(release.published_at),
      state:release.prerelease?'试用版已发布':'GitHub 已发布',url:base+'/releases/tag/'+encodeURIComponent(tag)});
  }
  for (const commit of commits) {
    const sha=commit.sha, date=timestamp(commit.commit?.committer?.date);
    const label=clean(commit.commit?.message?.split('\n')[0]);
    if(typeof sha!=='string'||!/^[a-f0-9]{40}$/.test(sha)||!date||!label)continue;
    changes.push({id:'commit:'+sha,label,date,state:'代码已更新',url:base+'/commit/'+sha});
  }
  const pull = eligible.find(item=>item.state==='open'&&timestamp(item.updated_at)&&clean(item.title));
  return {history:changes.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12),
    pull:pull?{id:'pr:'+pull.number,label:clean(pull.title),date:timestamp(pull.updated_at),
      state:pull.draft?'开发草稿':'等待合并',url:base+'/pull/'+pull.number}:null};
}

