"use strict";
const { version } = require("../package.json");
const API_USER_AGENT = `QA-Report-Agent/${version}`;

function createJiraTransport(networkSession) {
  return async (url, options = {}) => {
    const target = new URL(url);
    if (!["https:", "http:"].includes(target.protocol)) throw new Error("Недопустимый протокол Jira");
    // Jira applies additional browser XSRF checks to Chromium's default UA.
    // This isolated main-process transport is an API client with explicit auth.
    const headers = new Headers(options.headers);
    headers.set("User-Agent", API_USER_AGENT);
    try {
      return await networkSession.fetch(target.href, {
        ...options,
        headers,
        // Use Chromium's certificate chain builder and OS trust decisions.
        // Keep redirects manual and credentials explicit; no ambient session login.
        redirect: "manual", credentials: "omit", cache: "no-store",
      });
    } catch (error) {
      if (/redirect was cancelled/i.test(String(error.message))) {
        throw new Error("Jira перенаправляет запрос. Проверьте адрес Jira или используйте вход через Copy as cURL для SSO.");
      }
      const code = String(error.message || "").match(/ERR_CERT_[A-Z_]+/)?.[0];
      if (!code) throw error;
      const reason = code === "ERR_CERT_DATE_INVALID" ? "Проверьте дату компьютера и срок действия сертификата Jira."
        : code === "ERR_CERT_COMMON_NAME_INVALID" ? "Сертификат выдан для другого адреса. Проверьте адрес Jira."
        : "Не удалось построить доверенную цепочку. Проверьте VPN; если Jira не открывается в браузере без предупреждений, обратитесь в ИТ за корпоративным сертификатом.";
      const failure = new Error(`Не удалось проверить сертификат Jira. ${reason}`);
      failure.code = code;
      throw failure;
    }
  };
}
module.exports = { createJiraTransport };
