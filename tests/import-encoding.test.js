const test = require("node:test");
const assert = require("node:assert/strict");
const { repairImportText, parseJiraMarkup } = require("../jira-markup-import");
const misread = value => new TextDecoder("windows-1251").decode(new TextEncoder().encode(value));
const checklist = [
  "Окружение: DEV", "ТЕСТ — НЕ ОК", "h2. GET /realty/filters — Фильтры",
  "||Номер||Проверка||Ожидаемый результат||Статус||",
  '|1.|Линия метро|{{metro_line != null}}; [Документация|https://example.test/?a=1&b=2]|НЕ ОК|',
].join("\n");

test("Windows misdecoding is repaired before recognizing environment, number and status columns", () => {
  const parsed = parseJiraMarkup(misread(checklist));
  assert.equal(parsed.environment, "DEV");
  assert.equal(parsed.overallStatus, "НЕ ОК");
  assert.equal(parsed.intro, "");
  assert.equal(parsed.sections[0].title, "GET /realty/filters — Фильтры");
  assert.deepEqual(parsed.sections[0].columns.map(c => c.title), ["Проверка", "Ожидаемый результат"]);
  assert.equal(parsed.sections[0].rows[0].status, "НЕ ОК");
  const cells = Object.values(parsed.sections[0].rows[0].cells);
  assert.equal(cells[0], "Линия метро");
  assert.match(cells[1], /metro_line != null/);
  assert.match(cells[1], /https:\/\/example.test\/\?a=1&amp;b=2/);
});

test("repeated misdecoding, punctuation and mixed intact text recover without further changes on re-import", () => {
  for (let damaged = checklist, depth = 0; depth <= 3; depth++, damaged = misread(damaged)) {
    assert.equal(repairImportText(damaged), checklist, `depth ${depth}`);
    assert.equal(repairImportText(repairImportText(damaged)), checklist);
  }
  const mixed = `Текст в порядке: ${misread("Проверено — ёж, № 2, ✓ 😀")}; конец`;
  assert.equal(repairImportText(mixed), "Текст в порядке: Проверено — ёж, № 2, ✓ 😀; конец");
  assert.equal(repairImportText(misread("НЕ ОК")), "НЕ ОК");
});

test("normal Unicode, code, ambiguous short sequences and irreversibly lost letters remain unchanged", () => {
  for (const value of [checklist, "Привет, мир! Ёжик № 1 — 20 °C ✓ 😀", "Українська мова: ґ, є, і, ї. Беларуская: ў.",
    'const x = "Русский"; GET /api?a=1&b=2; {{foo != bar}}', "Р° + Р° + Р°", "СЃ РЎ", "Р�Р� ??", "cafè naïve Ελληνικά 日本語"]) {
    assert.equal(repairImportText(value), value);
  }
});
