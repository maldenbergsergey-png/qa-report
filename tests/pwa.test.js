const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
function worker(windows = []) {
  let activated = false;
  const handlers = {};
  const stored = new Map();
  const deleted = [];
  const cache = {
    async addAll(requests) { for (const r of requests) stored.set(r.url, { cached: r.url }); },
    async match(key) { return stored.get(key); },
  };
  class LocalRequest { constructor(url) { this.url = url; } }
  vm.runInNewContext(source, {
    self: { registration: { scope: 'https://qa.test/' }, async skipWaiting() { activated = true; }, location: { origin: 'https://qa.test' }, clients: { async claim() {}, async matchAll() { return windows; } }, addEventListener: (name, fn) => handlers[name] = fn },
    caches: { async open() { return cache; }, async keys() { return ['qa-report-shell-v0', 'another-app']; }, async delete(name) { deleted.push(name); } },
    Request: LocalRequest, URL, fetch: async () => { throw new Error('Server unavailable'); },
  });
  return { handlers, stored, deleted, isActivated: () => activated };
}
test('complete offline shell includes every local script/style and install icon', async () => {
  const { handlers, stored } = worker();
  await new Promise((resolve, reject) => handlers.install({ waitUntil: p => p.then(resolve, reject) }));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g)) assert.ok(stored.has(match[1]), match[1]);
  for (const url of stored.keys()) assert.ok(fs.existsSync(path.join(root, url === '/' ? 'index.html' : url.split('?')[0])), url);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(i => i.sizes === `${size}x${size}`);
    assert.ok(stored.has(icon.src));
    const png = fs.readFileSync(path.join(root, new URL(icon.src, 'https://qa.test').pathname));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
test('Docker image includes every script referenced by the editor', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  for (const match of html.matchAll(/<script[^>]+src="\/([^"?]+\.js)(?:\?[^"#]*)?"/g)) {
    assert.match(dockerfile, new RegExp(`(?:^|\\s)${match[1].replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:\\s|$)`, 'm'), match[1]);
  }
});
test('offline deep links use editor shell; APIs, mutations and external resources bypass cache', async () => {
  const { handlers, stored } = worker();
  stored.set('/', { editor: true });
  let response;
  handlers.fetch({ request: { url: 'https://qa.test/report/abcd1234?test=1', method: 'GET', mode: 'navigate' }, respondWith: p => response = p });
  assert.deepEqual(await response, { editor: true });
  for (const [url, method] of [['https://qa.test/api/reports', 'GET'], ['https://qa.test/', 'POST'], ['https://other.test/app.js?v=83', 'GET'], ['https://qa.test/downloads/agent.zip', 'GET']]) {
    handlers.fetch({ request: { url, method, mode: 'navigate' }, respondWith() { assert.fail(`Intercepted ${url}`); } });
  }
});
test('activation deletes only outdated QA Report shell caches', async () => {
  const { handlers, deleted } = worker();
  await new Promise((resolve, reject) => handlers.activate({ waitUntil: p => p.then(resolve, reject) }));
  assert.deepEqual(deleted, ['qa-report-shell-v0']);
});

for (const additionalWindow of [false, true]) {
  test(`explicit activation ${additionalWindow ? 'refuses other windows' : 'accepts the sole requesting window'}`, async () => {
    const windows = [{ id: 'requester', url: 'https://qa.test/report/abcd1234' }];
    if (additionalWindow) windows.push({ id: 'other', url: 'https://qa.test/' });
    const w = worker(windows);
    let reply;
    await new Promise((resolve, reject) => w.handlers.message({
      data: { type: 'APPLY_UPDATE' }, source: { id: 'requester' },
      ports: [{ postMessage: value => reply = value }], waitUntil: p => p.then(resolve, reject),
    }));
    assert.equal(reply.ok, !additionalWindow);
    assert.equal(w.isActivated(), !additionalWindow);
  });
}
