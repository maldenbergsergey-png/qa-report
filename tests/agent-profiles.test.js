"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { migrateConfig, saveJira, removeJira, publicJiras } = require("../agent/jira-profiles");
const core = require("../agent/qa-report-agent");
const first = { baseUrl: "https://jira.example.test/first", token: "one-local-secret", authMethod: "pat" };
const second = { baseUrl: "https://jira.example.test/second", token: "two-local-secret", authMethod: "cookie" };
test("single-Jira configuration migrates without losing pairing or credentials", () => {
  const original = { secret: "pair", serverUrl: "https://reports.example.test", theme: "dark", jira: first };
  const migrated = migrateConfig(original);
  assert.equal(migrated.jiras.length, 1); assert.equal(migrated.jiras[0].token, first.token); assert.equal(migrated.secret, "pair");
  assert.equal(migrated.jira, undefined); assert.equal(original.jira, first); assert.equal(migrateConfig(migrated), migrated);
  const next = saveJira(migrated, second, "", "Вторая Jira");
  assert.equal(next.jiras.length, 2);
  const changed = saveJira(next, { ...first, token: "renewed" }, next.jiras[0].id, "Первая Jira");
  assert.equal(changed.jiras[0].token, "renewed"); assert.equal(changed.jiras[1].token, second.token);
  assert.throws(() => saveJira(next, second), /уже добавлена/);
  assert.throws(() => saveJira(next, first, "unknown"), /удалено/);
  assert.equal(removeJira(next, next.jiras[0].id).jiras[0].baseUrl, second.baseUrl);
  assert(!JSON.stringify(publicJiras(next)).includes("secret"));
});
test("Jira credentials are selected by origin AND context path, overriding stale browser hints", async t => {
  const config = { jiras: [first, second] };
  const calls = [];
  core.setJiraTransport(async (url, options) => { calls.push({ url, headers: options.headers }); return new Response(JSON.stringify({ body: "text", fields: { attachment: [] } }), { headers: { "content-type": "application/json" } }); });
  t.after(() => core.setJiraTransport(fetch));
  for (const jira of [first, second]) {
    await core.executeJiraImportComment(config, { baseUrl: "https://old.example.test", commentUrl: `${jira.baseUrl}/browse/QA-1?focusedCommentId=1` });
  }
  assert.equal(calls[0].headers.Authorization, "Bearer one-local-secret"); assert.equal(calls[0].headers.Cookie, undefined);
  assert.equal(calls[2].headers.Cookie, "two-local-secret"); assert.equal(calls[2].headers.Authorization, undefined);
  for (const target of ["https://other.example.test/first", "https://jira.example.test/first-extra", "https://jira.example.test", "https://user:pass@jira.example.test/first", "https://jira.example.test/third"]) {
    assert.throws(() => core.configuredJira(config, { issueUrl: `${target}/browse/QA-1` }));
  }
  assert.equal(calls.length, 4);
});
