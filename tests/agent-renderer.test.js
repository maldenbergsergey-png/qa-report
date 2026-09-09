const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
test('autostart sends the new value before rendering restores the previous snapshot', async () => {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, classList: { toggle() {} }, listeners: {}, replaceChildren() {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
    return nodes.get(id);
  };
  let state = { autoStart: false, loginSupported: true, version: 'test' };
  const calls = [];
  const context = { document: { getElementById: node, documentElement: { dataset: {} } }, URL,
    window: { agent: { onStatus() {}, ready() {}, state: async () => ({ ok: true, value: state }), autoStart: async enabled => {
      calls.push(enabled); state = { ...state, autoStart: enabled }; return { ok: true, value: state };
    } } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../agent/desktop/renderer.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  for (const enabled of [true, false, true, false]) {
    node('autoStart').checked = enabled;
    node('autoStart').listeners.change({ currentTarget: node('autoStart') });
    assert.equal(node('autoStart').disabled, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(node('autoStart').checked, enabled);
    assert.equal(node('autoStart').disabled, false);
  }
  assert.deepEqual(calls, [true, false, true, false]);
});
