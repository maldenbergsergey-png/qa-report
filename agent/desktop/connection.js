"use strict";
const core = require("../qa-report-agent");

function parseLink(value) {
  if (typeof value !== "string" || value.length > 4096) throw new Error("Некорректная ссылка подключения");
  const url = new URL(value);
  if (url.protocol !== "qareport-agent:" || url.hostname !== "connect" || !["", "/"].includes(url.pathname) || url.username || url.password || url.port) {
    throw new Error("Неизвестная команда агента");
  }
  const serverUrl = core.normalizeServerUrl(url.searchParams.get("server"));
  const server = new URL(serverUrl);
  if (server.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(server.hostname)) {
    throw new Error("Для подключения к QA Report нужен HTTPS");
  }
  const code = url.searchParams.get("code") || "";
  if (!/^\d{8}$/.test(code)) throw new Error("Ссылка устарела или повреждена. Нажмите «Подключить» в QA Report ещё раз.");
  const theme = url.searchParams.get("theme");
  return { serverUrl, code, ...(["light", "dark", "graphite"].includes(theme) ? { theme } : {}) };
}

function jiraFromForm(form) {
  if (!form || typeof form !== "object") throw new Error("Заполните настройки Jira");
  let jira;
  if (form.mode === "curl") {
    jira = core.parseCurlCredentials(String(form.curl || ""));
  } else {
    if (!["pat", "basic"].includes(form.mode)) throw new Error("Выберите способ входа");
    const baseUrl = core.jiraBaseFromUrl(String(form.baseUrl || "").trim());
    const cloud = new URL(baseUrl).hostname.endsWith(".atlassian.net");
    jira = { baseUrl, type: cloud ? "cloud" : "data-center", authMethod: cloud ? "api-token" : form.mode,
      user: String(form.user || "").trim(), token: String(form.token || "").trim() };
  }
  const url = new URL(jira.baseUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Укажите HTTPS-адрес Jira без логина и пароля в ссылке");
  if (!jira.token || /[\r\n]/.test(jira.token)) throw new Error("Укажите корректный токен или данные сессии Jira");
  if (["basic", "api-token"].includes(jira.authMethod) && !jira.user) throw new Error("Укажите логин или email Atlassian");
  return jira;
}
module.exports = { parseLink, jiraFromForm };
