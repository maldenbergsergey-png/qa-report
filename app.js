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
  "ТРЕБУЕТ УТОЧНЕНИЯ": {
    className: "status-clarification",
    color: "#9f5f00",
    jiraColor: "#bf6700",
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
  copyVisualButton: document.querySelector("#copyVisualButton"),
  clearButton: document.querySelector("#clearButton"),
  importButton: document.querySelector("#importButton"),
  previewModal: document.querySelector("#previewModal"),
  closePreviewButton: document.querySelector("#closePreviewButton"),
  visualPreview: document.querySelector("#visualPreview"),
  markupPreview: document.querySelector("#markupPreview"),
  modalCopyButton: document.querySelector("#modalCopyButton"),
  modalCopyVisualButton: document.querySelector("#modalCopyVisualButton"),
  importModal: document.querySelector("#importModal"),
  closeImportButton: document.querySelector("#closeImportButton"),
  importMarkup: document.querySelector("#importMarkup"),
  importWarning: document.querySelector("#importWarning"),
  applyImportButton: document.querySelector("#applyImportButton"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryChart: document.querySelector("#summaryChart"),
  summaryList: document.querySelector("#summaryList"),
  saveState: document.querySelector("#saveState"),
  feedbackButton: document.querySelector("#feedbackButton"),
  toast: document.querySelector("#toast"),
  blockFormat: document.querySelector("#blockFormat"),
  linkButton: document.querySelector("#linkButton"),
  linkPopover: document.querySelector("#linkPopover"),
  linkPopoverTitle: document.querySelector("#linkPopoverTitle"),
  linkTextInput: document.querySelector("#linkTextInput"),
  linkUrlInput: document.querySelector("#linkUrlInput"),
  linkPopoverError: document.querySelector("#linkPopoverError"),
  closeLinkPopoverButton: document.querySelector("#closeLinkPopoverButton"),
  removeLinkButton: document.querySelector("#removeLinkButton"),
  applyLinkButton: document.querySelector("#applyLinkButton"),
  textColorInput: document.querySelector("#textColorInput"),
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
  jiraMenuButton: document.querySelector("#jiraMenuButton"),
  jiraMenu: document.querySelector("#jiraMenu"),
  copyMenuButton: document.querySelector("#copyMenuButton"),
  copyMenu: document.querySelector("#copyMenu"),
  focusExitButton: document.querySelector("#focusExitButton"),
  codeButton: document.querySelector("#codeButton"),
  imageButton: document.querySelector("#imageButton"),
  imageInput: document.querySelector("#imageInput"),
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
  mediaViewerModal: document.querySelector("#mediaViewerModal"),
  mediaViewerImage: document.querySelector("#mediaViewerImage"),
  closeMediaViewerButton: document.querySelector("#closeMediaViewerButton"),
  codeEditorModal: document.querySelector("#codeEditorModal"),
  codeEditorTextarea: document.querySelector("#codeEditorTextarea"),
  codeEditorLineNumbers: document.querySelector("#codeEditorLineNumbers"),
  codeEditorLanguage: document.querySelector("#codeEditorLanguage"),
  codeEditorState: document.querySelector("#codeEditorState"),
  saveCodeButton: document.querySelector("#saveCodeButton"),
  closeCodeEditorButton: document.querySelector("#closeCodeEditorButton"),
  confirmModal: document.querySelector("#confirmModal"),
  confirmModalTitle: document.querySelector("#confirmModalTitle"),
  confirmModalMessage: document.querySelector("#confirmModalMessage"),
  closeConfirmButton: document.querySelector("#closeConfirmButton"),
  cancelConfirmButton: document.querySelector("#cancelConfirmButton"),
  acceptConfirmButton: document.querySelector("#acceptConfirmButton"),
  feedbackModal: document.querySelector("#feedbackModal"),
  closeFeedbackButton: document.querySelector("#closeFeedbackButton"),
  cancelFeedbackButton: document.querySelector("#cancelFeedbackButton"),
  sendFeedbackButton: document.querySelector("#sendFeedbackButton"),
  feedbackContact: document.querySelector("#feedbackContact"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  feedbackFilesButton: document.querySelector("#feedbackFilesButton"),
  feedbackFilesInput: document.querySelector("#feedbackFilesInput"),
  feedbackDropzone: document.querySelector("#feedbackDropzone"),
  feedbackPreviewList: document.querySelector("#feedbackPreviewList"),
  feedbackIncludeReport: document.querySelector("#feedbackIncludeReport"),
  feedbackError: document.querySelector("#feedbackError"),
  feedbackState: document.querySelector("#feedbackState"),
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
let editingCodeBlock = null;
let codeEditorInitialValue = "";
let linkEditorRange = null;
let editingLink = null;
let confirmResolver = null;
let feedbackFiles = [];

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
  draft.environment = elements.environment.value.trim() || "Не указано";
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
  const currentTargetIndex = section.columns.findIndex((item) => item.id === targetId);
  const insertionIndex = currentTargetIndex + (placeAfter ? 1 : 0);
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
  const meta = STATUS_META[status] || STATUS_META["НЕ ПРОВЕРЕНО"];
  select.classList.add(meta.className);
}

function hasRowContent(row) {
  return (
    Object.values(row.cells).some((value) => htmlToText(value) || /<img|<pre/i.test(value)) ||
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
    if ((tag === "span" && node.style.color) || (tag === "font" && node.getAttribute("color"))) {
      const color = node.style.color || node.getAttribute("color");
      return `{color:${cssColorToHex(color)}}${content}{color}`;
    }
    if (tag === "pre") {
      return `{code}\n${extractCodeText(node)}\n{code}`;
    }
    if (tag === "img") {
      const name = node.dataset.jiraName || node.dataset.fileName || node.alt || "image.png";
      // Ссылка по имени вложения даёт Jira возможность открыть изображение
      // во встроенном просмотрщике, а параметр thumbnail оставляет его компактным.
      return `!${name}|thumbnail!`;
    }
    if (tag === "figure") return `\n${content}\n`;
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
  content = content.replace(/\{code(?::[^}]+)?\}[\s\S]*?\{code\}/gi, (block) => {
    const token = `@@JIRA_PROTECTED_${protectedBlocks.length}@@`;
    protectedBlocks.push(block);
    return token;
  });
  content = content.replace(/![^!\r\n]+!/g, (block) => {
    const token = `@@JIRA_IMAGE_${protectedBlocks.length}@@`;
    // Jira распознаёт служебную вертикальную черту внутри image markup.
    // Блок временно вынимается, чтобы общий экранировщик ячейки не превратил
    // её в часть имени файла.
    protectedBlocks.push(block);
    return token;
  });
  // Если перед image-макросом оставить Jira-перенос `\\`, Jira перестаёт
  // распознавать изображение и воспринимает `|thumbnail` как новую ячейку.
  // Поэтому только на границе текста и изображения используем обычный пробел.
  content = content
    .replace(/[ \t]*(?:\r?\n)+[ \t]*(?=@@JIRA_IMAGE_\d+@@)/g, " ")
    .replace(/(@@JIRA_IMAGE_\d+@@)[ \t]*(?:\r?\n)+[ \t]*/g, "$1 ");
  content = content
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    // Несколько пустых абзацев вокруг изображения должны стать одним
    // переносом Jira. Иначе последний слеш экранирует начальный `!`
    // и изображение выводится обычным текстом.
    .replace(/(?:\r?\n)+/g, "\\\\");
  content = content.replace(
    /@@JIRA_(?:PROTECTED|IMAGE)_(\d+)@@/g,
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
    .replace(
      /\{color:(#[0-9a-f]{3,8})\}([\s\S]*?)\{color\}/gi,
      '<span style="color:$1">$2</span>',
    )
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
  if (status === "ТРЕБУЕТ УТОЧНЕНИЯ") return status;
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
    if (/^h[23]\.\s+/i.test(line)) {
      pendingTitle = line.replace(/^h[23]\.\s+/i, "").trim();
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
  if (htmlToText(draft.intro) || /<img|<pre/i.test(draft.intro)) {
    const intro = document.createElement("div");
    intro.innerHTML = previewEditorHtml(draft.intro);
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
      tr.innerHTML = `<td>${index + 1}.</td>${section.columns.map((column) => `<td>${previewEditorHtml(row.cells[column.id] || "")}</td>`).join("")}<td><strong style="color:${STATUS_META[row.status].jiraColor}">${row.status}</strong></td>`;
      tbody.append(tr);
    });
    table.append(thead, tbody);
    wrapper.append(heading, table);
  });
  return wrapper.innerHTML;
}

function generatePortableHtml() {
  const container = document.createElement("div");
  container.innerHTML = generateVisualPreview();
  container.style.fontFamily = "Arial, sans-serif";
  container.style.color = "#172b4d";
  container.style.background = "#ffffff";
  container.querySelectorAll("h1").forEach((item) => {
    item.style.fontSize = "24px";
    item.style.margin = "0 0 16px";
  });
  container.querySelectorAll("h2").forEach((item) => {
    item.style.fontSize = "19px";
    item.style.margin = "24px 0 8px";
  });
  container.querySelectorAll("table").forEach((table) => {
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
  });
  container.querySelectorAll("th, td").forEach((cell) => {
    cell.style.padding = "8px";
    cell.style.border = "1px solid #c7cdd4";
    cell.style.verticalAlign = "top";
    cell.style.textAlign = "left";
  });
  container.querySelectorAll("th").forEach((cell) => {
    cell.style.background = "#f1f2f4";
    cell.style.fontWeight = "700";
  });
  container.querySelectorAll("figure").forEach((figure) => {
    figure.style.margin = "6px 0";
  });
  container.querySelectorAll("img").forEach((image) => {
    image.style.display = "block";
    image.style.maxWidth = image.style.width || "320px";
    image.style.height = "auto";
  });
  container.querySelectorAll("pre").forEach((block) => {
    block.style.padding = "10px";
    block.style.border = "1px solid #c7cdd4";
    block.style.borderRadius = "6px";
    block.style.background = "#f4f5f7";
    block.style.whiteSpace = "pre-wrap";
  });
  return container.outerHTML;
}

function previewEditorHtml(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  container.querySelectorAll("[data-editor-ui]").forEach((item) => item.remove());
  container.querySelectorAll(".cell-code-block").forEach((block) => {
    block.classList.remove("code-selected", "code-dragging", "code-expanded");
    block.removeAttribute("draggable");
    block.removeAttribute("tabindex");
  });
  container.querySelectorAll(".cell-image").forEach((figure) => {
    figure.classList.remove("image-selected");
    figure.removeAttribute("tabindex");
  });
  return container.innerHTML;
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
  const publishButtonHtml = elements.publishButton.innerHTML;
  try {
    collectDocumentFields();
    const issue = parseIssueUrl(draft.issueUrl);
    const settings = { ...jiraSettings };
    validateJiraSettings(settings, jiraSecret);
    await checkBackendCompatibility();
    const confirmed = await askConfirmation(
      `Опубликовать отчёт комментарием в задаче ${issue.issueKey}?`,
      { title: "Отправка в Jira", confirmText: "Отправить" },
    );
    if (!confirmed) return;
    elements.publishButton.disabled = true;
    elements.publishButton.innerHTML =
      '<span class="primary-action-icon">…</span><span class="primary-action-label">Отправляем…</span>';
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
    elements.publishButton.innerHTML = publishButtonHtml;
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
      const confirmed = await askConfirmation(`Удалить отчёт «${report.title}»?`, {
        title: "Удаление отчёта",
        confirmText: "Удалить",
        danger: true,
      });
      if (!confirmed) return;
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

function cssColorToHex(color) {
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color.toLowerCase();
  const match = String(color).match(/\d+(?:\.\d+)?/g);
  if (!match || match.length < 3) return color;
  return `#${match
    .slice(0, 3)
    .map((value) => Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, "0"))
    .join("")}`;
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
  const jiraCode = `{code}\n${code}\n{code}`;
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

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "code-control-button code-edit";
  editButton.textContent = "✎";
  editButton.title = "Открыть редактор кода";
  editButton.setAttribute("aria-label", "Редактировать код");
  editButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openCodeEditor(block);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "code-control-button code-delete";
  deleteButton.textContent = "🗑";
  deleteButton.title = "Удалить фрагмент кода";
  deleteButton.setAttribute("aria-label", "Удалить фрагмент кода");
  deleteButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteEditorObject(block, "Фрагмент кода удалён");
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
  controls.append(copyButton, editButton, toggle, deleteButton);
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
  block.tabIndex = 0;
  block.focus({ preventScroll: true });
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
    event.dataTransfer.setData("text/plain", `{code}\n${code}\n{code}`);
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
  const code = formatCode(snippet.code);
  const detectedLanguage = detectCodeLanguage(code);
  const language =
    detectedLanguage !== "text" ? detectedLanguage : String(snippet.language || "text").toLowerCase();
  const html = `<p><br></p>${codeSnippetHtml(language, code, snippet.width)}<p><br></p>`;
  insertHtmlAtSelection(html, range);
  highlightCodeBlocks(editor);
}

function deleteEditorObject(object, message) {
  const editor = object.closest(".cell-editor, .intro-editor");
  if (object.matches(".cell-code-block.code-expanded")) restoreColumnAfterCode(object);
  object.remove();
  editor?.dispatchEvent(new Event("input", { bubbles: true }));
  showToast(message);
}

function openCodeEditor(block) {
  editingCodeBlock = block;
  codeEditorInitialValue = extractCodeText(block);
  elements.codeEditorTextarea.value = codeEditorInitialValue;
  updateCodeEditorLineNumbers();
  elements.codeEditorLanguage.textContent = (block.dataset.language || detectCodeLanguage(codeEditorInitialValue)).toUpperCase();
  elements.codeEditorState.textContent = "Изменений нет";
  elements.saveCodeButton.disabled = true;
  elements.codeEditorModal.hidden = false;
  setCodeEditorBackgroundInert(true);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => elements.codeEditorTextarea.focus());
}

function setCodeEditorBackgroundInert(inert) {
  document.querySelectorAll(".topbar, .workspace, #focusExitButton, #feedbackButton").forEach((element) => {
    element.inert = inert;
  });
}

function updateCodeEditorLineNumbers() {
  const lineCount = Math.max(1, elements.codeEditorTextarea.value.split("\n").length);
  elements.codeEditorLineNumbers.textContent = Array.from(
    { length: lineCount },
    (_, index) => index + 1,
  ).join("\n");
  elements.codeEditorLineNumbers.scrollTop = elements.codeEditorTextarea.scrollTop;
}

function codeEditorIsDirty() {
  return (
    !elements.codeEditorModal.hidden &&
    Boolean(editingCodeBlock) &&
    elements.codeEditorTextarea.value !== codeEditorInitialValue
  );
}

function saveCodeChanges() {
  if (!editingCodeBlock?.isConnected) return closeCodeEditor(true);
  const code = formatCode(elements.codeEditorTextarea.value);
  const language = detectCodeLanguage(code);
  editingCodeBlock.dataset.language = language;
  let codeElement = editingCodeBlock.querySelector(":scope > code");
  if (!codeElement) {
    codeElement = document.createElement("code");
    editingCodeBlock.append(codeElement);
  }
  codeElement.textContent = code;
  codeEditorInitialValue = code;
  highlightCodeBlock(editingCodeBlock);
  commitCodeChange(editingCodeBlock);
  closeCodeEditor(true);
  showToast("Изменения кода сохранены");
}

async function closeCodeEditor(force = false) {
  if (!force && codeEditorIsDirty()) {
    const confirmed = await askConfirmation(
      "Изменения кода не сохранены. Закрыть редактор и потерять их?",
      { title: "Несохранённый код", confirmText: "Закрыть без сохранения", danger: true },
    );
    if (!confirmed) return false;
  }
  elements.codeEditorModal.hidden = true;
  setCodeEditorBackgroundInert(false);
  document.body.style.overflow = "";
  editingCodeBlock = null;
  codeEditorInitialValue = "";
  return true;
}

function openMediaViewer(image) {
  elements.mediaViewerImage.src = image.src;
  elements.mediaViewerImage.alt = image.dataset.fileName || "Вложение";
  elements.mediaViewerModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMediaViewer() {
  elements.mediaViewerModal.hidden = true;
  elements.mediaViewerImage.removeAttribute("src");
  document.body.style.overflow = "";
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

function formatCode(code) {
  const source = String(code || "").replace(/\r\n?/g, "\n").replace(/\t/g, "  ").trim();
  if (!source) return "";
  try {
    return JSON.stringify(JSON.parse(source), null, 2);
  } catch {
    return source;
  }
}

function looksLikeCode(value) {
  const source = String(value || "").trim();
  if (!source) return false;
  if (detectCodeLanguage(source) !== "text") return true;
  if (!source.includes("\n")) return false;
  return (
    /^[\s]*[{\[]/m.test(source) ||
    /[{}[\]();=>]/.test(source) ||
    /^(?:\s{2,}|\t)\S/m.test(source)
  );
}

function isPlainUrl(value) {
  return /^(?:https?:\/\/|www\.)[^\s]+$/i.test(String(value || "").trim());
}

function normalizeLinkUrl(value) {
  const url = String(value || "").trim();
  return /^www\./i.test(url) ? `https://${url}` : url;
}

function linkifyPlainText(value) {
  const source = String(value || "");
  const pattern = /(?:https?:\/\/|www\.)[^\s]+/gi;
  let output = "";
  let offset = 0;
  for (const match of source.matchAll(pattern)) {
    output += escapeHtml(source.slice(offset, match.index));
    output += `<a href="${escapeHtml(normalizeLinkUrl(match[0]))}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[0])}</a>`;
    offset = match.index + match[0].length;
  }
  return `${output}${escapeHtml(source.slice(offset))}`.replace(/\r?\n/g, "<br>");
}

function insertCodeBlock() {
  if (!activeEditor?.matches(".cell-editor, .intro-editor")) return;
  const rangeNode = savedEditorRange?.commonAncestorContainer;
  const range =
    savedEditorRange && rangeNode?.isConnected && activeEditor.contains(rangeNode)
      ? savedEditorRange.cloneRange()
      : null;
  const selection = range && !range.collapsed ? range.toString() : "";
  const code = formatCode(selection);
  const language = detectCodeLanguage(code);
  const marker = crypto.randomUUID();
  const html = `<p><br></p><pre class="cell-code-block" data-new-code="${marker}" data-language="${language}"><code>${escapeHtml(code)}</code></pre><p><br></p>`;
  insertHtmlAtSelection(html, range);
  highlightCodeBlocks(activeEditor);
  const inserted = activeEditor.querySelector(`pre[data-new-code="${marker}"]`);
  inserted?.removeAttribute("data-new-code");
  if (inserted) openCodeEditor(inserted);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function openFeedback() {
  feedbackFiles = [];
  elements.feedbackContact.value = "";
  elements.feedbackMessage.value = "";
  elements.feedbackIncludeReport.checked = false;
  elements.feedbackError.hidden = true;
  elements.feedbackState.textContent = "Обращение сохранится на сервере приложения.";
  renderFeedbackFiles();
  elements.feedbackModal.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => elements.feedbackMessage.focus());
}

function closeFeedback() {
  elements.feedbackModal.hidden = true;
  document.body.style.overflow = "";
  feedbackFiles = [];
  renderFeedbackFiles();
}

async function addFeedbackFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith("image/"));
  for (const file of images) {
    if (feedbackFiles.length >= 6) {
      elements.feedbackError.textContent = "Можно приложить не более 6 изображений";
      elements.feedbackError.hidden = false;
      break;
    }
    if (file.size > 8 * 1024 * 1024) {
      elements.feedbackError.textContent = `Файл «${file.name}» больше 8 МБ`;
      elements.feedbackError.hidden = false;
      continue;
    }
    const totalSize = feedbackFiles.reduce((sum, entry) => sum + entry.size, 0) + file.size;
    if (totalSize > 18 * 1024 * 1024) {
      elements.feedbackError.textContent = "Общий размер изображений больше 18 МБ";
      elements.feedbackError.hidden = false;
      break;
    }
    feedbackFiles.push({
      id: crypto.randomUUID(),
      name: file.name || `screenshot-${feedbackFiles.length + 1}.png`,
      type: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
    });
  }
  renderFeedbackFiles();
}

function renderFeedbackFiles() {
  elements.feedbackPreviewList.innerHTML = "";
  elements.feedbackDropzone.hidden = feedbackFiles.length > 0;
  feedbackFiles.forEach((file) => {
    const item = document.createElement("div");
    item.className = "feedback-preview-item";
    const image = document.createElement("img");
    image.src = file.dataUrl;
    image.alt = "";
    const info = document.createElement("span");
    info.textContent = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Удалить изображение";
    remove.addEventListener("click", () => {
      feedbackFiles = feedbackFiles.filter((entry) => entry.id !== file.id);
      renderFeedbackFiles();
    });
    item.append(image, info, remove);
    elements.feedbackPreviewList.append(item);
  });
}

async function sendFeedback() {
  const message = elements.feedbackMessage.value.trim();
  if (!message) {
    elements.feedbackError.textContent = "Опишите проблему";
    elements.feedbackError.hidden = false;
    elements.feedbackMessage.focus();
    return;
  }
  elements.feedbackError.hidden = true;
  elements.sendFeedbackButton.disabled = true;
  elements.feedbackState.textContent = "Отправляем обращение…";
  try {
    collectDocumentFields();
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact: elements.feedbackContact.value.trim(),
        message,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        theme: document.documentElement.dataset.theme || "light",
        report: elements.feedbackIncludeReport.checked ? clone(draft) : null,
        files: feedbackFiles.map((file) => ({
          name: file.name,
          type: file.type,
          dataBase64: file.dataUrl.split(",")[1] || "",
        })),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    closeFeedback();
    showToast("Обращение отправлено", 4500);
  } catch (error) {
    elements.feedbackError.textContent = `Не удалось отправить: ${error.message}`;
    elements.feedbackError.hidden = false;
    elements.feedbackState.textContent = "Проверьте соединение и попробуйте ещё раз.";
  } finally {
    elements.sendFeedbackButton.disabled = false;
  }
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
    ensureMediaBoundaries(figure);
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

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "media-copy-button";
    viewButton.textContent = "⛶";
    viewButton.title = "Открыть изображение";
    viewButton.setAttribute("aria-label", "Открыть изображение");
    viewButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMediaViewer(image);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "media-copy-button";
    deleteButton.textContent = "🗑";
    deleteButton.title = "Удалить изображение";
    deleteButton.setAttribute("aria-label", "Удалить изображение");
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteEditorObject(figure, "Изображение удалено");
    });
    controls.append(copyButton, viewButton, deleteButton);
    figure.append(controls);
  });
}

function ensureMediaBoundaries(figure) {
  const createParagraph = () => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    return paragraph;
  };
  if (!figure.previousSibling) figure.before(createParagraph());
  if (!figure.nextSibling) figure.after(createParagraph());
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
  figure.tabIndex = 0;
  figure.focus({ preventScroll: true });
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
  const usedNumbers = [];
  const allHtml = [
    draft.intro,
    ...draft.sections.flatMap((section) =>
      section.rows.flatMap((row) => Object.values(row.cells)),
    ),
  ];
  allHtml.forEach((html) => {
    container.innerHTML = html || "";
    container.querySelectorAll("img").forEach((image) => {
      const name = image.dataset.jiraName || image.dataset.fileName || "";
      const match = name.match(/^screenshot-(\d+)\./i);
      if (match) usedNumbers.push(Number(match[1]));
    });
  });
  let screenshotNumber = Math.max(0, ...usedNumbers) + 1;
  const extensionByType = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  const collectFromHtml = (html, location) => {
    container.innerHTML = html || "";
    container.querySelectorAll("img[data-attachment-id]").forEach((image) => {
      // Локальный data URL остаётся исходником изображения и после публикации.
      // Загружаем его заново при каждой отправке: старое вложение пользователь
      // мог удалить из Jira, а новый комментарий не должен от него зависеть.
      if (!image.src.startsWith("data:")) return;
      const [, dataBase64 = ""] = image.src.split(",");
      const type = image.dataset.mimeType || "image/png";
      const extension = extensionByType[type] || "png";
      images.push({
        attachmentId: image.dataset.attachmentId,
        name: `screenshot-${screenshotNumber}.${extension}`,
        type,
        dataBase64,
        ...location,
      });
      screenshotNumber += 1;
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

async function copyVisualReport() {
  if (!draft.sections.some((section) => section.rows.some(hasRowContent))) {
    showToast("Добавьте хотя бы одну заполненную строку");
    return;
  }
  const html = generatePortableHtml();
  const textContainer = document.createElement("div");
  textContainer.innerHTML = html;
  const plainText = textContainer.innerText;
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Расширенный буфер обмена недоступен");
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      }),
    ]);
  } catch {
    const holder = document.createElement("div");
    holder.contentEditable = "true";
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    holder.innerHTML = html;
    document.body.append(holder);
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    holder.remove();
  }
  showToast("Визуальная таблица скопирована");
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
  elements.themeToggle.querySelector(".theme-icon use")?.setAttribute(
    "href",
    dark ? "#icon-sun" : "#icon-moon",
  );
  elements.themeToggle.setAttribute(
    "aria-label",
    dark ? "Включить светлую тему" : "Включить тёмную тему",
  );
  elements.themeToggle.title = dark ? "Включить светлую тему" : "Включить тёмную тему";
}

function closeHeaderDropdowns(exceptMenu = null) {
  [
    [elements.jiraMenuButton, elements.jiraMenu],
    [elements.copyMenuButton, elements.copyMenu],
  ].forEach(([button, menu]) => {
    if (!button || !menu || menu === exceptMenu) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.closest(".header-dropdown")?.classList.remove("open");
  });
}

function toggleHeaderDropdown(button, menu) {
  const willOpen = menu.hidden;
  closeHeaderDropdowns(menu);
  menu.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
  button.closest(".header-dropdown")?.classList.toggle("open", willOpen);
  if (willOpen) menu.querySelector("button:not(:disabled)")?.focus();
}

function askConfirmation(message, options = {}) {
  if (confirmResolver) confirmResolver(false);
  elements.confirmModalTitle.textContent = options.title || "Подтвердите действие";
  elements.confirmModalMessage.textContent = message;
  elements.acceptConfirmButton.textContent = options.confirmText || "Подтвердить";
  elements.acceptConfirmButton.className =
    `button ${options.danger ? "button-danger" : "button-primary"}`;
  elements.confirmModal.hidden = false;
  document.body.style.overflow = "hidden";
  elements.acceptConfirmButton.focus();
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function resolveConfirmation(value) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  elements.confirmModal.hidden = true;
  document.body.style.overflow =
    elements.codeEditorModal.hidden &&
    elements.previewModal.hidden &&
    elements.importModal.hidden &&
    elements.jiraSettingsModal.hidden &&
    elements.historyModal.hidden
      ? ""
      : "hidden";
  resolve(value);
}

async function resetDraft() {
  const confirmed = await askConfirmation("Очистить текущий отчёт и создать новый?", {
    title: "Новый отчёт",
    confirmText: "Создать новый",
    danger: true,
  });
  if (!confirmed) return;
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
elements.linkButton.addEventListener("pointerdown", () => {
  const selection = window.getSelection();
  if (selection?.rangeCount && activeEditor.contains(selection.anchorNode)) {
    savedEditorRange = selection.getRangeAt(0).cloneRange();
  }
});
function anchorFromRange(range) {
  if (!range) return null;
  const parentAnchor = (node) =>
    (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest?.("a") || null;
  return (
    parentAnchor(range.startContainer) ||
    parentAnchor(range.endContainer) ||
    parentAnchor(range.commonAncestorContainer)
  );
}

function positionLinkPopover() {
  const buttonRect = elements.linkButton.getBoundingClientRect();
  const popoverWidth = Math.min(360, window.innerWidth - 24);
  const left = Math.max(12, Math.min(buttonRect.left, window.innerWidth - popoverWidth - 12));
  elements.linkPopover.style.width = `${popoverWidth}px`;
  elements.linkPopover.style.left = `${left}px`;
  elements.linkPopover.style.top = `${buttonRect.bottom + 8}px`;
}

function closeLinkPopover() {
  elements.linkPopover.hidden = true;
  elements.linkPopoverError.hidden = true;
  linkEditorRange = null;
  editingLink = null;
}

function openLinkPopover() {
  linkEditorRange = savedEditorRange?.cloneRange() || null;
  editingLink = anchorFromRange(linkEditorRange);
  const selectedText = linkEditorRange?.toString().trim() || "";
  const selectedUrl = isPlainUrl(selectedText) ? normalizeLinkUrl(selectedText) : "";
  elements.linkPopoverTitle.textContent = editingLink ? "Изменить ссылку" : "Добавить ссылку";
  elements.linkTextInput.value = editingLink?.textContent || selectedText || "";
  elements.linkUrlInput.value = editingLink?.getAttribute("href") || selectedUrl;
  elements.removeLinkButton.hidden = !editingLink;
  elements.linkPopoverError.hidden = true;
  elements.linkPopover.hidden = false;
  positionLinkPopover();
  requestAnimationFrame(() =>
    (elements.linkTextInput.value ? elements.linkUrlInput : elements.linkTextInput).focus(),
  );
}

function applyLinkFromPopover() {
  const title = elements.linkTextInput.value.trim();
  const url = normalizeLinkUrl(elements.linkUrlInput.value);
  if (!title) {
    elements.linkPopoverError.textContent = "Введите текст ссылки";
    elements.linkPopoverError.hidden = false;
    return;
  }
  if (!/^https?:\/\/\S+$/i.test(url)) {
    elements.linkPopoverError.textContent =
      "Введите адрес, начинающийся с www., http:// или https://";
    elements.linkPopoverError.hidden = false;
    return;
  }
  elements.linkUrlInput.value = url;
  const range = linkEditorRange?.cloneRange();
  if (editingLink?.isConnected && range) range.selectNode(editingLink);
  insertHtmlAtSelection(
    `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`,
    range,
  );
  closeLinkPopover();
  activeEditor.focus();
}

function removeEditedLink() {
  if (!editingLink?.isConnected) return closeLinkPopover();
  const text = document.createTextNode(editingLink.textContent || "");
  editingLink.replaceWith(text);
  activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  closeLinkPopover();
  activeEditor.focus();
}

elements.linkButton.addEventListener("click", openLinkPopover);
elements.applyLinkButton.addEventListener("click", applyLinkFromPopover);
elements.removeLinkButton.addEventListener("click", removeEditedLink);
elements.closeLinkPopoverButton.addEventListener("click", closeLinkPopover);
[elements.linkTextInput, elements.linkUrlInput].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLinkFromPopover();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeLinkPopover();
      activeEditor.focus();
    }
  });
});
elements.textColorInput.addEventListener("pointerdown", () => {
  const selection = window.getSelection();
  if (selection?.rangeCount && activeEditor.contains(selection.anchorNode)) {
    savedEditorRange = selection.getRangeAt(0).cloneRange();
  }
});
elements.textColorInput.addEventListener("input", () => {
  const range = savedEditorRange?.cloneRange();
  activeEditor.focus();
  if (range && !range.collapsed) {
    const span = document.createElement("span");
    span.style.color = elements.textColorInput.value;
    span.append(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedEditorRange = range.cloneRange();
  } else {
    document.execCommand("foreColor", false, elements.textColorInput.value);
  }
  activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
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
  const pasteTarget = event.target;
  const isNativeTextControl =
    pasteTarget?.matches?.("input:not([type='file']), textarea") ||
    pasteTarget?.isContentEditable;

  if (!elements.feedbackModal.hidden) {
    const images = [...(event.clipboardData?.files || [])].filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length) {
      event.preventDefault();
      await addFeedbackFiles(images);
      return;
    }
    if (elements.feedbackModal.contains(event.target)) return;
    event.preventDefault();
    elements.feedbackMessage.focus();
    return;
  }
  if (
    isNativeTextControl &&
    !pasteTarget.closest?.(".cell-editor, .intro-editor")
  ) {
    return;
  }
  if (!elements.codeEditorModal.hidden) {
    if (event.target === elements.codeEditorTextarea) return;
    event.preventDefault();
    elements.codeEditorTextarea.focus();
    return;
  }
  if (!elements.linkPopover.hidden) {
    if (elements.linkPopover.contains(event.target)) return;
    event.preventDefault();
    const input =
      document.activeElement === elements.linkTextInput
        ? elements.linkTextInput
        : elements.linkUrlInput;
    const pastedText = event.clipboardData?.getData("text/plain") || "";
    input.focus();
    input.setRangeText(pastedText, input.selectionStart, input.selectionEnd, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const editor = event.target.closest?.(".cell-editor, .intro-editor") || activeEditor;
  if (!editor?.matches(".cell-editor, .intro-editor")) return;
  const images = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
  if (images.length) {
    event.preventDefault();
    activeEditor = editor;
    await insertImages(images);
    return;
  }
  const html = event.clipboardData?.getData("text/html") || "";
  const plainText = event.clipboardData?.getData("text/plain") || "";
  let snippet = parseCodeFromClipboard(html, plainText);
  if (!snippet && looksLikeCode(plainText)) {
    const code = formatCode(plainText);
    snippet = { language: detectCodeLanguage(code), code, width: "" };
  }
  const selection = window.getSelection();
  const range =
    selection?.rangeCount && editor.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : null;
  if (snippet) {
    event.preventDefault();
    insertCodeSnippet(editor, snippet, range);
    return;
  }
  if (isPlainUrl(plainText)) {
    event.preventDefault();
    activeEditor = editor;
    const url = normalizeLinkUrl(plainText);
    insertHtmlAtSelection(
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`,
      range,
    );
    return;
  }
  if (!html && /(?:https?:\/\/|www\.)[^\s]+/i.test(plainText)) {
    event.preventDefault();
    activeEditor = editor;
    const linked = linkifyPlainText(plainText);
    insertHtmlAtSelection(linked, range);
  }
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
  if (
    !elements.linkPopover.hidden &&
    !event.target.closest("#linkPopover, #linkButton")
  ) {
    closeLinkPopover();
  }
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

elements.jiraMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleHeaderDropdown(elements.jiraMenuButton, elements.jiraMenu);
});
elements.copyMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleHeaderDropdown(elements.copyMenuButton, elements.copyMenu);
});
elements.jiraMenu.addEventListener("click", () => closeHeaderDropdowns());
elements.copyMenu.addEventListener("click", () => closeHeaderDropdowns());
elements.previewButton.addEventListener("click", openPreview);
elements.feedbackButton.addEventListener("click", openFeedback);
elements.closeFeedbackButton.addEventListener("click", closeFeedback);
elements.cancelFeedbackButton.addEventListener("click", closeFeedback);
elements.sendFeedbackButton.addEventListener("click", sendFeedback);
elements.feedbackFilesButton.addEventListener("click", () => elements.feedbackFilesInput.click());
elements.feedbackFilesInput.addEventListener("change", async () => {
  await addFeedbackFiles(elements.feedbackFilesInput.files);
  elements.feedbackFilesInput.value = "";
});
elements.feedbackDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.feedbackDropzone.classList.add("drag-over");
});
elements.feedbackDropzone.addEventListener("dragleave", () => {
  elements.feedbackDropzone.classList.remove("drag-over");
});
elements.feedbackDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  elements.feedbackDropzone.classList.remove("drag-over");
  await addFeedbackFiles(event.dataTransfer.files);
});
elements.copyButton.addEventListener("click", copyMarkup);
elements.copyVisualButton.addEventListener("click", copyVisualReport);
elements.modalCopyButton.addEventListener("click", copyMarkup);
elements.modalCopyVisualButton.addEventListener("click", copyVisualReport);
elements.closePreviewButton.addEventListener("click", closePreview);
elements.clearButton.addEventListener("click", resetDraft);
elements.importButton.addEventListener("click", openImport);
elements.closeImportButton.addEventListener("click", closeImport);
elements.applyImportButton.addEventListener("click", () => applyImport("replace"));
elements.closeMediaViewerButton.addEventListener("click", closeMediaViewer);
elements.closeCodeEditorButton.addEventListener("click", () => closeCodeEditor());
elements.saveCodeButton.addEventListener("click", saveCodeChanges);
elements.acceptConfirmButton.addEventListener("click", () => resolveConfirmation(true));
elements.cancelConfirmButton.addEventListener("click", () => resolveConfirmation(false));
elements.closeConfirmButton.addEventListener("click", () => resolveConfirmation(false));
elements.codeEditorTextarea.addEventListener("input", () => {
  const code = elements.codeEditorTextarea.value;
  updateCodeEditorLineNumbers();
  elements.codeEditorLanguage.textContent = detectCodeLanguage(code).toUpperCase();
  const dirty = codeEditorIsDirty();
  elements.codeEditorState.textContent = dirty ? "Есть несохранённые изменения" : "Изменений нет";
  elements.saveCodeButton.disabled = !dirty;
});
elements.codeEditorTextarea.addEventListener("scroll", () => {
  elements.codeEditorLineNumbers.scrollTop = elements.codeEditorTextarea.scrollTop;
});
elements.codeEditorTextarea.addEventListener("keydown", (event) => {
  event.stopPropagation();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (codeEditorIsDirty()) saveCodeChanges();
    return;
  }
  if (event.key === "Escape") {
    if (!elements.feedbackModal.hidden) {
      closeFeedback();
      return;
    }
    event.preventDefault();
    closeCodeEditor();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const start = elements.codeEditorTextarea.selectionStart;
    const end = elements.codeEditorTextarea.selectionEnd;
    elements.codeEditorTextarea.setRangeText("  ", start, end, "end");
    elements.codeEditorTextarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
elements.codeEditorModal.addEventListener("keydown", (event) => {
  event.stopPropagation();
  if (event.key === "Escape") {
    event.preventDefault();
    closeCodeEditor();
  }
});
document.addEventListener(
  "focusin",
  (event) => {
    if (
      elements.codeEditorModal.hidden ||
      elements.codeEditorModal.contains(event.target) ||
      (!elements.confirmModal.hidden && elements.confirmModal.contains(event.target))
    ) {
      return;
    }
    elements.codeEditorTextarea.focus();
  },
  true,
);
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
  const confirmed = await askConfirmation(`Удалить всю локальную историю (${reports.length} отчётов)?`, {
    title: "Очистка истории",
    confirmText: "Очистить",
    danger: true,
  });
  if (!confirmed) return;
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
  if (!event.target.closest(".header-dropdown")) closeHeaderDropdowns();
  if (!event.target.closest(".floating-context-menu, .row-menu-button, .column-menu-button, .cell-image")) {
    closeFloatingMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openedMenu = document.querySelector(".header-dropdown.open");
  if (!openedMenu) return;
  const trigger = openedMenu.querySelector(".header-dropdown-trigger");
  closeHeaderDropdowns();
  trigger?.focus();
});
window.addEventListener("resize", () => {
  closeHeaderDropdowns();
  closeFloatingMenu();
  if (!elements.linkPopover.hidden) positionLinkPopover();
});
window.addEventListener("scroll", closeFloatingMenu, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Backspace" || event.key === "Delete") {
    const selectedCode = document.querySelector(".cell-code-block.code-selected");
    const selectedImage = document.querySelector(".cell-image.image-selected");
    const object = selectedImage;
    if (object && document.activeElement === object) {
      event.preventDefault();
      const editor = object.closest(".cell-editor, .intro-editor");
      object.remove();
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
      showToast("Изображение удалено");
      return;
    }
  }
  if (event.key === "Escape") {
    if (!elements.confirmModal.hidden) {
      resolveConfirmation(false);
      return;
    }
    if (!elements.linkPopover.hidden) {
      closeLinkPopover();
      activeEditor.focus();
      return;
    }
    if (!elements.codeEditorModal.hidden) {
      closeCodeEditor();
      return;
    }
    if (!elements.mediaViewerModal.hidden) {
      closeMediaViewer();
      return;
    }
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
window.addEventListener("beforeunload", (event) => {
  if (codeEditorIsDirty()) {
    event.preventDefault();
    event.returnValue = "";
  }
  collectDocumentFields();
  saveDraft();
});

render();
updateHistoryButtons();
