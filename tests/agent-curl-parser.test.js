const assert = require("node:assert/strict");
const test = require("node:test");

const { parseCurlCredentials } = require("../agent/qa-report-agent");

test("local agent parses Windows Copy as cURL (cmd) with Jira session cookies", () => {
  const command = String.raw`curl ^"https://jira.example.test/rest/api/latest/tokens^" ^ -H ^"accept: */*^" ^ -b ^"session=abc^%^7Cxyz; route=node-1^"`;
  const result = parseCurlCredentials(command);

  assert.deepEqual(result, {
    baseUrl: "https://jira.example.test",
    type: "data-center",
    authMethod: "cookie",
    token: "session=abc%7Cxyz; route=node-1",
    user: "",
  });
});

test("local agent parses multiline Windows Copy as cURL (cmd)", () => {
  const command = [
    'curl ^"https://company.atlassian.net/rest/api/3/myself^" ^',
    '  -H ^"Authorization: Basic dXNlckBleGFtcGxlLnRlc3Q6dG9rZW4=^"',
  ].join("\r\n");
  const result = parseCurlCredentials(command);

  assert.equal(result.baseUrl, "https://company.atlassian.net");
  assert.equal(result.type, "cloud");
  assert.equal(result.authMethod, "api-token");
  assert.equal(result.user, "user@example.test");
  assert.equal(result.token, "token");
});
