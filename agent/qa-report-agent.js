#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");
const tls = require("node:tls");

const VERSION = "0.2.7";
let jiraRequest = (...args) => fetch(...args);
function setJiraTransport(request) {
  if (typeof request !== "function") throw new TypeError("Jira transport must be a function");
  jiraRequest = request;
}

function errorMessage(error) {
  const parts = [];
  let current = error;
  while (current) {
    const message = String(current.message || "").trim();
    const code = String(current.code || "").trim();
    const detail = code && !message.includes(code) ? `${message || "Ошибка сети"} (${code})` : message || code;
    if (detail && !parts.includes(detail)) parts.push(detail);
    current = current.cause;
  }
  return parts.join(": ") || "Неизвестная ошибка";
}

function configDirectory() {
  if (process.env.QA_REPORT_AGENT_CONFIG_DIR) return path.resolve(process.env.QA_REPORT_AGENT_CONFIG_DIR);
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || process.env.APPDATA || os.homedir(), "QA Report Agent");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "QA Report Agent");
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "qa-report-agent");
}

const CONFIG_DIR = configDirectory();
const CONFIG_FILE = path.join(CONFIG_DIR, "agent.json");
const EXTRA_CA_FILE = path.join(CONFIG_DIR, "jira-extra-ca.pem");

function restartWithExtraCa(removeConfigure = false) {
  console.log("Перезапускаем агент с восстановленной TLS-цепочкой…\n");
  const forwardedArguments = removeConfigure
    ? process.argv.slice(2).filter((value) => value !== "--configure-jira")
    : process.argv.slice(2);
  const child = spawnSync(
    process.execPath,
    [process.argv[1], ...forwardedArguments],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_EXTRA_CA_CERTS: EXTRA_CA_FILE },
    },
  );
  process.exit(child.status ?? 1);
}

function ensureExtraCaRuntime() {
  if (fs.existsSync(EXTRA_CA_FILE) && process.env.NODE_EXTRA_CA_CERTS !== EXTRA_CA_FILE) {
    restartWithExtraCa();
  }
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : "";
}

function normalizeServerUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Адрес QA Report должен начинаться с http:// или https://");
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Не удалось прочитать ${CONFIG_FILE}: ${error.message}`);
  }
}

function writeConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(CONFIG_FILE, 0o600); } catch { /* Windows управляет ACL самостоятельно. */ }
}

function tokenizeCurl(value) {
  let source = String(value || "");
  // Chrome and Edge on Windows copy commands for cmd.exe as `curl ^"...^"`.
  // Decode cmd caret escapes before applying the regular shell-like tokenizer.
  if (/\bcurl(?:\.exe)?\b[\s\S]*\^["']/i.test(source)) {
    source = source
      .replace(/\^(?:\r\n|\n|\r)/g, "")
      .replace(/\^([\s\S])/g, "$1")
      .replace(/\^\s*(?=\S)/g, "");
  }
  const tokens = [];
  let current = "";
  let quote = "";
  let escaping = false;
  for (const character of source) {
    if (escaping) {
      if (character !== "\n" && character !== "\r") current += character;
      escaping = false;
    } else if (character === "\\") {
      escaping = true;
    } else if (quote) {
      if (character === quote) quote = "";
      else current += character;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (/\s/.test(character)) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function jiraBaseFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  const cut = url.pathname.search(/\/(?:rest\/api\/(?:2|3|latest)|browse\/[A-Z][A-Z0-9_]*-\d+)\b/i);
  url.pathname = cut >= 0 ? url.pathname.slice(0, cut) : url.pathname;
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function parseCurlCredentials(command) {
  const tokens = tokenizeCurl(command);
  let rawUrl = "";
  let userToken = "";
  let cookieToken = "";
  const headers = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1] || "";
    if (["-H", "--header"].includes(token)) {
      const separator = next.indexOf(":");
      if (separator > 0) headers.set(next.slice(0, separator).trim().toLowerCase(), next.slice(separator + 1).trim());
      index += 1;
    } else if (["-u", "--user"].includes(token)) {
      userToken = next;
      index += 1;
    } else if (["-b", "--cookie"].includes(token)) {
      cookieToken = next;
      index += 1;
    } else if (token.startsWith("--cookie=")) {
      cookieToken = token.slice("--cookie=".length);
    } else if (token.startsWith("-b") && token.length > 2) {
      cookieToken = token.slice(2);
    } else if (token === "--url") {
      rawUrl = next;
      index += 1;
    } else if (token.startsWith("--url=")) {
      rawUrl = token.slice("--url=".length);
    } else if (/^https?:\/\//i.test(token)) {
      rawUrl = token;
    }
  }
  if (!rawUrl) throw new Error("В curl не найден адрес Jira");
  const baseUrl = jiraBaseFromUrl(rawUrl);
  const cloud = new URL(baseUrl).hostname.endsWith(".atlassian.net");
  const authorization = headers.get("authorization") || "";
  const cookie = headers.get("cookie") || cookieToken;
  if (/^bearer\s+/i.test(authorization)) {
    return { baseUrl, type: "data-center", authMethod: "pat", token: authorization.replace(/^bearer\s+/i, "").trim(), user: "" };
  }
  if (/^basic\s+/i.test(authorization)) {
    const decoded = Buffer.from(authorization.replace(/^basic\s+/i, ""), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    return { baseUrl, type: cloud ? "cloud" : "data-center", authMethod: cloud ? "api-token" : "basic", user: decoded.slice(0, separator), token: decoded.slice(separator + 1) };
  }
  if (userToken) {
    const separator = userToken.indexOf(":");
    if (separator < 0) throw new Error("Параметр -u должен содержать user:token");
    return { baseUrl, type: cloud ? "cloud" : "data-center", authMethod: cloud ? "api-token" : "basic", user: userToken.slice(0, separator), token: userToken.slice(separator + 1) };
  }
  if (cookie) return { baseUrl, type: "data-center", authMethod: "cookie", token: cookie, user: "" };
  throw new Error("В curl не найдены Authorization, Cookie или -u");
}

async function questionSecret(terminal, prompt) {
  console.log(prompt);
  console.log("  Ввод скрыт: вставьте значение и нажмите Enter. Ctrl+C — отмена.");
  if (process.platform !== "win32" && process.stdin.isTTY) {
    terminal.pause();
    if (typeof process.stdin.setRawMode === "function") process.stdin.setRawMode(false);
    const secret = spawnSync(
      "/bin/sh",
      ["-c", "stty -echo; trap 'stty echo' EXIT; IFS= read -r value; printf '\\n' >&2; printf '%s' \"$value\""],
      { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" },
    );
    if (secret.status !== 0) throw new Error("Не удалось прочитать скрытое значение");
    console.log("  ✓ Значение получено.");
    return secret.stdout;
  }
  const originalWrite = terminal._writeToOutput;
  terminal._writeToOutput = () => {};
  try {
    const answer = await terminal.question("");
    console.log("  ✓ Значение получено.");
    return answer;
  } finally {
    terminal._writeToOutput = originalWrite;
  }
}

function tlsErrorCode(error) {
  let current = error;
  while (current) {
    if (current.code) return String(current.code);
    current = current.cause;
  }
  return "";
}

function peerCertificate(baseUrl) {
  const url = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      rejectUnauthorized: false,
    });
    const timeout = setTimeout(() => socket.destroy(new Error("Таймаут получения TLS-сертифика")), 15_000);
    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      const certificate = socket.getPeerCertificate(true);
      socket.end();
      resolve(certificate);
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function installMissingIssuer(baseUrl) {
  const certificate = await peerCertificate(baseUrl);
  const issuerUrl = certificate.infoAccess?.["CA Issuers - URI"]?.[0];
  if (!issuerUrl) throw new Error("в сертификате Jira нет адреса промежуточного CA");
  const url = new URL(issuerUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("сертификат Jira содержит недопустимый адрес CA");
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`не удалось скачать промежуточный CA: HTTP ${response.status}`);
  const certificateData = Buffer.from(await response.arrayBuffer());
  const issuer = new crypto.X509Certificate(certificateData);
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(EXTRA_CA_FILE, `${issuer.toString()}\n`, { mode: 0o600 });
  try { fs.chmodSync(EXTRA_CA_FILE, 0o600); } catch { /* Windows управляет ACL самостоятельно. */ }
  return issuer.subject;
}

async function verifyJira(connection) {
  return jiraFetch(connection, "/rest/api/2/myself", { returnMeta: true });
}

async function configureJira(config, terminal) {
  console.log("\nНастройка Jira для локальной публикации.");
  console.log("Шаг 1 из 3 — выберите способ авторизации.");
  console.log("1 — вставить Copy as cURL из авторизованной вкладки Jira (подходит для SSO/2FA)");
  console.log("2 — Personal Access Token");
  console.log("3 — логин и пароль / API token");
  const mode = String(await terminal.question("Способ авторизации [1]: ")).trim() || "1";
  if (!["1", "2", "3"].includes(mode)) throw new Error("Выберите способ авторизации: 1, 2 или 3");
  let jira;
  if (mode === "1") {
    console.log("\nШаг 2 из 3 — данные Jira.");
    const command = await questionSecret(terminal, "Вставьте Copy as cURL одной строкой.");
    jira = parseCurlCredentials(command);
    console.log(`  ✓ Адрес Jira найден: ${jira.baseUrl}`);
  } else {
    console.log("\nШаг 2 из 3 — адрес Jira.");
    const baseUrl = jiraBaseFromUrl(await terminal.question("Адрес Jira: "));
    console.log(`  ✓ Адрес принят: ${baseUrl}`);
    const cloud = new URL(baseUrl).hostname.endsWith(".atlassian.net");
    console.log("\nШаг 3 из 3 — учётные данные.");
    const user = mode === "3" || cloud ? String(await terminal.question(cloud ? "Email Atlassian: " : "Логин Jira: ")).trim() : "";
    const token = String(await questionSecret(terminal, mode === "2" ? "Введите Personal Access Token." : cloud ? "Введите API token." : "Введите пароль.")).trim();
    jira = { baseUrl, type: cloud ? "cloud" : "data-center", authMethod: cloud ? "api-token" : mode === "2" ? "pat" : "basic", user, token };
  }
  if (!jira.token) throw new Error("Jira credential не найден");
  console.log("\nПроверяем адрес и авторизацию Jira…");
  try {
    const verification = await verifyJira(jira);
    console.log(`  ✓ Jira ответила HTTP ${verification.status}. Авторизация работает.`);
  } catch (error) {
    const code = tlsErrorCode(error);
    const missingIssuer = ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(code);
    if (!missingIssuer || process.env.NODE_EXTRA_CA_CERTS === EXTRA_CA_FILE) {
      throw new Error(`Настройка не сохранена: ${error.message}${code ? ` (${code})` : ""}`);
    }
    console.log("  ! Jira не передаёт полную TLS-цепочку. Восстанавливаем промежуточный CA…");
    try {
      const issuer = await installMissingIssuer(jira.baseUrl);
      console.log(`  ✓ Промежуточный CA сохранён: ${issuer.replace(/\n/g, ", ")}`);
    } catch (repairError) {
      throw new Error(`Настройка не сохранена: TLS-цепочка Jira неполная; ${repairError.message}`);
    }
    jira.pendingVerification = true;
  }
  config.jira = jira;
  writeConfig(config);
  if (jira.pendingVerification) {
    config.restartForExtraCa = true;
    return config;
  }
  console.log(`Jira настроена локально: ${jira.baseUrl}`);
  console.log("Credential остаётся в локальном конфигурационном файле с ограниченными правами.\n");
  return config;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function pairAgent() {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const initialServer = argument("--server") || process.env.QA_REPORT_SERVER_URL || "";
    const serverUrl = normalizeServerUrl(initialServer || await terminal.question("Адрес QA Report: "));
    const initialCode = argument("--pair-code") || "";
    const code = String(initialCode || await terminal.question("8-значный код подключения: ")).replace(/\D/g, "");
    const defaultName = `${os.hostname()} (${process.platform})`;
    const name = String(await terminal.question(`Имя устройства [${defaultName}]: `)).trim() || defaultName;
    console.log("Подключаем устройство…");
    const result = await fetchJson(`${serverUrl}/api/agent/pair`, {
      method: "POST",
      body: JSON.stringify({ code, name, platform: process.platform, version: VERSION }),
    });
    const config = { serverUrl, deviceId: result.deviceId, secret: result.secret, name };
    writeConfig(config);
    console.log(`Устройство подключено. Настройки сохранены: ${CONFIG_FILE}`);
    return config;
  } finally {
    terminal.close();
  }
}

async function executeNetworkTest(payload) {
  const base = new URL(payload.baseUrl);
  const target = new URL(`${base.pathname.replace(/\/+$/, "")}/rest/api/2/serverInfo`, base.origin);
  const startedAt = Date.now();
  const response = await jiraRequest(target, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  return {
    reachable: true,
    targetOrigin: base.origin,
    status: response.status,
    durationMs: Date.now() - startedAt,
    contentType,
    location: response.headers.get("location") || "",
    authRequired: response.status === 401 || response.status === 403,
    browserChallenge: response.status >= 300 && response.status < 400 || /text\/html/i.test(contentType),
    jiraResponse: /application\/json/i.test(contentType) && /^\s*[\[{]/.test(text),
  };
}

function configuredJira(config, payload) {
  if (!config.jira?.baseUrl || !config.jira?.token) {
    const error = new Error("Jira не настроена в локальном агенте. Перезапустите агент и выполните настройку авторизации.");
    error.status = 401;
    throw error;
  }
  const requested = jiraBaseFromUrl(payload.issueUrl || payload.commentUrl || payload.baseUrl || config.jira.baseUrl);
  if (new URL(requested).origin !== new URL(config.jira.baseUrl).origin) {
    const error = new Error("Задание запрашивает другую Jira, не разрешённую в локальном агенте");
    error.status = 403;
    throw error;
  }
  return config.jira;
}

function jiraAuthHeaders(connection) {
  if (connection.authMethod === "cookie") return { Cookie: connection.token };
  if (connection.type === "cloud" || connection.authMethod === "basic") {
    return { Authorization: `Basic ${Buffer.from(`${connection.user}:${connection.token}`).toString("base64")}` };
  }
  return { Authorization: `Bearer ${connection.token}` };
}

async function jiraFetch(connection, pathname, options = {}) {
  const { returnMeta = false, ...fetchOptions } = options;
  const formData = fetchOptions.body instanceof FormData;
  const response = await jiraRequest(`${connection.baseUrl}${pathname}`, {
    ...fetchOptions,
    redirect: "manual",
    headers: {
      Accept: "application/json",
      ...jiraAuthHeaders(connection),
      ...(fetchOptions.body && !formData ? { "Content-Type": "application/json" } : {}),
      ...(fetchOptions.headers || {}),
    },
    signal: fetchOptions.signal || AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (/text\/html/i.test(contentType) || /^\s*(?:<!doctype|<html|<head)/i.test(text)) {
    const error = new Error(`Jira вернула страницу SSO/WAF вместо REST API (HTTP ${response.status}). Обновите cookie через Copy as cURL.`);
    error.status = response.status || 502;
    throw error;
  }
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) {
    const details = payload.errorMessages?.join("; ") || Object.values(payload.errors || {}).join("; ") || payload.message || response.statusText;
    const error = new Error(`Jira вернула ${response.status}: ${details}`);
    error.status = response.status;
    throw error;
  }
  return returnMeta ? { payload, status: response.status, location: response.headers.get("location") || "", rawText: text } : payload;
}

function issueReference(connection, rawUrl) {
  const url = new URL(String(rawUrl || ""));
  if (url.origin !== new URL(connection.baseUrl).origin) throw new Error("Ссылка задачи относится к другой Jira");
  const issueKey = url.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i)?.[1]?.toUpperCase();
  if (!issueKey) throw new Error("В ссылке не найден ключ задачи Jira");
  return { issueKey, issueUrl: url };
}

async function recentComments(connection, commentPath) {
  const result = await jiraFetch(connection, `${commentPath}?maxResults=100`);
  return Array.isArray(result.comments) ? result.comments : [];
}

async function executeJiraTest(config, payload) {
  const connection = configuredJira(config, payload);
  const version = connection.type === "cloud" ? "3" : "2";
  const user = await jiraFetch(connection, `/rest/api/${version}/myself`);
  return { ok: true, displayName: user.displayName, name: user.emailAddress || user.name || user.accountId };
}

async function executeJiraComment(config, payload) {
  const connection = configuredJira(config, payload);
  const { issueKey, issueUrl } = issueReference(connection, payload.issueUrl);
  const cloud = connection.type === "cloud";
  const expected = cloud ? "adf" : "wiki";
  if (payload.comment?.format !== expected || !payload.comment?.body) throw new Error(`Для Jira требуется формат ${expected}`);
  const version = cloud ? "3" : "2";
  const commentPath = `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/comment`;
  let before = [];
  try { before = await recentComments(connection, commentPath); } catch { /* POST всё равно можно выполнить. */ }
  const creation = await jiraFetch(connection, commentPath, {
    method: "POST",
    body: JSON.stringify({ body: payload.comment.body }),
    returnMeta: true,
  });
  let commentId = creation.payload?.id ? String(creation.payload.id) : "";
  let verificationSource = "create-response";
  if (!commentId) {
    const after = await recentComments(connection, commentPath);
    const previous = new Set(before.map((comment) => String(comment.id || "")));
    const created = after.filter((comment) => comment.id && !previous.has(String(comment.id)));
    const expectedBody = typeof payload.comment.body === "string" ? payload.comment.body.trim() : JSON.stringify(payload.comment.body);
    const matching = [...created, ...after].reverse().find((comment) => {
      const actual = typeof comment.body === "string" ? comment.body.trim() : JSON.stringify(comment.body);
      return actual === expectedBody && comment.id;
    });
    commentId = String(matching?.id || (created.length === 1 ? created[0].id : ""));
    verificationSource = matching ? "comments-body-match" : "comments-id-diff";
  }
  if (!commentId) throw new Error(`Jira не подтвердила создание комментария (HTTP ${creation.status})`);
  const verified = await jiraFetch(connection, `${commentPath}/${encodeURIComponent(commentId)}`);
  if (String(verified?.id || "") !== commentId) throw new Error(`Jira не подтвердила комментарий ${commentId}`);
  return {
    ok: true,
    verified: true,
    verificationSource,
    commentId,
    issueUrl: issueUrl.toString(),
    commentUrl: `${connection.baseUrl}/browse/${encodeURIComponent(issueKey)}?focusedCommentId=${encodeURIComponent(commentId)}#comment-${encodeURIComponent(commentId)}`,
  };
}

async function executeJiraAttachments(config, payload) {
  const connection = configuredJira(config, payload);
  const { issueKey } = issueReference(connection, payload.issueUrl);
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!files.length) return { ok: true, attachments: [] };
  if (files.length > 20) throw new Error("За один раз разрешено не более 20 вложений");
  const version = connection.type === "cloud" ? "3" : "2";
  const results = [];
  for (const [index, file] of files.entries()) {
    const bytes = Buffer.from(String(file.dataBase64 || ""), "base64");
    if (!bytes.length) throw new Error(`Вложение ${index + 1} пустое`);
    const name = path.basename(String(file.name || `attachment-${index + 1}`)).replace(/[\r\n"]/g, "_");
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: String(file.type || "application/octet-stream") }), name);
    const uploaded = await jiraFetch(connection, `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/attachments`, {
      method: "POST",
      body: form,
      headers: { "X-Atlassian-Token": "no-check" },
    });
    const item = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (!item?.id) throw new Error(`Jira не вернула данные вложения «${name}»`);
    results.push({ attachmentId: file.attachmentId, id: item.id, filename: item.filename || name, content: item.content, thumbnail: item.thumbnail });
  }
  return { ok: true, attachments: results };
}

async function executeJiraImportComment(config, payload) {
  const connection = configuredJira(config, payload);
  const { issueKey } = issueReference(connection, payload.commentUrl);
  const commentUrl = new URL(payload.commentUrl);
  const commentId = commentUrl.searchParams.get("focusedCommentId") || commentUrl.hash.match(/comment-(\d+)/)?.[1];
  if (!commentId) throw new Error("В ссылке не найден ID комментария");
  const version = connection.type === "cloud" ? "3" : "2";
  const comment = await jiraFetch(connection, `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/comment/${encodeURIComponent(commentId)}`);
  let attachments = [];
  try {
    const issue = await jiraFetch(connection, `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}?fields=attachment`);
    attachments = (issue.fields?.attachment || []).map(item => ({ id: String(item.id), filename: item.filename, content: item.content, thumbnail: item.thumbnail, mimeType: item.mimeType }));
  } catch { /* Text remains importable when Jira denies access to the attachment list. */ }
  return { ok: true, format: connection.type === "cloud" ? "adf" : "wiki", body: comment.body, issueUrl: `${connection.baseUrl}/browse/${encodeURIComponent(issueKey)}`, commentId, attachments, attachmentDownload: true };

}

async function executeJiraImportAttachment(config, payload) {
  const connection = configuredJira(config, payload);
  const { issueKey } = issueReference(connection, payload.commentUrl);
  const version = connection.type === "cloud" ? "3" : "2";
  const issue = await jiraFetch(connection, `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}?fields=attachment`);
  const attachment = (issue.fields?.attachment || []).find(item => String(item.id) === String(payload.attachmentId));
  if (!attachment) throw new Error("Вложение не найдено или недоступно в этой задаче");
  const limit = 50 * 1024 * 1024;
  if (Number(attachment.size) > limit) throw new Error("Вложение больше 50 МБ");
  const target = connection.type === "cloud"
    ? new URL(`${connection.baseUrl}/rest/api/3/attachment/content/${encodeURIComponent(attachment.id)}?redirect=false`)
    : new URL(attachment.content, `${connection.baseUrl}/`);
  if (target.origin !== new URL(connection.baseUrl).origin || target.username || target.password) throw new Error("Адрес вложения вне разрешённой Jira");
  const response = await jiraRequest(target.toString(), { redirect: "manual", headers: jiraAuthHeaders(connection), signal: AbortSignal.timeout(60_000) });
  const type = String(response.headers.get("content-type") || "").split(";")[0];
  if (!response.ok || (type === "text/html" && attachment.mimeType !== "text/html")) { await response.body?.cancel(); throw new Error(`Jira не отдала файл (HTTP ${response.status}). Обновите подключение Jira`); }
  if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new Error("Вложение больше 50 МБ"); }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > limit) throw new Error("Вложение больше 50 МБ"); chunks.push(chunk); }
  return { ok: true, file: { name: attachment.filename, type: attachment.mimeType || type || "application/octet-stream", dataBase64: Buffer.concat(chunks).toString("base64") } };
}

async function executeJob(config, job) {
  if (job.type === "jira.network-test") return executeNetworkTest(job.payload);
  if (job.type === "jira.test") return executeJiraTest(config, job.payload);
  if (job.type === "jira.comment") return executeJiraComment(config, job.payload);
  if (job.type === "jira.attachments") return executeJiraAttachments(config, job.payload);
  if (job.type === "jira.import-attachment") return executeJiraImportAttachment(config, job.payload);
  if (job.type === "jira.import-comment") return executeJiraImportComment(config, job.payload);
  throw new Error(`Неподдерживаемое задание: ${job.type}`);
}

function agentAuthorization(config) {
  return `Bearer ${config.deviceId}.${config.secret}`;
}

async function reportResult(config, job, result, error = null) {
  await fetchJson(`${config.serverUrl}/api/agent/jobs/${job.id}/result`, {
    method: "POST",
    headers: { Authorization: agentAuthorization(config) },
    body: JSON.stringify(error ? { ok: false, error: error.message } : { ok: true, result }),
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abortableWait(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

async function pairWithCode(server, code, name = `${os.hostname()} (${process.platform})`) {
  const serverUrl = normalizeServerUrl(server);
  if (!/^\d{8}$/.test(String(code))) throw new Error("Код подключения недействителен. Откройте агент из QA Report ещё раз.");
  const result = await fetchJson(`${serverUrl}/api/agent/pair`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ code, name, platform: process.platform, version: VERSION }),
  });
  if (!result.deviceId || !result.secret) throw new Error("Сервер не вернул ключ подключения");
  return { serverUrl, deviceId: result.deviceId, secret: result.secret, name };
}

async function run(config, { signal, onStatus = () => {}, onPreferences = () => {}, version = VERSION } = {}) {
  console.log(`QA Report Agent ${VERSION}`);
  console.log(`Устройство: ${config.name}`);
  console.log(`Сервер: ${config.serverUrl}`);
  console.log("Агент подключён. Оставьте это окно открытым; Ctrl+C — остановить.\n");
  let failureDelay = 2000;
  while (!signal?.aborted) {
    try {
      const response = await fetchJson(`${config.serverUrl}/api/agent/poll`, {
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        method: "POST",
        headers: { Authorization: agentAuthorization(config) },
        body: JSON.stringify({ version, ...(config.desktop ? { jiraBaseUrl: config.jira?.baseUrl || "" } : {}) }),
      });
      failureDelay = 2000;
      onPreferences(response.preferences || {});
      onStatus({ connected: true, message: "Подключён" });
      if (!response.job) {
        await abortableWait(response.pollAfterMs || 2500, signal);
        continue;
      }
      const job = response.job;
      console.log(`[${new Date().toLocaleTimeString()}] Выполняем ${job.type}`);
      try {
        const result = await executeJob(config, job);
        await reportResult(config, job, result);
        console.log(`Готово: HTTP ${result.status}, ${result.durationMs} мс`);
      } catch (error) {
        await fetchJson(`${config.serverUrl}/api/agent/jobs/${job.id}/result`, {
          method: "POST",
          headers: { Authorization: agentAuthorization(config) },
          body: JSON.stringify({ ok: false, error: error.message, status: error.status || 502 }),
        }).catch(() => {});
        console.error(`Ошибка задания: ${error.message}`);
      }
    } catch (error) {
      if (signal?.aborted) break;
      onStatus({ connected: false, message: errorMessage(error) });
      console.error(`Связь с QA Report: ${errorMessage(error)}. Повтор через ${Math.round(failureDelay / 1000)} сек.`);
      await abortableWait(failureDelay, signal);
      failureDelay = Math.min(failureDelay * 2, 30_000);
    }
  }
}

async function main() {
  ensureExtraCaRuntime();
  if (process.argv.includes("--reset")) {
    for (const file of [CONFIG_FILE, EXTRA_CA_FILE]) {
      try { fs.unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    console.log("Локальные настройки агента полностью удалены.");
    console.log("Запустите start ещё раз и введите новый адрес QA Report и код подключения.");
    return;
  }
  let config = readConfig() || await pairAgent();
  if (!config.jira || process.argv.includes("--configure-jira")) {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    try { config = await configureJira(config, terminal); }
    finally { terminal.close(); }
  }
  if (config.restartForExtraCa) restartWithExtraCa(true);
  if (config.jira?.pendingVerification) {
    console.log("Повторно проверяем Jira с восстановленной TLS-цепочкой…");
    const verification = await verifyJira(config.jira);
    delete config.jira.pendingVerification;
    writeConfig(config);
    console.log(`  ✓ Jira ответила HTTP ${verification.status}. Авторизация работает.\n`);
  }
  await run(config);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`QA Report Agent: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}

module.exports = { jiraBaseFromUrl, parseCurlCredentials, tokenizeCurl, normalizeServerUrl,
  executeJiraImportAttachment, executeJiraImportComment, configuredJira, readConfig, writeConfig, pairWithCode, verifyJira, setJiraTransport, run, errorMessage, CONFIG_FILE, EXTRA_CA_FILE };
