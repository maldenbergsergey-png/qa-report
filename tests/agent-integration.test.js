const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ORIGIN = "http://127.0.0.1:4186";
const OWNER_HEADERS = {
  "Content-Type": "application/json",
  "X-QA-Report-Client-Id": "agent-integration-browser",
};

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${ORIGIN}/api/health`);
      if (response.ok) return;
    } catch { /* Сервер ещё запускается. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Тестовый QA Report не запустился");
}

test("local agent pairing, restricted job and result flow", async (context) => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-report-agent-test-"));
  const app = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: "4186", REPORTS_DB_PATH: path.join(testDir, "reports.sqlite") },
    stdio: "ignore",
  });
  context.after(() => app.kill());
  await waitForServer();

  const pairingResponse = await fetch(`${ORIGIN}/api/agent/pairings`, {
    method: "POST",
    headers: OWNER_HEADERS,
    body: "{}",
  });
  assert.equal(pairingResponse.status, 201);
  const pairing = await pairingResponse.json();
  assert.match(pairing.code, /^\d{8}$/);
  assert.equal(pairing.serverUrl, ORIGIN);

  const pairResponse = await fetch(`${ORIGIN}/api/agent/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: pairing.code, name: "Test device", platform: "linux", version: "0.2.0" }),
  });
  assert.equal(pairResponse.status, 201);
  const credentials = await pairResponse.json();
  const authorization = `Bearer ${credentials.deviceId}.${credentials.secret}`;

  const reusedPairing = await fetch(`${ORIGIN}/api/agent/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: pairing.code }),
  });
  assert.equal(reusedPairing.status, 404);

  await fetch(`${ORIGIN}/api/agent/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ version: "0.2.1" }),
  });
  const status = await fetch(`${ORIGIN}/api/agent/status`, { headers: OWNER_HEADERS }).then((response) => response.json());
  assert.equal(status.connected, true);
  assert.equal(status.devices[0].name, "Test device");
  assert.equal(status.devices[0].version, "0.2.1");

  const forbiddenJob = await fetch(`${ORIGIN}/api/agent/jobs`, {
    method: "POST",
    headers: OWNER_HEADERS,
    body: JSON.stringify({ type: "http.proxy", baseUrl: "http://internal" }),
  });
  assert.equal(forbiddenJob.status, 422);

  const jobResponse = await fetch(`${ORIGIN}/api/agent/jobs`, {
    method: "POST",
    headers: OWNER_HEADERS,
    body: JSON.stringify({ type: "jira.network-test", baseUrl: "http://jira.internal" }),
  });
  assert.equal(jobResponse.status, 202);
  const created = await jobResponse.json();

  const poll = await fetch(`${ORIGIN}/api/agent/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: "{}",
  }).then((response) => response.json());
  assert.equal(poll.job.id, created.jobId);
  assert.equal(poll.job.type, "jira.network-test");
  assert.deepEqual(poll.job.payload, { baseUrl: "http://jira.internal" });

  const resultResponse = await fetch(`${ORIGIN}/api/agent/jobs/${created.jobId}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ ok: true, result: { status: 401, reachable: true } }),
  });
  assert.equal(resultResponse.status, 200);

  const result = await fetch(`${ORIGIN}/api/agent/jobs/${created.jobId}`, { headers: OWNER_HEADERS })
    .then((response) => response.json());
  assert.equal(result.job.status, "completed");
  assert.equal(result.job.result.status, 401);

  const jiraProxyPromise = fetch(`${ORIGIN}/api/agent/jira/comment`, {
    method: "POST",
    headers: OWNER_HEADERS,
    body: JSON.stringify({
      transport: "agent",
      type: "data-center",
      baseUrl: "http://jira.internal",
      token: "must-not-reach-agent",
      issueUrl: "http://jira.internal/browse/QA-42",
      comment: { format: "wiki", body: "Agent comment" },
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const jiraPoll = await fetch(`${ORIGIN}/api/agent/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: "{}",
  }).then((response) => response.json());
  assert.equal(jiraPoll.job.type, "jira.comment");
  assert.equal(jiraPoll.job.payload.token, undefined);
  assert.equal(jiraPoll.job.payload.comment.body, "Agent comment");
  await fetch(`${ORIGIN}/api/agent/jobs/${jiraPoll.job.id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ ok: true, result: { ok: true, verified: true, commentId: "9001" } }),
  });
  const jiraProxyResponse = await jiraProxyPromise;
  assert.equal(jiraProxyResponse.status, 201);
  const jiraProxyResult = await jiraProxyResponse.json();
  assert.equal(jiraProxyResult.commentId, "9001");
});
