"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const http = require("node:http");
const asar = require("../agent/node_modules/@electron/asar");
const { _electron } = require(process.env.QA_REPORT_PLAYWRIGHT || "playwright");
const root = path.resolve(__dirname, "../agent");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-agent-desktop-"));
const key = crypto.generateKeyPairSync("ed25519");
const fixture = path.join(directory, "app");
const config = path.join(directory, "config");
const userData = path.join(config, "desktop-profile");
const updatesDir = path.join(userData, "updates");
const screenshots = path.resolve(process.env.QA_REPORT_SCREENSHOTS || "../artifacts/agent-0.4.0");
const requests = [];
let application, pendingJob = null, reported = false, theme = "dark";
const server = http.createServer(async (req, res) => {
  let body = ""; for await (const chunk of req) body += chunk;
  requests.push({ url: req.url, body: JSON.parse(body || "{}") });
  res.setHeader("content-type", "application/json");
  if (req.url.endsWith("/poll")) { const job = pendingJob; pendingJob = null; res.end(JSON.stringify({ job, pollAfterMs: 30, preferences: { theme } })); }
  else { reported = true; res.end('{}'); }
});
async function archive(version) {
  const stage = path.join(directory, `code-${version}`); fs.mkdirSync(stage, { recursive: true });
  for (const name of ["qa-report-agent.js", "jira-profiles.js", "desktop"]) fs.cpSync(path.join(root, name), path.join(stage, name), { recursive: true });
  fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ name: "qa-agent-fixture", version, main: "desktop/main.js" }));
  const name = `qr-report-agent-code-${version}.asar`, file = path.join(updatesDir, name);
  await asar.createPackage(stage, file);
  const bytes = fs.readFileSync(file);
  const payload = Buffer.from(JSON.stringify({ version, runtime: "0.4.0", minimumVersion: "0.4.0", file: name, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), notes: ["Обновление проверки"] }));
  return { schema: 1, payload: payload.toString("base64"), signature: crypto.sign(null, payload, key.privateKey).toString("base64") };
}
(async () => {
  fs.mkdirSync(config, { recursive: true }); fs.mkdirSync(updatesDir, { recursive: true }); fs.mkdirSync(screenshots, { recursive: true });
  fs.mkdirSync(fixture, { recursive: true });
  for (const name of ["bootstrap", "desktop", "qa-report-agent.js", "jira-profiles.js"]) fs.cpSync(path.join(root, name), path.join(fixture, name), { recursive: true });
  fs.writeFileSync(path.join(fixture, "bootstrap/release-key.pem"), key.publicKey.export({ type: "spki", format: "pem" }));
  fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ name: "qa-agent-fixture", version: "0.4.0", main: "entry.cjs" }));
  const initial = await archive("0.4.1"), next = await archive("0.4.2");
  fs.writeFileSync(path.join(updatesDir, "state.json"), JSON.stringify({ active: initial }));
  fs.writeFileSync(path.join(directory, "next.json"), JSON.stringify(next));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const serverUrl = `http://127.0.0.1:${server.address().port}`;
  fs.writeFileSync(path.join(config, "agent.json"), JSON.stringify({ deviceId: "fixture", secret: "pair-fixture", serverUrl, name: "Test agent", theme: "dark", automaticUpdates: false, jira: { baseUrl: "https://jira-one.example.test", type: "data-center", authMethod: "pat", token: "first-local-token" } }));
  fs.writeFileSync(path.join(fixture, "entry.cjs"), `
    const { app, session } = require('electron');
    const fs = require('node:fs'), path = require('node:path');
    app.setPath('userData', ${JSON.stringify(userData)});
    Object.defineProperty(app, 'isPackaged', { get: () => true });
    app.setAsDefaultProtocolClient = () => true;
    app.relaunch = () => { global.relaunchRequested = true; };
    global.jiraRequests = []; global.blockJira = false;
    app.whenReady().then(() => {
      session.fromPartition('qa-report-jira').fetch = async (url, options) => {
        global.jiraRequests.push({ url, headers: Object.fromEntries(options.headers.entries()) });
        if (global.blockJira) await new Promise(resolve => { global.releaseJira = resolve; });
        return new Response(JSON.stringify(url.includes('fields=attachment') ? { fields: { attachment: [] } } : { displayName: 'QA Fixture', body: 'Report' }), { headers: { 'content-type': 'application/json' } });
      };
      session.fromPartition('qa-report-updates').fetch = async (url, options) => {
        if (options.redirect !== 'error' || options.credentials !== 'omit') throw new Error('Unsafe update request');
        return new Response(require('original-fs').readFileSync(url.endsWith('latest.json') ? ${JSON.stringify(path.join(directory, "next.json"))} : path.join(${JSON.stringify(updatesDir)}, path.basename(new URL(url).pathname))));
      };
    });
    require('./bootstrap/main');
  `);
  application = await _electron.launch({ executablePath: require("../agent/node_modules/electron"), args: [fixture], env: { ...process.env, ELECTRON_RUN_AS_NODE: "", QA_REPORT_AGENT_CONFIG_DIR: config } });
  application.process().stdout.on("data", chunk => process.stdout.write(chunk));
  application.process().stderr.on("data", chunk => process.stderr.write(chunk));
  const page = await application.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.waitForFunction(() => document.querySelector('#version').textContent === 'v0.4.1');
  assert.equal(await application.evaluate(() => global.qaReportRuntime.updates.saved.booting), false);
  assert.equal(await page.locator('.connection').count(), 1);
  const state = await page.evaluate(() => window.agent.state());
  assert(!JSON.stringify(state).includes('first-local-token'));
  await page.getByRole('button', { name: '＋ Добавить Jira', exact: true }).click();
  await page.locator('#label').fill('Вторая Jira'); await page.locator('#baseUrl').fill('https://jira-two.example.test/jira'); await page.locator('#token').fill('second-local-token');
  await page.locator('#save').click(); await page.waitForFunction(() => document.querySelectorAll('.connection').length === 2 && document.querySelector('#settings').hidden);
  await page.getByRole('button', { name: 'Проверить: Вторая Jira', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#result').textContent.includes('Jira доступна'));
  const jiraRequests = await application.evaluate(() => global.jiraRequests);
  assert.equal(jiraRequests.at(-1).headers.authorization, 'Bearer second-local-token');
  assert.equal(jiraRequests.at(-1).headers['user-agent'], 'QA-Report-Agent/0.4.1');
  assert(jiraRequests.at(-1).url.startsWith('https://jira-two.example.test/jira/'));
  await page.locator('#checkUpdate').click(); await page.waitForFunction(() => document.querySelector('#updateAction').textContent === 'Загрузить обновление');
  await page.screenshot({ path: path.join(screenshots, 'agent-dark-update.png'), fullPage: true });
  await page.locator('#updateAction').click(); await page.waitForFunction(() => document.querySelector('#updateAction').textContent === 'Установить и перезапустить');
  theme = 'light';
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.screenshot({ path: path.join(screenshots, 'agent-light-ready.png'), fullPage: true });
  // Block an actual Jira import job, click install, then release it. Relaunch must
  // happen only after its result reaches the report server.
  await application.evaluate(() => { global.blockJira = true; });
  pendingJob = { id: 'fixture-job', type: 'jira.import-comment', payload: { commentUrl: 'https://jira-one.example.test/browse/QA-1?focusedCommentId=1' } };
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await application.evaluate(() => Boolean(global.releaseJira))) break;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(await application.evaluate(() => Boolean(global.releaseJira)), true, "Jira job must be active before install");
  const installation = page.locator('#updateAction').click(); await installation;
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(await application.evaluate(() => Boolean(global.relaunchRequested)), false);
  assert.equal(reported, false);
  await application.evaluate(() => { global.blockJira = false; global.releaseJira(); });
  await new Promise((resolve, reject) => { if (application.process().exitCode !== null) return resolve(); const timer = setTimeout(() => reject(new Error('Agent did not exit for update')), 10_000); application.process().once('exit', () => { clearTimeout(timer); resolve(); }); });
  assert.equal(reported, true);
  assert.equal(JSON.parse(Buffer.from(JSON.parse(fs.readFileSync(path.join(updatesDir, 'state.json'))).active.payload, 'base64')).version, '0.4.2');
  const saved = JSON.parse(fs.readFileSync(path.join(config, 'agent.json')));
  assert.equal(saved.jiras.length, 2); assert.equal(saved.jiras[0].token, 'first-local-token'); assert.equal(saved.jiras[1].token, 'second-local-token');
  assert(!JSON.stringify(requests).includes('local-token'));
  assert.deepEqual(errors, []);
  console.log('PASS: real Electron bootstrap loads a signed ASAR, retains migration and both Jira credentials, renders two themes and installs only after an active job is reported.');
})().catch(async error => { console.error(error); if (application) console.error(await application.evaluate(() => global.qaReportRuntime?.updates.state).catch(() => 'App closed')); process.exitCode = 1; }).finally(async () => { if (application) await application.close().catch(() => {}); server.close(); fs.rmSync(directory, { recursive: true, force: true }); });
