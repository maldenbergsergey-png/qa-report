"use strict";
const { app, session } = require("electron");
const http = require("node:http");
const assert = require("node:assert/strict");
const { createJiraTransport } = require("../desktop/network");
const core = require("../qa-report-agent");
const { version } = require("../package.json");

// Exercise the real poll -> attachment/comment job -> Chromium -> result path.
// The fixture models Jira's documented additional check for browser User-Agents.
// It deliberately does not stand in for the customer's Jira configuration.
const requests = [];
const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 42]);
let nextJob, jobResult, controller, commentBody;
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const record = { path: req.url, method: req.method, headers: req.headers, body };
  requests.push(record);
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/agent/poll") {
    const job = nextJob; nextJob = null;
    res.end(JSON.stringify({ job, pollAfterMs: 10 })); return;
  }
  if (/^\/api\/agent\/jobs\/[^/]+\/result$/.test(req.url)) {
    jobResult = JSON.parse(body); res.end("{}"); controller.abort(); return;
  }
  if (req.method === "POST" && req.url.startsWith("/rest/")) {
    if (/Mozilla|Chrome|Safari|Electron/i.test(req.headers["user-agent"] || "")) {
      res.writeHead(404, { "Content-Type": "text/plain" }); res.end("XSRF check failed"); return;
    }
    if (req.url.endsWith("/attachments")) {
      if (req.headers["x-atlassian-token"] !== "no-check") {
        res.writeHead(403); res.end(JSON.stringify({ message: "XSRF check failed" })); return;
      }
      res.end(JSON.stringify([{ id: "8", filename: "Screenshot 2.png", content: "/secure/attachment/8/image.png" }])); return;
    }
    if (req.url.endsWith("/comment")) {
      commentBody = JSON.parse(body).body;
      res.end(JSON.stringify({ id: "9", body: commentBody })); return;
    }
  }
  if (req.url.endsWith("?fields=attachment")) {
    res.end(JSON.stringify({ fields: { attachment: [] } })); return;
  }
  if (req.url.endsWith("/comment/9")) {
    res.end(JSON.stringify({ id: "9", body: commentBody })); return;
  }
  res.end(JSON.stringify({ displayName: "Local fixture" }));
});

app.whenReady().then(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const network = session.fromPartition("qa-xsrf-verification", { cache: false });
  await network.cookies.set({ url: baseUrl, name: "ambient", value: "must-not-leak" });
  const transport = createJiraTransport(network);
  core.setJiraTransport(transport);
  const identity = { serverUrl: baseUrl, deviceId: "fixture-device", secret: "fixture-secret", desktop: true, name: "XSRF fixture" };
  async function runJob(jira, type, payload) {
    jobResult = null;
    controller = new AbortController();
    nextJob = { id: "fixture-job", type, payload };
    const timeout = setTimeout(() => controller.abort(), 10000);
    try { await core.run({ ...identity, jira }, { signal: controller.signal, version }); }
    finally { clearTimeout(timeout); }
    assert.ok(jobResult?.ok, jobResult?.error || "Agent did not return a successful result");
    return jobResult.result;
  }
  for (const auth of [
    { authMethod: "pat", token: "fixture-pat" },
    { authMethod: "basic", user: "fixture", token: "fixture-password" },
    { authMethod: "cookie", token: "JSESSIONID=fixture-session" },
  ]) {
    const jira = { ...auth, baseUrl, type: "data-center" };
    const uploaded = await runJob(jira, "jira.attachments", {
      issueUrl: `${baseUrl}/browse/QA-1`,
      files: [{ attachmentId: "local-image", name: "Screenshot 2.png", type: "image/png", dataBase64: bytes.toString("base64") }],
    });
    assert.equal(uploaded.attachments[0].attachmentId, "local-image");
    assert.equal(uploaded.attachments[0].id, "8");
    const sent = requests.findLast(r => r.path.endsWith("/attachments"));
    assert.equal(sent.headers["user-agent"], `QA-Report-Agent/${version}`);
    assert.equal(sent.headers["x-atlassian-token"], "no-check");
    assert.match(sent.headers["content-type"], /^multipart\/form-data; boundary=/);
    assert.ok(sent.body.includes(bytes), "Original binary attachment bytes must arrive unchanged");
    assert.ok(sent.body.includes(Buffer.from('filename="Screenshot 2.png"')));
    if (auth.authMethod === "cookie") {
      assert.equal(sent.headers.cookie, auth.token); assert.equal(sent.headers.authorization, undefined);
    } else {
      assert.equal(sent.headers.cookie, undefined);
      assert.equal(sent.headers.authorization, auth.authMethod === "pat" ? `Bearer ${auth.token}` : `Basic ${Buffer.from(`${auth.user}:${auth.token}`).toString("base64")}`);
    }
    const published = await runJob(jira, "jira.comment", {
      issueUrl: `${baseUrl}/browse/QA-1`, comment: { format: "wiki", body: "!Screenshot 2.png|thumbnail!" },
    });
    assert.equal(published.verified, true); assert.equal(published.commentId, "9");
    console.log(`PASS: ${auth.authMethod}, attachment and verified comment through the real agent job loop`);
  }
  // Header normalization must preserve explicit credentials and multipart handling.
  await transport(`${baseUrl}/headers`, { headers: new Headers({ Authorization: "Bearer header-fixture", "User-Agent": "Mozilla/5.0" }) });
  assert.equal(requests.at(-1).headers["user-agent"], `QA-Report-Agent/${version}`);
  assert.equal(requests.at(-1).headers.authorization, "Bearer header-fixture");
  assert.equal(requests.at(-1).headers.cookie, undefined);
  console.log("PASS: Chromium requests identify the API client; ambient cookies remain excluded");
}).then(() => { server.close(); app.exit(0); }).catch(error => { console.error(error); server.close(); app.exit(1); });
