import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { chromeAccount, chromeKeychain, chromeScope } from './project-store.js';

const run = promisify(execFile);
const input = process.argv[2];
if (process.platform !== 'darwin') {
  console.error('Chrome 商店只读授权目前支持 macOS。');
  process.exit(1);
}
if (!input) {
  console.error('用法：node connect-chrome-store.mjs <Google 桌面 OAuth 客户端 JSON 路径>');
  process.exit(1);
}

async function authorize() {
  let installed;
  try { ({ installed } = JSON.parse(await readFile(input, 'utf8'))); }
  catch { throw new Error('无法读取 Google 桌面 OAuth 客户端 JSON。'); }
  const clientId = installed?.client_id, clientSecret = installed?.client_secret;
  if (!clientId?.endsWith('.apps.googleusercontent.com') || typeof clientSecret !== 'string') {
    throw new Error('需要 Google Cloud 中类型为「桌面应用」的 OAuth 客户端 JSON。');
  }

  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  let resolveCode, rejectCode;
  const result = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const callback = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method !== 'GET' || url.pathname !== '/oauth' || url.searchParams.get('state') !== state) {
      response.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get('code');
    response.writeHead(code?200:400, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'})
      .end(code?'已收到授权，可以关闭此标签页。请回到终端查看保存结果。':'授权未完成，可以关闭此标签页。');
    if (code) resolveCode(code);
    else rejectCode(new Error('Google 只读授权未完成。'));
  });
  await new Promise((resolve, reject) => {
    callback.once('error', reject);
    callback.listen(0, '127.0.0.1', resolve);
  });
  const redirect = 'http://127.0.0.1:'+callback.address().port+'/oauth';
  const params = new URLSearchParams({
    client_id:clientId,redirect_uri:redirect,response_type:'code',scope:chromeScope,state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',
    access_type:'offline',prompt:'consent',
  });
  const timeout = setTimeout(() => rejectCode(new Error('尚未完成 Google 授权，请重新运行连接命令。')), 180000);
  let code;
  try {
    code = await Promise.all([result,run('/usr/bin/open',['https://accounts.google.com/o/oauth2/v2/auth?'+params])]).then(([value])=>value);
  } finally {
    clearTimeout(timeout);
    callback.close();
  }
  const response = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,code_verifier:verifier,redirect_uri:redirect,grant_type:'authorization_code'}),
  });
  if (!response.ok) throw new Error('Google 授权交换失败。');
  const token = await response.json().catch(()=>null);
  if (typeof token?.refresh_token !== 'string' || token.scope !== chromeScope) throw new Error('未收到 Chrome 商店只读授权。');
  const secret = Buffer.from(JSON.stringify({clientId,clientSecret,refreshToken:token.refresh_token})).toString('hex');
  await new Promise((resolve, reject) => {
    // Pass the credential through stdin so it never appears in process arguments.
    const child = spawn('/usr/bin/security',['-i'],{stdio:['pipe','ignore','ignore']});
    child.once('error',reject);
    child.stdin.on('error',reject);
    child.once('close',code=>code===0?resolve():reject(new Error('无法保存到登录钥匙串。')));
    child.stdin.end('add-generic-password -U -a '+chromeAccount+' -s '+chromeKeychain+' -X '+secret+'\n');
  });
  try {
    await run('/usr/bin/security',['find-generic-password','-s',chromeKeychain,'-a',chromeAccount],{timeout:4000,maxBuffer:4096});
  } catch {
    throw new Error('未能核实钥匙串已保存授权。');
  }
  console.log('Chrome 商店只读授权已保存。回到个人 AI 工作台刷新，等待下一次同步。');
}

try { await authorize(); }
catch (error) {
  console.error(error.message);
  process.exitCode=1;
}
