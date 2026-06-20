const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY = 30 * 1024 * 1024;
const APP_VERSION = "0.2.2";
const API_REVISION = 4;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
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
  const authMethod = type === "cloud" ? "api-token" : input.authMethod === "basic" ? "basic" : "pat";
  if (!token) throw new Error(authMethod === "basic" ? "Пароль не указан" : "Токен не указан");
  if ((type === "cloud" || authMethod === "basic") && !user) {
    throw new Error(type === "cloud" ? "Email Atlassian не указан" : "Логин Jira не указан");
  }
  return { type, authMethod, baseUrl: baseUrl.toString().replace(/\/$/, ""), token, user };
}

function authHeaders(connection) {
  if (connection.type === "cloud" || connection.authMethod === "basic") {
    const credentials = Buffer.from(`${connection.user}:${connection.token}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }
  return { Authorization: `Bearer ${connection.token}` };
}

async function jiraFetch(connection, pathname, options = {}) {
  const { returnMeta = false, ...fetchOptions } = options;
  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  const response = await fetch(`${connection.baseUrl}${pathname}`, {
    ...fetchOptions,
    headers: {
      Accept: "application/json",
      ...authHeaders(connection),
      ...(fetchOptions.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(fetchOptions.headers || {}),
    },
  });
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
  const normalizedFiles = files.map(decodeImageFile);
  const version = connection.type === "cloud" ? "3" : "2";
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
    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, { ok: true, service: "qa-report" });
      return;
    }
    if (request.method === "POST" && request.url === "/api/jira/test") {
      await handleJiraTest(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/jira/comment") {
      await handleJiraComment(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/jira/import-comment") {
      await handleJiraImportComment(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/jira/attachments") {
      await handleJiraAttachments(request, response);
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

server.listen(PORT, HOST, () => {
  console.log(`QA Report: http://${HOST}:${PORT}`);
});
