"use strict";
const $ = (id) => document.getElementById(id);
let current = {}, working = false, editing = false, editingId = "", listKey = "";
function render(state) {
  current = state;
  document.documentElement.dataset.theme = state.theme || "system";
  $("version").textContent = `v${state.version}`;
  $("status").textContent = state.message;
  $("status").classList.toggle("online", state.connected);
  $("pairing").textContent = state.paired ? state.serverUrl : "Откройте агент из настроек QA Report.";
  $("settings").hidden = !editing;
  $("add").disabled = working || editing || !state.paired;
  $("save").disabled = working || !state.paired;
  $("save").textContent = working ? "Проверяем подключение…" : "Сохранить и проверить";
  $("cancel").disabled = working;
  const jiras = state.jiras || [];
  $("empty").hidden = jiras.length > 0 || editing;
  const key = JSON.stringify([jiras, working]);
  if (key !== listKey) {
    listKey = key;
    const cards = jiras.map(jira => {
      const card = document.createElement("article"); card.className = "connection";
      const icon = document.createElement("span"); icon.className = "jira-icon"; icon.textContent = "J"; icon.setAttribute("aria-hidden", "true");
      const body = document.createElement("div"); body.className = "connection-body";
      const title = document.createElement("strong"); title.textContent = jira.label || new URL(jira.baseUrl).host;
      const address = document.createElement("small"); address.className = "muted"; address.textContent = jira.baseUrl;
      const actions = document.createElement("div"); actions.className = "actions";
      for (const [label, action] of [["Проверить", () => perform(() => window.agent.test(jira.id))], ["Изменить", () => edit(jira)], ["Удалить", () => perform(() => window.agent.remove(jira.id), "Удаляем подключение…")]]) {
        const button = document.createElement("button"); button.type = "button"; button.className = "secondary compact";
        button.textContent = label; button.disabled = working;
        button.setAttribute("aria-label", `${label}: ${jira.label || jira.baseUrl}`);
        button.addEventListener("click", action); actions.append(button);
      }
      body.append(title, address, actions); card.append(icon, body); return card;
    });
    $("connections").replaceChildren(...cards);
  }
  $("autoStartField").hidden = !state.loginSupported;
  $("autoStart").checked = state.autoStart;
  $("autoStart").disabled = working;
  $("automaticUpdates").checked = state.automaticUpdates !== false;
  $("automaticUpdates").disabled = working;
  const update = state.update || {};
  $("updateStatus").textContent = update.message || "Проверяем новые версии автоматически.";
  $("updateVersion").hidden = !update.version || ["idle", "current", "checking"].includes(update.phase);
  $("updateVersion").textContent = `${update.required ? "Нужно обновить · " : ""}v${update.version || ""}`;
  $("updateProgress").hidden = update.phase !== "downloading";
  $("updateProgress").value = update.progress || 0;
  $("updateNotes").hidden = !update.notes?.length;
  const notes = (update.notes || []).map(text => { const li = document.createElement("li"); li.textContent = text; return li; });
  $("updateNotes").replaceChildren(...notes);
  $("checkUpdate").disabled = working || ["checking", "downloading"].includes(update.phase);
  $("checkUpdate").textContent = update.phase === "checking" ? "Проверяем…" : "Проверить сейчас";
  $("updateAction").hidden = !["available", "ready", "installer"].includes(update.phase);
  $("updateAction").disabled = working;
  $("updateAction").textContent = update.phase === "ready" ? "Установить и перезапустить" : update.phase === "installer" ? "Скачать приложение" : "Загрузить обновление";
  fields();
}
function fields() {
  const curl = $("mode").value === "curl";
  $("manual").hidden = curl; $("curlFields").hidden = !curl;
  let cloud = false;
  try { cloud = new URL($("baseUrl").value).hostname.endsWith(".atlassian.net"); } catch {}
  $("userField").hidden = $("mode").value !== "basic" && !cloud;
  $("tokenLabel").textContent = cloud ? "API token Atlassian" : $("mode").value === "basic" ? "Пароль Jira" : "Personal Access Token";
}
function edit(jira = {}) {
  editing = true; editingId = jira.id || "";
  $("formTitle").textContent = jira.id ? "Изменить подключение" : "Новое подключение";
  $("label").value = jira.label || ""; $("baseUrl").value = jira.baseUrl || "";
  $("mode").value = jira.authMethod === "cookie" ? "curl" : ["basic", "api-token"].includes(jira.authMethod) ? "basic" : "pat";
  for (const id of ["user", "token", "curl"]) $(id).value = "";
  render(current); $("label").focus();
}
async function perform(action, message = "Проверяем…") {
  working = true; render(current); $("result").textContent = message;
  try {
    const result = await action();
    if (!result.ok) throw new Error(result.error);
    $("result").textContent = typeof result.value === "string" ? result.value : "";
    if (result.value && typeof result.value === "object") render(result.value);
    return result.ok;
  } catch (error) { $("result").textContent = error.message; }
  finally { working = false; render(current); }
}
$("add").addEventListener("click", () => edit());
$("cancel").addEventListener("click", () => { editing = false; editingId = ""; for (const id of ["token", "curl"]) $(id).value = ""; render(current); });
$("mode").addEventListener("change", fields); $("baseUrl").addEventListener("input", fields);
$("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = { id: editingId, ...Object.fromEntries(["label", "mode", "baseUrl", "user", "token", "curl"].map(key => [key, $(key).value])) };
  const ok = await perform(() => window.agent.save(form));
  if (ok) { $("token").value = ""; $("curl").value = ""; editing = false; render(current); }
});
$("autoStart").addEventListener("change", event => { const enabled = event.currentTarget.checked; perform(() => window.agent.autoStart(enabled), "Сохраняем…"); });
$("automaticUpdates").addEventListener("change", event => { const enabled = event.currentTarget.checked; perform(() => window.agent.automaticUpdates(enabled), "Сохраняем…"); });
$("checkUpdate").addEventListener("click", () => perform(() => window.agent.checkUpdate(), "Проверяем обновления…"));
$("updateAction").addEventListener("click", () => {
  const phase = current.update?.phase;
  perform(() => phase === "ready" ? window.agent.installUpdate() : phase === "installer" ? window.agent.openDownloads() : window.agent.downloadUpdate(), phase === "ready" ? "Завершаем задания и перезапускаем агент…" : "Загружаем обновление…");
});
window.agent.onStatus(render);
window.agent.state().then(result => {
  if (result.ok) { render(result.value); window.agent.ready(); }
  else $("result").textContent = result.error;
});
