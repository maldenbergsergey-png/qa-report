const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  try {
    const source = fs.readFileSync(envPath, "utf8");
    source.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || Object.hasOwn(process.env, match[1])) return;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    });
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`Не удалось прочитать .env: ${error.message}`);
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY = 30 * 1024 * 1024;
const APP_VERSION = "0.2.2";
const API_REVISION = 5;
const FEEDBACK_DIR = process.env.FEEDBACK_DIR || path.join(ROOT, "feedback-data");
const feedbackRateLimit = new Map();

function readSecret(name) {
  const candidates = [
    process.env[`${name}_FILE`],
    path.join(ROOT, "secrets", name.toLowerCase()),
  ].filter(Boolean);
  for (const filePath of candidates) {
    try {
      return fs.readFileSync(filePath, "utf8").trim();
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Не удалось прочитать secret ${name}: ${error.message}`);
      }
    }
  }
  return String(process.env[name] || "").trim();
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ ...payload, appVersion: APP_VERSION, apiRevision: API_REVISION }));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("Запрос слишком большой");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function normalizeConnection(input) {
  const type = input.type === "cloud" ? "cloud" : "data-center";
  const baseUrl = new URL(input.baseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("Поддерживаются только http:// и https:// адреса Jira");
  }
  baseUrl.username = "";
  baseUrl.password = "";
  baseUrl.hash = "";
  baseUrl.search = "";
  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "");
  const token = String(input.token || "");
  const user = String(input.user || "");
  const authMethod =
    type === "cloud" ? "api-token" : input.authMethod === "basic" || input.authMethod === "cookie" ? input.authMethod : "pat";
  if (!token) throw new Error(authMethod === "basic" ? "Пароль не указан" : authMethod === "cookie" ? "Cookie не указан" : "Токен не указан");
  if ((type === "cloud" || authMethod === "basic") && !user) {
    throw new Error(type === "cloud" ? "Email Atlassian не указан" : "Логин Jira не указан");
  }
  return { type, authMethod, baseUrl: baseUrl.toString().replace(/\/$/, ""), token, user };
}

function authHeaders(connection) {
  if (connection.authMethod === "cookie") {
    return { Cookie: connection.token };
  }
  if (connection.type === "cloud" || connection.authMethod === "basic") {
    const credentials = Buffer.from(`${connection.user}:${connection.token}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }
  return { Authorization: `Bearer ${connection.token}` };
}

async function jiraFetch(connection, pathname, options = {}) {
  const { returnMeta = false, ...fetchOptions } = options;
  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  const targetUrl = `${connection.baseUrl}${pathname}`;
  let response;
  try {
    response = await fetch(targetUrl, {
      ...fetchOptions,
      headers: {
        Accept: "application/json",
        ...authHeaders(connection),
        ...(fetchOptions.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (fetchError) {
    const reason = fetchError.cause?.message || fetchError.message || "неизвестная ошибка сети";
    const error = new Error(
      `Не удалось подключиться к Jira ${connection.baseUrl}: ${reason}. ` +
        "Проверьте, что Node-сервер приложения видит Jira: VPN, DNS, корпоративный proxy и TLS-сертификаты.",
    );
    error.status = 502;
    error.code = fetchError.cause?.code || fetchError.code || "JIRA_FETCH_FAILED";
    error.pathname = pathname;
    error.targetUrl = targetUrl;
    throw error;
  }
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const looksLikeHtml =
    /text\/html/i.test(contentType) ||
    /^\s*(?:<!doctype\s+html|<html|<head|<noscript)\b/i.test(text);
  if (looksLikeHtml) {
    const challengePath =
      text.match(/url\s*=\s*([^"'<>\s]+)/i)?.[1] ||
      text.match(/location(?:\.href)?\s*=\s*["']([^"']+)/i)?.[1] ||
      "";
    const error = new Error(
      "Корпоративный шлюз безопасности вернул HTML-проверку вместо Jira REST API" +
        `${challengePath ? ` (переход ${challengePath})` : ""}. ` +
        "Запрос с PAT не дошёл до Jira. Администратору необходимо разрешить IP сервера приложения " +
        "или отключить browser challenge для /rest/api/* при авторизации через Authorization header.",
    );
    error.status = 502;
    error.code = "JIRA_SECURITY_CHALLENGE";
    error.pathname = pathname;
    throw error;
  }
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    const details =
      payload.errorMessages?.join("; ") ||
      Object.values(payload.errors || {}).join("; ") ||
      payload.message ||
      response.statusText;
    const error = new Error(`Jira вернула ${response.status}: ${details}`);
    error.status = response.status;
    throw error;
  }
  if (returnMeta) {
    return {
      payload,
      status: response.status,
      location: response.headers.get("location") || "",
      contentType: response.headers.get("content-type") || "",
      rawText: text,
    };
  }
  return payload;
}

function commentIdFromReference(value) {
  const text = String(value || "");
  return text.match(/\/comment\/(\d+)(?:[/?#]|$)/i)?.[1] || "";
}

async function readRecentComments(connection, commentPath) {
  const first = await jiraFetch(connection, `${commentPath}?maxResults=100`);
  const firstComments = Array.isArray(first.comments) ? first.comments : [];
  const total = Number(first.total);
  if (Number.isFinite(total) && total > firstComments.length) {
    const startAt = Math.max(0, total - 100);
    const last = await jiraFetch(
      connection,
      `${commentPath}?startAt=${startAt}&maxResults=100`,
    );
    return {
      total: Number.isFinite(Number(last.total)) ? Number(last.total) : total,
      comments: Array.isArray(last.comments) ? last.comments : firstComments,
    };
  }
  return {
    total: Number.isFinite(total) ? total : firstComments.length,
    comments: firstComments,
  };
}

function parseIssueReference(connection, rawUrl) {
  let issueUrl;
  try {
    issueUrl = new URL(String(rawUrl || ""));
  } catch {
    throw new Error("Некорректная ссылка Jira");
  }
  const jiraBase = new URL(connection.baseUrl);
  if (issueUrl.origin !== jiraBase.origin) {
    throw new Error("Ссылка относится к другому адресу Jira");
  }
  const issueMatch = issueUrl.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)(?:\/|$)/i);
  const issueKey = issueMatch?.[1]?.toUpperCase() || "";
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)) {
    throw new Error("В ссылке не найден ключ задачи Jira");
  }
  return { issueUrl, issueKey };
}

function parseCommentId(commentUrl) {
  const candidates = [
    commentUrl.searchParams.get("focusedCommentId"),
    commentUrl.searchParams.get("commentId"),
    commentUrl.searchParams.get("selectedItem")?.match(/comment-(\d+)/i)?.[1],
    commentUrl.hash.match(/comment-(\d+)/i)?.[1],
    commentUrl.hash.match(/comment-(\d+)/i)?.[1],
  ];
  const commentId = candidates.find((value) => /^\d+$/.test(String(value || "")));
  if (!commentId) throw new Error("В ссылке не найден идентификатор комментария");
  return String(commentId);
}

function sanitizeAttachmentName(name, mimeType, index) {
  const extensionByType = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  const expectedExtension = extensionByType[mimeType] || ".bin";
  const raw = path.basename(String(name || `image-${index + 1}${expectedExtension}`));
  const safeBase = raw
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const currentExtension = path.extname(safeBase).toLowerCase();
  const baseWithoutExtension = currentExtension ? safeBase.slice(0, -currentExtension.length) : safeBase;
  return `${baseWithoutExtension || `image-${index + 1}`}${expectedExtension}`;
}

function detectImageMime(bytes) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

function decodeImageFile(file, index) {
  const base64 = String(file.dataBase64 || "")
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s+/g, "");
  if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error(`Файл «${file.name || index + 1}» содержит некорректные base64-данные`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) throw new Error(`Файл «${file.name || index + 1}» пустой`);
  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error(`Файл «${file.name || index + 1}» больше 10 МБ`);
  }
  const detectedType = detectImageMime(bytes);
  if (!detectedType) {
    throw new Error(`Файл «${file.name || index + 1}» не распознан как PNG, JPEG, GIF или WebP`);
  }
  return {
    attachmentId: file.attachmentId,
    bytes,
    type: detectedType,
    name: sanitizeAttachmentName(file.name, detectedType, index),
  };
}

function safeStorageFilename(name, mimeType) {
  return sanitizeAttachmentName(name, mimeType || "image/png", 0).replace(/^image-1(\.[a-z0-9]+)$/i, `image-${Date.now()}$1`);
}

async function storageFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    const details = payload.message || payload.error_description || payload.error || response.statusText;
    const error = new Error(`${response.status}: ${details}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function normalizeYandexFolder(value) {
  const pathValue = String(value || "/QA Report").trim() || "/QA Report";
  return `/${pathValue.replace(/^\/+|\/+$/g, "")}`;
}

async function ensureYandexFolder(token, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    const url = new URL("https://cloud-api.yandex.net/v1/disk/resources");
    url.searchParams.set("path", current);
    const response = await fetch(url, { method: "PUT", headers: { Authorization: `OAuth ${token}` } });
    if (response.ok || response.status === 409) continue;
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Не удалось создать папку Яндекс.Диска ${current}: ${payload.message || response.statusText}`);
  }
}

async function uploadToYandexDisk({ token, folderPath, file }) {
  const folder = normalizeYandexFolder(folderPath);
  await ensureYandexFolder(token, folder);
  const targetPath = `${folder}/${file.name}`;
  const uploadUrl = new URL("https://cloud-api.yandex.net/v1/disk/resources/upload");
  uploadUrl.searchParams.set("path", targetPath);
  uploadUrl.searchParams.set("overwrite", "true");
  const uploadLink = await storageFetch(uploadUrl, {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!uploadLink.href) throw new Error("Яндекс.Диск не вернул адрес загрузки");
  const uploadResponse = await fetch(uploadLink.href, {
    method: uploadLink.method || "PUT",
    headers: { "Content-Type": file.type },
    body: file.bytes,
  });
  if (!uploadResponse.ok) throw new Error(`Яндекс.Диск не принял файл: HTTP ${uploadResponse.status}`);
  const publishUrl = new URL("https://cloud-api.yandex.net/v1/disk/resources/publish");
  publishUrl.searchParams.set("path", targetPath);
  await storageFetch(publishUrl, {
    method: "PUT",
    headers: { Authorization: `OAuth ${token}` },
  });
  const metaUrl = new URL("https://cloud-api.yandex.net/v1/disk/resources");
  metaUrl.searchParams.set("path", targetPath);
  metaUrl.searchParams.set("fields", "name,public_url,path");
  const meta = await storageFetch(metaUrl, {
    headers: { Authorization: `OAuth ${token}` },
  });
  return {
    provider: "yandex",
    name: meta.name || file.name,
    publicUrl: meta.public_url,
    path: meta.path || targetPath,
  };
}

function multipartBody(parts, boundary) {
  const chunks = [];
  parts.forEach((part) => {
    chunks.push(Buffer.from(`--${boundary}\r\n${part.headers}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(part.body) ? part.body : Buffer.from(String(part.body)));
    chunks.push(Buffer.from("\r\n"));
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

async function uploadToGoogleDrive({ token, folderId, file }) {
  const metadata = {
    name: file.name,
    ...(folderId ? { parents: [folderId] } : {}),
  };
  const boundary = `qa-report-${crypto.randomUUID()}`;
  const body = multipartBody(
    [
      {
        headers: "Content-Type: application/json; charset=UTF-8",
        body: JSON.stringify(metadata),
      },
      {
        headers: `Content-Type: ${file.type}`,
        body: file.bytes,
      },
    ],
    boundary,
  );
  const upload = await storageFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!upload.id) throw new Error("Google Drive не вернул ID файла");
  await storageFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(upload.id)}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  const meta = await storageFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(upload.id)}?fields=id,name,webViewLink,webContentLink`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    provider: "google",
    id: meta.id,
    name: meta.name || file.name,
    publicUrl: meta.webViewLink || upload.webViewLink || meta.webContentLink || upload.webContentLink,
  };
}

async function handleStorageUpload(request, response) {
  const body = await readJson(request);
  const provider = body.provider === "google" ? "google" : body.provider === "yandex" ? "yandex" : "";
  if (!provider) throw new Error("Выберите хранилище: yandex или google");
  const token = String(body.token || "").trim();
  if (!token) throw new Error("Токен хранилища не указан");
  const decoded = decodeImageFile(body.file || {}, 0);
  const file = {
    ...decoded,
    name: safeStorageFilename(body.file?.name || decoded.name, decoded.type),
  };
  const result =
    provider === "yandex"
      ? await uploadToYandexDisk({ token, folderPath: body.yandexPath, file })
      : await uploadToGoogleDrive({ token, folderId: String(body.googleFolderId || "").trim(), file });
  if (!result.publicUrl) throw new Error("Хранилище загрузило файл, но не вернуло публичную ссылку");
  sendJson(response, 200, { ok: true, ...result });
}

async function handleJiraTest(request, response) {
  const body = await readJson(request);
  const connection = normalizeConnection(body);
  const version = connection.type === "cloud" ? "3" : "2";
  const user = await jiraFetch(connection, `/rest/api/${version}/myself`);
  sendJson(response, 200, {
    ok: true,
    displayName: user.displayName,
    name: user.emailAddress || user.name || user.accountId,
  });
}

async function handleJiraComment(request, response) {
  const body = await readJson(request);
  const connection = normalizeConnection(body);
  const { issueUrl, issueKey } = parseIssueReference(connection, body.issueUrl);
  const cloud = connection.type === "cloud";
  const expectedFormat = cloud ? "adf" : "wiki";
  if (body.comment?.format !== expectedFormat || !body.comment?.body) {
    throw new Error(`Для выбранной Jira требуется формат комментария ${expectedFormat}`);
  }
  const version = cloud ? "3" : "2";
  const commentPath = `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/comment`;
  let beforeSnapshot = { total: null, comments: [] };
  let beforeError = "";
  try {
    beforeSnapshot = await readRecentComments(connection, commentPath);
  } catch (error) {
    if (error.code === "JIRA_SECURITY_CHALLENGE") throw error;
    beforeError = error.message;
  }

  const creation = await jiraFetch(
    connection,
    commentPath,
    {
      method: "POST",
      body: JSON.stringify({ body: body.comment.body }),
      returnMeta: true,
    },
  );
  const result = creation.payload || {};
  let commentId =
    (result.id ? String(result.id) : "") ||
    commentIdFromReference(result.self) ||
    commentIdFromReference(creation.location);
  let verificationSource = "create-response";
  let afterSnapshot = { total: null, comments: [] };
  let afterError = "";

  if (!commentId) {
    try {
      afterSnapshot = await readRecentComments(connection, commentPath);
    } catch (error) {
      if (error.code === "JIRA_SECURITY_CHALLENGE") throw error;
      afterError = error.message;
    }
    const comments = afterSnapshot.comments;
    const previousIds = new Set(beforeSnapshot.comments.map((comment) => String(comment.id || "")));
    const newlyCreated = comments.filter(
      (comment) => comment.id && !previousIds.has(String(comment.id)),
    );
    const normalizeCommentBody = (value) =>
      typeof value === "string"
        ? value.replace(/\r\n/g, "\n").trim()
        : JSON.stringify(value);
    const expectedBody = normalizeCommentBody(body.comment.body);
    const candidates =
      beforeSnapshot.total === null && beforeSnapshot.comments.length === 0
        ? comments
        : newlyCreated;
    const matchingComment = [...candidates].reverse().find((comment) => {
      const actualBody = normalizeCommentBody(comment.body);
      return actualBody === expectedBody && comment.id;
    });
    const onlyNewComment = newlyCreated.length === 1 ? newlyCreated[0] : null;
    commentId = matchingComment?.id
      ? String(matchingComment.id)
      : onlyNewComment?.id
        ? String(onlyNewComment.id)
        : "";
    verificationSource = matchingComment ? "comments-body-match" : "comments-id-diff";
  }

  if (!commentId) {
    const responsePreview = creation.rawText
      ? creation.rawText.replace(/\s+/g, " ").slice(0, 300)
      : "<пустой ответ>";
    const diagnostics = [
      `POST ${commentPath}: HTTP ${creation.status}`,
      `ответ: ${responsePreview}`,
      `Location: ${creation.location || "<нет>"}`,
      `комментариев до: ${beforeSnapshot.total ?? "неизвестно"}`,
      `после: ${afterSnapshot.total ?? "неизвестно"}`,
      beforeError ? `ошибка чтения до POST: ${beforeError}` : "",
      afterError ? `ошибка чтения после POST: ${afterError}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(
      `Jira не подтвердила создание комментария. ${diagnostics}`,
    );
  }

  let verifiedComment;
  try {
    verifiedComment = await jiraFetch(
      connection,
      `${commentPath}/${encodeURIComponent(commentId)}`,
    );
  } catch (error) {
    throw new Error(
      `Комментарий получил ID ${commentId}, но контрольное чтение не удалось: ${error.message}`,
    );
  }
  if (!verifiedComment?.id || String(verifiedComment.id) !== commentId) {
    throw new Error(`Jira не подтвердила чтение созданного комментария ${commentId}`);
  }

  sendJson(response, 201, {
    ok: true,
    verified: true,
    verificationSource,
    commentId,
    issueUrl: issueUrl.toString(),
    commentUrl: `${connection.baseUrl}/browse/${encodeURIComponent(issueKey)}?focusedCommentId=${encodeURIComponent(commentId)}#comment-${encodeURIComponent(commentId)}`,
  });
}

async function handleJiraImportComment(request, response) {
  const body = await readJson(request);
  const connection = normalizeConnection(body);
  const { issueUrl, issueKey } = parseIssueReference(connection, body.commentUrl);
  const commentId = parseCommentId(issueUrl);
  const cloud = connection.type === "cloud";
  const version = cloud ? "3" : "2";
  const comment = await jiraFetch(
    connection,
    `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/comment/${encodeURIComponent(commentId)}`,
  );
  let attachments = [];
  try {
    const issue = await jiraFetch(
      connection,
      `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}?fields=attachment`,
    );
    attachments = (issue.fields?.attachment || []).map((item) => ({
      id: String(item.id),
      filename: item.filename,
      content: item.content,
      thumbnail: item.thumbnail,
      mimeType: item.mimeType,
    }));
  } catch {
    // Комментарий можно импортировать и без доступа к списку вложений.
  }
  sendJson(response, 200, {
    ok: true,
    format: cloud ? "adf" : "wiki",
    body: comment.body,
    issueUrl: `${connection.baseUrl}/browse/${encodeURIComponent(issueKey)}`,
    commentId,
    attachments,
  });
}

async function handleJiraAttachments(request, response) {
  const body = await readJson(request);
  const connection = normalizeConnection(body);
  const { issueKey } = parseIssueReference(connection, body.issueUrl);
  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) return sendJson(response, 200, { ok: true, attachments: [] });
  if (files.length > 20) throw new Error("За один раз можно загрузить не более 20 изображений");
  const version = connection.type === "cloud" ? "3" : "2";
  const normalizedFiles = files.map(decodeImageFile);
  const usedNames = new Set();
  const usedScreenshotNumbers = [];
  let attachmentListAvailable = false;
  try {
    const issue = await jiraFetch(
      connection,
      `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}?fields=attachment`,
    );
    for (const attachment of issue.fields?.attachment || []) {
      if (!attachment.filename) continue;
      const filename = String(attachment.filename).toLowerCase();
      usedNames.add(filename);
      const match = filename.match(/^screenshot-(\d+)\.[a-z0-9]+$/i);
      if (match) usedScreenshotNumbers.push(Number(match[1]));
    }
    attachmentListAvailable = true;
  } catch {
    // Если у пользователя нет права читать список вложений, загрузка всё равно
    // продолжится. Имена текущей пачки останутся уникальными между собой.
  }
  let screenshotNumber = Math.max(0, ...usedScreenshotNumbers) + 1;
  const fallbackPrefix = `screenshot-${Date.now()}`;
  normalizedFiles.forEach((file, index) => {
    const extension = path.extname(file.name) || ".png";
    if (!attachmentListAvailable) {
      file.name = `${fallbackPrefix}-${index + 1}${extension}`;
      usedNames.add(file.name.toLowerCase());
      return;
    }
    const requestedName = file.name.toLowerCase();
    const requestedMatch = requestedName.match(/^screenshot-(\d+)\.[a-z0-9]+$/i);
    let candidate = "";
    if (requestedMatch && !usedNames.has(requestedName)) {
      candidate = file.name;
      screenshotNumber = Math.max(screenshotNumber, Number(requestedMatch[1]) + 1);
    } else {
      do {
        candidate = `screenshot-${screenshotNumber}${extension}`;
        screenshotNumber += 1;
      } while (usedNames.has(candidate.toLowerCase()));
    }
    file.name = candidate;
    usedNames.add(candidate.toLowerCase());
  });
  const results = [];
  for (const file of normalizedFiles) {
    const form = new FormData();
    form.append("file", new Blob([file.bytes], { type: file.type }), file.name);
    let uploaded;
    try {
      uploaded = await jiraFetch(
        connection,
        `/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/attachments`,
        {
          method: "POST",
          body: form,
          headers: { "X-Atlassian-Token": "no-check" },
        },
      );
    } catch (error) {
      throw new Error(
        `Не удалось загрузить «${file.name}» (${file.type}, ${file.bytes.length} байт): ${error.message}`,
      );
    }
    const item = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (!item?.id) {
      throw new Error(`Jira не вернула данные вложения для файла «${file.name}»`);
    }
    results.push({
      attachmentId: file.attachmentId,
      id: item.id,
      filename: item.filename || file.name,
      content: item.content,
      thumbnail: item.thumbnail,
    });
  }
  sendJson(response, 200, { ok: true, attachments: results });
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function emailFeedback(metadata, files, report) {
  const apiKey = readSecret("RESEND_API_KEY");
  const to = process.env.FEEDBACK_TO_EMAIL || "maldenbergsergey@gmail.com";
  if (!apiKey) return { emailed: false, configured: false, reason: "email-not-configured" };
  const from = process.env.FEEDBACK_FROM_EMAIL || "QA Report <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `QA Report — обратная связь ${metadata.id}`,
      html: `
        <h2>Новое обращение QA Report</h2>
        <p><strong>Контакт:</strong> ${escapeHtmlText(metadata.contact || "не указан")}</p>
        <p><strong>Время:</strong> ${escapeHtmlText(metadata.createdAt)}</p>
        <p><strong>Страница:</strong> ${escapeHtmlText(metadata.pageUrl)}</p>
        <p><strong>Viewport:</strong> ${escapeHtmlText(metadata.viewport)}</p>
        <h3>Описание</h3>
        <p>${escapeHtmlText(metadata.message).replace(/\n/g, "<br>")}</p>
        <p>Текущий отчёт: ${metadata.reportIncluded ? "приложен в report.json" : "не приложен"}</p>
      `,
      attachments: [
        ...files.map((file) => ({
          filename: file.name,
          content: file.bytes.toString("base64"),
        })),
        ...(report
          ? [{
              filename: "report.json",
              content: Buffer.from(JSON.stringify(report, null, 2)).toString("base64"),
            }]
          : []),
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      emailed: false,
      configured: true,
      reason: payload.message || `Resend HTTP ${response.status}`,
    };
  }
  return { emailed: true, configured: true, emailId: payload.id || "" };
}

async function handleFeedback(request, response) {
  const clientAddress = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (feedbackRateLimit.get(clientAddress) || []).filter(
    (timestamp) => now - timestamp < 10 * 60 * 1000,
  );
  if (recent.length >= 5) {
    const error = new Error("Слишком много обращений. Попробуйте снова через несколько минут");
    error.status = 429;
    throw error;
  }
  recent.push(now);
  feedbackRateLimit.set(clientAddress, recent);
  const body = await readJson(request);
  const message = String(body.message || "").trim();
  if (!message) throw new Error("Описание проблемы не заполнено");
  if (message.length > 20000) throw new Error("Описание проблемы слишком длинное");
  const rawFiles = Array.isArray(body.files) ? body.files : [];
  if (rawFiles.length > 6) throw new Error("Можно приложить не более 6 изображений");
  const files = rawFiles.map((file, index) =>
    decodeImageFile({ ...file, attachmentId: `feedback-${index + 1}` }, index),
  );
  const totalSize = files.reduce((sum, file) => sum + file.bytes.length, 0);
  if (totalSize > 20 * 1024 * 1024) throw new Error("Общий размер изображений больше 20 МБ");

  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const entryDir = path.join(FEEDBACK_DIR, id);
  await fs.promises.mkdir(entryDir, { recursive: true });
  const metadata = {
    id,
    createdAt: new Date().toISOString(),
    contact: String(body.contact || "").trim().slice(0, 500),
    message,
    pageUrl: String(body.pageUrl || "").slice(0, 2000),
    userAgent: String(body.userAgent || "").slice(0, 1000),
    viewport: String(body.viewport || "").slice(0, 100),
    theme: String(body.theme || "").slice(0, 40),
    reportIncluded: Boolean(body.report),
    attachments: files.map((file) => ({ name: file.name, type: file.type, size: file.bytes.length })),
  };
  await Promise.all([
    fs.promises.writeFile(path.join(entryDir, "feedback.json"), JSON.stringify(metadata, null, 2)),
    ...(body.report
      ? [fs.promises.writeFile(path.join(entryDir, "report.json"), JSON.stringify(body.report, null, 2))]
      : []),
    ...files.map((file) => fs.promises.writeFile(path.join(entryDir, file.name), file.bytes)),
  ]);

  const mail = await emailFeedback(metadata, files, body.report || null).catch((error) => ({
    emailed: false,
    configured: true,
    reason: error.message,
  }));
  if (mail.configured && !mail.emailed) {
    const error = new Error(
      `Обращение сохранено, но email не отправлен: ${mail.reason || "неизвестная ошибка"}`,
    );
    error.status = 502;
    throw error;
  }
  sendJson(response, 201, {
    ok: true,
    feedbackId: id,
    stored: true,
    emailed: mail.emailed,
    emailId: mail.emailId || "",
    emailReason: mail.reason || "",
  });
}

function serveStatic(request, response) {
  const requestPath = new URL(request.url, "http://localhost").pathname;
  const relative = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, "index.html")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url, "http://localhost").pathname;
    if (request.method === "GET" && requestPath === "/api/health") {
      sendJson(response, 200, { ok: true, service: "qa-report" });
      return;
    }
    if (request.method === "POST" && requestPath === "/api/jira/test") {
      await handleJiraTest(request, response);
      return;
    }
    if (request.method === "POST" && requestPath === "/api/jira/comment") {
      await handleJiraComment(request, response);
      return;
    }
    if (request.method === "POST" && requestPath === "/api/jira/import-comment") {
      await handleJiraImportComment(request, response);
      return;
    }
    if (request.method === "POST" && requestPath === "/api/jira/attachments") {
      await handleJiraAttachments(request, response);
      return;
    }
    if (request.method === "POST" && requestPath === "/api/storage/upload") {
      await handleStorageUpload(request, response);
      return;
    }
    if (request.method === "POST" && requestPath === "/api/feedback") {
      await handleFeedback(request, response);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Метод не поддерживается" });
      return;
    }
    serveStatic(request, response);
  } catch (error) {
    const status = error.status || 400;
    sendJson(response, status, {
      error: error.message || "Неизвестная ошибка",
      errorCode: error.code || "",
      jiraPath: error.pathname || "",
    });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Порт ${PORT} уже занят. Вероятно, QA Report уже запущен: http://${HOST}:${PORT}`,
    );
    console.error(
      `Остановите предыдущий процесс или запустите приложение на другом порту: PORT=4174 node server.js`,
    );
    process.exit(1);
  }
  console.error(`Не удалось запустить QA Report: ${error.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`QA Report: http://${HOST}:${PORT}`);
});
