const STORAGE_KEY = "qa-report-editor-draft-v2";
const JIRA_SETTINGS_KEY = "qa-report-jira-settings-v1";
const STORAGE_SETTINGS_KEY = "qa-report-storage-settings-v1";
const DB_NAME = "qa-report-editor";
const DB_VERSION = 1;
const REPORT_STORE = "reports";
const HISTORY_LIMIT = 50;
const REQUIRED_API_REVISION = 5;

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
  reportCard: document.querySelector(".report-card"),
  introEditor: document.querySelector("#introEditor"),
  sections: document.querySelector("#sections"),
  sectionSticky: document.querySelector("#sectionSticky"),
  sectionStickyTitle: document.querySelector("#sectionStickyTitle"),
  sectionStickyScroll: document.querySelector("#sectionStickyScroll"),
  sectionStickyColgroup: document.querySelector("#sectionStickyColgroup"),
  sectionStickyHeader: document.querySelector("#sectionStickyHeader"),
  sectionTemplate: document.querySelector("#sectionTemplate"),
  addSectionButton: document.querySelector("#addSectionButton"),
  previewButton: document.querySelector("#previewButton"),
  copyButton: document.querySelector("#copyButton"),
  copyVisualButton: document.querySelector("#copyVisualButton"),
  exportXlsxButton: document.querySelector("#exportXlsxButton"),
  clearButton: document.querySelector("#clearButton"),
  importButton: document.querySelector("#importButton"),
  previewModal: document.querySelector("#previewModal"),
  closePreviewButton: document.querySelector("#closePreviewButton"),
  visualPreview: document.querySelector("#visualPreview"),
  markupPreview: document.querySelector("#markupPreview"),
  modalCopyButton: document.querySelector("#modalCopyButton"),
  modalCopyVisualButton: document.querySelector("#modalCopyVisualButton"),
  modalSaveMarkupButton: document.querySelector("#modalSaveMarkupButton"),
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
  textColorMenu: document.querySelector("#textColorMenu"),
  themeToggle: document.querySelector("#themeToggle"),
  settingsButton: document.querySelector("#settingsButton"),
  publishButton: document.querySelector("#publishButton"),
  jiraSettingsModal: document.querySelector("#jiraSettingsModal"),
  closeJiraSettingsButton: document.querySelector("#closeJiraSettingsButton"),
  settingsJiraSectionButton: document.querySelector("#settingsJiraSectionButton"),
  settingsFilesSectionButton: document.querySelector("#settingsFilesSectionButton"),
  settingsJiraSection: document.querySelector("#settingsJiraSection"),
  settingsFilesSection: document.querySelector("#settingsFilesSection"),
  jiraManualTab: document.querySelector("#jiraManualTab"),
  jiraCurlTab: document.querySelector("#jiraCurlTab"),
  jiraManualPane: document.querySelector("#jiraManualPane"),
  jiraCurlPane: document.querySelector("#jiraCurlPane"),
  jiraCurlInput: document.querySelector("#jiraCurlInput"),
  jiraCurlState: document.querySelector("#jiraCurlState"),
  parseJiraCurlButton: document.querySelector("#parseJiraCurlButton"),
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
  yandexStorageEnabled: document.querySelector("#yandexStorageEnabled"),
  yandexStorageToken: document.querySelector("#yandexStorageToken"),
  yandexStoragePath: document.querySelector("#yandexStoragePath"),
  googleStorageEnabled: document.querySelector("#googleStorageEnabled"),
  googleStorageToken: document.querySelector("#googleStorageToken"),
  googleStorageFolder: document.querySelector("#googleStorageFolder"),
  storageConnectionState: document.querySelector("#storageConnectionState"),
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
let storageSecrets = { yandex: "", google: "" };
let storageSettings = loadStorageSettings();
let undoStack = [];
let redoStack = [];
let historyCurrent = "";
let historyTimer;
let suppressHistory = false;
let importSource = "markup";
let pendingImportedDraft = null;
let dbPromise;
let draggedCodeBlock = null;
let draggedImageFigure = null;
let pointerObjectGesture = null;
const suppressObjectOpenUntil = new WeakMap();
let editingCodeBlock = null;
let codeEditorInitialValue = "";
let activeStickySectionId = "";
let stickyScrollSyncing = false;
let stickyUpdateFrame = 0;
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

function loadStorageSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || "{}");
    return {
      yandex: {
        enabled: Boolean(saved.yandex?.enabled),
        path: saved.yandex?.path || "/QA Report",
      },
      google: {
        enabled: Boolean(saved.google?.enabled),
        folderId: saved.google?.folderId || "",
      },
    };
  } catch {
    return {
      yandex: { enabled: false, path: "/QA Report" },
      google: { enabled: false, folderId: "" },
    };
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
  scheduleStickySectionUpdate();
}

function renderTable(fragment, section) {
  const table = fragment.querySelector(".check-table");
  const tableScroll = fragment.querySelector(".table-scroll");
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
  tableScroll?.addEventListener("scroll", () => syncStickyScrollFromSection(section.id, tableScroll));
}

function getSectionTableWidth(section) {
  return 52 + 164 + 46 + section.columns.reduce((sum, item) => sum + (Number(item.width) || 240), 0);
}

function createStickyColumn(width, className = "") {
  const col = document.createElement("col");
  if (className) col.className = className;
  col.style.width = `${width}px`;
  return col;
}

function createStickyHeaderCell(label, className = "") {
  const th = document.createElement("th");
  if (className) th.className = className;
  th.textContent = label;
  return th;
}

function renderSectionSticky(section, sectionElement) {
  if (!section || !sectionElement || section.collapsed) {
    elements.sectionSticky.hidden = true;
    activeStickySectionId = "";
    return;
  }
  positionSectionSticky(sectionElement);
  const tableScroll = sectionElement.querySelector(".table-scroll");
  const tableWidth = getSectionTableWidth(section);
  activeStickySectionId = section.id;
  elements.sectionSticky.hidden = false;
  elements.sectionStickyTitle.textContent = section.title || "Раздел";
  elements.sectionStickyColgroup.innerHTML = "";
  elements.sectionStickyHeader.innerHTML = "";
  elements.sectionStickyColgroup.append(createStickyColumn(52, "number-col"));
  elements.sectionStickyHeader.append(createStickyHeaderCell("№"));
  section.columns.forEach((column) => {
    const width = Math.max(140, Number(column.width) || 240);
    elements.sectionStickyColgroup.append(createStickyColumn(width, "dynamic-col"));
    elements.sectionStickyHeader.append(createStickyHeaderCell(column.title || "Без названия"));
  });
  elements.sectionStickyColgroup.append(createStickyColumn(164, "status-col"), createStickyColumn(46, "actions-col"));
  elements.sectionStickyHeader.append(createStickyHeaderCell("Статус", "status-header"), createStickyHeaderCell(""));
  const table = elements.sectionSticky.querySelector(".section-sticky-table");
  table.style.width = `${tableWidth}px`;
  table.style.minWidth = "100%";
  syncStickyScrollFromSection(section.id, tableScroll);
}

function getStickyOffset() {
  const toolbarRect = document.querySelector(".editor-toolbar")?.getBoundingClientRect();
  return Math.max(0, toolbarRect?.bottom || 0) + 10;
}

function positionSectionSticky(sectionElement = null) {
  if (!elements.sectionSticky || !elements.reportCard) return;
  const targetRect =
    sectionElement?.querySelector(".table-scroll")?.getBoundingClientRect() || elements.reportCard.getBoundingClientRect();
  const left = Math.max(12, targetRect.left);
  const borderCompensation = 2;
  elements.sectionSticky.style.top = `${getStickyOffset()}px`;
  elements.sectionSticky.style.left = `${left}px`;
  elements.sectionSticky.style.width = `${Math.max(
    320,
    Math.min(targetRect.width + borderCompensation, window.innerWidth - left - 12),
  )}px`;
}

function getActiveSectionForSticky() {
  const sectionElements = [...elements.sections.querySelectorAll(".check-section")].filter(
    (sectionElement) => !sectionElement.classList.contains("collapsed"),
  );
  if (!sectionElements.length) return null;
  const marker = getStickyOffset() + 64;
  let activeElement = null;
  for (const sectionElement of sectionElements) {
    const rect = sectionElement.getBoundingClientRect();
    if (rect.top <= marker && rect.bottom > marker) {
      activeElement = sectionElement;
      break;
    }
    if (rect.top <= marker) activeElement = sectionElement;
  }
  if (!activeElement) return null;
  const section = draft.sections.find((item) => item.id === activeElement.dataset.sectionId);
  return section ? { section, sectionElement: activeElement } : null;
}

function updateStickySection() {
  stickyUpdateFrame = 0;
  if (!elements.sectionSticky) return;
  const active = getActiveSectionForSticky();
  if (!active) {
    elements.sectionSticky.hidden = true;
    activeStickySectionId = "";
    return;
  }
  positionSectionSticky(active.sectionElement);
  if (active.section.id !== activeStickySectionId || elements.sectionSticky.hidden) {
    renderSectionSticky(active.section, active.sectionElement);
    return;
  }
  syncStickyScrollFromSection(active.section.id, active.sectionElement.querySelector(".table-scroll"));
}

function scheduleStickySectionUpdate() {
  if (stickyUpdateFrame) return;
  stickyUpdateFrame = requestAnimationFrame(updateStickySection);
}

function syncStickyScrollFromSection(sectionId, tableScroll) {
  if (!tableScroll || elements.sectionSticky.hidden || activeStickySectionId !== sectionId || stickyScrollSyncing) return;
  stickyScrollSyncing = true;
  elements.sectionStickyScroll.scrollLeft = tableScroll.scrollLeft;
  requestAnimationFrame(() => {
    stickyScrollSyncing = false;
  });
}

function syncActiveSectionScrollFromSticky() {
  if (stickyScrollSyncing || !activeStickySectionId) return;
  const sectionElement = elements.sections.querySelector(`[data-section-id="${activeStickySectionId}"]`);
  const tableScroll = sectionElement?.querySelector(".table-scroll");
  if (!tableScroll) return;
  stickyScrollSyncing = true;
  tableScroll.scrollLeft = elements.sectionStickyScroll.scrollLeft;
  requestAnimationFrame(() => {
    stickyScrollSyncing = false;
  });
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
    if (activeStickySectionId === section.id) renderSectionSticky(section, sectionElement);
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
      { label: "Добавить строку выше", action: () => applyRowAction(section, row.id, "insert-above") },
      { label: "Добавить строку ниже", action: () => applyRowAction(section, row.id, "insert-below") },
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
  if (index < 0) return;
  if (action === "insert-above") {
    section.rows.splice(index, 0, createRow(section.columns));
  } else if (action === "insert-below") {
    section.rows.splice(index + 1, 0, createRow(section.columns));
  } else if (action === "duplicate") {
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
    if (item.icon) button.append(createUiIcon(item.icon));
    const label = document.createElement("span");
    label.textContent = item.label;
    button.append(label);
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

function createUiIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("ui-icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#icon-${name}`);
  svg.append(use);
  return svg;
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

function wrapSpreadsheetLongLine(line, maxLength = 96) {
  const chunks = [];
  let rest = String(line || "");
  while (rest.length > maxLength) {
    const window = rest.slice(0, maxLength + 1);
    const softBreak = Math.max(
      window.lastIndexOf(","),
      window.lastIndexOf(";"),
      window.lastIndexOf(" "),
      window.lastIndexOf("&"),
    );
    const index = softBreak > Math.floor(maxLength * 0.55) ? softBreak + 1 : maxLength;
    chunks.push(rest.slice(0, index).trimEnd());
    rest = rest.slice(index).trimStart();
  }
  chunks.push(rest);
  return chunks.join("\n");
}

function normalizeSpreadsheetCodeBlock(value) {
  return String(value || "")
    .split("\n")
    .map((line) => wrapSpreadsheetLongLine(line, 92))
    .join("\n")
    .trim();
}

function htmlToSpreadsheetText(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  container.querySelectorAll("[data-editor-ui], figcaption").forEach((node) => node.remove());
  const lines = [];
  let current = "";
  const append = (value) => {
    current += String(value || "").replace(/\u00a0/g, " ");
  };
  const newline = () => {
    const line = current.trimEnd();
    if (line || lines.length) lines.push(line);
    current = "";
  };
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent || "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches?.("[data-editor-ui]")) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      newline();
      return;
    }
    if (tag === "img") {
      const name = node.dataset.jiraName || node.dataset.fileName || node.alt || "изображение";
      const link = node.dataset.jiraUrl || (node.src && !node.src.startsWith("data:") ? node.src : "");
      append(link ? `[Изображение: ${name}] ${link}` : `[Изображение: ${name}]`);
      return;
    }
    if (tag === "a") {
      const text = node.textContent?.trim() || node.getAttribute("href") || "";
      const href = node.getAttribute("href") || "";
      append(href && href !== text ? `${text} (${href})` : text);
      return;
    }
    if (tag === "pre") {
      newline();
      append(`Код:\n${normalizeSpreadsheetCodeBlock(extractCodeText(node))}`);
      newline();
      return;
    }
    const block = ["p", "div", "figure", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag);
    if (tag === "li" && current.trim()) newline();
    for (const child of node.childNodes) walk(child);
    if (block) newline();
  };
  for (const child of container.childNodes) walk(child);
  if (current.trim()) newline();
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
    const tag = node.tagName.toLowerCase();
    if ((tag === "span" && node.style.color) || (tag === "font" && node.getAttribute("color"))) {
      const content = [...node.childNodes].map(walk).join("");
      if (!content.trim()) return "";
      if (/\{color(?::[^}]+)?\}/i.test(content)) return content;
      const color = node.style.color || node.getAttribute("color");
      return `{color:${cssColorToHex(color)}}${content}{color}`;
    }
    const content = [...node.childNodes].map(walk).join("");
    if (tag === "strong" || tag === "b") return `*${content}*`;
    if (tag === "em" || tag === "i") return `_${content}_`;
    if (tag === "u") return `+${content}+`;
    if (tag === "s" || tag === "strike") return `-${content}-`;
    if (tag === "a") return `[${content}|${node.getAttribute("href") || ""}]`;
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
  return normalizeJiraColorMarkup(
    [...container.childNodes].map(walk).join("").replace(/\n{3,}/g, "\n\n").trim(),
  );
}

function escapeWiki(value) {
  return htmlToWiki(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "\n\u00a0\n");
}

function normalizeJiraCellWhitespace(value) {
  const lines = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  while (lines[0] === "") lines.shift();
  while (lines.at(-1) === "") lines.pop();

  const normalized = [];
  for (const line of lines) {
    if (!line) {
      if (normalized.length && normalized.at(-1) !== "") normalized.push("");
      continue;
    }
    normalized.push(line);
  }
  return normalized.join("\n");
}

function jiraCell(value) {
  let content = normalizeJiraColorMarkup(htmlToWiki(value));
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
  content = normalizeJiraCellWhitespace(content);
  content = content
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[ \t]*(?:\r?\n)+[ \t]*/g, (breaks) => {
      const count = (breaks.match(/\n/g) || []).length;
      return count > 1 ? "\n\u00a0\n" : "\n";
    });
  content = content.replace(
    /@@JIRA_(?:PROTECTED|IMAGE)_(\d+)@@/g,
    (_, index) => protectedBlocks[Number(index)] || "",
  );
  return content.trim() ? content : " ";
}

function normalizeJiraColorMarkup(value) {
  const protectedBlocks = [];
  let output = String(value || "").replace(/\{code(?::[^}]+)?\}[\s\S]*?\{code\}/gi, (block) => {
    const token = `@@JIRA_CODE_COLOR_${protectedBlocks.length}@@`;
    protectedBlocks.push(block);
    return token;
  });
  output = balanceJiraColorMarkup(output)
    .replace(/\{color:[^}]+\}\s*\{color\}/gi, "")
    .replace(/\{color\}\s*\{color\}/gi, "");
  let previous = "";
  while (output !== previous) {
    previous = output;
    output = output.replace(
      /\{color:(#[0-9a-f]{3,8})\}([\s\S]*?)\{color\}\s*\{color:\1\}([\s\S]*?)\{color\}/gi,
      "{color:$1}$2$3{color}",
    );
  }
  return output.replace(
    /@@JIRA_CODE_COLOR_(\d+)@@/g,
    (_, index) => protectedBlocks[Number(index)] || "",
  );
}

function balanceJiraColorMarkup(value) {
  const tokenPattern = /\{color(?::([^}]+))?\}/gi;
  const source = String(value || "");
  let output = "";
  let offset = 0;
  let activeColor = "";
  let activeStart = -1;
  let activeHasContent = false;
  for (const match of source.matchAll(tokenPattern)) {
    const text = source.slice(offset, match.index);
    output += text;
    if (activeColor && text.trim()) activeHasContent = true;
    offset = match.index + match[0].length;
    if (match[1]) {
      if (activeColor) {
        if (activeHasContent) output += "{color}";
        else output = output.slice(0, activeStart);
      }
      activeColor = cssColorToHex(match[1]).toLowerCase();
      activeStart = output.length;
      activeHasContent = false;
      output += `{color:${activeColor}}`;
      continue;
    }
    if (!activeColor) continue;
    if (activeHasContent) output += "{color}";
    else output = output.slice(0, activeStart);
    activeColor = "";
    activeStart = -1;
    activeHasContent = false;
  }
  const tail = source.slice(offset);
  output += tail;
  if (activeColor) {
    if (tail.trim()) output += "{color}";
    else output = output.slice(0, activeStart);
  }
  return output;
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

function collectWikiTableRow(lines, startIndex, expectedCells) {
  let row = lines[startIndex].trim();
  let index = startIndex;
  while (
    expectedCells &&
    splitWikiRow(row).length < expectedCells &&
    index + 1 < lines.length
  ) {
    const next = lines[index + 1];
    const trimmed = next.trim();
    if (/^h[1-6]\.\s+/i.test(trimmed) || trimmed.startsWith("|")) break;
    row += `\n${next}`;
    index += 1;
  }
  return { row, index };
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

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
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
      headers = { statusIndex, columnCount: rawHeaders.length };
      pendingTitle = "";
      continue;
    }
    if (line.startsWith("|") && headers && currentSection) {
      const collected = collectWikiTableRow(lines, lineIndex, headers.columnCount);
      lineIndex = collected.index;
      const values = splitWikiRow(collected.row);
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
  elements.jiraAuthMethod.value =
    jiraSettings.authMethod === "basic" || jiraSettings.authMethod === "cookie" ? jiraSettings.authMethod : "pat";
  elements.jiraBaseUrl.value = jiraSettings.baseUrl;
  elements.jiraUser.value = jiraSettings.user;
  elements.jiraToken.value = jiraSecret;
  updateJiraSettingsLabels();
}

function updateJiraSettingsLabels() {
  const cloud = elements.jiraType.value === "cloud";
  const basic = !cloud && elements.jiraAuthMethod.value === "basic";
  const cookie = !cloud && elements.jiraAuthMethod.value === "cookie";
  elements.jiraAuthMethodField.hidden = cloud;
  elements.jiraUserField.hidden = !cloud && !basic;
  elements.jiraUserLabel.textContent = cloud ? "Email Atlassian" : "Логин Jira";
  elements.jiraTokenLabel.textContent = cloud
    ? "API token"
    : basic
      ? "Пароль"
      : cookie
        ? "Cookie"
        : "Personal Access Token";
  elements.jiraToken.placeholder = cloud
    ? "API token не сохраняется"
    : basic
      ? "Пароль не сохраняется"
      : cookie
        ? "Cookie не сохраняется"
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
    throw new Error(
      settings.authMethod === "basic"
        ? "Укажите пароль"
        : settings.authMethod === "cookie"
          ? "Укажите cookie"
          : "Укажите токен",
    );
  }
  if ((settings.type === "cloud" || settings.authMethod === "basic") && !settings.user) {
    throw new Error(settings.type === "cloud" ? "Для Jira Cloud укажите email Atlassian" : "Укажите логин Jira");
  }
}

function setConnectionState(message, type = "") {
  elements.jiraConnectionState.textContent = message;
  elements.jiraConnectionState.className = `connection-state ${type}`.trim();
}

function setStorageConnectionState(message, type = "") {
  elements.storageConnectionState.textContent = message;
  elements.storageConnectionState.className = `connection-state ${type}`.trim();
}

function fillStorageSettingsForm() {
  elements.yandexStorageEnabled.checked = Boolean(storageSettings.yandex.enabled);
  elements.yandexStoragePath.value = storageSettings.yandex.path || "/QA Report";
  elements.yandexStorageToken.value = storageSecrets.yandex;
  elements.googleStorageEnabled.checked = Boolean(storageSettings.google.enabled);
  elements.googleStorageFolder.value = storageSettings.google.folderId || "";
  elements.googleStorageToken.value = storageSecrets.google;
}

function readStorageSettingsForm() {
  return {
    yandex: {
      enabled: elements.yandexStorageEnabled.checked,
      path: elements.yandexStoragePath.value.trim() || "/QA Report",
    },
    google: {
      enabled: elements.googleStorageEnabled.checked,
      folderId: elements.googleStorageFolder.value.trim(),
    },
  };
}

function saveStorageSettings() {
  storageSettings = readStorageSettingsForm();
  storageSecrets = {
    yandex: elements.yandexStorageToken.value,
    google: elements.googleStorageToken.value,
  };
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(storageSettings));
}

function setSettingsSection(section) {
  const files = section === "files";
  elements.settingsJiraSectionButton.classList.toggle("active", !files);
  elements.settingsFilesSectionButton.classList.toggle("active", files);
  elements.settingsJiraSection.hidden = files;
  elements.settingsFilesSection.hidden = !files;
  elements.settingsJiraSection.classList.toggle("active", !files);
  elements.settingsFilesSection.classList.toggle("active", files);
  elements.testJiraButton.hidden = files;
}

function openJiraSettings() {
  fillJiraSettingsForm();
  fillStorageSettingsForm();
  setSettingsSection("jira");
  setJiraSettingsTab("manual");
  setConnectionState("Соединение ещё не проверялось.");
  setStorageConnectionState("Настройки файлового хранилища ещё не сохранялись.");
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
  saveStorageSettings();
  setConnectionState("Настройки сохранены. Секрет останется только до перезагрузки.", "success");
  setStorageConnectionState("Настройки файлов сохранены. Токены останутся только до перезагрузки.", "success");
}

function setJiraSettingsTab(tab) {
  const curl = tab === "curl";
  elements.jiraManualTab.classList.toggle("active", !curl);
  elements.jiraCurlTab.classList.toggle("active", curl);
  elements.jiraManualTab.setAttribute("aria-selected", curl ? "false" : "true");
  elements.jiraCurlTab.setAttribute("aria-selected", curl ? "true" : "false");
  elements.jiraManualPane.hidden = curl;
  elements.jiraCurlPane.hidden = !curl;
}

function tokenizeCurlCommand(value) {
  const tokens = [];
  let current = "";
  let quote = "";
  let escaping = false;
  for (const char of String(value || "")) {
    if (escaping) {
      if (char !== "\n" && char !== "\r") current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      else current += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

function splitCurlHeader(value) {
  const index = String(value || "").indexOf(":");
  if (index < 0) return null;
  return {
    name: value.slice(0, index).trim().toLowerCase(),
    value: value.slice(index + 1).trim(),
  };
}

function inferJiraBaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.username = "";
  url.password = "";
  url.hash = "";
  url.search = "";
  const restIndex = url.pathname.search(/\/rest\/api\/(?:2|3|latest)\b/i);
  const browseIndex = url.pathname.search(/\/browse\/[A-Z][A-Z0-9_]*-\d+\b/i);
  const cutIndex = restIndex >= 0 ? restIndex : browseIndex;
  url.pathname = cutIndex >= 0 ? url.pathname.slice(0, cutIndex) : "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function decodeBasicCredentials(value) {
  const decoded = atob(value.trim());
  const separator = decoded.indexOf(":");
  if (separator < 0) throw new Error("Basic Authorization не содержит user:token");
  return {
    user: decoded.slice(0, separator),
    token: decoded.slice(separator + 1),
  };
}

function parseJiraCurl(value) {
  const tokens = tokenizeCurlCommand(value);
  if (!tokens.length) throw new Error("Вставьте curl-запрос");
  const headers = new Map();
  let url = "";
  let userToken = "";
  let cookie = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1] || "";
    if (token === "curl") continue;
    if (token === "-H" || token === "--header") {
      const header = splitCurlHeader(next);
      if (header) headers.set(header.name, header.value);
      index += 1;
      continue;
    }
    if (token.startsWith("-H") && token.length > 2) {
      const header = splitCurlHeader(token.slice(2));
      if (header) headers.set(header.name, header.value);
      continue;
    }
    if (token.startsWith("--header=")) {
      const header = splitCurlHeader(token.slice("--header=".length));
      if (header) headers.set(header.name, header.value);
      continue;
    }
    if (token === "-u" || token === "--user" || token === "--user-name") {
      userToken = next;
      index += 1;
      continue;
    }
    if (token.startsWith("-u") && token.length > 2) {
      userToken = token.slice(2);
      continue;
    }
    if (token.startsWith("--user=")) {
      userToken = token.slice("--user=".length);
      continue;
    }
    if (token === "-b" || token === "--cookie") {
      cookie = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--cookie=")) {
      cookie = token.slice("--cookie=".length);
      continue;
    }
    if (token === "--url") {
      url = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--url=")) {
      url = token.slice("--url=".length);
      continue;
    }
    if (!token.startsWith("-") && /^https?:\/\//i.test(token)) {
      url = token;
    }
  }
  if (!url) throw new Error("В curl не найден URL Jira");
  const baseUrl = inferJiraBaseUrl(url);
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  const isCloud = hostname.endsWith(".atlassian.net");
  const authorization = headers.get("authorization") || "";
  const headerCookie = headers.get("cookie") || "";
  if (/^bearer\s+/i.test(authorization)) {
    return {
      settings: { type: "data-center", authMethod: "pat", baseUrl, user: "" },
      token: authorization.replace(/^bearer\s+/i, "").trim(),
      summary: "Найден Bearer-токен",
    };
  }
  if (/^basic\s+/i.test(authorization)) {
    const credentials = decodeBasicCredentials(authorization.replace(/^basic\s+/i, ""));
    return {
      settings: {
        type: isCloud ? "cloud" : "data-center",
        authMethod: isCloud ? "api-token" : "basic",
        baseUrl,
        user: credentials.user,
      },
      token: credentials.token,
      summary: "Найден Basic Authorization",
    };
  }
  if (userToken) {
    const separator = userToken.indexOf(":");
    if (separator < 0) throw new Error("Параметр -u должен быть в формате user:token");
    return {
      settings: {
        type: isCloud ? "cloud" : "data-center",
        authMethod: isCloud ? "api-token" : "basic",
        baseUrl,
        user: userToken.slice(0, separator),
      },
      token: userToken.slice(separator + 1),
      summary: "Найден параметр -u user:token",
    };
  }
  if (headerCookie || cookie) {
    return {
      settings: { type: "data-center", authMethod: "cookie", baseUrl, user: "" },
      token: headerCookie || cookie,
      summary: "Найден Cookie",
    };
  }
  throw new Error("В curl не найден Authorization, -u или Cookie");
}

function showJiraCurlState(message, type = "") {
  elements.jiraCurlState.textContent = message;
  elements.jiraCurlState.className = `settings-curl-state ${type}`.trim();
  elements.jiraCurlState.hidden = false;
}

function applyJiraCurlSettings() {
  try {
    const parsed = parseJiraCurl(elements.jiraCurlInput.value);
    jiraSettings = parsed.settings;
    jiraSecret = parsed.token;
    localStorage.setItem(JIRA_SETTINGS_KEY, JSON.stringify(jiraSettings));
    fillJiraSettingsForm();
    setConnectionState("Настройки из curl сохранены. Секрет останется только до перезагрузки.", "success");
    showJiraCurlState(`${parsed.summary}: ${jiraSettings.baseUrl}`, "success");
  } catch (error) {
    showJiraCurlState(error.message, "error");
    setConnectionState(error.message, "error");
  }
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
  document.body.classList.toggle("focus-mode-active", enabled);
  elements.focusExitButton.hidden = !enabled;
  elements.focusModeButton.querySelector("span:last-child").textContent = enabled ? "Выйти" : "Фокус";
  requestAnimationFrame(scheduleStickySectionUpdate);
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
    delete block.dataset.dragBound;
    block.removeAttribute("draggable");
    block.removeAttribute("tabindex");
  });
  clone.querySelectorAll(".cell-image").forEach((figure) => {
    figure.classList.remove("image-selected", "image-dragging");
    delete figure.dataset.dragBound;
    figure.removeAttribute("draggable");
    figure.removeAttribute("tabindex");
  });
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
  return `<pre class="cell-code-block" data-qa-code-snippet="true" data-language="${escapeHtml(language || "text")}"${widthStyle}><code>${escapeHtml(code)}</code></pre>`;
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

function createObjectActionButton({ icon, title, className = "", action }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `object-action-button ${className}`.trim();
  button.title = title;
  button.setAttribute("aria-label", title);
  button.append(createUiIcon(icon));
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await action(event, button);
  });
  return button;
}

function highlightCodeBlock(block) {
  const code = extractCodeText(block);
  let codeElement = block.querySelector(":scope > code");
  if (!codeElement) {
    codeElement = document.createElement("code");
    block.replaceChildren(codeElement);
  }
  codeElement.innerHTML = escapeHtml(code);
  block.querySelectorAll(":scope > [data-editor-ui]").forEach((item) => item.remove());
  const lines = code.split("\n").length;
  block.classList.remove("code-collapsed", "code-expanded");
  block.classList.add("code-preview");
  block.tabIndex = 0;
  block.setAttribute("aria-label", `Код, ${lines} ${pluralizeLines(lines)}. Открыть код`);

  const meta = document.createElement("span");
  meta.className = "code-preview-meta";
  meta.dataset.editorUi = "true";
  meta.contentEditable = "false";
  meta.textContent = `Код · ${lines} ${pluralizeLines(lines)}`;

  const controls = document.createElement("span");
  controls.className = "object-action-panel code-controls";
  controls.dataset.editorUi = "true";
  controls.contentEditable = "false";

  const copyButton = createObjectActionButton({
    icon: "copy",
    title: "Копировать код",
    className: "code-copy",
    action: () => copyCodeSnippet(block, block.dataset.language || "text", code),
  });
  const menuButton = createObjectActionButton({
    icon: "more",
    title: "Действия с кодом",
    className: "code-menu",
    action: (_event, button) =>
      showFloatingMenu(button, [
        {
          label: "Преобразовать в текст",
          icon: "code",
          action: () => convertCodeSnippetToText(block),
        },
      ]),
  });
  const deleteButton = createObjectActionButton({
    icon: "trash",
    title: "Удалить фрагмент кода",
    className: "object-action-danger code-delete",
    action: () => deleteEditorObject(block, "Фрагмент кода удалён — отменить можно через Ctrl/Cmd+Z"),
  });
  controls.append(copyButton, deleteButton, menuButton);
  block.prepend(meta, controls);
  enableCodeObject(block);
}

function pluralizeLines(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "строк";
  if (mod10 === 1) return "строка";
  if (mod10 >= 2 && mod10 <= 4) return "строки";
  return "строк";
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
  suppressObjectOpenUntil.set(block, Date.now() + 500);
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
    suppressObjectOpenUntil.set(block, Date.now() + 300);
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
  if (block.dataset.dragBound === "true") return;
  block.dataset.dragBound = "true";
  block.addEventListener("dragstart", (event) => {
    if (event.target.closest("[data-editor-ui]")) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    const language = block.dataset.language || "text";
    const code = extractCodeText(block);
    draggedCodeBlock = block;
    suppressObjectOpenUntil.set(block, Date.now() + 500);
    block.classList.add("code-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `{code}\n${code}\n{code}`);
    event.dataTransfer.setData("text/html", codeSnippetHtml(language, code, block.style.width || ""));
  });
  block.addEventListener("dragend", () => {
    block.classList.remove("code-dragging");
    suppressObjectOpenUntil.set(block, Date.now() + 300);
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
  const fenced = String(plainText || "").match(/^\s*```([a-z0-9_-]*)[^\n]*\n([\s\S]*?)\n```\s*$/i);
  if (fenced) {
    return {
      language: (fenced[1] || detectCodeLanguage(fenced[2])).trim().toLowerCase(),
      code: fenced[2],
      width: "",
    };
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
  const language = String(snippet.language || detectCodeLanguage(code) || "text").toLowerCase();
  const html = `<p><br></p>${codeSnippetHtml(language, code, snippet.width)}<p><br></p>`;
  insertHtmlAtSelection(html, range);
  highlightCodeBlocks(editor);
}

function textToEditorHtml(value) {
  return escapeHtml(String(value || "")).replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");
}

function stripInlineColors(root) {
  root.querySelectorAll?.("span[style], font[color]").forEach((node) => {
    if (node.matches("span[style]")) node.style.color = "";
    if (node.matches("font[color]")) node.removeAttribute("color");
    const element = node;
    if (element.getAttribute("style") === "") element.removeAttribute("style");
    if (
      element.tagName === "FONT" ||
      (element.tagName === "SPAN" && !element.getAttribute("style") && !element.attributes.length)
    ) {
      element.replaceWith(...element.childNodes);
    }
  });
}

function wrapSelectionWithColor(range, color) {
  const fragment = range.extractContents();
  stripInlineColors(fragment);
  const span = document.createElement("span");
  span.style.color = color;
  span.append(fragment);
  range.insertNode(span);
  range.setStartAfter(span);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedEditorRange = range.cloneRange();
}

function convertCodeSnippetToText(block) {
  const editor = block.closest(".cell-editor, .intro-editor");
  if (!editor) return;
  if (block.matches(".cell-code-block.code-expanded")) restoreColumnAfterCode(block);
  const code = extractCodeText(block);
  const replacement = document.createElement("p");
  replacement.innerHTML = textToEditorHtml(code) || "<br>";
  block.replaceWith(replacement);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  showToast("Код преобразован в текст — отменить можно через Ctrl/Cmd+Z");
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
  elements.codeEditorLanguage.textContent = `${codeEditorInitialValue.split("\n").length} ${pluralizeLines(codeEditorInitialValue.split("\n").length)}`;
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
    const parsed = JSON.parse(source);
    if (parsed && typeof parsed === "object") return "json";
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
  if (source.includes("\n") && /^[\w.-]+:\s+\S+/m.test(source) && !/[{};]/.test(source)) return "yaml";
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
  const hasCyrillic = /[а-яё]/i.test(source);
  const detectedLanguage = detectCodeLanguage(source);
  if (detectedLanguage !== "text") {
    if (!hasCyrillic) return true;
    return /[{}()[\];]|^\s*(?:const|let|var|function|import|export|class|def|SELECT|INSERT|UPDATE|DELETE)\b/im.test(source);
  }
  if (!source.includes("\n")) return false;

  const lines = source.split("\n").map((line) => line.trimEnd());
  const meaningfulLines = lines.filter((line) => line.trim());
  if (!meaningfulLines.length) return false;
  if (hasCyrillic) return false;

  const jsonishStart = /^[\s]*[{\[]/.test(source);
  const indentedLines = meaningfulLines.filter((line) => /^(?:\s{2,}|\t)\S/.test(line)).length;
  const structuralLines = meaningfulLines.filter((line) =>
    /(?:=>|[{}[\];]|\)\s*[,;]?$)/.test(line),
  ).length;
  const codeAssignmentLines = meaningfulLines.filter((line) =>
    /^\s*(?:const|let|var|return|await|this\.|[\w$.[\]'"]+)\s*(?:=|\+=|-=|=>)\s*/.test(line),
  ).length;
  const objectLikeLines = meaningfulLines.filter((line) =>
    /^\s*["']?[\w$.-]+["']?\s*:\s*.+,?\s*$/.test(line),
  ).length;
  const commandLines = meaningfulLines.filter((line) =>
    /^\s*(?:npm|yarn|pnpm|git|curl|docker|kubectl|ssh|cd|mkdir|rm|cp|mv)\b/.test(line),
  ).length;
  const codeScore =
    (jsonishStart ? 3 : 0) +
    indentedLines +
    structuralLines +
    codeAssignmentLines * 2 +
    objectLikeLines +
    commandLines * 2;

  return (
    (jsonishStart && structuralLines >= 1) ||
    codeScore >= 4 ||
    codeAssignmentLines >= 2 ||
    commandLines >= 2
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

async function downloadImage(image) {
  try {
    const response = await fetch(image.src);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const filename =
      image.dataset.fileName ||
      image.dataset.jiraName ||
      `screenshot.${extension}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  } catch {
    showToast("Не удалось скачать изображение");
  }
}

function activeStorageProviders() {
  return [
    storageSettings.yandex.enabled ? { id: "yandex", label: "Яндекс.Диск" } : null,
    storageSettings.google.enabled ? { id: "google", label: "Google Drive" } : null,
  ].filter(Boolean);
}

function blobToDataBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function imageToUploadFile(image) {
  const response = await fetch(image.src);
  const blob = await response.blob();
  return {
    name: image.dataset.fileName || image.dataset.jiraName || `image.${blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png"}`,
    type: image.dataset.mimeType || blob.type || "image/png",
    dataBase64: await blobToDataBase64(blob),
  };
}

function replaceImageWithLink(figure, url, label) {
  const editor = figure.closest(".cell-editor, .intro-editor");
  const paragraph = document.createElement("p");
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  paragraph.append(link);
  figure.replaceWith(paragraph);
  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}

async function uploadImageToStorage(figure, provider) {
  const image = figure.querySelector("img");
  if (!image) return;
  const providerName = provider === "yandex" ? "Яндекс.Диск" : "Google Drive";
  const token = storageSecrets[provider] || "";
  if (!token) {
    setSettingsSection("files");
    fillStorageSettingsForm();
    elements.jiraSettingsModal.hidden = false;
    document.body.style.overflow = "hidden";
    showToast(`Укажите токен для ${providerName} в настройках`, 4500);
    return;
  }
  showToast(`Загружаем изображение в ${providerName}...`, 3500);
  try {
    await checkBackendCompatibility();
    const file = await imageToUploadFile(image);
    const response = await fetch("/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        token,
        yandexPath: storageSettings.yandex.path,
        googleFolderId: storageSettings.google.folderId,
        file,
      }),
    });
    const result = await response.json().catch(() => ({}));
    assertCurrentBackend(result);
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    const url = result.publicUrl || result.webViewLink || result.url;
    if (!url) throw new Error("Хранилище не вернуло ссылку на файл");
    replaceImageWithLink(figure, url, `${file.name} (${providerName})`);
    showToast(`Изображение загружено в ${providerName}`);
  } catch (error) {
    showToast(`Не удалось загрузить в ${providerName}: ${error.message}`, 6000);
  }
}

function enhanceImageControls(root = document) {
  root.querySelectorAll(".cell-image").forEach((figure) => {
    ensureMediaBoundaries(figure);
    figure.querySelectorAll(":scope > [data-editor-ui]").forEach((item) => item.remove());
    const image = figure.querySelector("img");
    if (!image) return;
    figure.tabIndex = 0;
    figure.setAttribute("aria-label", "Открыть изображение");
    const controls = document.createElement("span");
    controls.className = "object-action-panel image-controls";
    controls.dataset.editorUi = "true";
    controls.contentEditable = "false";
    const copyButton = createObjectActionButton({
      icon: "copy",
      title: "Копировать изображение",
      action: () => copyImageToClipboard(image),
    });
    const deleteButton = createObjectActionButton({
      icon: "trash",
      title: "Удалить изображение",
      className: "object-action-danger",
      action: () => deleteEditorObject(figure, "Изображение удалено — отменить можно через Ctrl/Cmd+Z"),
    });
    const moreButton = createObjectActionButton({
      icon: "more",
      title: "Ещё действия",
      action: (_event, button) => showImageMenu(figure, button),
    });
    controls.append(copyButton, deleteButton, moreButton);
    figure.append(controls);
    enableImageObject(figure);
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

function showImageMenu(figure, anchor = figure) {
  selectImage(figure);
  const storageActions = activeStorageProviders().map((provider) => ({
    label: `Загрузить в ${provider.label}`,
    icon: "download",
    action: () => uploadImageToStorage(figure, provider.id),
  }));
  showFloatingMenu(anchor, [
    ...storageActions,
    { label: "Скачать изображение", icon: "download", action: () => downloadImage(figure.querySelector("img")) },
    { label: "Выровнять слева", icon: "align-left", action: () => setImageAlignment(figure, "left") },
    { label: "Выровнять по центру", icon: "align-center", action: () => setImageAlignment(figure, "center") },
    { label: "Выровнять справа", icon: "align-right", action: () => setImageAlignment(figure, "right") },
    {
      label: "По ширине ячейки",
      icon: "stretch",
      action: () => {
        figure.style.width = "100%";
        commitImageChange(figure);
      },
    },
  ]);
}

function enableImageObject(figure) {
  figure.draggable = true;
  if (figure.dataset.dragBound === "true") return;
  figure.dataset.dragBound = "true";
  figure.addEventListener("dragstart", (event) => {
    if (event.target.closest("[data-editor-ui]")) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    const clone = figure.cloneNode(true);
    clone.querySelectorAll("[data-editor-ui]").forEach((item) => item.remove());
    clone.classList.remove("image-selected", "image-dragging");
    clone.removeAttribute("draggable");
    delete clone.dataset.dragBound;
    draggedImageFigure = figure;
    suppressObjectOpenUntil.set(figure, Date.now() + 500);
    figure.classList.add("image-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", clone.outerHTML);
    event.dataTransfer.setData("text/plain", imageFallbackMarkup(figure.querySelector("img")));
  });
  figure.addEventListener("dragend", () => {
    figure.classList.remove("image-dragging");
    suppressObjectOpenUntil.set(figure, Date.now() + 300);
    draggedImageFigure = null;
    document.querySelectorAll(".code-drop-target").forEach((item) => item.classList.remove("code-drop-target"));
  });
}

function startImageResize(event, figure) {
  event.preventDefault();
  event.stopPropagation();
  closeFloatingMenu();
  selectImage(figure);
  suppressObjectOpenUntil.set(figure, Date.now() + 500);
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
    suppressObjectOpenUntil.set(figure, Date.now() + 300);
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

function collectCurrentAttachments() {
  const attachments = [];
  const seen = new Set();
  const collectFromHtml = (html) => {
    const container = document.createElement("div");
    container.innerHTML = html || "";
    container.querySelectorAll("img").forEach((image) => {
      const filename = image.dataset.jiraName || image.dataset.fileName || image.alt || "image.png";
      if (seen.has(filename)) return;
      seen.add(filename);
      attachments.push({
        filename,
        id: image.dataset.jiraId || image.dataset.attachmentId || "",
        content: image.dataset.jiraUrl || image.src || "",
        thumbnail: image.dataset.jiraThumbnail || image.src || "",
      });
    });
  };
  collectFromHtml(draft.intro);
  draft.sections.forEach((section) => {
    section.rows.forEach((row) => {
      Object.values(row.cells).forEach(collectFromHtml);
    });
  });
  return attachments;
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
  await writeClipboardText(markup, "Разметка скопирована — можно вставлять в Jira");
}

async function copyPreviewMarkup() {
  const markup = elements.markupPreview.value;
  if (!markup.trim()) {
    showToast("Разметка пуста");
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
  showToast("Разметка из предпросмотра скопирована");
}

async function savePreviewMarkupToDraft() {
  try {
    const imported = parseJiraMarkup(elements.markupPreview.value, collectCurrentAttachments());
    await saveReportSnapshot("before-preview-markup-save");
    draft = {
      ...imported,
      reportId: draft.reportId,
      issueUrl: draft.issueUrl,
      environment: imported.environment || draft.environment,
      overallStatus: imported.overallStatus || draft.overallStatus,
    };
    scheduleHistoryCommit();
    saveDraft();
    render();
    elements.visualPreview.innerHTML = generateVisualPreview();
    elements.markupPreview.value = generateMarkup();
    showToast("Изменения разметки сохранены в таблицу");
  } catch (error) {
    showToast(`Не удалось сохранить разметку: ${error.message}`, 9000);
  }
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

const XLSX_STATUS_STYLES = {
  OK: 5,
  "НЕ ОК": 6,
  "ПОЧТИ ОК": 7,
  "НЕ ПРОВЕРЕНО": 8,
  "ЧАСТИЧНО ПРОВЕРЕНО": 9,
  "ТРЕБУЕТ УТОЧНЕНИЯ": 10,
};

function xlsxEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let value = "";
  let current = index;
  while (current > 0) {
    const mod = (current - 1) % 26;
    value = String.fromCharCode(65 + mod) + value;
    current = Math.floor((current - mod) / 26);
  }
  return value;
}

function createSharedStringStore() {
  const values = [];
  const indexByValue = new Map();
  return {
    add(value) {
      const text = String(value ?? "");
      if (!indexByValue.has(text)) {
        indexByValue.set(text, values.length);
        values.push(text);
      }
      return indexByValue.get(text);
    },
    xml() {
      const items = values.map((value) => `<si><t xml:space="preserve">${xlsxEscape(value)}</t></si>`).join("");
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${values.length}" uniqueCount="${values.length}">${items}</sst>`;
    },
  };
}

function xlsxCell(ref, value, styleId, sharedStrings) {
  const style = styleId ? ` s="${styleId}"` : "";
  return `<c r="${ref}" t="s"${style}><v>${sharedStrings.add(value)}</v></c>`;
}

function xlsxRow(index, cells, options = {}) {
  const height = options.height ? ` ht="${options.height}" customHeight="1"` : "";
  return `<row r="${index}"${height}>${cells.join("")}</row>`;
}

function estimateXlsxRowHeight(values, columns) {
  const maxLines = values.reduce((max, value, index) => {
    const width = Math.max(10, columns[index]?.width || 18);
    const explicitLines = String(value || "").split("\n");
    const estimated = explicitLines.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(12, width * 1.05))),
      0,
    );
    return Math.max(max, estimated);
  }, 1);
  return Math.min(360, Math.max(22, 17 + (maxLines - 1) * 15));
}

function getXlsxStatusStyle(status) {
  return XLSX_STATUS_STYLES[status] || XLSX_STATUS_STYLES["НЕ ПРОВЕРЕНО"];
}

function buildXlsxWorksheet() {
  collectDocumentFields();
  const sharedStrings = createSharedStringStore();
  const rows = [];
  const merges = [];
  let rowIndex = 1;
  const maxDynamicColumns = draft.sections.reduce((max, section) => Math.max(max, section.columns.length), 0);
  const exportDynamicColumns = Math.max(4, maxDynamicColumns);
  const totalColumns = exportDynamicColumns + 2;
  const lastColumn = columnName(totalColumns);
  const bodyColumns = [
    { width: 7 },
    ...Array.from({ length: exportDynamicColumns }, (_, index) => {
      const widths = draft.sections
        .map((section) => Number(section.columns[index]?.width) || 240)
        .filter(Boolean);
      const px = widths.length ? Math.max(...widths) : 240;
      return { width: Math.max(20, Math.min(56, Math.round(px / 7))) };
    }),
    { width: 24 },
  ];
  const columnXml = bodyColumns
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`)
    .join("");

  rows.push(xlsxRow(rowIndex, [xlsxCell("A1", "QA Report — чек-лист", 1, sharedStrings)], { height: 28 }));
  merges.push(`A${rowIndex}:${lastColumn}${rowIndex}`);
  rowIndex += 1;

  rows.push(
    xlsxRow(
      rowIndex,
      [
        xlsxCell(`A${rowIndex}`, "Задача", 12, sharedStrings),
        xlsxCell(`B${rowIndex}`, draft.issueUrl || "Не указана", 13, sharedStrings),
        xlsxCell(`D${rowIndex}`, "Окружение", 12, sharedStrings),
        xlsxCell(`E${rowIndex}`, draft.environment || "Не указано", 13, sharedStrings),
        xlsxCell(`F${rowIndex}`, draft.overallStatus || "НЕ ПРОВЕРЕНО", getXlsxStatusStyle(draft.overallStatus), sharedStrings),
      ],
      { height: 22 },
    ),
  );
  merges.push(`B${rowIndex}:C${rowIndex}`);
  rowIndex += 1;

  const intro = htmlToSpreadsheetText(draft.intro);
  if (intro) {
    rowIndex += 1;
    rows.push(xlsxRow(rowIndex, [xlsxCell(`A${rowIndex}`, "Вводный текст", 2, sharedStrings)]));
    merges.push(`A${rowIndex}:${lastColumn}${rowIndex}`);
    rowIndex += 1;
    rows.push(
      xlsxRow(rowIndex, [xlsxCell(`A${rowIndex}`, intro, 3, sharedStrings)], {
        height: estimateXlsxRowHeight([intro], [{ width: totalColumns * 18 }]),
      }),
    );
    merges.push(`A${rowIndex}:${lastColumn}${rowIndex}`);
    rowIndex += 1;
  }

  draft.sections.forEach((section) => {
    const contentRows = section.rows.filter(hasRowContent);
    if (!contentRows.length) return;
    rowIndex += 2;
    rows.push(xlsxRow(rowIndex, [xlsxCell(`A${rowIndex}`, section.title || "Раздел", 4, sharedStrings)], { height: 24 }));
    merges.push(`A${rowIndex}:${lastColumn}${rowIndex}`);
    rowIndex += 1;

    const headers = [
      "№",
      ...Array.from({ length: exportDynamicColumns }, (_, index) => section.columns[index]?.title || ""),
      "Статус",
    ];
    rows.push(
      xlsxRow(
        rowIndex,
        headers.map((header, index) => xlsxCell(`${columnName(index + 1)}${rowIndex}`, header, 2, sharedStrings)),
        { height: 22 },
      ),
    );
    rowIndex += 1;

    contentRows.forEach((row, index) => {
      const cellContent = Array.from({ length: exportDynamicColumns }, (_, columnIndex) => {
        const column = section.columns[columnIndex];
        const html = column ? row.cells[column.id] || "" : "";
        return {
          value: column ? htmlToSpreadsheetText(html) : "",
          code: /<pre[\s>]/i.test(html),
        };
      });
      const values = [
        `${index + 1}.`,
        ...cellContent.map((cell) => cell.value),
        row.status || "НЕ ПРОВЕРЕНО",
      ];
      const cells = values.map((value, cellIndex) => {
        const ref = `${columnName(cellIndex + 1)}${rowIndex}`;
        const isStatus = cellIndex === values.length - 1;
        const isCode = cellIndex > 0 && cellIndex < values.length - 1 && cellContent[cellIndex - 1]?.code;
        return xlsxCell(
          ref,
          value,
          isStatus ? getXlsxStatusStyle(row.status) : cellIndex === 0 ? 11 : isCode ? 14 : 3,
          sharedStrings,
        );
      });
      rows.push(xlsxRow(rowIndex, cells, { height: estimateXlsxRowHeight(values, bodyColumns) }));
      rowIndex += 1;
    });
  });

  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/><cols>${columnXml}</cols><sheetData>${rows.join("")}</sheetData>` +
    `${mergeXml}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sheetXml, sharedStringsXml: sharedStrings.xml() };
}

function xlsxStylesXml() {
  const fillColors = [
    "FFFFFF",
    "1F4E78",
    "D9EAF7",
    "263238",
    "D9EAD3",
    "F4CCCC",
    "D9EAF7",
    "EADCF8",
    "FCE5CD",
    "FFF2CC",
    "F6F8FA",
  ];
  const fills = fillColors
    .map((color) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><color rgb="FF172B4D"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF172B4D"/><name val="Calibri"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF172B4D"/><name val="Consolas"/></font></fonts><fills count="${fillColors.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD0D7DE"/></left><right style="thin"><color rgb="FFD0D7DE"/></right><top style="thin"><color rgb="FFD0D7DE"/></top><bottom style="thin"><color rgb="FFD0D7DE"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="15"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="7" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="8" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="9" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="10" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="11" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="center" shrinkToFit="1"/></xf><xf numFmtId="0" fontId="4" fillId="12" borderId="1" xfId="0" applyFill="1" applyFont="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(output, value) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output, value) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const local = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, checksum);
    writeUint32(local, dataBytes.length);
    writeUint32(local, dataBytes.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    chunks.push(new Uint8Array(local), nameBytes, dataBytes);
    const centralEntry = [];
    writeUint32(centralEntry, 0x02014b50);
    writeUint16(centralEntry, 20);
    writeUint16(centralEntry, 20);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint32(centralEntry, checksum);
    writeUint32(centralEntry, dataBytes.length);
    writeUint32(centralEntry, dataBytes.length);
    writeUint16(centralEntry, nameBytes.length);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint16(centralEntry, 0);
    writeUint32(centralEntry, 0);
    writeUint32(centralEntry, offset);
    central.push(new Uint8Array(centralEntry), nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
  });
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralSize);
  writeUint32(end, offset);
  writeUint16(end, 0);
  return new Blob([...chunks, ...central, new Uint8Array(end)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildChecklistXlsxBlob() {
  const { sheetXml, sharedStringsXml } = buildXlsxWorksheet();
  const now = new Date().toISOString();
  return createZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>QA Report</Application></Properties>` },
    { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>QA Report</dc:creator><cp:lastModifiedBy>QA Report</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Чек-лист" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
    { name: "xl/styles.xml", content: xlsxStylesXml() },
    { name: "xl/sharedStrings.xml", content: sharedStringsXml },
  ]);
}

function safeExportFilename() {
  const issueKey = issueKeyFromUrl(draft.issueUrl) || "checklist";
  return `${issueKey}-${new Date().toISOString().slice(0, 10)}.xlsx`
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
}

function exportChecklistXlsx() {
  if (!draft.sections.some((section) => section.rows.some(hasRowContent))) {
    showToast("Добавьте хотя бы одну заполненную строку");
    return;
  }
  try {
    const blob = buildChecklistXlsxBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeExportFilename();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("XLSX-файл сформирован");
  } catch (error) {
    console.error("Ошибка экспорта XLSX:", error);
    showToast(`Не удалось экспортировать XLSX: ${error.message}`, 5000);
  }
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
  const iconMap = { light: "#icon-sun", graphite: "#icon-corporate", dark: "#icon-moon" };
  elements.themeToggle.querySelector(".theme-icon use")?.setAttribute(
    "href",
    iconMap[theme] || "#icon-moon",
  );
  document.querySelectorAll(".theme-menu-item").forEach((item) => {
    const isActive = item.dataset.theme === theme;
    item.classList.toggle("current", isActive);
    item.setAttribute("aria-current", isActive ? "true" : "false");
  });
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
  if (selection?.rangeCount && activeEditor?.contains(selection.anchorNode)) {
    savedEditorRange = selection.getRangeAt(0).cloneRange();
  }
});
function closeTextColorMenu() {
  elements.textColorMenu.hidden = true;
  elements.textColorInput.setAttribute("aria-expanded", "false");
}

elements.textColorInput.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  const willOpen = elements.textColorMenu.hidden;
  elements.textColorMenu.hidden = !willOpen;
  elements.textColorInput.setAttribute("aria-expanded", String(willOpen));
});
elements.textColorMenu.addEventListener("click", (event) => {
  const swatch = event.target.closest("button[data-color]");
  if (!swatch) return;
  event.preventDefault();
  event.stopPropagation();
  const color = swatch.dataset.color;
  const range = savedEditorRange?.cloneRange();
  activeEditor?.focus();
  if (range && !range.collapsed) {
    wrapSelectionWithColor(range, color);
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    showToast("Выделите текст, чтобы применить цвет");
  }
  closeTextColorMenu();
});
elements.codeButton.addEventListener("pointerdown", (event) => {
  const selection = window.getSelection();
  if (selection?.rangeCount && activeEditor?.contains(selection.anchorNode)) {
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
  const textToPaste = plainText || htmlToText(html);
  if (textToPaste) {
    event.preventDefault();
    activeEditor = editor;
    const cleanHtml = /(?:https?:\/\/|www\.)[^\s]+/i.test(textToPaste)
      ? linkifyPlainText(textToPaste)
      : textToEditorHtml(textToPaste);
    insertHtmlAtSelection(cleanHtml, range);
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
    pointerObjectGesture = {
      object: codeBlock,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    return;
  }
  const figure = event.target.closest(".cell-image");
  if (!figure) return;
  const rect = figure.getBoundingClientRect();
  const onResizeHandle = rect.right - event.clientX <= 18 && rect.bottom - event.clientY <= 18;
  if (onResizeHandle) {
    startImageResize(event, figure);
    return;
  }
  if (!event.target.closest("[data-editor-ui]")) {
    pointerObjectGesture = {
      object: figure,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }
});
document.addEventListener("pointermove", (event) => {
  if (!pointerObjectGesture || pointerObjectGesture.moved) return;
  const distance = Math.hypot(
    event.clientX - pointerObjectGesture.startX,
    event.clientY - pointerObjectGesture.startY,
  );
  if (distance > 5) {
    pointerObjectGesture.moved = true;
    suppressObjectOpenUntil.set(pointerObjectGesture.object, Date.now() + 350);
  }
});
document.addEventListener("pointerup", () => {
  if (pointerObjectGesture?.moved) {
    suppressObjectOpenUntil.set(pointerObjectGesture.object, Date.now() + 350);
  }
  pointerObjectGesture = null;
});
document.addEventListener("pointercancel", () => {
  if (pointerObjectGesture) {
    suppressObjectOpenUntil.set(pointerObjectGesture.object, Date.now() + 350);
  }
  pointerObjectGesture = null;
});
document.addEventListener("click", (event) => {
  const codeBlock = event.target.closest(".cell-code-block");
  if (codeBlock && !event.target.closest("[data-editor-ui]")) {
    event.preventDefault();
    event.stopPropagation();
    if ((suppressObjectOpenUntil.get(codeBlock) || 0) <= Date.now()) openCodeEditor(codeBlock);
    return;
  }
  const figure = event.target.closest(".cell-image");
  if (figure && !event.target.closest("[data-editor-ui]")) {
    event.preventDefault();
    event.stopPropagation();
    if ((suppressObjectOpenUntil.get(figure) || 0) <= Date.now()) {
      openMediaViewer(figure.querySelector("img"));
    }
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
  if (!draggedCodeBlock && !draggedImageFigure) return;
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
  if (!draggedCodeBlock && !draggedImageFigure) return;
  const editor = event.target.closest?.(".cell-editor, .intro-editor");
  if (!editor) return;
  event.preventDefault();
  event.stopPropagation();
  const range = rangeFromPoint(event.clientX, event.clientY, editor);
  if (draggedCodeBlock) {
    const sourceBlock = draggedCodeBlock;
    const sourceEditor = sourceBlock.closest(".cell-editor, .intro-editor");
    const snippet = parseCodeFromClipboard(
      event.dataTransfer.getData("text/html"),
      event.dataTransfer.getData("text/plain"),
    );
    if (!snippet) return;
    insertCodeSnippet(editor, snippet, range);
    sourceBlock.remove();
    sourceEditor?.dispatchEvent(new Event("input", { bubbles: true }));
    draggedCodeBlock = null;
  } else if (draggedImageFigure) {
    const sourceFigure = draggedImageFigure;
    const sourceEditor = sourceFigure.closest(".cell-editor, .intro-editor");
    const html = event.dataTransfer.getData("text/html");
    if (!html) return;
    activeEditor = editor;
    insertHtmlAtSelection(html, range);
    enhanceImageControls(editor);
    sourceFigure.remove();
    sourceEditor?.dispatchEvent(new Event("input", { bubbles: true }));
    draggedImageFigure = null;
  }
  editor.classList.remove("code-drop-target");
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
elements.exportXlsxButton.addEventListener("click", exportChecklistXlsx);
elements.modalCopyButton.addEventListener("click", copyPreviewMarkup);
elements.modalCopyVisualButton.addEventListener("click", copyVisualReport);
elements.modalSaveMarkupButton.addEventListener("click", savePreviewMarkupToDraft);
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
  updateCodeEditorLineNumbers();
  const lineCount = Math.max(1, elements.codeEditorTextarea.value.split("\n").length);
  elements.codeEditorLanguage.textContent = `${lineCount} ${pluralizeLines(lineCount)}`;
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
elements.settingsButton.addEventListener("click", openJiraSettings);
elements.closeJiraSettingsButton.addEventListener("click", closeJiraSettings);
elements.saveJiraSettingsButton.addEventListener("click", saveJiraSettings);
elements.testJiraButton.addEventListener("click", testJiraConnection);
elements.publishButton.addEventListener("click", publishToJira);
elements.jiraType.addEventListener("change", updateJiraSettingsLabels);
elements.jiraAuthMethod.addEventListener("change", updateJiraSettingsLabels);
elements.settingsJiraSectionButton.addEventListener("click", () => setSettingsSection("jira"));
elements.settingsFilesSectionButton.addEventListener("click", () => setSettingsSection("files"));
elements.jiraManualTab.addEventListener("click", () => setJiraSettingsTab("manual"));
elements.jiraCurlTab.addEventListener("click", () => setJiraSettingsTab("curl"));
elements.parseJiraCurlButton.addEventListener("click", applyJiraCurlSettings);
elements.themeToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = document.getElementById("themeMenu");
  if (!menu) return;
  if (menu.hidden) {
    closeHeaderDropdowns();
    menu.hidden = false;
    elements.themeToggle.setAttribute("aria-expanded", "true");
    menu.querySelector("button")?.focus();
  } else {
    menu.hidden = true;
    elements.themeToggle.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll(".theme-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const theme = item.dataset.theme;
    localStorage.setItem("qa-report-theme", theme);
    applyTheme(theme);
    const menu = document.getElementById("themeMenu");
    menu.hidden = true;
    elements.themeToggle.setAttribute("aria-expanded", "false");
    elements.themeToggle.focus();
  });
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
  if (!event.target.closest(".theme-selector")) {
    const themeMenu = document.getElementById("themeMenu");
    if (themeMenu && !themeMenu.hidden) {
      themeMenu.hidden = true;
      elements.themeToggle?.setAttribute("aria-expanded", "false");
    }
  }
  if (!event.target.closest(".toolbar-color-wrap") && !elements.textColorMenu.hidden) {
    closeTextColorMenu();
  }
  if (!event.target.closest(".floating-context-menu, .row-menu-button, .column-menu-button, .cell-image, .cell-code-block")) {
    closeFloatingMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.textColorMenu.hidden) {
    closeTextColorMenu();
    elements.textColorInput.focus();
    return;
  }
  const themeMenu = document.getElementById("themeMenu");
  if (themeMenu && !themeMenu.hidden) {
    themeMenu.hidden = true;
    elements.themeToggle?.setAttribute("aria-expanded", "false");
    elements.themeToggle?.focus();
    return;
  }
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
  scheduleStickySectionUpdate();
});
window.addEventListener("scroll", () => {
  closeFloatingMenu();
  scheduleStickySectionUpdate();
}, true);
elements.sectionStickyScroll?.addEventListener("scroll", syncActiveSectionScrollFromSticky);
document.addEventListener("keydown", (event) => {
  const focusedObject = document.activeElement;
  if (
    (event.key === "Enter" || event.key === " ") &&
    focusedObject?.matches?.(".cell-code-block, .cell-image") &&
    event.target === focusedObject
  ) {
    event.preventDefault();
    if (focusedObject.matches(".cell-code-block")) openCodeEditor(focusedObject);
    else openMediaViewer(focusedObject.querySelector("img"));
    return;
  }
  if (event.key === "Backspace" || event.key === "Delete") {
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
