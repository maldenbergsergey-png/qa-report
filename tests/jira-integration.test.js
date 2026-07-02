const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");

async function main() {
  const received = [];
  let fallbackCommentCreated = false;
  let wafPostAttempted = false;
  const mock = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    const body = request.headers["content-type"]?.includes("application/json")
      ? JSON.parse(rawBody.toString("utf8") || "{}")
      : rawBody;
    received.push({
      url: request.url,
      method: request.method,
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
      body,
    });
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/rest/api/2/issue/QA-999/comment?maxResults=100") {
      response.setHeader("Content-Type", "text/html; charset=UTF-8");
      response.end(
        '<!DOCTYPE html><html><head><noscript><meta http-equiv="refresh" content="0; url=/exhkqyad"></noscript></head></html>',
      );
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-999/comment" && request.method === "POST") {
      wafPostAttempted = true;
      response.statusCode = 201;
      response.end(JSON.stringify({ id: "should-not-exist" }));
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-456/comment" && request.method === "POST") {
      fallbackCommentCreated = true;
      response.statusCode = 201;
      response.end(JSON.stringify({}));
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-456/comment?maxResults=100") {
      response.end(
        JSON.stringify({
          total: fallbackCommentCreated ? 1 : 0,
          comments: fallbackCommentCreated ? [{ id: "20002", body: "Fallback comment" }] : [],
        }),
      );
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-456/comment/20002") {
      response.end(JSON.stringify({ id: "20002", body: "Fallback comment" }));
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-789/comment" && request.method === "POST") {
      response.statusCode = 201;
      response.end(JSON.stringify({}));
      return;
    }
    if (request.url === "/rest/api/2/issue/QA-789/comment?maxResults=100") {
      response.end(JSON.stringify({ total: 0, comments: [] }));
      return;
    }
    if (request.url.endsWith("/myself")) {
      response.end(JSON.stringify({ displayName: "QA Tester", name: "qa" }));
      return;
    }
    if (request.url.includes("/comment/777")) {
      response.end(
        JSON.stringify({
          body: {
            type: "doc",
            version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: "Комментарий" }] }],
          },
        }),
      );
      return;
    }
    if (request.url.includes("?fields=attachment")) {
      response.end(JSON.stringify({ fields: { attachment: [] } }));
      return;
    }
    if (request.url.endsWith("/attachments")) {
      response.statusCode = 200;
      response.end(JSON.stringify([{ id: "900", filename: "shot.png", content: "http://jira/shot.png" }]));
      return;
    }
    response.statusCode = 201;
    response.end(JSON.stringify({ id: "10001" }));
  });
  await new Promise((resolve) => mock.listen(4199, "127.0.0.1", resolve));

  const app = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: "4174" },
    stdio: "ignore",
  });
  await new Promise((resolve) => setTimeout(resolve, 250));

  try {
    const testResponse = await fetch("http://127.0.0.1:4174/api/jira/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        baseUrl: "http://127.0.0.1:4199",
        token: "secret-pat",
      }),
    });
    assert.equal(testResponse.status, 200);
    assert.equal((await testResponse.json()).displayName, "QA Tester");

    const commentResponse = await fetch("http://127.0.0.1:4174/api/jira/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cloud",
        baseUrl: "http://127.0.0.1:4199",
        user: "qa@example.com",
        token: "cloud-token",
        issueUrl: "http://127.0.0.1:4199/browse/QA-123",
        comment: {
          format: "adf",
          body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [] }] },
        },
      }),
    });
    assert.equal(commentResponse.status, 201);
    const commentResult = await commentResponse.json();
    assert.equal(commentResult.verified, true);
    assert.equal(commentResult.commentId, "10001");
    assert.equal(commentResult.apiRevision, 4);
    const patTestRequest = received.find((item) => item.url === "/rest/api/2/myself");
    assert.equal(patTestRequest.authorization, "Bearer secret-pat");
    const cloudCommentRequest = received.find(
      (item) => item.url === "/rest/api/3/issue/QA-123/comment" && item.method === "POST",
    );
    assert.match(cloudCommentRequest.authorization, /^Basic /);
    assert.equal(cloudCommentRequest.body.body.type, "doc");

    const basicResponse = await fetch("http://127.0.0.1:4174/api/jira/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        authMethod: "basic",
        baseUrl: "http://127.0.0.1:4199",
        user: "legacy-user",
        token: "legacy-password",
      }),
    });
    assert.equal(basicResponse.status, 200);
    const basicTestRequest = received
      .filter((item) => item.url === "/rest/api/2/myself")
      .find((item) => item.authorization?.startsWith("Basic "));
    assert.equal(
      basicTestRequest.authorization,
      `Basic ${Buffer.from("legacy-user:legacy-password").toString("base64")}`,
    );

    const cookieResponse = await fetch("http://127.0.0.1:4174/api/jira/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        authMethod: "cookie",
        baseUrl: "http://127.0.0.1:4199",
        token: "JSESSIONID=session-from-curl; atlassian.xsrf.token=xsrf",
      }),
    });
    assert.equal(cookieResponse.status, 200);
    const cookieTestRequest = received
      .filter((item) => item.url === "/rest/api/2/myself")
      .find((item) => item.cookie?.includes("JSESSIONID=session-from-curl"));
    assert.equal(cookieTestRequest.authorization, undefined);
    assert.equal(cookieTestRequest.cookie, "JSESSIONID=session-from-curl; atlassian.xsrf.token=xsrf");

    const fallbackResponse = await fetch("http://127.0.0.1:4174/api/jira/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        baseUrl: "http://127.0.0.1:4199",
        token: "secret-pat",
        issueUrl: "http://127.0.0.1:4199/browse/QA-456",
        comment: { format: "wiki", body: "Fallback comment" },
      }),
    });
    assert.equal(fallbackResponse.status, 201);
    const fallbackResult = await fallbackResponse.json();
    assert.equal(fallbackResult.verified, true);
    assert.equal(fallbackResult.commentId, "20002");
    assert.equal(fallbackResult.verificationSource, "comments-body-match");

    const diagnosticResponse = await fetch("http://127.0.0.1:4174/api/jira/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        baseUrl: "http://127.0.0.1:4199",
        token: "secret-pat",
        issueUrl: "http://127.0.0.1:4199/browse/QA-789",
        comment: { format: "wiki", body: "Missing comment" },
      }),
    });
    assert.equal(diagnosticResponse.status, 400);
    const diagnosticResult = await diagnosticResponse.json();
    assert.match(diagnosticResult.error, /HTTP 201/);
    assert.match(diagnosticResult.error, /комментариев до: 0/);
    assert.match(diagnosticResult.error, /после: 0/);

    const wafResponse = await fetch("http://127.0.0.1:4174/api/jira/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "data-center",
        baseUrl: "http://127.0.0.1:4199",
        token: "secret-pat",
        issueUrl: "http://127.0.0.1:4199/browse/QA-999",
        comment: { format: "wiki", body: "Must not be sent" },
      }),
    });
    assert.equal(wafResponse.status, 502);
    const wafResult = await wafResponse.json();
    assert.equal(wafResult.errorCode, "JIRA_SECURITY_CHALLENGE");
    assert.match(wafResult.error, /\/rest\/api\/\*/);
    assert.equal(wafPostAttempted, false);

    const importResponse = await fetch("http://127.0.0.1:4174/api/jira/import-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cloud",
        baseUrl: "http://127.0.0.1:4199",
        user: "qa@example.com",
        token: "cloud-token",
        commentUrl: "http://127.0.0.1:4199/browse/QA-123?focusedCommentId=777",
      }),
    });
    assert.equal(importResponse.status, 200);
    assert.equal((await importResponse.json()).format, "adf");

    const tinyPng = Buffer.from("iVBORw0KGgo=", "base64").toString("base64");
    const attachmentResponse = await fetch("http://127.0.0.1:4174/api/jira/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cloud",
        baseUrl: "http://127.0.0.1:4199",
        user: "qa@example.com",
        token: "cloud-token",
        issueUrl: "http://127.0.0.1:4199/browse/QA-123",
        files: [
          {
            attachmentId: "local-1",
            name: "shot.png",
            type: "image/png",
            dataBase64: tinyPng,
          },
        ],
      }),
    });
    assert.equal(attachmentResponse.status, 200);
    assert.equal((await attachmentResponse.json()).attachments[0].attachmentId, "local-1");
    console.log("Jira integration test passed");
  } finally {
    app.kill("SIGTERM");
    await new Promise((resolve) => mock.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
