const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { parseLink, jiraFromForm } = require("../agent/desktop/connection");
const { pairWithCode, run } = require("../agent/qa-report-agent");

test("desktop links accept encoded HTTPS and local development without shell interpretation", () => {
  const link = new URL("qareport-agent://connect");
  link.searchParams.set("server", "https://reports.example.test"); link.searchParams.set("code", "00123456");
  assert.deepEqual(parseLink(link.href), { serverUrl: "https://reports.example.test", code: "00123456" });
  assert.equal(parseLink("qareport-agent://connect?server=http%3A%2F%2F127.0.0.1%3A4173&code=12345678").serverUrl, "http://127.0.0.1:4173");
  for (const raw of ["https://connect?server=https://example.test&code=12345678", "qareport-agent://exec?server=https://example.test&code=12345678", "qareport-agent://connect?server=http://example.test&code=12345678", "qareport-agent://connect?server=https://user:secret@example.test&code=12345678", "qareport-agent://connect?server=https://example.test&code=12345678%3Bwhoami"]) assert.throws(() => parseLink(raw));
});
test("desktop wizard validates PAT, cloud email and cURL without executing it", () => {
  assert.equal(jiraFromForm({ mode: "pat", baseUrl: "https://jira.example.test/browse/QA-1", token: "abc" }).baseUrl, "https://jira.example.test");
  assert.throws(() => jiraFromForm({ mode: "pat", baseUrl: "https://company.atlassian.net", token: "abc" }), /email/);
  assert.equal(jiraFromForm({ mode: "pat", baseUrl: "https://company.atlassian.net", user: "qa@example.test", token: "abc" }).authMethod, "api-token");
  assert.equal(jiraFromForm({ mode: "curl", curl: "curl 'https://jira.example.test/rest/api/2/myself' -H 'Cookie: session=abc'" }).authMethod, "cookie");
  assert.throws(() => jiraFromForm({ mode: "pat", baseUrl: "http://jira.example.test", token: "abc" }), /HTTPS/);
  assert.throws(() => jiraFromForm({ mode: "pat", baseUrl: "https://jira.example.test", token: "" }), /токен/);
});
test("GUI pairs with the existing API, reports only Jira URL and cancels polling", async (context) => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    requests.push({ url: req.url, body: JSON.parse(raw), auth: req.headers.authorization });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(req.url.endsWith("/pair") ? { deviceId: "device", secret: "secret" } : { job: null, pollAfterMs: 60000 }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const config = await pairWithCode(`http://127.0.0.1:${server.address().port}`, "12345678", "GUI test");
  config.desktop = true; config.jira = { baseUrl: "https://jira.example.test", token: "private" };
  const controller = new AbortController();
  await run(config, { signal: controller.signal, onStatus: () => controller.abort() });
  assert.equal(requests[0].body.code, "12345678");
  assert.equal(requests[1].body.jiraBaseUrl, config.jira.baseUrl);
  assert.equal(requests[1].auth, "Bearer device.secret");
  assert.ok(!JSON.stringify(requests).includes("private"));
});

test("report target wins over stale browser settings without permitting a different Jira", () => {
  const { configuredJira } = require("../agent/qa-report-agent");
  const config = { jira: { baseUrl: "https://jira.example.test", token: "local-only" } };
  assert.equal(configuredJira(config, { baseUrl: "https://old.atlassian.net", issueUrl: "https://jira.example.test/browse/QA-42" }), config.jira);
  assert.equal(configuredJira(config, { baseUrl: "https://old.atlassian.net", commentUrl: "https://jira.example.test/browse/QA-42?focusedCommentId=1" }), config.jira);
  assert.throws(() => configuredJira(config, { baseUrl: config.jira.baseUrl, issueUrl: "https://other.example.test/browse/QA-42" }), /другую Jira/);
  assert.throws(() => configuredJira(config, { baseUrl: "https://other.example.test" }), /другую Jira/);
});
test("pairing link carries the selected theme and rejects unknown themes", () => {
  const link = "qareport-agent://connect?server=https://reports.example.test&code=12345678";
  assert.equal(parseLink(link + "&theme=dark").theme, "dark");
  assert.equal(parseLink(link + "&theme=graphite").theme, "graphite");
  assert.equal(parseLink(link + "&theme=invalid").theme, undefined);
});
