const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const headers = require('../agent/jira-headers');
const core = require('../agent/qa-report-agent');
const { jiraFromForm } = require('../agent/desktop/connection');
const { publicJiras } = require('../agent/jira-profiles');
const extra = { name: 'X-Jira-Access', value: 'fixture-access-key' };

test('optional header validates input, protects transport headers and limits destination', () => {
  assert.equal(headers.normalize(null), null);
  assert.equal(headers.normalize({name:'',value:''}), null);
  assert.deepEqual(headers.normalize(extra), extra);
  for (const name of ['Authorization','cOOkie','Host','Content-Type','Content-Length','X-Atlassian-Token','Sec-Fetch-Site','Proxy-Authorization','User-Agent','X-Forwarded-For','bad:name','bad name','X-Test\r\nInjected']) {
    assert.throws(() => headers.normalize({ name, value: extra.value }), error => !error.message.includes(extra.value));
  }
  for (const value of ['', ' ', 'a\r\nCookie: injected', 'a\0b', 'тест', 'x'.repeat(4097)]) assert.throws(() => headers.normalize({name:extra.name,value}));
  assert.throws(() => headers.normalize({name:'',value:'x'}));
  const connection = {baseUrl:'https://jira.example/jira',additionalHeader:extra};
  assert.deepEqual(headers.headers(connection, 'https://jira.example/jira/secure/attachment/1'), {[extra.name]:extra.value});
  for (const url of ['https://other.example/jira/file','http://jira.example/jira/file','https://jira.example/jira2/file','https://jira.example/second/file']) assert.throws(() => headers.headers(connection, url));
});

test('header edits preserve existing access for the same Jira and hide values from snapshots', () => {
  const previous = {id:'one',baseUrl:'https://jira.example/jira',type:'data-center',authMethod:'pat',token:'saved-token',additionalHeader:extra};
  const form = {mode:'pat',baseUrl:previous.baseUrl,headerName:extra.name,headerValue:''};
  const retained = jiraFromForm(form, previous);
  assert.equal(retained.token, previous.token);
  assert.deepEqual(retained.additionalHeader, extra);
  assert.equal(jiraFromForm({...form,headerValue:'changed'}, previous).additionalHeader.value,'changed');
  assert.equal(jiraFromForm({...form,headerName:''}, previous).additionalHeader,null);
  assert.throws(() => jiraFromForm({...form,baseUrl:'https://other.example'}, previous));
  assert.throws(() => jiraFromForm({...form,baseUrl:'https://jira.example/second',token:'new-token'}, previous));
  assert.throws(() => jiraFromForm({...form,headerName:'X-Different'}, previous));
  const cookie = {...previous,authMethod:'cookie'};
  assert.equal(jiraFromForm({...form,mode:'curl',curl:''},cookie).token,cookie.token);
  const snapshot = publicJiras({jiras:[retained]});
  assert.equal(snapshot[0].headerName,extra.name);
  assert(!JSON.stringify(snapshot).includes(extra.value));
  assert(!JSON.stringify(snapshot).includes(previous.token));
});

function fixtureResponse(url) {
  const target = new URL(url), base = target.origin + '/jira';
  if (target.pathname.endsWith('/attachment/meta')) return Response.json({enabled:true,uploadLimit:10000});
  if (target.search === '?fields=attachment') return Response.json({fields:{attachment:[{id:'42',filename:'file.txt',mimeType:'text/plain',size:4,content:base+'/secure/attachment/42/file.txt'}]}});
  if (target.pathname.endsWith('/file.txt')) return new Response('data', {headers:{'content-type':'text/plain'}});
  if (target.pathname.endsWith('/attachments')) return Response.json([{id:'43',filename:'new.txt'}]);
  if (target.search.includes('maxResults')) return Response.json({comments:[],total:0});
  if (target.pathname.endsWith('/myself')) return Response.json({displayName:'Fixture'});
  return Response.json({id:'7',body:'report'});
}
const payloadFor = base => ({baseUrl:base,issueUrl:base+'/browse/QA-1',commentUrl:base+'/browse/QA-1?focusedCommentId=7',attachmentId:'42',comment:{format:'wiki',body:'report'},files:[{name:'new.txt',type:'text/plain',dataBase64:Buffer.from('new').toString('base64')}]});
const actions = ['test','comment','attachments','attachment-manifest','import-comment','import-attachment'];

test('all agent Jira operations send the profile header and isolate destinations', async t => {
  const jira = {baseUrl:'https://jira.example/jira',authMethod:'pat',token:'token',additionalHeader:extra};
  const config = {jiras:[jira,{...jira,baseUrl:'https://jira.example/second',additionalHeader:{...extra,value:'second-key'}}]};
  const calls=[];
  core.setJiraTransport(async (url, options) => {calls.push({url:String(url),options});return fixtureResponse(url);});
  t.after(()=>core.setJiraTransport(fetch));
  for (const action of actions) await core.executeJob(config,{type:'jira.'+action,payload:{...payloadFor(jira.baseUrl),additionalHeader:{name:extra.name,value:'browser-must-not-override'}}});
  await core.executeJob(config,{type:'jira.network-test',payload:{baseUrl:jira.baseUrl}});
  assert(calls.length>12);
  for (const call of calls) {assert.equal(call.options.headers[extra.name],extra.value);assert.equal(call.options.redirect,'manual');}
  const upload=calls.find(call=>call.url.endsWith('/attachments'));
  assert.equal(upload.options.headers['X-Atlassian-Token'],'no-check');
  assert(upload.options.body instanceof FormData);
  assert.equal(upload.options.headers['Content-Type'],undefined);
  await core.executeJob(config,{type:'jira.test',payload:{baseUrl:'https://jira.example/second'}});
  assert.equal(calls.at(-1).options.headers[extra.name],'second-key');
  await core.executeJob(config,{type:'jira.network-test',payload:{baseUrl:'https://unknown.example'}});
  assert.equal(calls.at(-1).options.headers[extra.name],undefined);
  const count=calls.length;
  await assert.rejects(core.executeJob(config,{type:'jira.test',payload:{baseUrl:'https://unknown.example'}}));
  assert.equal(calls.length,count);
  core.setJiraTransport(async()=>new Response(null,{status:302,headers:{location:'https://other.example'}}));
  await assert.rejects(core.verifyJira(jira));
});

async function listen(server) {await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
test('server sends the header for API, multipart and downloads, rejects overrides and follows no redirects', async t => {
  const received=[];let redirect=false,leaked=0;
  const sink=http.createServer((req,res)=>{leaked++;res.end('{}');});const sinkUrl=await listen(sink);
  t.after(()=>sink.close());
  const mock=http.createServer(async(req,res)=>{
    for await(const chunk of req) {};
    received.push({url:req.url,headers:req.headers});
    if(redirect){res.writeHead(302,{location:sinkUrl});res.end();return;}
    const answer=fixtureResponse(mockUrl+req.url);
    res.writeHead(answer.status,Object.fromEntries(answer.headers));res.end(Buffer.from(await answer.arrayBuffer()));
  });const mockUrl=await listen(mock);t.after(()=>mock.close());
  const probe=http.createServer();const appUrl=await listen(probe);await new Promise(resolve=>probe.close(resolve));
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jira-header-test-'));
  const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:new URL(appUrl).port,REPORTS_DB_PATH:path.join(dir,'reports.sqlite')},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}fs.rmSync(dir,{recursive:true,force:true});});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server startup timeout')),5000);
    child.stdout.on('data',chunk=>{if(String(chunk).includes('QA Report:')){clearTimeout(timer);resolve();}});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});
  });
  const base=mockUrl+'/jira';
  const post=(action, additionalHeader=extra)=>fetch(appUrl+'/api/jira/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payloadFor(base),token:'fixture-token',additionalHeader})});
  for(const action of actions){const response=await post(action);assert(response.ok, action+': '+await response.text());}
  assert(received.length>12);
  for(const call of received) assert.equal(call.headers['x-jira-access'],extra.value,call.url);
  assert.equal(received.find(call=>call.url.endsWith('/attachments')).headers['x-atlassian-token'],'no-check');
  const count=received.length;
  for(const name of ['Authorization','Host','Cookie','Content-Type']){const response=await post('test',{name,value:'invalid'});assert.equal(response.status,400);}
  assert.equal(received.length,count);
  await post('test',null);assert.equal(received.at(-1).headers['x-jira-access'],undefined);
  redirect=true;const response=await post('test');assert.equal(response.status,502);assert.equal(leaked,0);
});
