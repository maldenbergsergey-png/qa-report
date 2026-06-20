const STORAGE_KEY = "qa-report-editor-draft-v2";
const JIRA_SETTINGS_KEY = "qa-report-jira-settings-v1";
const DB_NAME = "qa-report-editor";
const DB_VERSION = 1;
const REPORT_STORE = "reports";
const HISTORY_LIMIT = 50;
const REQUIRED_API_REVISION = 4;

const STATUS_META = {
  OK: { className: "status-ok", color: "#22a06b", jiraColor: "#14892c" },
  "НЕ ОК": { className: "status-fail", color: "#c9372c", jiraColor: "#de350b" },
  "ПОЧТИ ОК": { className: "status-almost", color: "#579dff", jiraColor: "#59afe1" },
  "НЕ ПРОВЕРЕНО": { className: "status-unchecked", color: "#8270db", jiraColor: "#654982" },
  "ЧАСТИЧНО ПРОВЕРЕНО": {
    className: "status-partial",
    color: "#f18d13",
    jiraColor: "#ff8b00",
  },
};

const DEFAULT_COLUMNS = [
  { id: "check", title: "Проверка" },
  { id: "expected", title: "Ожидаемый результат" },
  { id: "actual", title: "Фактический результат" },
  { id: "comment", title: "Комментарий" },
];

function createRow(columns = DEFAULT_COLUMNS) {
  return {
    id: crypto.randomUUID(),
    status: "НЕ ПРОВЕРЕНО",
    cells: Object.fromEntries(columns.map((column) => [column.id, ""])),
  };
}

function createSection(title = "Основные проверки", columns = DEFAULT_COLUMNS, rowCount = 1) {
  const copiedColumns = columns.map((column) => ({ ...column }));
  return {
    id: crypto.randomUUID(),
    title,
    collapsed: false,
    columns: copiedColumns,
    rows: Array.from({ length: rowCount }, () => createRow(copiedColumns)),
  };
}

const DEFAULT_DRAFT = {
  reportId: crypto.randomUUID(),
  schemaVersion: 3,
  issueUrl: "",
  environment: "STAGE",
  overallStatus: "OK",
  intro: "",
  sections: [createSection("Основные проверки", DEFAULT_COLUMNS, 2)],
};

const elements = {
  issueUrl: document.querySelector("#issueUrl"),
  environment: document.querySelector("#environment"),
  overallStatus: document.querySelector("#overallStatus"),
  introEditor: document.querySelector("#introEditor"),
  sections: document.querySelector("#sections"),
  sectionTemplate: document.querySelector("#sectionTemplate"),
  addSectionButton: document.querySelector("#addSectionButton"),
  previewButton: document.querySelector("#previewButton"),
  copyButton: document.querySelector("#copyButton"),
  clearButton: document.querySelector("#clearButton"),
  importButton: document.querySelector("#importButton"),
  previewModal: document.querySelector("#previewModal"),
  closePreviewButton: document.querySelector("#closePreviewButton"),
  visualPreview: document.querySelector("#visualPreview"),
  markupPreview: document.querySelector("#markupPreview"),
  modalCopyButton: document.querySelector("#modalCopyButton"),
  importModal: document.querySelector("#importModal"),
  closeImportButton: document.querySelector("#closeImportButton"),
  importMarkup: document.querySelector("#importMarkup"),
  importWarning: document.querySelector("#importWarning"),
  applyImportButton: document.querySelector("#applyImportButton"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryChart: document.querySelector("#summaryChart"),
  summaryList: document.querySelector("#summaryList"),
  saveState: document.querySelector("#saveState"),
  toast: document.querySelector("#toast"),
  blockFormat: document.querySelector("#blockFormat"),
  linkButton: document.querySelector("#linkButton"),
  themeToggle: document.querySelector("#themeToggle"),
  jiraSettingsButton: document.querySelector("#jiraSettingsButton"),
  publishButton: document.querySelector("#publishButton"),
  jiraSettingsModal: document.querySelector("#jiraSettingsModal"),
  closeJiraSettingsButton: document.querySelector("#closeJiraSettingsButton"),
  jiraType: document.querySelector("#jiraType"),
  jiraAuthMethod: document.querySelector("#jiraAuthMethod"),
  jiraAuthMethodField: document.querySelector("#jiraAuthMethodField"),
  jiraBaseUrl: document.querySelector("#jiraBaseUrl"),
  jiraUserField: document.querySelector("#jiraUserField"),
  jiraUser: document.querySelector("#jiraUser"),
  jiraUserLabel: document.querySelector("#jiraUserLabel"),
  jiraToken: document.querySelector("#jiraToken"),
  jiraTokenLabel: document.querySelector("#jiraTokenLabel"),
  jiraConnectionState: document.querySelector("#jiraConnectionState"),
  testJiraButton: document.querySelector("#testJiraButton"),
  saveJiraSettingsButton: document.querySelector("#saveJiraSettingsButton"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  historyButton: document.querySelector("#historyButton"),
  focusModeButton: document.querySelector("#focusModeButton"),
  focusExitButton: document.querySelector("#focusExitButton"),
  codeButton: document.querySelector("#codeButton"),
  imageButton: document.querySelector("#imageButton"),
  imageInput: document.querySelector("#imageInput"),
  appendImportButton: document.querySelector("#appendImportButton"),
  commentImportUrl: document.querySelector("#commentImportUrl"),
  markupImportPane: document.querySelector("#markupImportPane"),
  commentImportPane: document.querySelector("#commentImportPane"),
  importSummary: document.querySelector("#importSummary"),
  historyModal: document.querySelector("#historyModal"),
  closeHistoryButton: document.querySelector("#closeHistoryButton"),
  historySearch: document.querySelector("#historySearch"),
  historyUsage: document.querySelector("#historyUsage"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  saveHistorySnapshotButton: document.querySelector("#saveHistorySnapshotButton"),
};

let draft = loadDraft();
let saveTimer;
let toastTimer;
let activeEditor = elements.introEditor;
let savedEditorRange = null;
let floatingMenu = null;
let jiraSecret = "";
let jiraSettings = loadJiraSettings();
let undoStack = [];
let redoStack = [];
let historyCurrent = "";
let historyTimer;
let suppressHistory = false;
let importSource = "markup";
let pendingImportedDraft = null;
let dbPromise;
let draggedCodeBlock = null;

applyTheme(localStorage.getItem("qa-report-theme") || "light");
historyCurrent = serializeDraft();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(DEFAULT_DRAFT);
    const parsed = JSON.parse(saved);
    return {
      ...clone(DEFAULT_DRAFT),
      ...parsed,
      reportId: parsed.reportId || crypto.randomUUID(),
      schemaVersion: 3,
      issueUrl: parsed.issueUrl || "",
    };
  } catch {
    return clone(DEFAULT_DRAFT);
  }
}

function loadJiraSettings() {
  try {
    return {
      type: "data-center",
      authMethod: "pat",
      baseUrl: "",
      user: "",
      ...JSON.parse(localStorage.getItem(JIRA_SETTINGS_KEY) || "{}"),
    };
  } catch {
    return { type: "data-center", authMethod: "pat", baseUrl: "", user: "" };
  }
}

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        const store = db.createObjectStore(REPORT_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function dbTransaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORT_STORE, mode);
    const store = transaction.objectStore(REPORT_STORE);
    let result;
    try {
      result = action(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

function issueKeyFromUrl(value) {
  try {
    return new URL(value).pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i)?.[1]?.toUpperCase() || "";
  } catch {
    return "";
  }
}

async function saveReportSnapshot(reason = "manual") {
  collectDocumentFields();
  const now = new Date().toISOString();
  const existing = await getReportRecord(draft.reportId);
  const issueKey = issueKeyFromUrl(draft.issueUrl);
  const record = {
    id: draft.reportId,
    title: `${issueKey || "Без задачи"} — ${draft.environment}`,
    issueUrl: draft.issueUrl,
    issueKey,
    environment: draft.environment,
    overallStatus: draft.overallStatus,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastOpenedAt: now,
    reason,
    document: clone(draft),
    schemaVersion: 3,
  };
  await dbTransaction("readwrite", (store) => store.put(record));
  await trimReportHistory();
  return record;
}

async function getReportRecord(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(REPORT_STORE, "readonly").objectStore(REPORT_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllReports() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(REPORT_STORE, "readonly").objectStore(REPORT_STORE).getAll();
    request.onsuccess = () =>
      resolve((request.result || []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}

async function deleteReportRecord(id) {
  await dbTransaction("readwrite", (store) => store.delete(id));
}

async function trimReportHistory() {
  const reports = await getAllReports();
  for (const report of reports.slice(HISTORY_LIMIT)) await deleteReportRecord(report.id);
}

async function clearReportHistory() {
  await dbTransaction("readwrite", (store) => store.clear());
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Большие отчёты с изображениями продолжают сохраняться в IndexedDB.
  }
  elements.saveState.classList.remove("saving");
  elements.saveState.querySelector("span:last-child").textContent = "Черновик сохранён";
  queueMicrotask(() => saveReportSnapshot("autosave").catch(() => {}));
}

function scheduleSave() {
  elements.saveState.classList.add("saving");
  elements.saveState.querySelector("span:last-child").textContent = "Сохраняем…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 400);
  scheduleHistoryCommit();
}

function serializeDraft() {
  return JSON.stringify(draft);
}

function scheduleHistoryCommit() {
  if (suppressHistory) return;
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    collectDocumentFields();
    const next = serializeDraft();
    if (next === historyCurrent) return;
    undoStack.push(historyCurrent);
    if (undoStack.length > 100) undoStack.shift();
    historyCurrent = next;
    redoStack = [];
    updateHistoryButtons();
  }, 500);
}

function updateHistoryButtons() {
  elements.undoButton.disabled = undoStack.length === 0;
  elements.redoButton.disabled = redoStack.length === 0;
}

function restoreSerializedDraft(serialized) {
  suppressHistory = true;
  draft = JSON.parse(serialized);
  historyCurrent = serialized;
  render();
  saveDraft();
  suppressHistory = false;
  updateHistoryButtons();
}

function undo() {
  clearTimeout(historyTimer);
  collectDocumentFields();
  const current = serializeDraft();
  if (current !== historyCurrent) {
    undoStack.push(historyCurrent);
    historyCurrent = current;
  }
  const previous = undoStack.pop();
  if (!previous) return updateHistoryButtons();
  redoStack.push(historyCurrent);
  restoreSerializedDraft(previous);
}

function redo() {
  const next = redoStack.pop();
  if (!next) return updateHistoryButtons();
  undoStack.push(historyCurrent);
  restoreSerializedDraft(next);
}

function collectDocumentFields() {
  draft.issueUrl = elements.issueUrl.value;
  draft.environment = elements.environment.value;
  draft.overallStatus = elements.overallStatus.value;
  draft.intro = cleanEditorHtml(elements.introEditor);
}

function render() {
  elements.issueUrl.value = draft.issueUrl || "";
  elements.environment.value = draft.environment;
  elements.overallStatus.value = draft.overallStatus;
  setStatusClass(elements.overallStatus, draft.overallStatus);
  elements.introEditor.innerHTML = draft.intro;
  elements.introEditor.querySelectorAll("figcaption").forEach((caption) => caption.remove());
  highlightCodeBlocks(elements.introEditor);
  enhanceImageControls(elements.introEditor);
  draft.intro = cleanEditorHtml(elements.introEditor);
  renderSections();
  renderSummary();
}

function renderSections() {
  elements.sections.innerHTML = "";
  draft.sections.forEach((section) => {
    const fragment = elements.sectionTemplate.content.cloneNode(true);
    const sectionElement = fragment.querySelector(".check-section");
    sectionElement.dataset.sectionId = section.id;
    sectionElement.draggable = true;
    sectionElement.classList.toggle("collapsed", Boolean(section.collapsed));

    const title = fragment.querySelector(".section-title");
    title.value = section.title;
    title.addEventListener("input", () => {
      section.title = title.value;
      scheduleSave();
    });

    fragment.querySelector(".collapse-section").addEventListener("click", () => {
      section.collapsed = !section.collapsed;
      sectionElement.classList.toggle("collapsed", section.collapsed);
      scheduleSave();
    });
    fragment.querySelector(".move-section-up").addEventListener("click", () => moveSection(section.id, -1));
    fragment.querySelector(".move-section-down").addEventListener("click", () => moveSection(section.id, 1));
    fragment.querySelector(".delete-section").addEventListener("click", () => deleteSection(section.id));
    fragment.querySelector(".add-row-button").addEventListener("click", () => {
      section.rows.push(createRow(section.columns));
      renderSections();
      scheduleSave();
    });
    renderTable(fragment, section);
    enableSectionDragging(sectionElement, section.id);
    elements.sections.append(fragment);
    highlightCodeBlocks(sectionElement);
    enhanceImageControls(sectionElement);
  });
}

function renderTable(fragment, section) {
  const table = fragment.querySelector(".check-table");
  const colgroup = fragment.querySelector("colgroup");
  const header = fragment.querySelector("thead tr");
  const numberCol = document.createElement("col");
  numberCol.className = "number-col";
  colgroup.append(numberCol);
  header.append(createHeader("№"));

  let totalWidth = 52 + 164 + 46;
  section.columns.forEach((column, index) => {
    column.width = Math.max(140, Number(column.width) || 240);
    const col = document.createElement("col");
    col.className = "dynamic-col";
    col.style.width = `${column.width}px`;
    colgroup.append(col);
    const th = createColumnHeader(section, column, index);
    th.dataset.columnId = column.id;
    header.append(th);
    totalWidth += column.width;
  });

  const statusCol = document.createElement("col");
  statusCol.className = "status-col";
  const actionsCol = document.createElement("col");
  actionsCol.className = "actions-col";
  colgroup.append(statusCol, actionsCol);
  header.append(createStatusHeader(section), createHeader(""));
  table.style.width = `${totalWidth}px`;
  table.style.minWidth = "100%";

  const tbody = fragment.querySelector("tbody");
  section.rows.forEach((row, index) => tbody.append(createRowElement(section, row, index)));
}

function createHeader(content, html = false) {
  const th = document.createElement("th");
  if (html) th.innerHTML = content;
  else th.textContent = content;
  return th;
}

function createColumnHeader(section, column, index) {
  const th = document.createElement("th");
  th.className = "editable-column-header";
  const dragHandle = document.createElement("span");
  dragHandle.className = "column-drag-handle";
  dragHandle.textContent = "⋮⋮";
  dragHandle.title = "Перетащить столбец";
  dragHandle.draggable = true;
  dragHandle.addEventListener("dragstart", (event) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/column-id", column.id);
    const sectionElement = th.closest(".check-section");
    const cellIndex = [...th.parentElement.children].indexOf(th);
    sectionElement?.querySelectorAll(`tr > *:nth-child(${cellIndex + 1})`).forEach((cell) => {
      cell.classList.add("column-dragging");
    });
    const ghost = document.createElement("div");
    ghost.className = "column-drag-ghost";
    ghost.textContent = column.title || "Столбец";
    document.body.append(ghost);
    event.dataTransfer.setDragImage(ghost, 24, 20);
    requestAnimationFrame(() => ghost.remove());
  });
  dragHandle.addEventListener("dragend", () => {
    document.querySelectorAll(".column-dragging, .column-drag-over-before, .column-drag-over-after").forEach(
      (item) => item.classList.remove("column-dragging", "column-drag-over-before", "column-drag-over-after"),
    );
  });
  th.addEventListener("dragover", (event) => {
    if (![...event.dataTransfer.types].includes("text/column-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = th.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    th.classList.toggle("column-drag-over-before", !after);
    th.classList.toggle("column-drag-over-after", after);
  });
  th.addEventListener("dragleave", () => {
    th.classList.remove("column-drag-over-before", "column-drag-over-after");
  });
  th.addEventListener("drop", (event) => {
    const sourceId = event.dataTransfer.getData("text/column-id");
    if (!sourceId) return;
    event.preventDefault();
    event.stopPropagation();
    th.classList.remove("column-drag-over-before", "column-drag-over-after");
    const rect = th.getBoundingClientRect();
    moveColumnTo(section, sourceId, column.id, event.clientX > rect.left + rect.width / 2);
  });
  const input = document.createElement("input");
  input.value = column.title;
  input.setAttribute("aria-label", `Название столбца ${column.title}`);
  input.addEventListener("input", () => {
    column.title = input.value;
    input.setAttribute("aria-label", `Название столбца ${input.value || "Без названия"}`);
    scheduleSave();
  });
  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "column-menu-button";
  menuButton.textContent = "•••";
  menuButton.title = "Действия со столбцом";
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const items = [
      { label: "Вставить столбец слева", action: () => insertColumn(section, index) },
      { label: "Вставить столбец справа", action: () => insertColumn(section, index + 1) },
    ];
    if (index > 0) {
      items.push({ label: "Переместить влево", action: () => moveColumn(section, column.id, -1) });
    }
    if (index < section.columns.length - 1) {
      items.push({ label: "Переместить вправо", action: () => moveColumn(section, column.id, 1) });
    }
    items.push({
      label: "Удалить столбец",
      danger: true,
      action: () => deleteColumn(section, column.id),
    });
    showFloatingMenu(menuButton, items);
  });
  th.append(dragHandle, input, menuButton);
  const resizer = document.createElement("span");
  resizer.className = "column-resizer";
  resizer.title = "Изменить ширину столбца";
  resizer.addEventListener("pointerdown", (event) => startColumnResize(event, section, column));
  th.append(resizer);
  return th;
}

function startColumnResize(event, section, column) {
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startWidth = Math.max(140, Number(column.width) || 240);
  const onMove = (moveEvent) => {
    column.width = Math.max(140, Math.min(1000, startWidth + moveEvent.clientX - startX));
    const sectionElement = elements.sections.querySelector(`[data-section-id="${section.id}"]`);
    const col = sectionElement?.querySelector(`th[data-column-id="${column.id}"]`);
    if (!col) return;
    const colIndex = [...col.parentElement.children].indexOf(col);
    const colElement = sectionElement.querySelector(`colgroup`).children[colIndex];
    colElement.style.width = `${column.width}px`;
    const table = sectionElement.querySelector(".check-table");
    const total = 52 + 164 + 46 + section.columns.reduce((sum, item) => sum + (Number(item.width) || 240), 0);
    table.style.width = `${total}px`;
  };
  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    scheduleSave();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function createStatusHeader(section) {
  const th = document.createElement("th");
  th.className = "status-header";
  const label = document.createElement("span");
  label.innerHTML = 'Статус <span class="required">*</span>';
  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "column-menu-button";
  menuButton.textContent = "•••";
  menuButton.title = "Действия рядом со статусом";
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showFloatingMenu(menuButton, [
      {
        label: "Вставить столбец слева",
        action: () => insertColumn(section, section.columns.length),
      },
    ]);
  });
  th.append(label, menuButton);
  return th;
}

function createRowElement(section, row, index) {
  const tr = document.createElement("tr");
  tr.dataset.rowId = row.id;

  const numberCell = document.createElement("td");
  numberCell.className = "row-number";
  numberCell.textContent = `${index + 1}.`;
  tr.append(numberCell);

  section.columns.forEach((column) => {
    const td = document.createElement("td");
    td.className = "editor-cell";
    const editor = document.createElement("div");
    editor.className = "cell-editor";
    editor.contentEditable = "true";
    editor.dataset.columnId = column.id;
    editor.dataset.placeholder = column.title || "Введите значение";
    editor.innerHTML = row.cells[column.id] || "";
    editor.querySelectorAll("figcaption").forEach((caption) => caption.remove());
    row.cells[column.id] = editor.innerHTML;
    editor.addEventListener("input", () => {
      row.cells[column.id] = cleanEditorHtml(editor);
      renderSummary();
      scheduleSave();
    });
    td.append(editor);
    tr.append(td);
  });

  const statusCell = document.createElement("td");
  const statusSelect = createStatusSelect(row.status);
  statusSelect.addEventListener("change", () => {
    row.status = statusSelect.value;
    setStatusClass(statusSelect, row.status);
    renderSummary();
    scheduleSave();
  });
  statusCell.append(statusSelect);
  tr.append(statusCell);

  const actions = document.createElement("td");
  actions.className = "row-actions";
  const menuButton = document.createElement("button");
  menuButton.className = "row-menu-button";
  menuButton.type = "button";
  menuButton.title = "Действия со строкой";
  menuButton.textContent = "•••";
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showFloatingMenu(menuButton, [
      { label: "Дублировать", action: () => applyRowAction(section, row.id, "duplicate") },
      { label: "Новый раздел отсюда", action: () => applyRowAction(section, row.id, "split") },
      { label: "Поднять выше", action: () => applyRowAction(section, row.id, "move-up") },
      { label: "Опустить ниже", action: () => applyRowAction(section, row.id, "move-down") },
      {
        label: "Удалить",
        danger: true,
        action: () => applyRowAction(section, row.id, "delete"),
      },
    ]);
  });
  actions.append(menuButton);
  tr.append(actions);
  return tr;
}

function createStatusSelect(value) {
  const select = document.createElement("select");
  select.className = "status-select";
  Object.keys(STATUS_META).forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    select.append(option);
  });
  select.value = value;
  setStatusClass(select, value);
  return select;
}

function insertColumn(section, index) {
  const column = { id: `column-${crypto.randomUUID()}`, title: "Новый столбец" };
  section.columns.splice(index, 0, column);
  section.rows.forEach((row) => (row.cells[column.id] = ""));
  closeFloatingMenu();
  renderSections();
  scheduleSave();
  const target = elements.sections.querySelector(
    `[data-section-id="${section.id}"] th[data-column-id="${column.id}"] input`,
  );
  target?.select();
}

function moveColumn(section, columnId, offset) {
  const index = section.columns.findIndex((column) => column.id === columnId);
  const targetIndex = index + offset;
  if (index < 0 || targetIndex < 0 || targetIndex >= section.columns.length) return;
  const [column] = section.columns.splice(index, 1);
  section.columns.splice(targetIndex, 0, column);
  closeFloatingMenu();
  renderSections();
  scheduleSave();
}

function moveColumnTo(section, sourceId, targetId, placeAfter = false) {
  const sourceIndex = section.columns.findIndex((column) => column.id === sourceId);
  const targetIndex = section.columns.findIndex((column) => column.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const [column] = section.columns.splice(sourceIndex, 1);
  let insertionIndex = targetIndex + (placeAfter ? 1 : 0);
  if (sourceIndex < insertionIndex) insertionIndex -= 1;
  section.columns.splice(insertionIndex, 0, column);
  renderSections();
  scheduleSave();
}

function deleteColumn(section, columnId) {
  section.columns = section.columns.filter((column) => column.id !== columnId);
  section.rows.forEach((row) => delete row.cells[columnId]);
  closeFloatingMenu();
  renderSections();
  renderSummary();
  scheduleSave();
}

function splitSectionAtRow(section, rowIndex) {
  if (rowIndex <= 0) {
    showToast("Выберите строку ниже первой");
    return;
  }
  const sectionIndex = draft.sections.findIndex((item) => item.id === section.id);
  const movedRows = section.rows.splice(rowIndex);
  const newSection = {
    id: crypto.randomUUID(),
    title: `${section.title} — продолжение`,
    collapsed: false,
    columns: clone(section.columns),
    rows: movedRows,
  };
  draft.sections.splice(sectionIndex + 1, 0, newSection);
  renderSections();
  renderSummary();
  scheduleSave();
}

function applyRowAction(section, rowId, action) {
  const index = section.rows.findIndex((row) => row.id === rowId);
  if (action === "duplicate") {
    section.rows.splice(index + 1, 0, { ...clone(section.rows[index]), id: crypto.randomUUID() });
  } else if (action === "split") {
    splitSectionAtRow(section, index);
    return;
  } else if (action === "move-up" && index > 0) {
    [section.rows[index - 1], section.rows[index]] = [section.rows[index], section.rows[index - 1]];
  } else if (action === "move-down" && index < section.rows.length - 1) {
    [section.rows[index + 1], section.rows[index]] = [section.rows[index], section.rows[index + 1]];
  } else if (action === "delete") {
    if (section.rows.length === 1) {
      showToast("В разделе должна остаться хотя бы одна строка");
      return;
    }
    section.rows.splice(index, 1);
  }
  renderSections();
  renderSummary();
  scheduleSave();
}

function deleteSection(sectionId) {
  if (draft.sections.length === 1) {
    showToast("В отчёте должен остаться хотя бы один раздел");
    return;
  }
  draft.sections = draft.sections.filter((section) => section.id !== sectionId);
  renderSections();
  renderSummary();
  scheduleSave();
}

function moveSection(sectionId, offset) {
  const index = draft.sections.findIndex((section) => section.id === sectionId);
  const next = index + offset;
  if (index < 0 || next < 0 || next >= draft.sections.length) return;
  [draft.sections[index], draft.sections[next]] = [draft.sections[next], draft.sections[index]];
  renderSections();
  scheduleSave();
}

function enableSectionDragging(sectionElement, sectionId) {
  const handle = sectionElement.querySelector(".drag-handle");
  let handlePressed = false;
  handle.addEventListener("pointerdown", () => (handlePressed = true));
  sectionElement.addEventListener("pointerup", () => (handlePressed = false));
  sectionElement.addEventListener("pointercancel", () => (handlePressed = false));
  sectionElement.addEventListener("dragstart", (event) => {
    if (!handlePressed) return event.preventDefault();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
    sectionElement.classList.add("dragging");
  });
  sectionElement.addEventListener("dragend", () => {
    sectionElement.classList.remove("dragging");
    document.querySelectorAll(".check-section").forEach((item) => item.classList.remove("drag-over"));
  });
  sectionElement.addEventListener("dragover", (event) => {
    event.preventDefault();
    sectionElement.classList.add("drag-over");
  });
  sectionElement.addEventListener("dragleave", () => sectionElement.classList.remove("drag-over"));
  sectionElement.addEventListener("drop", (event) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    const source = draft.sections.findIndex((section) => section.id === sourceId);
    const target = draft.sections.findIndex((section) => section.id === sectionId);
    if (source < 0 || target < 0 || source === target) return;
    const [moved] = draft.sections.splice(source, 1);
    draft.sections.splice(target, 0, moved);
    renderSections();
    scheduleSave();
  });
}

function showFloatingMenu(anchor, items) {
  closeFloatingMenu();
  const menu = document.createElement("div");
  menu.className = "floating-context-menu";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    if (item.danger) button.className = "danger-text";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      item.action();
      closeFloatingMenu();
    });
    menu.append(button);
  });
  document.body.append(menu);
  floatingMenu = menu;
  const anchorRect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const margin = 8;
  let left = Math.min(anchorRect.right - menuRect.width, window.innerWidth - menuRect.width - margin);
  left = Math.max(margin, left);
  let top = anchorRect.bottom + 6;
  if (top + menuRect.height > window.innerHeight - margin) {
    top = Math.max(margin, anchorRect.top - menuRect.height - 6);
  }
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeFloatingMenu() {
  floatingMenu?.remove();
  floatingMenu = null;
}

function setStatusClass(select, status) {
  Object.values(STATUS_META).forEach((meta) => select.classList.remove(meta.className));
  select.classList.add(STATUS_META[status].className);
}

function hasRowContent(row) {
  return (
    Object.values(row.cells).some((value) => htmlToText(value)) ||
    row.status !== "НЕ ПРОВЕРЕНО" ||
    Object.keys(row.cells).length === 0
  );
}

function renderSummary() {
  const rows = draft.sections.flatMap((section) => section.rows).filter(hasRowContent);
  elements.summaryTotal.textContent = rows.length;
  elements.summaryChart.innerHTML = "";
  elements.summaryList.innerHTML = "";
  Object.entries(STATUS_META).forEach(([status, meta]) => {
    const count = rows.filter((row) => row.status === status).length;
    const segment = document.createElement("div");
    segment.className = "chart-segment";
    segment.style.width = rows.length ? `${(count / rows.length) * 100}%` : "0";
    segment.style.background = meta.color;
    elements.summaryChart.append(segment);
    const item = document.createElement("div");
    item.className = "summary-row";
    item.innerHTML = `<span class="summary-color" style="background:${meta.color}"></span><span class="summary-label">${status}</span><span class="summary-count">${count}</span>`;
    elements.summaryList.append(item);
  });
}

function htmlToText(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  return (container.textContent || "").trim();
}

function extractCodeText(node) {
  let output = "";
  const walk = (current) => {
    if (current.nodeType === Node.TEXT_NODE) {
      output += current.textContent || "";
      return;
    }
    if (current.nodeType !== Node.ELEMENT_NODE) return;
    if (current.matches?.("[data-editor-ui]")) return;
    if (current.tagName === "BR") {
      output += "\n";
      return;
    }
    const block = ["DIV", "P"].includes(current.tagName);
    for (const child of current.childNodes) walk(child);
    if (block && output && !output.endsWith("\n")) output += "\n";
  };
  for (const child of node.childNodes) walk(child);
  return output.replace(/\u00a0/g, " ").replace(/\n+$/, "");
}

function htmlToWiki(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const content = [...node.childNodes].map(walk).join("");
    const tag = node.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") return `*${content}*`;
    if (tag === "em" || tag === "i") return `_${content}_`;
    if (tag === "u") return `+${content}+`;
    if (tag === "s" || tag === "strike") return `-${content}-`;
    if (tag === "a") return `[${content}|${node.getAttribute("href") || ""}]`;
    if (tag === "pre") {
      const language = node.dataset.language || "text";
      return `{code:${language}}\n${extractCodeText(node)}\n{code}`;
    }
    if (tag === "img") {
      const name = node.dataset.jiraName || node.dataset.fileName || node.alt || "image.png";
      return `!${name}|thumbnail!`;
    }
    if (tag === "figure") return content;
    if (tag === "br") return "\n";
    if (tag === "ul") return [...node.children].map((item) => `* ${walk(item).trim()}`).join("\n");
    if (tag === "ol") return [...node.children].map((item) => `# ${walk(item).trim()}`).join("\n");
    if (tag === "li") return content;
    if (/h[1-6]/.test(tag)) return `h${tag.slice(1)}. ${content}\n`;
    if (tag === "p" || tag === "div") return `${content}\n`;
    return content;
  }
  return [...container.childNodes].map(walk).join("").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeWiki(value) {
  return htmlToWiki(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "\\\\");
}

function jiraCell(value) {
  let content = htmlToWiki(value);
  const protectedBlocks = [];
  content = content.replace(/\{code:[^}]+\}[\s\S]*?\{code\}/gi, (block) => {
    const token = `@@JIRA_PROTECTED_${protectedBlocks.length}@@`;
    protectedBlocks.push(block);
    return token;
  });
  content = content.replace(/![^!\r\n]+!/g, (block) => {
    const token = `@@JIRA_PROTECTED_${protectedBlocks.length}@@`;
    protectedBlocks.push(block);
    return token;
  });
  content = content
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "\\\\");
  content = content.replace(
    /@@JIRA_PROTECTED_(\d+)@@/g,
    (_, index) => protectedBlocks[Number(index)] || "",
  );
  return content.trim() ? content : " ";
}

function splitWikiRow(line) {
  const delimiter = line.startsWith("||") ? "||" : "|";
  const source = line.slice(delimiter.length, line.endsWith(delimiter) ? -delimiter.length : undefined);
  const cells = [];
  let current = "";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      current += character === "|" ? "|" : `\\${character}`;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (source.startsWith(delimiter, index)) {
      cells.push(current);
      current = "";
      index += delimiter.length - 1;
    } else current += character;
  }
  cells.push(current);
  return cells;
}

function wikiInlineToHtml(value, attachments = []) {
  const codeBlocks = [];
  let source = String(value || "").replace(
    /\{code(?::(?:language=)?([^}]+))?\}([\s\S]*?)\{code\}/gi,
    (_, language, code) => {
      const token = `@@CODE${codeBlocks.length}@@`;
      codeBlocks.push(
        `<pre class="cell-code-block" data-language="${escapeHtml(language || "text")}"><code>${escapeHtml(code.trim())}</code></pre>`,
      );
      return token;
    },
  );
  const attachmentByName = new Map(attachments.map((item) => [item.filename, item]));
  return escapeHtml(source)
    .replace(/\\\\/g, "<br>")
    .replace(/!([^|!\n]+)(?:\|[^!]*)?!/g, (_, filename) => {
      const attachment = attachmentByName.get(filename);
      if (!attachment?.content && !attachment?.thumbnail) return `<span>[Изображение: ${filename}]</span>`;
      const src = attachment.thumbnail || attachment.content;
      return `<figure class="cell-image" contenteditable="false" data-align="left"><img src="${escapeHtml(src)}" alt="" data-attachment-id="${escapeHtml(attachment.id)}" data-file-name="${escapeHtml(filename)}" data-jira-name="${escapeHtml(filename)}" data-jira-id="${escapeHtml(attachment.id)}" data-jira-url="${escapeHtml(attachment.content || "")}"></figure>`;
    })
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, '<a href="$2">$1</a>')
    .replace(/\{color:[^}]+\}|\{color\}/g, "")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/\+([^+\n]+)\+/g, "<u>$1</u>")
    .replace(/@@CODE(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
}

function normalizeStatus(value) {
  const status = String(value || "")
    .replace(/\{color:[^}]+\}|\{color\}|[*_+]/g, "")
    .trim()
    .toUpperCase();
  if (status === "OK" || status === "ОК") return "OK";
  if (["НЕ ОК", "НЕ OK", "НЕОК"].includes(status)) return "НЕ ОК";
  if (["НА ДОРАБОТКУ", "FAILED", "FAIL"].includes(status)) return "НЕ ОК";
  if (["ПОЧТИ ОК", "ПОЧТИ OK"].includes(status)) return "ПОЧТИ ОК";
  if (status === "ЧАСТИЧНО ПРОВЕРЕНО") return status;
  return "НЕ ПРОВЕРЕНО";
}

function parseJiraMarkup(markup, attachments = []) {
  const lines = String(markup || "").replace(/\r/g, "").split("\n");
  const imported = {
    reportId: crypto.randomUUID(),
    schemaVersion: 3,
    issueUrl: "",
    environment: "STAGE",
    overallStatus: "OK",
    intro: "",
    sections: [],
  };
  const introLines = [];
  let pendingTitle = "";
  let currentSection = null;
  let headers = null;
  let tableNumber = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (!headers) introLines.push("");
      continue;
    }
    const issue = line.match(/^\*?Задача:\*?\s*(.+)$/i);
    if (issue) {
      continue;
    }
    const environment = line.match(/(?:Проверено\s+на|Окружение)\s*:?\s*([A-Za-zА-Яа-яЁё-]+)/i);
    if (environment) {
      const value = environment[1].toUpperCase();
      imported.environment = ["DEV", "STAGE", "PROD"].includes(value) ? value : "Локально";
      continue;
    }
    const overall = line.match(/(?:ТЕСТ\s*[-—]|Статус\s*:)\s*(.+?)\*?$/i);
    if (overall) {
      imported.overallStatus = normalizeStatus(overall[1]);
      continue;
    }
    if (/^h1\.\s+/i.test(line)) continue;
    if (/^h2\.\s+/i.test(line)) {
      pendingTitle = line.replace(/^h2\.\s+/i, "").trim();
      headers = null;
      currentSection = null;
      continue;
    }
    if (line.startsWith("||")) {
      tableNumber += 1;
      const rawHeaders = splitWikiRow(line).map((header) => header.trim());
      const numberIndex = rawHeaders.findIndex((header) => /^(номер|№)$/i.test(header));
      const statusIndex = rawHeaders.findIndex((header) => /статус/i.test(header));
      const columns = rawHeaders
        .map((title, index) => ({ title, index }))
        .filter(({ index }) => index !== numberIndex && index !== statusIndex)
        .map(({ title, index }) => ({
          id: `import-${tableNumber}-${index}-${crypto.randomUUID()}`,
          title: title || `Столбец ${index + 1}`,
          sourceIndex: index,
        }));
      currentSection = {
        id: crypto.randomUUID(),
        title: pendingTitle || `Раздел ${tableNumber}`,
        collapsed: false,
        columns,
        rows: [],
      };
      imported.sections.push(currentSection);
      headers = { statusIndex };
      pendingTitle = "";
      continue;
    }
    if (line.startsWith("|") && headers && currentSection) {
      const values = splitWikiRow(line);
      currentSection.rows.push({
        id: crypto.randomUUID(),
        status: normalizeStatus(headers.statusIndex >= 0 ? values[headers.statusIndex] : ""),
        cells: Object.fromEntries(
          currentSection.columns.map((column) => [
            column.id,
            wikiInlineToHtml(values[column.sourceIndex] || "", attachments),
          ]),
        ),
      });
      continue;
    }
    headers = null;
    currentSection = null;
    introLines.push(line);
  }

  imported.sections.forEach((section) => {
    section.columns.forEach((column) => delete column.sourceIndex);
  });
  imported.sections = imported.sections.filter((section) => section.rows.length);
  if (!imported.sections.length) throw new Error("В разметке не найдена таблица чек-листа");
  imported.intro = introLines
    .map((line) => (line ? `<p>${wikiInlineToHtml(line, attachments)}</p>` : ""))
    .join("");
  return imported;
}

function adfNodeText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  return (node.content || []).map(adfNodeText).join("");
}

function adfNodeToHtml(node, attachments = []) {
  if (!node) return "";
  if (node.type === "text") {
    let value = escapeHtml(node.text || "");
    for (const mark of node.marks || []) {
      if (mark.type === "strong") value = `<strong>${value}</strong>`;
      if (mark.type === "em") value = `<em>${value}</em>`;
      if (mark.type === "underline") value = `<u>${value}</u>`;
      if (mark.type === "strike") value = `<s>${value}</s>`;
      if (mark.type === "link") value = `<a href="${escapeHtml(mark.attrs?.href || "")}">${value}</a>`;
    }
    return value;
  }
  if (node.type === "hardBreak") return "<br>";
  if (node.type === "codeBlock") {
    return `<pre class="cell-code-block" data-language="${escapeHtml(node.attrs?.language || "text")}">${escapeHtml(adfNodeText(node))}</pre>`;
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    const tag = node.type === "bulletList" ? "ul" : "ol";
    return `<${tag}>${(node.content || []).map((item) => adfNodeToHtml(item, attachments)).join("")}</${tag}>`;
  }
  if (node.type === "listItem") {
    return `<li>${(node.content || []).map((item) => adfNodeToHtml(item, attachments)).join("")}</li>`;
  }
  if (node.type === "mediaSingle" || node.type === "media") {
    const media = node.type === "media" ? node : (node.content || []).find((item) => item.type === "media");
    const attachment = attachments.find((item) => String(item.id) === String(media?.attrs?.id));
    const url =
      media?.attrs?.url ||
      media?.attrs?.externalUrl ||
      attachment?.thumbnail ||
      attachment?.content ||
      "";
    const filename = attachment?.filename || media?.attrs?.alt || "Вложение Jira";
    return url
      ? `<figure class="cell-image" contenteditable="false" data-align="left"><img src="${escapeHtml(url)}" alt="" data-attachment-id="${escapeHtml(attachment?.id || media?.attrs?.id || "")}" data-file-name="${escapeHtml(filename)}" data-jira-name="${escapeHtml(filename)}" data-jira-id="${escapeHtml(attachment?.id || "")}" data-jira-url="${escapeHtml(attachment?.content || url)}"></figure>`
      : `<span>[Вложение Jira: ${escapeHtml(media?.attrs?.id || "без идентификатора")}]</span>`;
  }
  const content = (node.content || []).map((item) => adfNodeToHtml(item, attachments)).join("");
  if (node.type === "paragraph") return `<p>${content || "<br>"}</p>`;
  return content;
}

function parseAdfDocument(documentBody, attachments = []) {
  const imported = {
    reportId: crypto.randomUUID(),
    schemaVersion: 3,
    issueUrl: "",
    environment: "STAGE",
    overallStatus: "OK",
    intro: "",
    sections: [],
  };
  let pendingTitle = "";
  let tableNumber = 0;
  const intro = [];
  for (const node of documentBody?.content || []) {
    const text = adfNodeText(node).trim();
    const environment = text.match(/(?:Проверено на|Окружение)\s*:?\s*([A-Za-zА-Яа-яЁё-]+)/i);
    if (environment) {
      const value = environment[1].toUpperCase();
      imported.environment = ["DEV", "STAGE", "PROD"].includes(value) ? value : "Локально";
      continue;
    }
    const overall = text.match(/(?:ТЕСТ|Статус)\s*[:—-]\s*(.+)$/i);
    if (overall && node.type !== "table") {
      imported.overallStatus = normalizeStatus(overall[1]);
      continue;
    }
    if (node.type === "heading") {
      pendingTitle = text;
      continue;
    }
    if (node.type !== "table") {
      if (text) intro.push(adfNodeToHtml(node, attachments));
      continue;
    }
    tableNumber += 1;
    const tableRows = (node.content || []).filter((item) => item.type === "tableRow");
    if (!tableRows.length) continue;
    const headerNodes = tableRows[0].content || [];
    const rawHeaders = headerNodes.map((cell) => adfNodeText(cell).trim());
    const hasHeader = headerNodes.some((cell) => cell.type === "tableHeader");
    const dataRows = hasHeader ? tableRows.slice(1) : tableRows;
    const headers = hasHeader
      ? rawHeaders
      : Array.from({ length: headerNodes.length }, (_, index) => `Столбец ${index + 1}`);
    const numberIndex = headers.findIndex((header) => /^(номер|№|nº)$/i.test(header));
    const statusIndex = headers.findIndex((header) => /статус/i.test(header));
    const columns = headers
      .map((title, index) => ({ title, index }))
      .filter(({ index }) => index !== numberIndex && index !== statusIndex)
      .map(({ title, index }) => ({
        id: `adf-${tableNumber}-${index}-${crypto.randomUUID()}`,
        title: title || `Столбец ${index + 1}`,
        sourceIndex: index,
      }));
    const section = {
      id: crypto.randomUUID(),
      title: pendingTitle || `Раздел ${tableNumber}`,
      collapsed: false,
      columns,
      rows: dataRows.map((tableRow) => {
        const cells = tableRow.content || [];
        return {
          id: crypto.randomUUID(),
          status: normalizeStatus(statusIndex >= 0 ? adfNodeText(cells[statusIndex]) : ""),
          cells: Object.fromEntries(
            columns.map((column) => [column.id, adfNodeToHtml(cells[column.sourceIndex], attachments)]),
          ),
        };
      }),
    };
    section.columns.forEach((column) => delete column.sourceIndex);
    imported.sections.push(section);
    pendingTitle = "";
  }
  imported.intro = intro.join("");
  if (!imported.sections.length) throw new Error("В комментарии не найдены таблицы");
  return imported;
}

function generateMarkup() {
  collectDocumentFields();
  const blocks = [];
  const heading = [];
  const overallColor = STATUS_META[draft.overallStatus].jiraColor;
  heading.push(
    `*Проверено на ${draft.environment}*`,
    `{color:${overallColor}}*ТЕСТ — ${draft.overallStatus}*{color}`,
  );
  blocks.push(heading.join("\n"));
  const intro = htmlToWiki(draft.intro);
  if (intro) blocks.push(intro);

  draft.sections.forEach((section) => {
    const rows = section.rows.filter(hasRowContent);
    if (!rows.length) return;
    const lines = [`h2. ${section.title || "Раздел"}`];
    lines.push(
      `||${["Номер", ...section.columns.map((column) => column.title || "Без названия"), "Статус"].join("||")}||`,
    );
    rows.forEach((row, index) => {
      const values = section.columns.map((column) => jiraCell(row.cells[column.id] || ""));
      const status = `{color:${STATUS_META[row.status].jiraColor}}*${row.status}*{color}`;
      lines.push(`|${[`${index + 1}.`, ...values, status].join("|")}|`);
    });
    blocks.push(lines.join("\n"));
  });
  return blocks.join("\n\n");
}

function generateVisualPreview() {
  collectDocumentFields();
  const wrapper = document.createElement("div");
  const overallColor = STATUS_META[draft.overallStatus].jiraColor;
  wrapper.innerHTML = `<h1>Отчёт о тестировании</h1><p><strong>Проверено на ${escapeHtml(draft.environment)}</strong><br><strong style="color:${overallColor}">ТЕСТ — ${escapeHtml(draft.overallStatus)}</strong></p>`;
  if (htmlToText(draft.intro)) {
    const intro = document.createElement("div");
    intro.innerHTML = draft.intro;
    wrapper.append(intro);
  }
  draft.sections.forEach((section) => {
    const rows = section.rows.filter(hasRowContent);
    if (!rows.length) return;
    const heading = document.createElement("h2");
    heading.textContent = section.title || "Раздел";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr><th>Номер</th>${section.columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join("")}<th>Статус</th></tr>`;
    const tbody = document.createElement("tbody");
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${index + 1}.</td>${section.columns.map((column) => `<td>${row.cells[column.id] || ""}</td>`).join("")}<td><strong style="color:${STATUS_META[row.status].jiraColor}">${row.status}</strong></td>`;
      tbody.append(tr);
    });
    table.append(thead, tbody);
    wrapper.append(heading, table);
  });
  return wrapper.innerHTML;
}

function adfText(value, marks) {
  const node = { type: "text", text: value || " " };
  if (marks?.length) node.marks = marks;
  return node;
}

function adfParagraph(text, marks) {
  return { type: "paragraph", content: [adfText(text || " ", marks)] };
}

function htmlToAdfBlocks(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  const blocks = [];
  let paragraphText = "";
  const flushParagraph = () => {
    if (!paragraphText.trim()) return;
    blocks.push(adfParagraph(paragraphText.trim()));
    paragraphText = "";
  };
  const visit = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      paragraphText += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches("pre.cell-code-block")) {
      flushParagraph();
      blocks.push({
        type: "codeBlock",
        attrs: { language: node.dataset.language || "text" },
        content: [adfText(extractCodeText(node) || " ")],
      });
      return;
    }
    const image = node.matches("figure") ? node.querySelector("img") : node.matches("img") ? node : null;
    if (image) {
      flushParagraph();
      const name = image.dataset.jiraName || image.dataset.fileName || image.alt || "Вложение";
      const jiraId = image.dataset.jiraId;
      const attachmentUrl = image.dataset.jiraUrl;
      if (attachmentUrl) {
        blocks.push({
          type: "paragraph",
          content: [
            {
              type: "inlineCard",
              attrs: { url: attachmentUrl },
            },
          ],
        });
      } else {
        blocks.push(adfParagraph(`[Изображение: ${name}]`));
      }
      return;
    }
    if (["P", "DIV", "LI"].includes(node.tagName)) {
      for (const child of node.childNodes) visit(child);
      paragraphText += "\n";
      return;
    }
    for (const child of node.childNodes) visit(child);
  };
  for (const node of container.childNodes) visit(node);
  flushParagraph();
  return blocks.length ? blocks : [adfParagraph(" ")];
}

function generateAdfDocument() {
  collectDocumentFields();
  const content = [];
  const overallColor = STATUS_META[draft.overallStatus].jiraColor;
  content.push(
    adfParagraph(`Проверено на ${draft.environment}`, [{ type: "strong" }]),
    adfParagraph(`ТЕСТ — ${draft.overallStatus}`, [
      { type: "strong" },
      { type: "textColor", attrs: { color: overallColor } },
    ]),
  );
  if (htmlToText(draft.intro) || /<img|<pre/i.test(draft.intro)) {
    content.push(...htmlToAdfBlocks(draft.intro));
  }

  draft.sections.forEach((section) => {
    const rows = section.rows.filter(hasRowContent);
    if (!rows.length) return;
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [adfText(section.title || "Раздел")],
    });
    const headerCells = ["Номер", ...section.columns.map((column) => column.title), "Статус"].map(
      (title) => ({
        type: "tableHeader",
        content: [adfParagraph(title, [{ type: "strong" }])],
      }),
    );
    const tableRows = [
      { type: "tableRow", content: headerCells },
      ...rows.map((row, index) => ({
        type: "tableRow",
        content: [
          { type: "tableCell", content: [adfParagraph(`${index + 1}.`)] },
          ...section.columns.map((column) => ({
            type: "tableCell",
            content: htmlToAdfBlocks(row.cells[column.id] || ""),
          })),
          {
            type: "tableCell",
            content: [
              adfParagraph(row.status, [
                { type: "strong" },
                { type: "textColor", attrs: { color: STATUS_META[row.status].jiraColor } },
              ]),
            ],
          },
        ],
      })),
    ];
    content.push({
      type: "table",
      attrs: { isNumberColumnEnabled: false, layout: "default" },
      content: tableRows,
    });
  });
  return { type: "doc", version: 1, content };
}

function fillJiraSettingsForm() {
  elements.jiraType.value = jiraSettings.type;
  elements.jiraAuthMethod.value = jiraSettings.authMethod || "pat";
  elements.jiraBaseUrl.value = jiraSettings.baseUrl;
  elements.jiraUser.value = jiraSettings.user;
  elements.jiraToken.value = jiraSecret;
  updateJiraSettingsLabels();
}

function updateJiraSettingsLabels() {
  const cloud = elements.jiraType.value === "cloud";
  const basic = !cloud && elements.jiraAuthMethod.value === "basic";
  elements.jiraAuthMethodField.hidden = cloud;
  elements.jiraUserField.hidden = !cloud && !basic;
  elements.jiraUserLabel.textContent = cloud ? "Email Atlassian" : "Логин Jira";
  elements.jiraTokenLabel.textContent = cloud
    ? "API token"
    : basic
      ? "Пароль"
      : "Personal Access Token";
  elements.jiraToken.placeholder = cloud
    ? "API token не сохраняется"
    : basic
      ? "Пароль не сохраняется"
      : "Токен не сохраняется";
  elements.jiraToken.autocomplete = basic ? "current-password" : "off";
  elements.jiraUser.placeholder = cloud ? "name@company.ru" : "username";
}

function readJiraSettingsForm() {
  return {
    type: elements.jiraType.value,
    authMethod: elements.jiraType.value === "cloud" ? "api-token" : elements.jiraAuthMethod.value,
    baseUrl: elements.jiraBaseUrl.value.trim().replace(/\/+$/, ""),
    user: elements.jiraUser.value.trim(),
  };
}

function validateJiraSettings(settings, token) {
  if (!/^https?:\/\//i.test(settings.baseUrl)) {
    throw new Error("Укажите полный адрес Jira, начиная с http:// или https://");
  }
  if (!token) {
    throw new Error(settings.authMethod === "basic" ? "Укажите пароль" : "Укажите токен");
  }
  if ((settings.type === "cloud" || settings.authMethod === "basic") && !settings.user) {
    throw new Error(settings.type === "cloud" ? "Для Jira Cloud укажите email Atlassian" : "Укажите логин Jira");
  }
}

function setConnectionState(message, type = "") {
  elements.jiraConnectionState.textContent = message;
  elements.jiraConnectionState.className = `connection-state ${type}`.trim();
}

function openJiraSettings() {
  fillJiraSettingsForm();
  setConnectionState("Соединение ещё не проверялось.");
  elements.jiraSettingsModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeJiraSettings() {
  elements.jiraSettingsModal.hidden = true;
  document.body.style.overflow = "";
}

function saveJiraSettings() {
  const settings = readJiraSettingsForm();
  jiraSettings = settings;
  jiraSecret = elements.jiraToken.value;
  localStorage.setItem(JIRA_SETTINGS_KEY, JSON.stringify(settings));
  setConnectionState("Настройки сохранены. Секрет останется только до перезагрузки.", "success");
}

function parseIssueUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Укажите полную ссылку на задачу Jira");
  }
  const match = url.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)(?:\/|$)/i);
  if (!match) throw new Error("В ссылке не найден ключ задачи Jira");
  return { issueKey: match[1].toUpperCase(), issueUrl: url.toString() };
}

async function jiraRequest(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Ошибка подключения: HTTP ${response.status}`);
  }
  return result;
}

function assertCurrentBackend(result) {
  if (Number(result?.apiRevision) >= REQUIRED_API_REVISION) return;
  throw new Error(
    "Интерфейс обновлён, но сервер приложения запущен на старой версии. " +
      "Полностью перезапустите Node-процесс или пересоберите Docker-контейнер.",
  );
}

async function checkBackendCompatibility() {
  const response = await fetch("/api/health", { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Backend приложения недоступен: HTTP ${response.status}`);
  assertCurrentBackend(result);
  return result;
}

async function uploadPendingImages(settings, issue) {
  const files = collectLocalImages();
  if (!files.length) return [];
  elements.publishButton.textContent = `Вложения 0/${files.length}`;
  const result = await jiraRequest("/api/jira/attachments", {
    ...settings,
    token: jiraSecret,
    ...issue,
    files: files.map(({ attachmentId, name, type, dataBase64 }) => ({
      attachmentId,
      name,
      type,
      dataBase64,
    })),
  });
  applyUploadedAttachments(result.attachments || []);
  saveDraft();
  render();
  return result.attachments || [];
}

async function testJiraConnection() {
  try {
    const settings = readJiraSettingsForm();
    const token = elements.jiraToken.value;
    validateJiraSettings(settings, token);
    setConnectionState("Проверяем подключение…");
    const result = await jiraRequest("/api/jira/test", { ...settings, token });
    jiraSettings = settings;
    jiraSecret = token;
    localStorage.setItem(JIRA_SETTINGS_KEY, JSON.stringify(settings));
    setConnectionState(`Подключено: ${result.displayName || result.name || "пользователь Jira"}`, "success");
  } catch (error) {
    setConnectionState(error.message, "error");
  }
}

async function publishToJira() {
  try {
    collectDocumentFields();
    const issue = parseIssueUrl(draft.issueUrl);
    const settings = { ...jiraSettings };
    validateJiraSettings(settings, jiraSecret);
    await checkBackendCompatibility();
    if (!window.confirm(`Опубликовать отчёт комментарием в задаче ${issue.issueKey}?`)) return;
    elements.publishButton.disabled = true;
    elements.publishButton.textContent = "Отправляем…";
    await uploadPendingImages(settings, issue);
    const comment =
      settings.type === "cloud"
        ? { format: "adf", body: generateAdfDocument() }
        : { format: "wiki", body: generateMarkup() };
    const result = await jiraRequest("/api/jira/comment", {
      ...settings,
      token: jiraSecret,
      ...issue,
      comment,
    });
    assertCurrentBackend(result);
    if (!result.verified || !result.commentId) {
      throw new Error(
        `Backend ${result.appVersion || "неизвестной версии"} не вернул подтверждение комментария`,
      );
    }
    showToast(`Комментарий ${result.commentId} опубликован в ${issue.issueKey}`);
    if (result.commentUrl) window.open(result.commentUrl, "_blank", "noopener");
  } catch (error) {
    console.error("Ошибка публикации Jira:", error);
    showToast(error.message, 9000);
    if (/настро|токен|адрес|ключ/i.test(error.message)) openJiraSettings();
  } finally {
    elements.publishButton.disabled = false;
    elements.publishButton.textContent = "Отправить в Jira";
  }
}

function openPreview() {
  elements.markupPreview.value = generateMarkup();
  elements.visualPreview.innerHTML = generateVisualPreview();
  elements.previewModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePreview() {
  elements.previewModal.hidden = true;
  document.body.style.overflow = "";
}

function openImport() {
  elements.importMarkup.value = "";
  elements.commentImportUrl.value = "";
  elements.importWarning.hidden = true;
  elements.importSummary.hidden = true;
  pendingImportedDraft = null;
  elements.importModal.hidden = false;
  document.body.style.overflow = "hidden";
  if (importSource === "markup") elements.importMarkup.focus();
}

function closeImport() {
  elements.importModal.hidden = true;
  document.body.style.overflow = "";
}

function setFocusMode(enabled) {
  document.querySelector(".app-shell").classList.toggle("focus-mode", enabled);
  elements.focusExitButton.hidden = !enabled;
  elements.focusModeButton.querySelector("span:last-child").textContent = enabled ? "Выйти" : "Фокус";
}

async function openHistory() {
  await saveReportSnapshot("open-history").catch(() => {});
  elements.historyModal.hidden = false;
  document.body.style.overflow = "hidden";
  await renderHistoryList();
}

function closeHistory() {
  elements.historyModal.hidden = true;
  document.body.style.overflow = "";
}

async function renderHistoryList() {
  const reports = await getAllReports();
  const query = elements.historySearch.value.trim().toLowerCase();
  const filtered = reports.filter((report) =>
    `${report.title} ${report.issueKey} ${report.issueUrl}`.toLowerCase().includes(query),
  );
  elements.historyUsage.textContent = `${reports.length} из ${HISTORY_LIMIT}`;
  elements.historyList.innerHTML = "";
  if (!filtered.length) {
    elements.historyList.innerHTML = '<div class="history-empty">Сохранённых отчётов пока нет</div>';
    return;
  }
  filtered.forEach((report) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const info = document.createElement("div");
    info.innerHTML = `<h3>${escapeHtml(report.title)}</h3><p>${new Date(report.updatedAt).toLocaleString("ru-RU")} · ${escapeHtml(report.overallStatus)}</p>`;
    const actions = document.createElement("div");
    actions.className = "history-item-actions";
    const openButton = createSmallButton("Открыть", async () => {
      await saveReportSnapshot("before-open-history");
      suppressHistory = true;
      draft = clone(report.document);
      historyCurrent = serializeDraft();
      undoStack = [];
      redoStack = [];
      render();
      saveDraft();
      suppressHistory = false;
      closeHistory();
      showToast("Отчёт восстановлен из истории");
    });
    const copyButton = createSmallButton("Копия", async () => {
      await saveReportSnapshot("before-copy-history");
      draft = clone(report.document);
      draft.reportId = crypto.randomUUID();
      historyCurrent = serializeDraft();
      undoStack = [];
      redoStack = [];
      render();
      saveDraft();
      closeHistory();
      showToast("Создана копия отчёта");
    });
    const deleteButton = createSmallButton("Удалить", async () => {
      if (!window.confirm(`Удалить отчёт «${report.title}»?`)) return;
      await deleteReportRecord(report.id);
      await renderHistoryList();
    }, true);
    actions.append(openButton, copyButton, deleteButton);
    item.append(info, actions);
    elements.historyList.append(item);
  });
}

function createSmallButton(label, action, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button button-ghost${danger ? " danger-text" : ""}`;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function insertHtmlAtCursor(html) {
  activeEditor.focus();
  document.execCommand("insertHTML", false, html);
  activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertHtmlAtSelection(html, preferredRange = null) {
  const selection = window.getSelection();
  const preferredNode = preferredRange?.commonAncestorContainer;
  let range =
    preferredRange && preferredNode?.isConnected && activeEditor.contains(preferredNode)
      ? preferredRange.cloneRange()
      : selection?.rangeCount && activeEditor.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null;
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(activeEditor);
    range.collapse(false);
  }
  range.deleteContents();
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedEditorRange = range.cloneRange();
  }
  activeEditor.normalize();
  activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
}

function cleanEditorHtml(editor) {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll("[data-editor-ui]").forEach((item) => item.remove());
  clone.querySelectorAll(".cell-code-block").forEach((block) => {
    block.classList.remove("code-collapsed", "code-expanded", "code-selected", "code-dragging");
    delete block.dataset.previousColumnWidth;
    block.removeAttribute("draggable");
  });
  clone.querySelectorAll(".cell-image").forEach((figure) => figure.classList.remove("image-selected"));
  return clone.innerHTML;
}

async function writeClipboardText(value, successMessage = "Скопировано") {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(successMessage);
}

function codeSnippetHtml(language, code, width = "") {
  const widthStyle = width ? ` style="width:${escapeHtml(width)}"` : "";
  return `<pre class="cell-code-block" data-qa-code-snippet="true" data-language="${escapeHtml(language)}"${widthStyle}><code>${escapeHtml(code)}</code></pre>`;
}

async function copyCodeSnippet(block, language, code) {
  const jiraCode = `{code:${language}}\n${code}\n{code}`;
  const html = codeSnippetHtml(language, code, block.style.width || "");
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Расширенный буфер обмена не поддерживается");
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([jiraCode], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    showToast("Код скопирован: Jira-разметка и сниппет");
  } catch {
    await writeClipboardText(jiraCode, "Код скопирован в разметке Jira");
  }
}

function highlightJson(code) {
  const escaped = escapeHtml(code);
  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:)|("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, string, literal, number) => {
      if (key) return `<span class="code-key">${key}</span>`;
      if (string) return `<span class="code-string">${string}</span>`;
      if (literal) return `<span class="code-literal">${literal}</span>`;
      if (number) return `<span class="code-number">${number}</span>`;
      return match;
    },
  );
}

function highlightCodeBlock(block) {
  const language = (block.dataset.language || "text").toLowerCase();
  const code = extractCodeText(block);
  let codeElement = block.querySelector(":scope > code");
  if (!codeElement) {
    codeElement = document.createElement("code");
    block.replaceChildren(codeElement);
  }
  codeElement.innerHTML = language === "json" ? highlightJson(code) : escapeHtml(code);
  block.querySelectorAll(":scope > [data-editor-ui]").forEach((item) => item.remove());
  const lines = code.split("\n").length;
  const controls = document.createElement("span");
  controls.className = "code-controls";
  controls.dataset.editorUi = "true";
  controls.contentEditable = "false";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "code-control-button code-copy";
  copyButton.textContent = "⧉";
  copyButton.title = "Копировать код в разметке Jira";
  copyButton.setAttribute("aria-label", "Копировать код в разметке Jira");
  copyButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await copyCodeSnippet(block, language, code);
  });

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "code-control-button code-toggle";
  const collapsed = lines > 7 && !block.classList.contains("code-expanded");
  block.classList.toggle("code-collapsed", collapsed);
  toggle.textContent = collapsed ? "⤢" : "⤡";
  toggle.title = collapsed ? "Показать код полностью" : "Свернуть блок кода";
  toggle.setAttribute("aria-label", toggle.title);
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willExpand = block.classList.contains("code-collapsed");
    block.classList.toggle("code-collapsed", !willExpand);
    block.classList.toggle("code-expanded", willExpand);
    toggle.textContent = willExpand ? "⤡" : "⤢";
    toggle.title = willExpand ? "Свернуть блок кода" : `Развернуть блок кода (${lines} строк)`;
    toggle.setAttribute("aria-label", toggle.title);
    if (willExpand) {
      expandColumnForCode(block);
    } else {
      restoreColumnAfterCode(block);
    }
  });
  controls.append(copyButton, toggle);
  block.prepend(controls);
  enableCodeObject(block);
}

function highlightCodeBlocks(root = document) {
  root.querySelectorAll("pre.cell-code-block").forEach((block) => {
    ensureCodeBlockBoundaries(block);
    highlightCodeBlock(block);
  });
}

function ensureCodeBlockBoundaries(block) {
  const createParagraph = () => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    return paragraph;
  };
  if (!block.previousSibling || block.previousSibling.nodeType !== Node.ELEMENT_NODE) {
    block.before(createParagraph());
  }
  if (!block.nextSibling || block.nextSibling.nodeType !== Node.ELEMENT_NODE) {
    block.after(createParagraph());
  }
}

function getCodeColumnContext(block) {
  const editor = block.closest(".cell-editor");
  const sectionElement = block.closest(".check-section");
  if (!editor || !sectionElement) return null;
  const section = draft.sections.find((item) => item.id === sectionElement.dataset.sectionId);
  const column = section?.columns.find((item) => item.id === editor.dataset.columnId);
  if (!column) return null;
  const header = sectionElement.querySelector(`th[data-column-id="${column.id}"]`);
  const columnIndex = header ? [...header.parentElement.children].indexOf(header) : -1;
  if (columnIndex < 0) return null;
  return { editor, sectionElement, section, column, columnIndex };
}

function applyColumnWidth(context, width) {
  context.column.width = Math.max(140, Math.min(1000, Math.round(width)));
  context.sectionElement.querySelector("colgroup").children[context.columnIndex].style.width =
    `${context.column.width}px`;
  const table = context.sectionElement.querySelector(".check-table");
  table.style.width = `${52 + 164 + 46 + context.section.columns.reduce((sum, item) => sum + (Number(item.width) || 240), 0)}px`;
  scheduleSave();
}

function expandColumnForCode(block) {
  const context = getCodeColumnContext(block);
  if (!context) return;
  if (!block.dataset.previousColumnWidth) {
    block.dataset.previousColumnWidth = String(Number(context.column.width) || 240);
  }
  const desiredWidth = Math.min(
    1000,
    Math.max(Number(context.column.width) || 240, block.scrollWidth + 44),
  );
  if (desiredWidth > (Number(context.column.width) || 240)) {
    applyColumnWidth(context, desiredWidth);
  }
}

function restoreColumnAfterCode(block) {
  const context = getCodeColumnContext(block);
  const previousWidth = Number(block.dataset.previousColumnWidth);
  if (!context || !previousWidth) return;
  const anotherExpandedBlock = context.sectionElement.querySelector(
    `.cell-editor[data-column-id="${context.column.id}"] .cell-code-block.code-expanded`,
  );
  delete block.dataset.previousColumnWidth;
  if (!anotherExpandedBlock) applyColumnWidth(context, previousWidth);
}

function selectCodeBlock(block) {
  document.querySelectorAll(".cell-code-block.code-selected").forEach((item) => {
    if (item !== block) item.classList.remove("code-selected");
  });
  document.querySelectorAll(".cell-image.image-selected").forEach((item) => item.classList.remove("image-selected"));
  block.classList.add("code-selected");
}

function commitCodeChange(block) {
  const editor = block.closest(".cell-editor, .intro-editor");
  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}

function startCodeResize(event, block) {
  event.preventDefault();
  event.stopPropagation();
  selectCodeBlock(block);
  const editor = block.closest(".cell-editor, .intro-editor");
  const startX = event.clientX;
  const startWidth = block.getBoundingClientRect().width;
  const maxWidth = Math.max(160, editor?.clientWidth || startWidth);
  document.body.classList.add("resizing-code");
  const onMove = (moveEvent) => {
    const width = Math.max(160, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
    block.style.width = `${Math.round(width)}px`;
  };
  const onEnd = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onEnd);
    document.removeEventListener("pointercancel", onEnd);
    document.body.classList.remove("resizing-code");
    commitCodeChange(block);
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd);
  document.addEventListener("pointercancel", onEnd);
}

function rangeFromPoint(x, y, editor) {
  const nativeRange =
    document.caretRangeFromPoint?.(x, y) ||
    document.caretPositionFromPoint?.(x, y);
  if (nativeRange?.offsetNode) {
    if (!editor.contains(nativeRange.offsetNode)) return null;
    const converted = document.createRange();
    converted.setStart(nativeRange.offsetNode, nativeRange.offset);
    converted.collapse(true);
    return converted;
  }
  return nativeRange && editor.contains(nativeRange.startContainer) ? nativeRange : null;
}

function enableCodeObject(block) {
  block.draggable = true;
  block.addEventListener("dragstart", (event) => {
    if (event.target.closest("[data-editor-ui]")) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    const language = block.dataset.language || "text";
    const code = extractCodeText(block);
    draggedCodeBlock = block;
    block.classList.add("code-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `{code:${language}}\n${code}\n{code}`);
    event.dataTransfer.setData("text/html", codeSnippetHtml(language, code, block.style.width || ""));
  });
  block.addEventListener("dragend", () => {
    block.classList.remove("code-dragging");
    draggedCodeBlock = null;
    document.querySelectorAll(".code-drop-target").forEach((item) => item.classList.remove("code-drop-target"));
  });
}

function parseCodeFromClipboard(html, plainText) {
  if (html) {
    const container = document.createElement("div");
    container.innerHTML = html;
    const block = container.querySelector("pre[data-qa-code-snippet], pre.cell-code-block");
    if (block) {
      return {
        language: block.dataset.language || detectCodeLanguage(block.textContent || ""),
        code: block.textContent || "",
        width: block.style.width || "",
      };
    }
  }
  const match = String(plainText || "").match(/^\s*\{code(?::([^}]+))?\}\r?\n?([\s\S]*?)\r?\n?\{code\}\s*$/i);
  if (!match) return null;
  return {
    language: (match[1] || detectCodeLanguage(match[2])).trim().toLowerCase(),
    code: match[2],
    width: "",
  };
}

function insertCodeSnippet(editor, snippet, range = null) {
  activeEditor = editor;
  const html = `<p><br></p>${codeSnippetHtml(snippet.language, snippet.code, snippet.width)}<p><br></p>`;
  insertHtmlAtSelection(html, range);
  highlightCodeBlocks(editor);
}

function detectCodeLanguage(code) {
  const source = String(code || "").trim();
  if (!source) return "text";
  try {
    JSON.parse(source);
    return "json";
  } catch {}
  if (/^(?:<!doctype|<\?xml|<[\w:-]+[\s>])/i.test(source)) return "html";
  if (/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+/m.test(source)) return "http";
  if (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(source)) return "sql";
  if (/^\s*(?:#!\/.*\b(?:bash|sh)|(?:npm|yarn|pnpm|git|curl|docker)\s+)/m.test(source)) return "bash";
  if (/\b(?:interface|type)\s+\w+\s*[={]|:\s*(?:string|number|boolean)\b/.test(source)) return "typescript";
  if (/\b(?:const|let|var|function|=>|console\.log|import\s.+from|export\s+(?:default|const|function))\b/.test(source)) return "javascript";
  if (/^\s*(?:def|class)\s+\w+|^\s*(?:from\s+\S+\s+import|import\s+\S+)|\bprint\(/m.test(source)) return "python";
  if (/\b(?:public|private|protected)\s+(?:static\s+)?(?:class|void|String|int|boolean)\b/.test(source)) return "java";
  if (/[.#][\w-]+\s*\{[^}]*:[^}]*\}/s.test(source)) return "css";
  if (/^[\w.-]+:\s+\S+/m.test(source) && !/[{};]/.test(source)) return "yaml";
  return "text";
}

function insertCodeBlock() {
  if (!activeEditor?.matches(".cell-editor, .intro-editor")) return;
  const rangeNode = savedEditorRange?.commonAncestorContainer;
  const range =
    savedEditorRange && rangeNode?.isConnected && activeEditor.contains(rangeNode)
      ? savedEditorRange.cloneRange()
      : null;
  const selection = range && !range.collapsed ? range.toString() : "";
  const code = selection || '{\n  "key": "value"\n}';
  const language = detectCodeLanguage(code);
  const html = `<p><br></p><pre class="cell-code-block" data-language="${language}"><code>${escapeHtml(code)}</code></pre><p><br></p>`;
  insertHtmlAtSelection(html, range);
  highlightCodeBlocks(activeEditor);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function insertImages(files) {
  if (!activeEditor?.matches(".cell-editor, .intro-editor")) return;
  for (const file of [...files]) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 10 * 1024 * 1024) {
      showToast(`Файл ${file.name} больше 10 МБ`);
      continue;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const attachmentId = crypto.randomUUID();
    insertHtmlAtCursor(
      `<figure class="cell-image" contenteditable="false" data-align="left"><img src="${dataUrl}" alt="" data-attachment-id="${attachmentId}" data-file-name="${escapeHtml(file.name)}" data-mime-type="${escapeHtml(file.type)}"></figure><p><br></p>`,
    );
  }
  enhanceImageControls(activeEditor);
}

async function imageToPngBlob(image) {
  const response = await fetch(image.src);
  const sourceBlob = await response.blob();
  if (sourceBlob.type === "image/png") return sourceBlob;
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось преобразовать изображение"))),
      "image/png",
    );
  });
}

function imageFallbackMarkup(image) {
  const filename = image.dataset.jiraName || image.dataset.fileName || "";
  if (filename) return `!${filename}|thumbnail!`;
  return image.dataset.jiraUrl || image.src;
}

async function copyImageToClipboard(image) {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Копирование изображений не поддерживается");
    }
    const png = await imageToPngBlob(image);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    showToast("Изображение скопировано");
  } catch {
    await writeClipboardText(
      imageFallbackMarkup(image),
      image.dataset.jiraName || image.dataset.fileName
        ? "Скопирована Jira-разметка изображения"
        : "Скопирована ссылка на изображение",
    );
  }
}

function enhanceImageControls(root = document) {
  root.querySelectorAll(".cell-image").forEach((figure) => {
    figure.querySelectorAll(":scope > [data-editor-ui]").forEach((item) => item.remove());
    const image = figure.querySelector("img");
    if (!image) return;
    const controls = document.createElement("span");
    controls.className = "image-controls";
    controls.dataset.editorUi = "true";
    controls.contentEditable = "false";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "media-copy-button";
    copyButton.textContent = "⧉";
    copyButton.title = "Копировать изображение";
    copyButton.setAttribute("aria-label", "Копировать изображение");
    copyButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await copyImageToClipboard(image);
    });
    controls.append(copyButton);
    figure.append(controls);
  });
}

function commitImageChange(figure) {
  const editor = figure.closest(".cell-editor, .intro-editor");
  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}

function selectImage(figure) {
  document.querySelectorAll(".cell-image.image-selected").forEach((item) => {
    if (item !== figure) item.classList.remove("image-selected");
  });
  document.querySelectorAll(".cell-code-block.code-selected").forEach((item) => item.classList.remove("code-selected"));
  figure.classList.add("image-selected");
}

function setImageAlignment(figure, alignment) {
  figure.dataset.align = alignment;
  commitImageChange(figure);
}

function showImageMenu(figure) {
  selectImage(figure);
  showFloatingMenu(figure, [
    { label: "Выровнять слева", action: () => setImageAlignment(figure, "left") },
    { label: "По центру", action: () => setImageAlignment(figure, "center") },
    { label: "Выровнять справа", action: () => setImageAlignment(figure, "right") },
    {
      label: "По ширине ячейки",
      action: () => {
        figure.style.width = "100%";
        commitImageChange(figure);
      },
    },
    {
      label: "Удалить изображение",
      danger: true,
      action: () => {
        const editor = figure.closest(".cell-editor, .intro-editor");
        figure.remove();
        editor?.dispatchEvent(new Event("input", { bubbles: true }));
      },
    },
  ]);
}

function startImageResize(event, figure) {
  event.preventDefault();
  event.stopPropagation();
  closeFloatingMenu();
  selectImage(figure);
  const editor = figure.closest(".cell-editor, .intro-editor");
  const startX = event.clientX;
  const startWidth = figure.getBoundingClientRect().width;
  const maxWidth = Math.max(80, editor?.clientWidth || startWidth);
  document.body.classList.add("resizing-image");

  const onMove = (moveEvent) => {
    const width = Math.max(80, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
    figure.style.width = `${Math.round(width)}px`;
  };
  const onEnd = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onEnd);
    document.removeEventListener("pointercancel", onEnd);
    document.body.classList.remove("resizing-image");
    commitImageChange(figure);
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd);
  document.addEventListener("pointercancel", onEnd);
}

function collectLocalImages() {
  const images = [];
  const container = document.createElement("div");
  const collectFromHtml = (html, location) => {
    container.innerHTML = html || "";
    container.querySelectorAll("img[data-attachment-id]").forEach((image) => {
      if (!image.src.startsWith("data:") || image.dataset.jiraName) return;
      const [, dataBase64 = ""] = image.src.split(",");
      images.push({
        attachmentId: image.dataset.attachmentId,
        name: image.dataset.fileName || `image-${image.dataset.attachmentId}.png`,
        type: image.dataset.mimeType || "image/png",
        dataBase64,
        ...location,
      });
    });
  };
  collectFromHtml(draft.intro, { location: "intro" });
  for (const section of draft.sections) {
    for (const row of section.rows) {
      for (const [columnId, html] of Object.entries(row.cells)) {
        collectFromHtml(html, {
          location: "cell",
          sectionId: section.id,
          rowId: row.id,
          columnId,
        });
      }
    }
  }
  return images;
}

function applyUploadedAttachments(uploaded) {
  const byLocalId = new Map(uploaded.map((item) => [item.attachmentId, item]));
  const updateHtml = (html) => {
    const container = document.createElement("div");
    container.innerHTML = html || "";
    let changed = false;
    container.querySelectorAll("img[data-attachment-id]").forEach((image) => {
      const uploadedFile = byLocalId.get(image.dataset.attachmentId);
      if (!uploadedFile) return;
      image.dataset.jiraName = uploadedFile.filename || image.dataset.fileName;
      image.dataset.jiraId = uploadedFile.id || "";
      image.dataset.jiraUrl = uploadedFile.content || "";
      if (uploadedFile.thumbnail) image.dataset.jiraThumbnail = uploadedFile.thumbnail;
      changed = true;
    });
    return changed ? container.innerHTML : html;
  };
  draft.intro = updateHtml(draft.intro);
  for (const section of draft.sections) {
    for (const row of section.rows) {
      for (const column of section.columns) {
        row.cells[column.id] = updateHtml(row.cells[column.id] || "");
      }
    }
  }
}

async function prepareImport() {
  try {
    let imported;
    if (importSource === "markup") {
      imported = parseJiraMarkup(elements.importMarkup.value);
    } else {
      validateJiraSettings(jiraSettings, jiraSecret);
      const commentUrl = elements.commentImportUrl.value.trim();
      if (!commentUrl) throw new Error("Укажите ссылку на комментарий Jira");
      const result = await jiraRequest("/api/jira/import-comment", {
        ...jiraSettings,
        token: jiraSecret,
        commentUrl,
      });
      imported =
        result.format === "adf"
          ? parseAdfDocument(result.body, result.attachments || [])
          : parseJiraMarkup(result.body, result.attachments || []);
      imported.issueUrl = result.issueUrl || "";
    }
    pendingImportedDraft = imported;
    const rows = imported.sections.reduce((sum, section) => sum + section.rows.length, 0);
    const columns = imported.sections.reduce((sum, section) => sum + section.columns.length, 0);
    elements.importSummary.textContent = `Найдено: ${imported.sections.length} таблиц, ${rows} строк, ${columns} пользовательских колонок. Окружение: ${imported.environment}; итог: ${imported.overallStatus}.`;
    elements.importSummary.hidden = false;
    elements.importWarning.hidden = true;
    return imported;
  } catch (error) {
    elements.importWarning.textContent = error.message;
    elements.importWarning.hidden = false;
    pendingImportedDraft = null;
    throw error;
  }
}

async function applyImport(mode = "replace") {
  try {
    const imported = pendingImportedDraft || (await prepareImport());
    await saveReportSnapshot("before-import");
    if (mode === "append") {
      draft.sections.push(...clone(imported.sections));
      if (imported.intro) draft.intro += imported.intro;
    } else {
      const issueUrl = draft.issueUrl;
      draft = { ...imported, reportId: crypto.randomUUID(), issueUrl: imported.issueUrl || issueUrl };
    }
    scheduleHistoryCommit();
    saveDraft();
    render();
    closeImport();
    showToast(`Импортировано таблиц: ${imported.sections.length}`);
  } catch {
    // Ошибка уже показана в окне импорта.
  }
}

async function copyMarkup() {
  const markup = generateMarkup();
  if (!draft.sections.some((section) => section.rows.some(hasRowContent))) {
    showToast("Добавьте хотя бы одну заполненную строку");
    return;
  }
  try {
    await navigator.clipboard.writeText(markup);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = markup;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("Разметка скопирована — можно вставлять в Jira");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, duration = 2500) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.title = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), duration);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (!elements.themeToggle) return;
  const dark = theme === "dark";
  elements.themeToggle.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
  elements.themeToggle.querySelector(".theme-label").textContent = dark ? "Светлая" : "Тёмная";
  elements.themeToggle.setAttribute(
    "aria-label",
    dark ? "Включить светлую тему" : "Включить тёмную тему",
  );
}

function resetDraft() {
  if (!window.confirm("Очистить текущий отчёт и создать новый?")) return;
  saveReportSnapshot("before-new").catch(() => {});
  draft = clone(DEFAULT_DRAFT);
  draft.reportId = crypto.randomUUID();
  draft.sections = [createSection("Основные проверки", DEFAULT_COLUMNS, 2)];
  historyCurrent = serializeDraft();
  undoStack = [];
  redoStack = [];
  saveDraft();
  render();
  updateHistoryButtons();
  showToast("Создан новый отчёт");
}

elements.addSectionButton.addEventListener("click", () => {
  const previous = draft.sections[draft.sections.length - 1];
  const section = createSection(`Новый раздел ${draft.sections.length + 1}`, previous?.columns || DEFAULT_COLUMNS);
  draft.sections.push(section);
  renderSections();
  scheduleSave();
});

["input", "change"].forEach((eventName) => {
  [elements.issueUrl, elements.environment, elements.overallStatus].forEach((control) => {
    control.addEventListener(eventName, () => {
      collectDocumentFields();
      if (control === elements.overallStatus) setStatusClass(control, draft.overallStatus);
      scheduleSave();
    });
  });
});

elements.introEditor.addEventListener("input", () => {
  draft.intro = cleanEditorHtml(elements.introEditor);
  scheduleSave();
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    document.execCommand(button.dataset.command, false);
    activeEditor.focus();
  });
});
elements.blockFormat.addEventListener("change", () => {
  document.execCommand("formatBlock", false, elements.blockFormat.value);
  activeEditor.focus();
});
elements.linkButton.addEventListener("click", () => {
  const url = window.prompt("Введите адрес ссылки");
  if (url) document.execCommand("createLink", false, url);
  activeEditor.focus();
});
elements.codeButton.addEventListener("pointerdown", (event) => {
  const selection = window.getSelection();
  if (selection?.rangeCount && activeEditor.contains(selection.anchorNode)) {
    savedEditorRange = selection.getRangeAt(0).cloneRange();
  }
  event.preventDefault();
});
elements.codeButton.addEventListener("click", insertCodeBlock);
elements.imageButton.addEventListener("click", () => elements.imageInput.click());
elements.imageInput.addEventListener("change", async () => {
  await insertImages(elements.imageInput.files);
  elements.imageInput.value = "";
});
document.addEventListener("paste", async (event) => {
  const editor = event.target.closest?.(".cell-editor, .intro-editor") || activeEditor;
  if (!editor?.matches(".cell-editor, .intro-editor")) return;
  const images = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
  if (images.length) {
    event.preventDefault();
    activeEditor = editor;
    await insertImages(images);
    return;
  }
  const snippet = parseCodeFromClipboard(
    event.clipboardData?.getData("text/html") || "",
    event.clipboardData?.getData("text/plain") || "",
  );
  if (!snippet) return;
  event.preventDefault();
  const selection = window.getSelection();
  const range =
    selection?.rangeCount && editor.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : null;
  insertCodeSnippet(editor, snippet, range);
});
document.addEventListener("focusin", (event) => {
  if (event.target.matches(".intro-editor, .cell-editor")) {
    activeEditor = event.target;
    savedEditorRange = null;
  }
});
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !activeEditor?.contains(selection.anchorNode)) return;
  savedEditorRange = selection.getRangeAt(0).cloneRange();
});
document.addEventListener("pointerdown", (event) => {
  const codeBlock = event.target.closest(".cell-code-block");
  if (codeBlock && !event.target.closest("[data-editor-ui]")) {
    const rect = codeBlock.getBoundingClientRect();
    const onResizeHandle = rect.right - event.clientX <= 18 && rect.bottom - event.clientY <= 18;
    if (onResizeHandle) {
      startCodeResize(event, codeBlock);
      return;
    }
  }
  const figure = event.target.closest(".cell-image");
  if (!figure) return;
  const rect = figure.getBoundingClientRect();
  const onResizeHandle = rect.right - event.clientX <= 18 && rect.bottom - event.clientY <= 18;
  if (onResizeHandle) startImageResize(event, figure);
});
document.addEventListener("click", (event) => {
  const codeBlock = event.target.closest(".cell-code-block");
  if (codeBlock && !event.target.closest("[data-editor-ui]")) {
    event.preventDefault();
    event.stopPropagation();
    selectCodeBlock(codeBlock);
    return;
  }
  const figure = event.target.closest(".cell-image");
  if (figure) {
    event.preventDefault();
    event.stopPropagation();
    showImageMenu(figure);
    return;
  }
  document.querySelectorAll(".cell-image.image-selected").forEach((item) => {
    item.classList.remove("image-selected");
  });
  document.querySelectorAll(".cell-code-block.code-selected").forEach((item) => {
    item.classList.remove("code-selected");
  });
});

document.addEventListener("dragover", (event) => {
  if (!draggedCodeBlock) return;
  const editor = event.target.closest?.(".cell-editor, .intro-editor");
  if (!editor) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".code-drop-target").forEach((item) => {
    if (item !== editor) item.classList.remove("code-drop-target");
  });
  editor.classList.add("code-drop-target");
});

document.addEventListener("drop", (event) => {
  if (!draggedCodeBlock) return;
  const editor = event.target.closest?.(".cell-editor, .intro-editor");
  if (!editor) return;
  event.preventDefault();
  event.stopPropagation();
  const sourceBlock = draggedCodeBlock;
  const sourceEditor = sourceBlock.closest(".cell-editor, .intro-editor");
  const snippet = parseCodeFromClipboard(
    event.dataTransfer.getData("text/html"),
    event.dataTransfer.getData("text/plain"),
  );
  if (!snippet) return;
  const range = rangeFromPoint(event.clientX, event.clientY, editor);
  insertCodeSnippet(editor, snippet, range);
  if (sourceBlock.classList.contains("code-expanded")) restoreColumnAfterCode(sourceBlock);
  sourceBlock.remove();
  sourceEditor?.dispatchEvent(new Event("input", { bubbles: true }));
  editor.classList.remove("code-drop-target");
  draggedCodeBlock = null;
});

elements.previewButton.addEventListener("click", openPreview);
elements.copyButton.addEventListener("click", copyMarkup);
elements.modalCopyButton.addEventListener("click", copyMarkup);
elements.closePreviewButton.addEventListener("click", closePreview);
elements.clearButton.addEventListener("click", resetDraft);
elements.importButton.addEventListener("click", openImport);
elements.closeImportButton.addEventListener("click", closeImport);
elements.applyImportButton.addEventListener("click", () => applyImport("replace"));
elements.appendImportButton.addEventListener("click", () => applyImport("append"));
document.querySelectorAll(".import-source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    importSource = tab.dataset.importSource;
    document.querySelectorAll(".import-source-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    elements.markupImportPane.hidden = importSource !== "markup";
    elements.commentImportPane.hidden = importSource !== "comment";
    elements.importSummary.hidden = true;
    pendingImportedDraft = null;
  });
});
elements.undoButton.addEventListener("click", undo);
elements.redoButton.addEventListener("click", redo);
elements.historyButton.addEventListener("click", openHistory);
elements.closeHistoryButton.addEventListener("click", closeHistory);
elements.historySearch.addEventListener("input", () => renderHistoryList().catch(() => {}));
elements.saveHistorySnapshotButton.addEventListener("click", async () => {
  await saveReportSnapshot("manual");
  await renderHistoryList();
  showToast("Снимок отчёта сохранён");
});
elements.clearHistoryButton.addEventListener("click", async () => {
  const reports = await getAllReports();
  if (!reports.length) return;
  if (!window.confirm(`Удалить всю локальную историю (${reports.length} отчётов)?`)) return;
  await clearReportHistory();
  await renderHistoryList();
});
elements.focusModeButton.addEventListener("click", () => {
  const enabled = !document.querySelector(".app-shell").classList.contains("focus-mode");
  setFocusMode(enabled);
});
elements.focusExitButton.addEventListener("click", () => setFocusMode(false));
elements.jiraSettingsButton.addEventListener("click", openJiraSettings);
elements.closeJiraSettingsButton.addEventListener("click", closeJiraSettings);
elements.saveJiraSettingsButton.addEventListener("click", saveJiraSettings);
elements.testJiraButton.addEventListener("click", testJiraConnection);
elements.publishButton.addEventListener("click", publishToJira);
elements.jiraType.addEventListener("change", updateJiraSettingsLabels);
elements.jiraAuthMethod.addEventListener("change", updateJiraSettingsLabels);
elements.themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("qa-report-theme", theme);
  applyTheme(theme);
});
document.querySelectorAll(".preview-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".preview-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    const visual = tab.dataset.previewTab === "visual";
    elements.visualPreview.hidden = !visual;
    elements.markupPreview.hidden = visual;
  });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".floating-context-menu, .row-menu-button, .column-menu-button, .cell-image")) {
    closeFloatingMenu();
  }
});
window.addEventListener("resize", closeFloatingMenu);
window.addEventListener("scroll", closeFloatingMenu, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Backspace" || event.key === "Delete") {
    const selectedCode = document.querySelector(".cell-code-block.code-selected");
    const selectedImage = document.querySelector(".cell-image.image-selected");
    const object = selectedCode || selectedImage;
    if (object) {
      event.preventDefault();
      const editor = object.closest(".cell-editor, .intro-editor");
      if (selectedCode?.classList.contains("code-expanded")) restoreColumnAfterCode(selectedCode);
      object.remove();
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
      showToast(selectedCode ? "Фрагмент кода удалён" : "Изображение удалено");
      return;
    }
  }
  if (event.key === "Escape") {
    if (!elements.previewModal.hidden) closePreview();
    if (!elements.importModal.hidden) closeImport();
    if (!elements.jiraSettingsModal.hidden) closeJiraSettings();
    if (!elements.historyModal.hidden) closeHistory();
    if (document.querySelector(".app-shell").classList.contains("focus-mode")) setFocusMode(false);
  }
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  }
  if (
    (event.metaKey || event.ctrlKey) &&
    ((event.shiftKey && event.key.toLowerCase() === "z") || event.key.toLowerCase() === "y")
  ) {
    event.preventDefault();
    redo();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    collectDocumentFields();
    saveDraft();
    showToast("Черновик сохранён");
  }
});
window.addEventListener("beforeunload", () => {
  collectDocumentFields();
  saveDraft();
});

render();
updateHistoryButtons();
