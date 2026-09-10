const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../agent/qa-report-agent");
test("agent checks raw Jira limits, sends binary multipart and reports HTML 413 accurately", async t => {
  const jira = { baseUrl: "https://jira.example", token: "fixture", authMethod: "pat" };
  const config = { jiras: [jira] };
  let limit = 1204756, reject = false;
  const uploads = [];
  core.setJiraTransport(async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer fixture");
    if (url.endsWith("/attachment/meta")) return Response.json({ enabled: true, uploadLimit: limit });
    if (url.endsWith("?fields=attachment")) return Response.json({ fields: { attachment: [] } });
    if (url.endsWith("/attachments")) {
      uploads.push(options.body);
      if (reject) return new Response("<html>413</html>", { status: 413, headers: { "Content-Type": "text/html" } });
      return Response.json([{ id: "1", filename: "clip.mp4" }]);
    }
    throw new Error("Unexpected Jira call " + url);
  });
  t.after(() => core.setJiraTransport(fetch));
  const issueUrl = `${jira.baseUrl}/browse/QA-1`;
  const manifest = await core.executeJiraAttachmentManifest(config, { issueUrl, limitsOnly: true });
  assert.equal(manifest.attachmentLimits.jiraUploadLimit, limit);
  assert.deepEqual(manifest.attachments, []);
  const bytes = Buffer.alloc(1204756, 0x82);
  const payload = { issueUrl, files: [{ name: "clip.mp4", type: "video/mp4", dataBase64: bytes.toString("base64") }] };
  await core.executeJiraAttachments(config, payload);
  assert.deepEqual(Buffer.from(await uploads[0].get("file").arrayBuffer()), bytes);
  limit--;
  await assert.rejects(core.executeJiraAttachments(config, payload), /лимит Jira/);
  assert.equal(uploads.length, 1);
  limit++; reject = true;
  await assert.rejects(core.executeJiraAttachments(config, payload), error => error.status === 413 && /прокси/.test(error.message) && !/SSO/.test(error.message));
  assert.equal(uploads.length, 2);
});
