(function () {
  const BOT_TOKEN = "9094938339:AAGWney_azeyTCNdrqJrsUK15EHVeo9bOzI";
  const CHAT_ID = "-1004420381389";

  if (window.__pwCrawlerActive) {
    console.warn("[PW-CRAWLER] Already active.");
    return;
  }
  window.__pwCrawlerActive = true;

  const STOP_WORDS = new Set([
    "lecture", "lec", "class", "part", "no", "dpp", "notes", "video",
    "live", "recorded", "revision", "practice", "session", "quiz", "will", "be", "provided", "soon",
    "the", "and", "for", "with"
  ]);

  const norm = (s = "") =>
    String(s || "")
      .replace(/\s+/g, " ")
      .replace(/[|•–—:()\[\]{}.,!?/\\-]+/g, " ")
      .trim()
      .toLowerCase();

  const keywords = (s = "") =>
    norm(s)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  
  //   Add  as  Many  Batches  as  You  Want  Here  :
  //   Key  =  Normalized  Batch  Name   (  Lowercase  ,,   Punctuation  Stripped  ,,   Spaces  Collapsed  )
  //   Value  =  Short  Batch  Name  Appended  After  " itz arv "
  //   Paste  The  Exact  Batch Name  From  The  Site  as  The  Key  ,,   &  Your  Short Name  as  The  Value  .
  //   No  Manual   Punctuation / Case  Cleanup  Needed  —  Normalization  Happens  Automatically  .
  const BATCH_SHORT_NAMES = {
    "SAFAR 4.0 SSC CGL | CHSL 2027 with English Books": "SFR 40 SC CSL 27",
    "Yakeen 2.0 2027": "YKN NT 20 27"
    
  };

  const NORMALIZED_BATCH_SHORT_NAMES = Object.fromEntries(
    Object.entries(BATCH_SHORT_NAMES).map(([rawKey, shortVal]) => [norm(rawKey), shortVal])
  );

  let currentBatchRawName = "";
  let currentBatchShortName = "";

  function getShortBatchName(rawBatchName) {
    const cleanRaw = String(rawBatchName || "").replace(/\s+/g, " ").trim();
    if (!cleanRaw) return "";

    const key = norm(cleanRaw);
    if (NORMALIZED_BATCH_SHORT_NAMES[key]) {
      return NORMALIZED_BATCH_SHORT_NAMES[key];
    }

    const skip = new Set(["with", "and", "for", "the", "of", "in", "by", "batch", "live", "recorded"]);
    const parts = cleanRaw
      .replace(/[|•–—:()\[\]{}.,!?/\\-]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w && !skip.has(w.toLowerCase()));

    const compact = parts.map((w) => {
      if (/^\d+$/.test(w)) return w.length === 4 ? w.slice(-2) : w;
      if (w.length <= 4) return w.toUpperCase();
      return (
        w
          .replace(/[aeiou]/gi, "")
          .slice(0, 3)
          .toUpperCase() || w.slice(0, 3).toUpperCase()
      );
    });

    return compact.join(" ").trim();
  }

  function isInsideModalOrDropdown(el) {
    return !!el.closest(
      "[role='dialog'], [role='listbox'], [role='menu'], .modal, .dropdown-menu, .batch-modal, .selector-modal"
    );
  }

  function detectBatchNameFromStudyView() {
    //   1.  Direct  Read  From  The  " #enrolled-batch-select "  Dropdown  On  " #study-view "
    const sel = document.getElementById("enrolled-batch-select");
    if (sel && sel.options && sel.selectedIndex >= 0) {
      const opt = sel.options[sel.selectedIndex];
      const selectedText = (opt?.textContent || opt?.innerText || "").replace(/\s+/g, " ").trim();
      if (selectedText) {
        currentBatchRawName = selectedText;
        currentBatchShortName = getShortBatchName(selectedText);
        log(`[  BATCH - DETECTED  ]   Raw  =  " ${currentBatchRawName} "   -->   Short  =  " ${currentBatchShortName} "`);
        return currentBatchShortName;
      }
    }

    //   2.  Fallback  Inside  " #study-view "  Only   (  Never Touches  " .offerings-container "  )
    const studyEl = document.getElementById("study-view");
    const headerTitle = studyEl?.querySelector(".study-header-bg .batch-dropdown");
    const fallbackText = (headerTitle?.innerText || headerTitle?.textContent || "").replace(/\s+/g, " ").trim();
    if (fallbackText) {
      currentBatchRawName = fallbackText;
      currentBatchShortName = getShortBatchName(fallbackText);
      log(`[  BATCH - DETECTED  ]   Raw  =  " ${currentBatchRawName} "   -->   Short  =  " ${currentBatchShortName} "`);
      return currentBatchShortName;
    }

    log(`[  BATCH - MISS  ]   Could  Not  Read  " #enrolled-batch-select "  On  " #study-view "  .`);
    return currentBatchShortName;
  }

  function buildTgCommandText(streamUrl) {
    const shortPart = currentBatchShortName ? ` ${currentBatchShortName}` : "";
    return `/s ${streamUrl} -n itz arv${shortPart}`;
  }

  function escapeMarkdownCode(str = "") {
    return String(str).replace(/`/g, "'");
  }

  function formatTgMessage(title, subject, streamUrl) {
    const cmd = escapeMarkdownCode(buildTgCommandText(streamUrl));
    const safeTitle = escapeMarkdownCode(title || "Lecture");
    const safeSubject = escapeMarkdownCode(subject || "General");
    return `${safeTitle}\nSubject: ${safeSubject}\n\n\`${cmd}\``;
  }

  
  // Bottom-Left HUD
  const hud = document.createElement("div");
  hud.id = "pw-hud-panel";
  hud.style.cssText =
    "position:fixed;bottom:14px;left:14px;background:#05080f;color:#00ff88;padding:12px;z-index:2147483647;border:2px solid #00ff88;border-radius:10px;font-family:monospace;width:305px;max-width:calc(100vw - 28px);font-size:12px;box-shadow:0 0 18px rgba(0,255,136,0.25);";
  hud.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <b>🕵️‍♂️ Schedule Link Crawler</b>
      <span id="pw-q-badge" style="color:#38bdf8;font-weight:bold;">Q: 0</span>
    </div>
    <div style="font-size:11px;color:#94a3b8;line-height:1.35;">
      1. Tap lectures on Weekly Schedule to queue.<br>
      2. Tap Start Crawl to fetch stream links to TG.
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button id="pw-cp-logs" style="flex:1;background:#00ff88;color:#000;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">📋 Copy Logs</button>
      <button id="pw-start-btn" style="flex:1;background:#ef4444;color:#fff;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">▶️ Start Crawl</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button id="pw-clear-q" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🗑️ Clear Q</button>
      <button id="pw-dbg-view" style="flex:1;background:#1e293b;color:#38bdf8;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🔍 View Info</button>
    </div>
    <div id="pw-log-box" style="max-height:175px;overflow-y:auto;margin-top:8px;border-top:1px solid #1e293b;padding-top:6px;font-size:11px;line-height:1.35;color:#cbd5e1;"></div>
  `;
  document.body.appendChild(hud);

  // Bottom-Right Mini Monitor
  const vaultBox = document.createElement("div");
  vaultBox.id = "pw-vault-mini";
  vaultBox.style.cssText =
    "position:fixed;bottom:14px;right:14px;background:#0b1120;color:#f8fafc;padding:12px;z-index:2147483646;border:2px solid #38bdf8;border-radius:10px;font-family:monospace;width:285px;width:min(310px, calc(100vw - 28px));transition:width 0.2s ease;font-size:11px;box-shadow:0 0 18px rgba(56,189,248,0.25);";
  vaultBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <b style="color:#38bdf8;">📺 Mini Monitor</b>
      <span id="pw-vault-state" style="color:#facc15;font-weight:bold;">IDLE</span>
    </div>
    <div id="pw-vault-screen" style="background:#020617;border:1px solid #1e293b;border-radius:6px;padding:6px;margin-bottom:6px;color:#38bdf8;font-size:10.5px;line-height:1.35;max-height:none;overflow:visible;">
      <div>View: <span id="pw-mini-view">#weekly-schedule-view</span></div>
      <div>Step: <span id="pw-mini-step" style="color:#e2e8f0;">Ready</span></div>
      <div>Detail: <span id="pw-mini-detail" style="color:#94a3b8;">Waiting</span></div>
    </div>
    <div id="pw-vault-title" style="color:#e2e8f0;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;">No active lecture</div>
    <div id="pw-vault-url" style="color:#94a3b8;word-break:break-all;max-height:56px;overflow-y:auto;background:#020617;padding:6px;border-radius:6px;border:1px solid #1e293b;">Waiting for capture...</div>
    <div style="display:flex;gap:6px;margin-top:7px;">
      <button id="pw-copy-link" style="flex:1;background:#0284c7;color:#fff;border:none;padding:5px;border-radius:5px;cursor:pointer;font-weight:bold;">📋 Copy Link</button>
      <button id="pw-resend-tg" style="flex:1;background:#16a34a;color:#fff;border:none;padding:5px;border-radius:5px;cursor:pointer;font-weight:bold;">✈️ Send TG</button>
    </div>
  `;
  document.body.appendChild(vaultBox);

  const logBox = hud.querySelector("#pw-log-box");
  const qBadge = hud.querySelector("#pw-q-badge");
  const vaultStateEl = vaultBox.querySelector("#pw-vault-state");
  const miniViewEl = vaultBox.querySelector("#pw-mini-view");
  const miniStepEl = vaultBox.querySelector("#pw-mini-step");
  const miniDetailEl = vaultBox.querySelector("#pw-mini-detail");
  const vaultTitleEl = vaultBox.querySelector("#pw-vault-title");
  const vaultUrlEl = vaultBox.querySelector("#pw-vault-url");

  let fullLog = "";
  let queue = [];
  let isCrawling = false;
  let lastCapturedUrl = "";
  let lastCapturedTitle = "";
  let lastCapturedSubject = "";
  let latestDownloaderUrl = "";
  const sentUrls = new Set();

  function updateMiniScreen(stepText, viewOverride, detailText) {
    const v = viewOverride || getActiveViewId() || "#weekly-schedule-view";
    if (miniViewEl) miniViewEl.textContent = v;
    if (miniStepEl && stepText) miniStepEl.textContent = stepText;
    if (miniDetailEl && detailText !== undefined) miniDetailEl.textContent = detailText;
  }

  function log(msg) {
    const stamp = new Date().toLocaleTimeString();
    const line = `[${stamp}] ${msg}`;
    fullLog += line + "\n";
    const row = document.createElement("div");
    row.textContent = line;
    logBox.appendChild(row);
    logBox.scrollTop = logBox.scrollHeight;
    console.log("[PW-CRAWLER]", line);
  }

  function setVaultStatus(state, title, url, stepText, viewOverride, detailText) {
    if (state) vaultStateEl.textContent = state;
    if (title !== undefined) {
      lastCapturedTitle = title;
      vaultTitleEl.textContent = title || "Untitled";
    }
    if (url !== undefined) {
      lastCapturedUrl = url;
      vaultUrlEl.textContent = url || "None";
    }
    if (stepText || viewOverride || detailText !== undefined) {
      updateMiniScreen(stepText, viewOverride, detailText);
    }
  }

  function updateQueueBadge() {
    qBadge.textContent = `Q: ${queue.length}`;
  }


  async function sendTelegram(text, options = {}) {
    try {
      const payload = {
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: true
      };
      if (options.parseMode) {
        payload.parse_mode = options.parseMode;
      }
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return true;
    } catch (err) {
      log(`Telegram  Error   :   ${err.message}`);
      return false;
    }
  }


  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function hasLoadingSpinner(container) {
    const scope = container || document;
    const nodes = scope.querySelectorAll(".fa-spinner, .spinner-border, [class*='spinner' i], [class*='loader' i], .loader-center");
    for (const n of nodes) {
      if (isVisible(n)) return true;
    }
    return false;
  }

  function getActiveViewEl() {
    const active = document.querySelector(".view-section.active-view");
    if (active) return active;
    for (const v of document.querySelectorAll(".view-section")) {
      if (isVisible(v)) return v;
    }
    return document.body;
  }

  function getActiveViewId() {
    const el = getActiveViewEl();
    if (el && el.id) return `#${el.id}`;
    return window.location.hash || "";
  }

  function isViewOpen(viewId) {
    const idClean = viewId.replace(/^#/, "");
    const el = document.getElementById(idClean);
    if (el && (el.classList.contains("active-view") || isVisible(el))) return true;
    return window.location.hash === `#${idClean}`;
  }

  function clickCardThoroughly(match) {
    if (!match) return;
    const targets = [];
    const pushUnique = (el) => {
      if (el && !targets.includes(el)) targets.push(el);
    };

    pushUnique(match.clickable);
    pushUnique(match.rawEl);
    if (match.clickable && match.clickable.querySelectorAll) {
      match.clickable.querySelectorAll("[onclick], button, a, [role='button']").forEach(pushUnique);
    }

    for (const t of targets) {
      try { t.scrollIntoView({ behavior: "instant", block: "center" }); } catch (_) {}
      try { t.click(); } catch (_) {}
    }
  }

  function findAllClassesEl() {
    const studyEl = document.getElementById("study-view");
    if (!studyEl) return null;
    for (const item of studyEl.querySelectorAll(".offering-item")) {
      if (norm(item.innerText).includes("all classes")) return item;
    }
    for (const el of studyEl.querySelectorAll("button, a, div, span")) {
      if (el.children.length <= 4 && norm(el.innerText) === "all classes") {
        return el.closest(".offering-item") || el;
      }
    }
    return null;
  }

  function isOnStudyViewReady() {
    return getActiveViewId() === "#study-view" && !!findAllClassesEl();
  }

  function waitFor(predicate, { timeout = 25000, interval = 200, label = "Condition", progressEveryMs = 3500 } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let lastProgress = start;
      let done = false;
      let lastDiag = "";

      const finish = (fn, v) => {
        if (done) return;
        done = true;
        clearInterval(id);
        clearTimeout(safety);
        fn(v);
      };

      const step = () => {
        if (done) return;
        try {
          const res = predicate();
          if (typeof res === "string" && res.startsWith("DIAG:")) {
            lastDiag = res.slice(5);
          } else if (res) {
            finish(resolve, res);
            return;
          }
        } catch (err) {
          lastDiag = err && err.message ? err.message : String(err);
        }

        const now = Date.now();
        if (now - lastProgress >= progressEveryMs) {
          lastProgress = now;
          updateMiniScreen(`Waiting: ${label}`, undefined, lastDiag || "Polling...");
          log(`Waiting [${label}] (${Math.round((now - start) / 1000)}s)${lastDiag ? `: ${lastDiag}` : ""}`);
        }
        if (now - start >= timeout) {
          finish(reject, new Error(`Timeout [${label}]${lastDiag ? ` (${lastDiag})` : ""}`));
        }
      };

      const id = setInterval(step, interval);
      const safety = setTimeout(() => {
        finish(reject, new Error(`Timeout [${label}]${lastDiag ? ` (${lastDiag})` : ""}`));
      }, timeout + 500);
      step();
    });
  }

  async function waitForViewSettled(viewId, itemSelector, label, timeout = 25000) {
    let lastSig = "";
    let stableSince = 0;

    return waitFor(
      () => {
        const el = document.getElementById(viewId.replace(/^#/, ""));
        if (!el || !isViewOpen(viewId)) return `DIAG:${viewId} not active (now ${getActiveViewId()})`;
        if (hasLoadingSpinner(el)) {
          stableSince = 0;
          return `DIAG:Spinner in ${viewId}`;
        }

        const items = Array.from(el.querySelectorAll(itemSelector)).filter(
          (n) => isVisible(n) && norm(n.innerText).length > 0
        );
        if (items.length === 0) {
          stableSince = 0;
          return `DIAG:No rendered items in ${viewId}`;
        }

        const sig = `${items.length}:${(items[0].innerText || "").trim().slice(0, 25)}:${(items[items.length - 1].innerText || "").trim().slice(0, 25)}`;
        const now = Date.now();
        if (sig !== lastSig) {
          lastSig = sig;
          stableSince = now;
          return `DIAG:Rendering ${items.length} items in ${viewId}`;
        }
        if (now - stableSince < 450) {
          return `DIAG:Confirming list settled in ${viewId}`;
        }
        return items;
      },
      { timeout, interval: 220, label }
    );
  }

  hud.querySelector("#pw-cp-logs").onclick = () => {
    navigator.clipboard
      ?.writeText(fullLog)
      .then(() => log("Logs copied."))
      .catch(() => log("Copy blocked."));
  };

  hud.querySelector("#pw-clear-q").onclick = () => {
    if (isCrawling) return log("Cannot clear while crawling.");
    queue.forEach((item) => {
      if (item.cardEl) item.cardEl.style.outline = "";
    });
    queue = [];
    updateQueueBadge();
    log("Queue cleared.");
  };

  hud.querySelector("#pw-dbg-view").onclick = () => {
    const viewEl = getActiveViewEl();
    const texts = Array.from(viewEl.querySelectorAll("button, a, div, span, h1, h2, h3, h4, h5"))
      .filter((el) => isVisible(el) && el.children.length <= 3)
      .map((el) => (el.innerText || "").trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .slice(0, 8);
    log(`View=${getActiveViewId()} | StudyReady=${isOnStudyViewReady()} | Sample=[${texts.join(" | ")}]`);
  };

  vaultBox.querySelector("#pw-copy-link").onclick = () => {
    if (!lastCapturedUrl) return log("No captured link.");
    navigator.clipboard?.writeText(lastCapturedUrl).then(() => log("Link copied."));
  };

  vaultBox.querySelector("#pw-resend-tg").onclick = async () => {
    if (!lastCapturedUrl) return log("No captured link.");
    if (!currentBatchShortName && isOnStudyViewReady()) {
      detectBatchNameFromStudyView();
    }
    const cmd = buildTgCommandText(lastCapturedUrl);
    const tgMsg = formatTgMessage(lastCapturedTitle, lastCapturedSubject, lastCapturedUrl);
    const ok = await sendTelegram(tgMsg, { parseMode: "Markdown" });
    if (ok) log(`Sent  Command  To  TG   :   ${cmd}`);
  };


  function findScheduleCard(target) {
    const viewEl = getActiveViewEl();
    let curr = target;
    let steps = 0;
    let fallback = null;

    while (curr && curr !== viewEl && curr !== document.body && steps < 15) {
      const txt = (curr.innerText || "").trim();
      if (txt.includes("•") && txt.length >= 15 && txt.length <= 1600) {
        if (!fallback) fallback = curr;
        if (/\b(watch|resume|notes\s*&\s*more|view\s*note)\b/i.test(txt)) {
          return curr;
        }
      }
      curr = curr.parentElement;
      steps++;
    }
    return fallback;
  }

  function parseScheduleCard(card) {
    const lines = (card.innerText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const metaLine = lines.find((l) => l.includes("•")) || "";
    const subject = metaLine.includes("•") ? metaLine.split("•").slice(1).join("•").trim() : "";

    const titleLines = lines.filter(
      (l) =>
        l !== metaLine &&
        !/^\d{1,2}:\d{2}$/.test(l) &&
        !/^\d+\s*h(?:\s*\d+\s*m)?$/i.test(l) &&
        !/^(watch|resume|notes\s*&\s*more|view\s*note)$/i.test(l)
    );

    return { subject, title: titleLines[0] || "", metaLine };
  }

  document.addEventListener(
    "click",
    (e) => {
      if (isCrawling) return;
      if (hud.contains(e.target) || vaultBox.contains(e.target)) return;
      if (getActiveViewId() !== "#weekly-schedule-view") return;

      const card = findScheduleCard(e.target);
      if (!card) return;

      const { subject, title } = parseScheduleCard(card);
      if (!subject || !title) {
        log(`Ignored tap: missing ${!subject ? "subject" : "title"}.`);
        return;
      }

      const key = `${norm(subject)}::${norm(title)}`;
      if (queue.some((q) => q.key === key)) {
        log(`Duplicate skipped: ${title}`);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      card.style.outline = "2px solid #00ff88";
      queue.push({ key, subject, title, cardEl: card });
      updateQueueBadge();
      log(`Queued [${subject}]: ${title}`);
    },
    true
  );


  async function ensureStudyViewWithAllClasses() {
    if (isOnStudyViewReady()) {
      const bShort = detectBatchNameFromStudyView();
      updateMiniScreen("Study View Ready", "#study-view", bShort || "All Classes present");
      return true;
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      if (isOnStudyViewReady()) {
        const bShort = detectBatchNameFromStudyView();
        updateMiniScreen("Study View Ready", "#study-view", bShort || "All Classes present");
        return true;
      }
      const before = getActiveViewId();
      const viewEl = getActiveViewEl();
      const backBtn =
        viewEl?.querySelector(".breadcrumb-pw .back-btn, .back-btn, button[aria-label*='back' i]") ||
        document.querySelector(".view-section.active-view .back-btn");

      if (backBtn && isVisible(backBtn)) {
        log(`Back (${attempt + 1}) from ${before}`);
        updateMiniScreen(`Back from ${before}`, before, `Attempt ${attempt + 1}`);
        backBtn.click();
      } else if (typeof window.nav === "function") {
        log(`nav("study-view") from ${before}`);
        updateMiniScreen("nav -> #study-view", "#study-view", "Fallback nav");
        window.nav("study-view");
      }

      await sleep(350);
      if (isOnStudyViewReady()) {
        const bShort = detectBatchNameFromStudyView();
        updateMiniScreen("Study View Ready", "#study-view", bShort || "All Classes present");
        return true;
      }
    }

    if (typeof window.nav === "function") {
      window.nav("study-view");
      await sleep(400);
    }
    const ok = isOnStudyViewReady();
    const bShort = ok ? detectBatchNameFromStudyView() : "";
    updateMiniScreen(ok ? "Study View Ready" : "Study View Missing", getActiveViewId(), bShort);
    return ok;
  }


  async function returnToWeeklySchedule() {
    if (getActiveViewId() === "#weekly-schedule-view") {
      updateMiniScreen("On Weekly Schedule", "#weekly-schedule-view", "Idle");
      return;
    }
    const onStudy = await ensureStudyViewWithAllClasses();
    if (onStudy) {
      const schedBtn = Array.from(document.querySelectorAll("#study-view button, #study-view a, #study-view div"))
        .find((el) => isVisible(el) && norm(el.innerText).includes("view weekly schedule"));
      if (schedBtn) {
        schedBtn.click();
        await sleep(350);
      } else if (typeof window.openWeeklySchedule === "function") {
        window.openWeeklySchedule();
        await sleep(350);
      } else if (typeof window.nav === "function") {
        window.nav("weekly-schedule-view");
        await sleep(350);
      }
    }
    updateMiniScreen("Returned to Weekly Schedule", getActiveViewId(), "Ready");
  }

  function scoreMatch(candidateText, queryText) {
    const cNorm = norm(candidateText);
    const qNorm = norm(queryText);
    if (!cNorm || !qNorm) return 0;
    if (cNorm === qNorm) return 1000;
    if (cNorm.includes(qNorm)) return 700;
    if (qNorm.includes(cNorm) && cNorm.length >= 5) return 500;

    const qWords = keywords(queryText);
    if (qWords.length === 0) return 0;

    let hits = 0;
    for (const w of qWords) {
      if (cNorm.includes(w)) hits++;
    }
    return hits > 0 ? hits * 100 : 0;
  }

  function findBestClickable(viewId, selector, queryText, minScore = 100) {
    const viewEl = document.getElementById(viewId.replace(/^#/, "")) || getActiveViewEl();
    if (!viewEl || !isViewOpen(viewId)) return null;
    const candidates = Array.from(viewEl.querySelectorAll(selector)).filter(
      (el) => isVisible(el) && norm(el.innerText).length > 0
    );
    let bestEl = null;
    let bestScore = 0;

    for (const el of candidates) {
      const sc = scoreMatch((el.innerText || "").trim(), queryText);
      if (sc > bestScore) {
        bestScore = sc;
        bestEl = el;
      }
    }

    if (!bestEl || bestScore < minScore) return null;
    const clickable =
      bestEl.closest(".offering-item, .list-card, .card-custom, .content-card, button, a, [role='button']") ||
      bestEl;
    return { rawEl: bestEl, clickable, text: (bestEl.innerText || "").trim(), score: bestScore };
  }

  async function clickAndWaitForNextView(fromViewId, fromSelector, queryText, nextViewId, nextSelector, label, minScore = 100) {
    updateMiniScreen(`Loading ${fromViewId}...`, fromViewId, label);
    await waitForViewSettled(fromViewId, fromSelector, `Load ${fromViewId}`, 25000);

    const getMatch = () => findBestClickable(fromViewId, fromSelector, queryText, minScore);
    const firstMatch = await waitFor(
      () => getMatch() || `DIAG:No match for "${queryText}" in ${fromViewId}`,
      { timeout: 15000, interval: 220, label: `Match ${label}` }
    );

    clickCardThoroughly(firstMatch);
    updateMiniScreen(`Clicked ${label}`, nextViewId, firstMatch.text.replace(/\s+/g, " ").slice(0, 36));
    log(`Clicked ${label}: "${firstMatch.text.replace(/\s+/g, " ").slice(0, 35)}" (score ${firstMatch.score})`);

    const movedFirst = await waitFor(
      () => (isViewOpen(nextViewId) ? true : `DIAG:Waiting for ${nextViewId} (now ${getActiveViewId()})`),
      { timeout: 6000, interval: 220, label: `Open ${nextViewId}`, progressEveryMs: 3000 }
    ).catch(() => false);

    if (!movedFirst) {
      const freshMatch = getMatch() || firstMatch;
      log(`Re-clicking ${label} (view still ${getActiveViewId()})...`);
      clickCardThoroughly(freshMatch);
      await waitFor(
        () => (isViewOpen(nextViewId) ? true : `DIAG:Still ${getActiveViewId()}`),
        { timeout: 6000, interval: 220, label: `Retry ${nextViewId}`, progressEveryMs: 3000 }
      );
    }

    const settled = await waitForViewSettled(nextViewId, nextSelector, `Settle ${nextViewId}`, 25000);
    updateMiniScreen(`Settled ${nextViewId}`, nextViewId, `${settled.length} items`);
    return settled;
  }

  function findLectureDownloadTarget(lectureTitle) {
    const viewEl = document.getElementById("content-view") || getActiveViewEl();
    if (!viewEl || !isViewOpen("#content-view")) return { error: "#content-view not active" };
    if (hasLoadingSpinner(viewEl)) return { error: "Loading lectures" };

    const cards = Array.from(viewEl.querySelectorAll(".content-card, .list-group-custom > div")).filter(isVisible);
    if (cards.length === 0) return { error: "0 content cards" };

    let bestCard = null;
    let bestScore = 0;

    for (const card of cards) {
      const sc = scoreMatch(card.innerText || "", lectureTitle);
      if (sc > bestScore) {
        bestScore = sc;
        bestCard = card;
      }
    }

    if (!bestCard || bestScore < 100) {
      return { error: `No match for "${lectureTitle}"` };
    }

    const dlLink = bestCard.querySelector("a[href*='downloader'], a[href*='videoId']");
    if (dlLink) return { card: bestCard, dlEl: dlLink, href: dlLink.href || "" };

    const dlBtn = bestCard.querySelector(".btn-download, button[class*='download' i], a[class*='download' i]");
    if (dlBtn) return { card: bestCard, dlEl: dlBtn, href: dlBtn.href || "" };

    return { error: "Download button missing" };
  }


  function findSignedM3u8FromPerformance() {
    try {
      const entries = performance.getEntriesByType("resource") || [];
      const m3u8Entries = entries
        .map((e) => e?.name || "")
        .filter((name) => name.includes(".m3u8") || name.includes("master.mpd"));

      log(`[NET-PERF] Found ${m3u8Entries.length} manifest entries in performance resources.`);
      for (let i = m3u8Entries.length - 1; i >= 0; i--) {
        const name = m3u8Entries[i];
        log(`[NET-PERF-ENTRY] ${name}`);
        if (name.includes(".m3u8") && (name.includes("Signature=") || name.includes("proxy.studyparcham.in"))) {
          const normalized = name.replace(/\/hls\/[^/]+\/main\.m3u8/i, "/master.m3u8");
          log(`[NET-PERF-PICKED] ${normalized}`);
          return normalized;
        }
      }
    } catch (err) {
      log(`[NET-PERF-ERR] ${err.message}`);
    }
    return "";
  }

  function cleanStreamUrl(rawUrl) {
    log(`[CLEAN-IN-RAW] ${rawUrl || "(empty)"}`);
    if (!rawUrl) return "";
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const paramUrl = parsed.searchParams.get("url");
      const decodedTarget = paramUrl ? decodeURIComponent(paramUrl) : rawUrl;
      log(`[CLEAN-PARAM-URL] ${paramUrl || "(none)"}`);
      log(`[CLEAN-DECODED] ${decodedTarget}`);

      const streamUrl = new URL(decodedTarget, window.location.origin);
      const beforePath = streamUrl.pathname;
      const beforeSearch = streamUrl.search || "(no-query)";

      streamUrl.pathname = streamUrl.pathname.replace(
        /(\/hls\/[^/]+\/main\.m3u8|\/master\.mpd)$/i,
        "/master.m3u8"
      );

      if (
        streamUrl.hostname === "d1d34p8vz63oiq.cloudfront.net" &&
        !streamUrl.pathname.startsWith("/d1d34p8vz63oiq.cloudfront.net/")
      ) {
        streamUrl.protocol = "https:";
        streamUrl.host = "proxy.studyparcham.in";
        streamUrl.pathname = `/d1d34p8vz63oiq.cloudfront.net${streamUrl.pathname}`;
      }

      log(`[CLEAN-PARTS] path: "${beforePath}" -> "${streamUrl.pathname}" | query: "${beforeSearch}" -> "${streamUrl.search || "(no-query)"}"`);

      let built = streamUrl.toString();
      if (!streamUrl.search) {
        const perfSigned = findSignedM3u8FromPerformance();
        if (perfSigned) {
          built = perfSigned;
        } else {
          log(`[CLEAN-NO-SIG] No ?Signature= found in decoded URL or current tab network entries.`);
        }
      }

      log(`[CLEAN-FINAL] ${built}`);
      return built;
    } catch (err) {
      const fallback = String(rawUrl).replace(/(\/hls\/[^/?]+\/main\.m3u8|\/master\.mpd)/i, "/master.m3u8");
      log(`[CLEAN-CATCH] err=${err.message} -> fallback="${fallback}"`);
      return fallback;
    }
  }


  function extractSignedFromUrl(candidateUrl) {
    if (!candidateUrl || typeof candidateUrl !== "string") return "";
    if (candidateUrl.includes(".m3u8") && candidateUrl.includes("Signature=")) {
      return candidateUrl.replace(/\/hls\/[^/]+\/main\.m3u8/i, "/master.m3u8");
    }
    return "";
  }

  function attachDownloaderSnifferToWindow(win) {
    if (!win || win.__pwSnifferAttached) return;
    win.__pwSnifferAttached = true;

    const handleCandidate = (u, src) => {
      if (!u || typeof u !== "string") return;
      if (u.includes(".m3u8") || u.includes("master.mpd") || u.includes("proxy.studyparcham.in")) {
        log(`[DL-NET-${src}] ${u}`);
      }
      const signed = extractSignedFromUrl(u);
      if (signed) {
        latestDownloaderUrl = signed;
        log(`[DL-SIGNED-CAPTURED] ${signed}`);
      }
    };

    try {
      const entries = win.performance?.getEntriesByType?.("resource") || [];
      for (const e of entries) handleCandidate(e?.name || "", "PERF");
    } catch (_) {}

    try {
      if (typeof win.PerformanceObserver === "function") {
        const obs = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            handleCandidate(entry?.name || "", "OBS");
          }
        });
        obs.observe({ entryTypes: ["resource"] });
      }
    } catch (_) {}

    try {
      if (typeof win.fetch === "function") {
        const origF = win.fetch.bind(win);
        win.fetch = async function (...args) {
          const reqUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
          handleCandidate(reqUrl, "FETCH");
          return origF(...args);
        };
      }
    } catch (_) {}

    try {
      if (win.XMLHttpRequest) {
        const origOpen = win.XMLHttpRequest.prototype.open;
        win.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          handleCandidate(typeof url === "string" ? url : "", "XHR");
          return origOpen.call(this, method, url, ...rest);
        };
      }
    } catch (_) {}
  }


  let miniResizeTimer = null;

  function setMiniVaultExpanded(expanded) {
    if (!vaultBox) return;
    if (expanded) {
      vaultBox.style.width = "min(390px, calc(100vw - 28px))";
    } else {
      vaultBox.style.width = "min(310px, calc(100vw - 28px))";
    }
  }

  function fitMiniFrameToContent(frame) {
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight || 0,
        doc.body?.scrollHeight || 0,
        240
      );
      frame.style.height = `${Math.min(h + 8, Math.round(window.innerHeight * 0.65))}px`;
    } catch (_) {}
  }

  function removeMiniDownloaderFrame() {
    if (miniResizeTimer) {
      clearInterval(miniResizeTimer);
      miniResizeTimer = null;
    }
    const existing = document.getElementById("pw-mini-dl-frame");
    if (existing) existing.remove();
    setMiniVaultExpanded(false);
  }

  // Opens downloader inside an auto-sized mini-screen iframe on the same page/tab
  function openDownloaderInMiniScreen(dlUrl) {
    removeMiniDownloaderFrame();
    const screenBox = vaultBox.querySelector("#pw-vault-screen");
    if (!screenBox) return;

    setMiniVaultExpanded(true);

    const frame = document.createElement("iframe");
    frame.id = "pw-mini-dl-frame";
    frame.src = dlUrl;
    frame.scrolling = "no";
    frame.style.cssText =
      "width:100%;height:320px;border:1px solid #38bdf8;border-radius:8px;background:#0f172a;margin-top:6px;display:block;overflow:hidden;";
    frame.onload = () => {
      try {
        if (frame.contentWindow) {
          attachDownloaderSnifferToWindow(frame.contentWindow);
        }
        fitMiniFrameToContent(frame);
        miniResizeTimer = setInterval(() => fitMiniFrameToContent(frame), 400);
        setTimeout(() => {
          if (miniResizeTimer) {
            clearInterval(miniResizeTimer);
            miniResizeTimer = null;
          }
        }, 16000);
      } catch (err) {
        log(`[DL-FRAME-HOOK-ERR] ${err.message}`);
      }
    };
    screenBox.appendChild(frame);
  }


  const origWindowOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    if (typeof url === "string" && url.includes("downloader")) {
      latestDownloaderUrl = url;
      updateMiniScreen("Mini downloader loading", "/downloader", "Same-tab mini view");
      log(`[WINDOW-OPEN-INTERCEPTED] ${url}`);
      openDownloaderInMiniScreen(url);
      return null;
    }
    return origWindowOpen(url, target, features);
  };

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest?.("a[href]");
      if (a && a.href && a.href.includes("downloader")) {
        latestDownloaderUrl = a.href;
      }
    },
    true
  );


  async function processLecture(item, index, total) {
    lastCapturedTitle = item.title;
    lastCapturedSubject = item.subject;
    latestDownloaderUrl = "";
    setVaultStatus("RUNNING", item.title, "Extracting stream...", `[${index + 1}/${total}] Checking Study View`, undefined, item.subject);

    log(`[${index + 1}/${total}] ${item.title} (${item.subject})`);

    const ready = await ensureStudyViewWithAllClasses();
    if (!ready) {
      log(`Skip [${index + 1}/${total}]: All Classes not found on Study View.`);
      return;
    }

    log("Step 1: Opening All Classes...");
    await clickAndWaitForNextView(
      "#study-view",
      ".offering-item, button, a, div, span",
      "all classes",
      "#all-classes-view",
      "#subjects-grid .list-card, #subjects-grid > div",
      "All Classes",
      500
    );

    log(`Step 2: Selecting subject "${item.subject}"...`);
    await clickAndWaitForNextView(
      "#all-classes-view",
      "#subjects-grid .list-card, #subjects-grid > div",
      item.subject,
      "#chapters-view",
      "#chapters-list .list-card, #chapters-list > div",
      `Subject "${item.subject}"`,
      100
    );

    const chapQuery = keywords(item.title).join(" ") || norm(item.title);
    log(`Step 3: Selecting chapter for "${chapQuery}"...`);
    await clickAndWaitForNextView(
      "#chapters-view",
      "#chapters-list .list-card, #chapters-list > div",
      chapQuery,
      "#content-view",
      "#content-list .content-card, #content-list > div",
      `Chapter for "${item.title}"`,
      100
    );

    await waitForViewSettled("#content-view", "#content-list .content-card, #content-list > div", "Content list", 25000);

    log(`Step 4: Clicking download on "${item.title}"...`);
    updateMiniScreen("Triggering download...", "#content-view", item.title.slice(0, 35));
    const target = await waitFor(
      () => {
        const res = findLectureDownloadTarget(item.title);
        if (res.dlEl) return res;
        return `DIAG:${res.error || "No match"}`;
      },
      { timeout: 20000, interval: 220, label: `Download button for "${item.title}"` }
    );


    try { target.dlEl.scrollIntoView({ behavior: "instant", block: "center" }); } catch (_) {}
    target.dlEl.click();

    const initialDlUrl = await waitFor(
      () => latestDownloaderUrl || target.href || "",
      { timeout: 6000, interval: 150, label: "Downloader URL" }
    ).catch(() => "");

    if (initialDlUrl && !document.getElementById("pw-mini-dl-frame")) {
      openDownloaderInMiniScreen(initialDlUrl);
    }

    // Wait dynamically for signed .m3u8 inside mini downloader frame (up to 15s, no chunk download started)
    const signedOrRaw = await waitFor(
      () => {
        const frame = document.getElementById("pw-mini-dl-frame");
        if (frame && frame.contentWindow) {
          attachDownloaderSnifferToWindow(frame.contentWindow);
        }
        if (latestDownloaderUrl && latestDownloaderUrl.includes(".m3u8") && latestDownloaderUrl.includes("Signature=")) {
          return latestDownloaderUrl;
        }
        return `DIAG:Waiting for signed .m3u8 in mini downloader`;
      },
      { timeout: 15000, interval: 300, label: "Signed stream URL in mini downloader", progressEveryMs: 4000 }
    ).catch(() => initialDlUrl || latestDownloaderUrl || "");

    const cleaned = cleanStreamUrl(signedOrRaw);
    removeMiniDownloaderFrame();

    log(`[  URL - COMPARE  ]   Raw  =  "  ${signedOrRaw}  "   |   Cleaned  =  "  ${cleaned}  "`);
    if (cleaned) {
      const hasSig = cleaned.includes("Signature=");
      setVaultStatus("CAPTURED", item.title, cleaned, "Link ready", "/downloader", hasSig ? "Signed query intact" : "Base URL fallback");
      if (!sentUrls.has(cleaned)) {
      if (isOnStudyViewReady()) detectBatchNameFromStudyView();
        const tgCmd = buildTgCommandText(cleaned);
        const tgMsg = formatTgMessage(item.title, item.subject, cleaned);
        const ok = await sendTelegram(tgMsg, { parseMode: "Markdown" });
        if (ok) {
          sentUrls.add(cleaned);
          log(`Step - 5  :  Sent  Command  To  Telegram${hasSig ? "  (  with  Signature  )  "  :   ""}: ${tgCmd}`);
        }
      } else {
        log("Step - 5  :  Duplicate  Link  Skipped  .");
      }
    } else {
      setVaultStatus("NO_URL", item.title, "Downloader URL not captured", "URL missing", "#content-view");
      log("Warning  :  Downloader  URL  Not  Captured  .");
    }

    log("Step - 6  :  Returning  To  Study  View   🕊️  .......");
    await ensureStudyViewWithAllClasses();
  }

  hud.querySelector("#pw-start-btn").onclick = async () => {
    if (isCrawling) return log("Crawl already running.");
    if (queue.length === 0) return alert("Tap lectures on Weekly Schedule first.");

    isCrawling = true;
    const startBtn = hud.querySelector("#pw-start-btn");
    startBtn.disabled = true;
    startBtn.style.opacity = "0.6";

    for (let i = 0; i < queue.length; i++) {
      try {
        await processLecture(queue[i], i, queue.length);
      } catch (err) {
        log(`Error [${i + 1}/${queue.length}]: ${err.message}`);
        await ensureStudyViewWithAllClasses().catch(() => {});
      }
    }

    await returnToWeeklySchedule().catch(() => {});
    setVaultStatus("DONE", lastCapturedTitle, lastCapturedUrl, "All items processed", "#weekly-schedule-view", "Completed");
    log("All queued items processed.");
    isCrawling = false;
    startBtn.disabled = false;
    startBtn.style.opacity = "1";
  };
})();
