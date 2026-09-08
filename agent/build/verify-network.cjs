'use strict';
const { app, session } = require('electron');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createJiraTransport } = require('../desktop/network');
const core = require('../qa-report-agent');
const servers = [];
app.whenReady().then(async () => {
  const requests = [];
  const attachmentBytes = Buffer.from([0, 255, 137, 80, 78, 71, 13, 10, 42]);
  const handler = async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, headers: req.headers, body });
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/must-not-follow' }); res.end(); return; }
    if (req.url === '/secure/attachment/7/screenshot.png') {
      res.setHeader('Content-Type', 'image/png'); res.end(attachmentBytes); return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/rest/api/2/issue/QA-1/comment/3') {
      res.end(JSON.stringify({ body: '|Check|!screenshot.png!|' })); return;
    }
    if (req.url === '/rest/api/2/issue/QA-1?fields=attachment') {
      res.end(JSON.stringify({ fields: { attachment: [{ id: '7', filename: 'screenshot.png',
        content: '/secure/attachment/7/screenshot.png', mimeType: 'image/png', size: attachmentBytes.length }] } })); return;
    }
    res.end(JSON.stringify({ displayName: 'Test' }));
  };
  const plain = http.createServer(handler); servers.push(plain);
  await new Promise(resolve => plain.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${plain.address().port}`;
  const network = session.fromPartition('jira-network-verification', { cache: false });
  const request = createJiraTransport(network);
  core.setJiraTransport(request);
  await network.cookies.set({ url: baseUrl, name: 'ambient', value: 'must-not-leak' });
  await core.verifyJira({ baseUrl, authMethod: 'pat', token: 'test-pat' });
  assert.equal(requests.at(-1).headers.authorization, 'Bearer test-pat');
  assert.equal(requests.at(-1).headers.cookie, undefined);
  await core.verifyJira({ baseUrl, authMethod: 'cookie', token: 'JSESSIONID=test-session' });
  assert.equal(requests.at(-1).headers.cookie, 'JSESSIONID=test-session');
  await core.verifyJira({ baseUrl, authMethod: 'basic', user: 'test', token: 'password' });
  assert.equal(requests.at(-1).headers.authorization, 'Basic ' + Buffer.from('test:password').toString('base64'));
  const form = new FormData(); form.append('file', new Blob(['attachment-data']), 'report.txt');
  await request(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.match(requests.at(-1).headers['content-type'], /multipart\/form-data; boundary=/);
  assert.match(requests.at(-1).body, /attachment-data/);
  const config = { jira: { baseUrl, type: 'server', authMethod: 'pat', token: 'test-pat' } };
  const payload = { commentUrl: `${baseUrl}/browse/QA-1?focusedCommentId=3` };
  const imported = await core.executeJiraImportComment(config, payload);
  assert.equal(imported.attachmentDownload, true);
  assert.equal(imported.attachments[0].filename, 'screenshot.png');
  const downloaded = await core.executeJiraImportAttachment(config, { ...payload, attachmentId: '7' });
  assert.deepEqual(Buffer.from(downloaded.file.dataBase64, 'base64'), attachmentBytes);
  assert.equal(requests.at(-1).headers.authorization, 'Bearer test-pat');
  assert.equal(requests.at(-1).headers.cookie, undefined);
  await assert.rejects(request(`${baseUrl}/redirect`), /перенаправляет/);
  assert(!requests.some(r => r.path === '/must-not-follow'));
  const fixture = path.resolve(__dirname, '../../tests/fixtures/agent-tls');
  const secure = https.createServer({ key: fs.readFileSync(path.join(fixture, 'key.pem')), cert: fs.readFileSync(path.join(fixture, 'cert.pem')) }, handler);
  servers.push(secure); await new Promise(resolve => secure.listen(0, '127.0.0.1', resolve));
  const count = requests.length;
  await assert.rejects(request(`https://127.0.0.1:${secure.address().port}/private`, { headers: { Authorization: 'Bearer must-not-send' } }), /сертификат Jira/);
  assert.equal(requests.length, count, 'Untrusted TLS must not receive credentials');
  console.log('PASS: native Chromium Jira transport, PAT/basic/cookie, multipart, binary attachment import, manual redirects, untrusted TLS rejected');
}).then(() => { servers.forEach(s => s.close()); app.exit(0); }).catch(error => { console.error(error); app.exit(1); });
