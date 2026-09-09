// Real browser regression: isolated local app; every Jira request is a fixture.
// QA_REPORT_PLAYWRIGHT may point at an existing Playwright installation.
const { chromium } = require(process.env.QA_REPORT_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-web-'));
const output = process.env.QA_REPORT_SCREENSHOTS;
let child, browser;
async function main() {
  const listener = http.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const secret = crypto.randomBytes(32).toString('hex');
  child = spawn(process.execPath, ['server.js'], { cwd: root, env: {
    ...process.env, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'development',
    AUTH_SECRET: secret, AUTH_SECRET_FILE: '', DEV_LOGIN_EMAIL: 'qa@example.com',
    DEV_LOGIN_PASSWORD: crypto.randomBytes(24).toString('hex'),
    REPORTS_DB_PATH: path.join(temp, 'reports.sqlite'), QA_REPORT_PUBLIC_URL: origin,
    QA_STORAGE_ACCESS_KEY: '', QA_STORAGE_SECRET_KEY: '',
    QA_STORAGE_ACCESS_KEY_FILE: '', QA_STORAGE_SECRET_KEY_FILE: '',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = '';
    child.stdout.on('data', chunk => { log += chunk; if (log.includes('QA Report:')) resolve(); });
    child.stderr.on('data', chunk => fs.appendFileSync(path.join(temp, 'server.log'), chunk));
    child.once('exit', code => reject(Error(`Server exited: ${code}`)));
    setTimeout(() => reject(Error('Server startup timeout')), 10000).unref();
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (fs.existsSync(path.join(root, 'auth.js'))) {
    const { createSessionToken } = require(path.join(root, 'auth'));
    await context.addCookies([{ name: 'query-port-session', value: createSessionToken('qa@example.com', { env: { AUTH_SECRET: secret } }), url: origin, httpOnly: true, sameSite: 'Lax' }]);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Never contact a real Jira or external attachment service.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === origin ? route.continue() : route.abort();
  });
  const urls = ['https://jira-one.example.test', 'https://jira-two.example.test/jira'];
  await page.route('**/api/agent/status', route => route.fulfill({ json: { devices: [{ online:true, name:'QA Agent', version:'0.4.0', jiraBaseUrl:urls[0], jiraBaseUrls:urls }] } }));
  await page.route('**/api/agent/downloads', route => route.fulfill({ json: { downloads: [
    { platform:'mac-arm64', label:'macOS · Apple Silicon', version:'0.4.0', url:'https://github.com/maldenbergsergey-png/qa-report/releases/download/agent-v0.4.0/qa-report-agent-0.4.0-mac-arm64.dmg', available:true },
    { platform:'windows', label:'Windows · x64', version:'0.4.0', url:'https://github.com/maldenbergsergey-png/qa-report/releases/download/agent-v0.4.0/qa-report-agent-0.4.0-windows-x64.exe', available:true }
  ] } }));
  await page.goto(origin); await page.waitForSelector('#jiraMenuButton');
  await page.evaluate(() => openAgentSetup());
  await page.waitForFunction(() => document.querySelector('#agentJiraSuggestions').options.length === 2);
  assert.equal(await page.locator('#desktopAgentDownloads option').count(),2);
  assert.equal(await page.locator('[data-agent-platform="linux"]').count(),0);
  await page.locator('#agentJiraUrl').fill(urls[1]);
  await page.locator('#agentJiraUrl').dispatchEvent('change');
  await page.locator('#agentJiraUrl').blur();
  await page.evaluate(() => refreshAgentStatus());
  assert.equal(await page.locator('#agentJiraUrl').inputValue(),urls[1]);
  assert.equal(await page.evaluate(() => jiraSettings.baseUrl),urls[1]);
  await page.reload(); await page.waitForSelector('#jiraMenuButton');
  await page.evaluate(() => openAgentSetup());
  await page.waitForFunction(() => document.querySelector('#agentJiraSuggestions').options.length === 2);
  assert.equal(await page.locator('#agentJiraUrl').inputValue(),urls[1]);
  const download = await page.locator('#desktopAgentDownloads a').getAttribute('href');
  assert.equal(download, 'https://github.com/maldenbergsergey-png/qa-report/releases/download/agent-v0.4.0/qa-report-agent-0.4.0-mac-arm64.dmg');
  await page.locator('#desktopAgentDownloads select').selectOption('https://github.com/maldenbergsergey-png/qa-report/releases/download/agent-v0.4.0/qa-report-agent-0.4.0-windows-x64.exe');
  assert.equal(await page.locator('#desktopAgentDownloads a').getAttribute('href'), 'https://github.com/maldenbergsergey-png/qa-report/releases/download/agent-v0.4.0/qa-report-agent-0.4.0-windows-x64.exe');
  assert.equal(await page.locator('#desktopAgentDownloads a').getAttribute('target'), '_blank');
  assert.equal(await page.locator('#desktopAgentDownloads a').getAttribute('rel'), 'noopener noreferrer');
  assert.match(await page.locator('#desktopAgentDownloads select').textContent(), /0\.4\.0/);
  if (output) { fs.mkdirSync(output,{recursive:true}); await page.screenshot({path:path.join(output,'agent-web.png'),fullPage:true}); }
  assert.deepEqual(errors,[]);
  console.log('PASS: two supported download targets, two Jira suggestions, selection survives polling and reload.');
}
main().catch(error => { console.error(error); process.exitCode=1; }).finally(async () => { if(browser) await browser.close(); child?.kill(); fs.rmSync(temp,{recursive:true,force:true}); });
