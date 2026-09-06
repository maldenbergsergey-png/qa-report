"use strict";
const $ = (id) => document.getElementById(id);
let current = {}, working = false, editing = false;
function render(state) {
  current = state;
  document.documentElement.dataset.theme = state.theme || "system";
  $("version").textContent = `v${state.version}`;
  $("status").textContent = state.message;
  $("status").classList.toggle("online", state.connected);
  if (state.paired) $("pairing").textContent = state.serverUrl;
  $("saved").hidden = !state.configured;
  $("settings").hidden = state.configured && !editing;
  $("edit").hidden = !state.configured;
  $("edit").textContent = editing ? "Отмена" : "Изменить доступ";
  $("saved").textContent = state.jiraUrl;
  if (!$("baseUrl").value && state.jiraUrl) $("baseUrl").value = state.jiraUrl;
  $("save").disabled = working || !state.paired;
  $("test").disabled = working || !state.configured;
  $("autoStartField").hidden = !state.loginSupported;
  $("autoStart").checked = state.autoStart;
  $("autoStart").disabled = working;
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
async function perform(action) {
  working = true; render(current); $("result").textContent = "Проверяем…";
  try {
    const result = await action();
    if (!result.ok) throw new Error(result.error);
    $("result").textContent = typeof result.value === "string" ? result.value : "Сохранено";
    if (typeof result.value === "object") render(result.value);
    return result.ok;
  } catch (error) { $("result").textContent = error.message; }
  finally { working = false; render(current); }
}
$("edit").addEventListener("click", () => { editing = !editing; render(current); });
$("mode").addEventListener("change", fields); $("baseUrl").addEventListener("input", fields);
$("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  const ok = await perform(() => window.agent.save(Object.fromEntries(["mode", "baseUrl", "user", "token", "curl"].map((key) => [key, $(key).value]))));
  if (ok) { $("token").value = ""; $("curl").value = ""; editing = false; render(current); }
});
$("test").addEventListener("click", () => perform(() => window.agent.test()));
$("autoStart").addEventListener("change", (event) => {
  const enabled = event.currentTarget.checked;
  perform(() => window.agent.autoStart(enabled));
});
window.agent.onStatus(render);
window.agent.state().then((result) => { if (result.ok) render(result.value); else $("result").textContent = result.error; });
