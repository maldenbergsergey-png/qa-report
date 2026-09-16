(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.QaReportJiraHeaders = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  // These headers belong to authentication or the HTTP transport, not this option.
  const reserved = new Set(["authorization", "proxy-authorization", "cookie", "cookie2", "host",
    "connection", "content-type", "content-length", "transfer-encoding", "te", "trailer", "upgrade",
    "keep-alive", "expect", "accept", "accept-encoding", "user-agent", "origin", "referer",
    "x-atlassian-token", "forwarded", "via"]);
  function normalize(input) {
    if (input == null) return null;
    if (typeof input !== "object" || Array.isArray(input) || typeof input.name !== "string" || typeof input.value !== "string") {
      throw new Error("Укажите имя и значение дополнительного заголовка Jira");
    }
    const { name, value } = input;
    if (!name && !value) return null;
    if (!name || !value.trim()) throw new Error("Заполните оба поля дополнительного заголовка Jira или очистите их");
    if (name.length > 128 || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error("Некорректное имя заголовка Jira: используйте латинские буквы, цифры и дефис");
    const lower = name.toLowerCase();
    if (reserved.has(lower) || /^(?:sec-|proxy-|x-forwarded-)/.test(lower)) throw new Error("Этот служебный заголовок нельзя задать в дополнительной настройке Jira");
    if (value.length > 4096 || /[^\x20-\x7e]/.test(value)) throw new Error("Значение заголовка Jira должно содержать до 4096 печатных ASCII-символов без переносов строк");
    return { name, value };
  }
  function headers(connection, target = connection.baseUrl) {
    const header = normalize(connection.additionalHeader);
    if (!header) return {};
    const base = new URL(connection.baseUrl), url = new URL(target);
    const prefix = base.pathname.replace(/\/+$/, "");
    if (url.origin !== base.origin || url.username || url.password || (prefix && url.pathname !== prefix && !url.pathname.startsWith(prefix + "/"))) {
      throw new Error("Дополнительный заголовок нельзя отправить за пределы выбранной Jira");
    }
    return { [header.name]: header.value };
  }
  function baseKey(value) {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Укажите корректный адрес Jira");
    return url.origin + url.pathname.replace(/\/+$/, "");
  }
  return { normalize, headers, baseKey };
});
