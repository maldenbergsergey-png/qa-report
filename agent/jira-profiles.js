"use strict";
const { randomUUID } = require("node:crypto");

function listJiras(config) {
  return Array.isArray(config?.jiras) ? config.jiras : config?.jira ? [config.jira] : [];
}
function migrateConfig(config) {
  if (!config || Array.isArray(config.jiras)) return config;
  const next = { ...config, jiras: listJiras(config).map(jira => ({ ...jira, id: randomUUID(), label: "" })) };
  delete next.jira;
  return next;
}
function saveJira(config, jira, id = "", label = "") {
  const next = migrateConfig(config);
  if (id && !next.jiras.some(item => item.id === id)) throw new Error("Подключение Jira уже удалено");
  if (next.jiras.some(item => item.baseUrl === jira.baseUrl && item.id !== id)) throw new Error("Эта Jira уже добавлена. Измените её доступ в списке подключений.");
  if (!id && next.jiras.length >= 10) throw new Error("Можно сохранить до 10 подключений Jira");
  const saved = { ...jira, id: id || randomUUID(), label: String(label || "").trim().slice(0, 80) };
  return { ...next, jiras: id ? next.jiras.map(item => item.id === id ? saved : item) : [...next.jiras, saved] };
}
function removeJira(config, id) {
  const next = migrateConfig(config);
  if (!next.jiras.some(item => item.id === id)) throw new Error("Подключение Jira уже удалено");
  return { ...next, jiras: next.jiras.filter(item => item.id !== id) };
}
function publicJiras(config) {
  return listJiras(config).map(({ id, label, baseUrl, authMethod, type }) => ({ id, label, baseUrl, authMethod, type }));
}
module.exports = { listJiras, migrateConfig, saveJira, removeJira, publicJiras };
