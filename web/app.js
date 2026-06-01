const storageKey = "focusReadingLauncherRecords";
const draftKey = "focusReadingLauncherDraft";

const state = {
  currentSession: null,
  timerId: null,
  remainingSeconds: 0,
  startedAt: null,
  fileContent: "",
  fileName: "",
  fileType: "",
};

const views = {
  home: document.querySelector("#homeView"),
  ritual: document.querySelector("#ritualView"),
  reading: document.querySelector("#readingView"),
  exit: document.querySelector("#exitView"),
};

const elements = {
  form: document.querySelector("#sessionForm"),
  titleInput: document.querySelector("#titleInput"),
  urlInput: document.querySelector("#urlInput"),
  textInput: document.querySelector("#textInput"),
  fileInput: document.querySelector("#fileInput"),
  fileHint: document.querySelector("#fileHint"),
  customMinutes: document.querySelector("#customMinutes"),
  currentSessionCard: document.querySelector("#currentSessionCard"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  ritualTitle: document.querySelector("#ritualTitle"),
  enterReadingButton: document.querySelector("#enterReadingButton"),
  cancelRitualButton: document.querySelector("#cancelRitualButton"),
  readingTitle: document.querySelector("#readingTitle"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timeProgressText: document.querySelector("#timeProgressText"),
  timeProgressBar: document.querySelector("#timeProgressBar"),
  readingProgressText: document.querySelector("#readingProgressText"),
  readingProgressRange: document.querySelector("#readingProgressRange"),
  keyPointInput: document.querySelector("#keyPointInput"),
  saveKeyPointButton: document.querySelector("#saveKeyPointButton"),
  finishReadingButton: document.querySelector("#finishReadingButton"),
  sourceTypeLabel: document.querySelector("#sourceTypeLabel"),
  openLinkButton: document.querySelector("#openLinkButton"),
  contentArea: document.querySelector("#contentArea"),
  keyPointList: document.querySelector("#keyPointList"),
  exitMeta: document.querySelector("#exitMeta"),
  takeawayInput: document.querySelector("#takeawayInput"),
  nextActionInput: document.querySelector("#nextActionInput"),
  completeExitButton: document.querySelector("#completeExitButton"),
};

function showView(name) {
  Object.entries(views).forEach(([viewName, node]) => {
    node.classList.toggle("is-active", viewName === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getSelectedSourceType() {
  return document.querySelector("input[name='sourceType']:checked").value;
}

function getSelectedDuration() {
  const selectedValue = document.querySelector("input[name='duration']:checked").value;
  if (selectedValue === "custom") {
    const customValue = Number(elements.customMinutes.value);
    return Number.isFinite(customValue) && customValue > 0 ? Math.round(customValue) : 25;
  }
  return Number(selectedValue);
}

function formatDateTime(dateString) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(new Date(dateString));
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sourceLabel(type) {
  const labels = { link: "网页链接", text: "粘贴文本", file: "本地文件" };
  return labels[type] || type;
}

function estimateReadingMinutes(type, content) {
  if (type === "link") return 15;
  const visibleText = (content || "").replace(/\s+/g, "");
  if (!visibleText) return 5;
  return Math.max(5, Math.ceil(visibleText.length / 450));
}

function readRecords() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch (error) {
    return [];
  }
}

function writeRecords(records) {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function saveDraft(session) {
  localStorage.setItem(draftKey, JSON.stringify(session));
}

function clearDraft() {
  localStorage.removeItem(draftKey);
}

function updateSourcePanels() {
  const selected = getSelectedSourceType();
  document.querySelectorAll("[data-source-panel]").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.sourcePanel !== selected);
  });
}

function getMaterialPayload(type) {
  if (type === "link") {
    const url = elements.urlInput.value.trim();
    return {
      content: url,
      displayContent: url ? `这是一个网页链接。请点击右上角“打开链接”，在新标签页阅读原文。\n\n${url}` : "待补充链接。",
      originalName: url,
    };
  }

  if (type === "file") {
    const isPdf = state.fileType === "application/pdf" || state.fileName.toLowerCase().endsWith(".pdf");
    return {
      content: state.fileContent || state.fileName,
      displayContent: isPdf
        ? `已选择 PDF 文件：${state.fileName || "未命名 PDF"}\n\nMVP 暂不解析 PDF 正文。后续可在这里接入 PDF 文本解析；本次 Session 可先用于限时阅读外部文件。`
        : state.fileContent || "请先选择 txt 或 md 文件。PDF 第一版只显示占位提示。",
      originalName: state.fileName,
    };
  }

  const text = elements.textInput.value.trim();
  return {
    content: text,
    displayContent: text || "请粘贴要阅读的文本。",
    originalName: "粘贴文本",
  };
}

function createSession(event) {
  event.preventDefault();
  const type = getSelectedSourceType();
  const payload = getMaterialPayload(type);
  const title = elements.titleInput.value.trim() || inferTitle(type, payload.originalName, payload.content);
  const durationMinutes = getSelectedDuration();

  state.currentSession = {
    id: `session-${Date.now()}`,
    title,
    sourceType: type,
    sourceLabel: sourceLabel(type),
    sourceValue: payload.originalName,
    content: payload.displayContent,
    durationMinutes,
    estimatedMinutes: estimateReadingMinutes(type, payload.content),
    status: "未开始",
    readingProgress: 0,
    timeProgress: 0,
    keyPoints: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    takeaway: "",
    nextAction: "",
  };

  renderCurrentSessionCard();
  saveDraft(state.currentSession);
}

function inferTitle(type, name, content) {
  if (type === "link" && name) {
    try {
      return new URL(name).hostname.replace(/^www\./, "");
    } catch (error) {
      return "网页阅读 Session";
    }
  }
  if (type === "file" && name) return name;
  const firstLine = (content || "").split("\n").find((line) => line.trim());
  return firstLine ? firstLine.trim().slice(0, 32) : "未命名阅读 Session";
}

function renderCurrentSessionCard() {
  const session = state.currentSession;
  if (!session) {
    elements.currentSessionCard.className = "empty-card";
    elements.currentSessionCard.innerHTML = "<p>还没有阅读 Session。请先放入一份材料。</p>";
    return;
  }

  elements.currentSessionCard.className = "reading-card";
  elements.currentSessionCard.innerHTML = `
    <div class="card-topline">
      <span>${escapeHtml(session.sourceLabel)}</span>
      <strong>${escapeHtml(session.status)}</strong>
    </div>
    <h3>${escapeHtml(session.title)}</h3>
    <dl class="meta-grid">
      <div><dt>预计阅读时长</dt><dd>${session.estimatedMinutes} 分钟</dd></div>
      <div><dt>本次时间限制</dt><dd>${session.durationMinutes} 分钟</dd></div>
      <div><dt>阅读进度</dt><dd>${session.readingProgress}%</dd></div>
      <div><dt>来源类型</dt><dd>${session.sourceType}</dd></div>
    </dl>
    <div class="progress-track"><div class="progress-fill" style="width: ${session.readingProgress}%"></div></div>
    <button id="startRitualButton" class="primary-action" type="button">开始进入仪式</button>
  `;

  document.querySelector("#startRitualButton").addEventListener("click", startRitual);
}

function startRitual() {
  if (!state.currentSession) return;
  elements.ritualTitle.textContent = `准备阅读：${state.currentSession.title}`;
  showView("ritual");
}

function beginReading() {
  const session = state.currentSession;
  if (!session) return;

  session.status = "阅读中";
  session.startedAt = new Date().toISOString();
  state.startedAt = Date.now();
  state.remainingSeconds = session.durationMinutes * 60;
  saveDraft(session);
  renderReadingView();
  showView("reading");
  startTimer();
}

function renderReadingView() {
  const session = state.currentSession;
  elements.readingTitle.textContent = session.title;
  elements.sourceTypeLabel.textContent = session.sourceLabel;
  elements.readingProgressRange.value = session.readingProgress;
  updateReadingProgress(session.readingProgress);
  elements.keyPointInput.value = "";
  elements.contentArea.innerHTML = `<pre>${escapeHtml(session.content)}</pre>`;
  elements.openLinkButton.classList.toggle("is-hidden", session.sourceType !== "link");
  if (session.sourceType === "link" && session.sourceValue) {
    elements.openLinkButton.href = session.sourceValue;
  }
  renderKeyPoints();
  updateTimerDisplay();
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.remainingSeconds -= 1;
    updateTimerDisplay();
    if (state.remainingSeconds <= 0) {
      finishReading("timeup");
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay() {
  const session = state.currentSession;
  if (!session) return;
  const totalSeconds = session.durationMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - state.remainingSeconds);
  const percent = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));
  session.timeProgress = percent;
  elements.timerDisplay.textContent = formatTimer(Math.max(0, state.remainingSeconds));
  elements.timeProgressText.textContent = `${percent}%`;
  elements.timeProgressBar.style.width = `${percent}%`;
}

function updateReadingProgress(value) {
  const session = state.currentSession;
  const progress = Number(value);
  if (session) {
    session.readingProgress = progress;
    saveDraft(session);
  }
  elements.readingProgressRange.value = progress;
  elements.readingProgressText.textContent = `${progress}%`;
}

function saveKeyPoint() {
  const session = state.currentSession;
  const text = elements.keyPointInput.value.trim();
  if (!session || !text) return;
  session.keyPoints.push(text);
  elements.keyPointInput.value = "";
  saveDraft(session);
  renderKeyPoints();
}

function renderKeyPoints() {
  const session = state.currentSession;
  const points = session?.keyPoints || [];
  elements.keyPointList.innerHTML = points.length
    ? points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")
    : "<li>还没有关键点。读到有判断力的信息时再记录。</li>";
}

function finishReading(reason = "manual") {
  const session = state.currentSession;
  if (!session) return;
  stopTimer();
  saveKeyPoint();
  session.status = "已完成";
  session.endedAt = new Date().toISOString();
  if (reason === "timeup") {
    session.timeProgress = 100;
  }
  saveDraft(session);
  elements.exitMeta.textContent = reason === "timeup"
    ? "倒计时已结束。请用一分钟收束这次阅读。"
    : `你已结束《${session.title}》的阅读。请写下最重要的收获。`;
  elements.takeawayInput.value = session.takeaway;
  elements.nextActionInput.value = session.nextAction;
  showView("exit");
}

function completeExit() {
  const session = state.currentSession;
  if (!session) return;
  const takeaway = elements.takeawayInput.value.trim();
  if (!takeaway) {
    elements.takeawayInput.focus();
    alert("请先填写：读到最重要的点。完成退出需要一个明确收获。");
    return;
  }
  session.takeaway = takeaway;
  session.nextAction = elements.nextActionInput.value.trim();
  session.endedAt = session.endedAt || new Date().toISOString();
  session.status = "已完成";

  const records = readRecords();
  records.unshift({
    id: session.id,
    date: session.endedAt,
    title: session.title,
    sourceType: session.sourceType,
    sourceLabel: session.sourceLabel,
    durationMinutes: session.durationMinutes,
    readingProgress: session.readingProgress,
    takeaway: session.takeaway,
    nextAction: session.nextAction,
    keyPoints: session.keyPoints,
  });
  writeRecords(records.slice(0, 50));
  clearDraft();
  state.currentSession = null;
  renderCurrentSessionCard();
  renderHistory();
  showView("home");
}

function renderHistory() {
  const records = readRecords();
  if (!records.length) {
    elements.historyList.innerHTML = "<div class='empty-history'>暂无历史记录。完成一次退出仪式后会显示在这里。</div>";
    return;
  }

  elements.historyList.innerHTML = records.map((record) => `
    <article class="history-item">
      <div>
        <time>${formatDateTime(record.date)}</time>
        <h3>${escapeHtml(record.title)}</h3>
        <p>${escapeHtml(record.takeaway)}</p>
        ${record.nextAction ? `<small>下一步：${escapeHtml(record.nextAction)}</small>` : ""}
      </div>
      <dl>
        <div><dt>类型</dt><dd>${escapeHtml(record.sourceLabel || record.sourceType)}</dd></div>
        <div><dt>时长</dt><dd>${record.durationMinutes} 分钟</dd></div>
        <div><dt>完成度</dt><dd>${record.readingProgress}%</dd></div>
      </dl>
    </article>
  `).join("");
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey));
    if (draft && draft.status !== "已完成") {
      state.currentSession = draft;
      renderCurrentSessionCard();
    }
  } catch (error) {
    clearDraft();
  }
}

function handleFileChange() {
  const file = elements.fileInput.files[0];
  state.fileContent = "";
  state.fileName = file?.name || "";
  state.fileType = file?.type || "";

  if (!file) {
    elements.fileHint.textContent = "支持 txt / md 直接预览；pdf 第一版仅保存文件名并显示后续解析提示。";
    return;
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    elements.fileHint.textContent = `已选择 ${file.name}。PDF 解析将在后续版本接入，本次仅创建限时 Session。`;
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.fileContent = String(reader.result || "");
    elements.fileHint.textContent = `已读取 ${file.name}，可创建阅读 Session。`;
    if (!elements.titleInput.value.trim()) elements.titleInput.value = file.name;
  };
  reader.onerror = () => {
    elements.fileHint.textContent = "文件读取失败，请换一个 txt 或 md 文件。";
  };
  reader.readAsText(file);
}

function bindEvents() {
  document.querySelectorAll("input[name='sourceType']").forEach((radio) => {
    radio.addEventListener("change", updateSourcePanels);
  });
  document.querySelector("input[value='custom']").addEventListener("change", () => elements.customMinutes.focus());
  elements.form.addEventListener("submit", createSession);
  elements.fileInput.addEventListener("change", handleFileChange);
  elements.enterReadingButton.addEventListener("click", beginReading);
  elements.cancelRitualButton.addEventListener("click", () => showView("home"));
  elements.readingProgressRange.addEventListener("input", (event) => updateReadingProgress(event.target.value));
  document.querySelectorAll("[data-progress]").forEach((button) => {
    button.addEventListener("click", () => updateReadingProgress(button.dataset.progress));
  });
  elements.saveKeyPointButton.addEventListener("click", saveKeyPoint);
  elements.finishReadingButton.addEventListener("click", () => finishReading("manual"));
  elements.completeExitButton.addEventListener("click", completeExit);
  elements.clearHistoryButton.addEventListener("click", () => {
    if (confirm("确定清空本浏览器中的历史阅读记录吗？")) {
      writeRecords([]);
      renderHistory();
    }
  });
}

bindEvents();
updateSourcePanels();
loadDraft();
renderHistory();
