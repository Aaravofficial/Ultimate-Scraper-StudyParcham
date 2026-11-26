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
    String(s)
      .replace(/\s+/g, " ")
      .replace(/[|•–—:()\[\]{}.,!?/\\-]+/g, " ")
      .trim()
      .toLowerCase();

  const keywords = (s = "") =>
    norm(s)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

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
      1. On Weekly Schedule, tap lectures to queue.<br>
      2. Tap Start Crawl to fetch & send links to TG.
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button id="pw-cp-logs" style="flex:1;background:#00ff88;color:#000;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">📋 Copy Logs</button>
      <button id="pw-start-btn" style="flex:1;background:#ef4444;color:#fff;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">▶️ Start Crawl</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button id="pw-clear-q" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🗑️ Clear Q</button>
      <button id="pw-dbg-view" style="flex:1;background:#1e293b;color:#38bdf8;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🔍 View Info</button>
    </div>
    <div id="pw-log-box" style="max-height:185px;overflow-y:auto;margin-top:8px;border-top:1px solid #1e293b;padding-top:6px;font-size:11px;line-height:1.35;color:#cbd5e1;"></div>
  `;
  document.body.appendChild(hud);

  const vaultBox = document.createElement("div");
  vaultBox.id = "pw-vault-mini";
  vaultBox.style.cssText =
    "position:fixed;bottom:14px;right:14px;background:#0b1120;color:#f8fafc;padding:12px;z-index:2147483646;border:2px solid #38bdf8;border-radius:10px;font-family:monospace;width:280px;max-width:calc(100vw - 28px);font-size:11px;box-shadow:0 0 18px rgba(56,189,248,0.25);";
  vaultBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <b style="color:#38bdf8;">🔗 Stream Vault</b>
      <span id="pw-vault-state" style="color:#facc15;font-weight:bold;">IDLE</span>
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

  function setVaultStatus(state, title, url) {
    if (state) vaultStateEl.textContent = state;
    if (title !== undefined) {
      lastCapturedTitle = title;
      vaultTitleEl.textContent = title || "Untitled";
    }
    if (url !== undefined) {
      lastCapturedUrl = url;
      vaultUrlEl.textContent = url || "None";
    }
  }

  function updateQueueBadge() {
    qBadge.textContent = `Q: ${queue.length}`;
  }

  async function sendTelegram(text) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return true;
    } catch (err) {
      log(`Telegram error: ${err.message}`);
      return false;
    }
  }

  function waitFor(predicate, { timeout = 25000, interval = 200, label = "Condition", progressEveryMs = 4000 } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let lastProgress = start;
      let settled = false;
      let lastDiag = "";

      const finish = (fn, val) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        fn(val);
      };

      const poll = () => {
        if (settled) return;
        try {
          const out = predicate();
          if (typeof out === "string" && out.startsWith("DIAG:")) {
            lastDiag = out.slice(5);
          } else if (out) {
            finish(resolve, out);
            return;
          }
        } catch (err) {
          lastDiag = err && err.message ? err.message : String(err);
        }

        const now = Date.now();
        if (now - lastProgress >= progressEveryMs) {
          lastProgress = now;
          log(`Waiting [${label}] (${Math.round((now - start) / 1000)}s)${lastDiag ? `: ${lastDiag}` : ""}`);
        }

        if (now - start >= timeout) {
          const extra = lastDiag ? ` (${lastDiag})` : "";
          finish(reject, new Error(`Timeout waiting for ${label}${extra}`));
        }
      };

      poll();
      const timer = setInterval(poll, interval);
    });
  }

  function isVisible(el) {
    if (!el) return false;
    const st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function hasLoadingSpinner(container) {
    const scope = container || document;
    return Array.from(scope.querySelectorAll(".fa-spinner, .spinner-border, [class*='spinner' i], [class*='loader' i]")).some(isVisible);
  }

  function getActiveViewEl() {
    const active = document.querySelector(".view-section.active-view");
    if (active && isVisible(active)) return active;
    const visible = Array.from(document.querySelectorAll(".view-section")).find(isVisible);
    return visible || document.body;
  }

  function getActiveViewId() {
    const el = getActiveViewEl();
    if (el && el.id) return `#${el.id}`;
    return window.location.hash || "";
  }

  function hasAllClassesInStudyView() {
    const studyEl = document.getElementById("study-view");
    if (!studyEl || !isVisible(studyEl)) return false;
    const items = Array.from(studyEl.querySelectorAll(".offering-item, button, a, div, span"));
    return items.some((el) => isVisible(el) && el.children.length <= 4 && norm(el.innerText) === "all classes");
  }

  function isOnStudyViewReady() {
    return getActiveViewId() === "#study-view" && hasAllClassesInStudyView();
  }

  hud.querySelector("#pw-cp-logs").onclick = () => {
    navigator.clipboard
      ?.writeText(fullLog)
      .then(() => log("Logs copied."))
      .catch(() => log("Copy blocked."));
  };

  hud.querySelector("#pw-clear-q").onclick = () => {
    if (isCrawling) {
      log("Cannot clear while crawling.");
      return;
    }
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
    const ok = await sendTelegram(
      `${lastCapturedTitle || "Lecture"}\nSubject: ${lastCapturedSubject || "General"}\n\n/s1 ${lastCapturedUrl}`
    );
    if (ok) log("Sent link to TG.");
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
    const afterBullet = metaLine.includes("•") ? metaLine.split("•").slice(1).join("•").trim() : "";
    const subject = afterBullet;

    const titleLines = lines.filter(
      (l) =>
        l !== metaLine &&
        !/^\d{1,2}:\d{2}$/.test(l) &&
        !/^\d+\s*h(?:\s*\d+\s*m)?$/i.test(l) &&
        !/^(watch|resume|notes\s*&\s*more|view\s*note)$/i.test(l)
    );

    const title = titleLines[0] || "";
    return { subject, title, metaLine };
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

  async function stepBackOnce() {
    const before = getActiveViewId();
    const viewEl = getActiveViewEl();
    const backBtn =
      viewEl?.querySelector(".breadcrumb-pw .back-btn, .back-btn, button[aria-label*='back' i]") ||
      document.querySelector(".view-section.active-view .back-btn");

    if (backBtn && isVisible(backBtn)) {
      log(`Clicking back in ${before}`);
      backBtn.click();
    } else if (typeof window.nav === "function") {
      const map = {
        "#chapters-view": "all-classes-view",
        "#content-view": "chapters-view",
        "#weekly-schedule-view": "study-view",
        "#all-classes-view": "study-view"
      };
      log(`Calling nav("${map[before] || "study-view"}")`);
      window.nav(map[before] || "study-view");
    }

    await waitFor(
      () => getActiveViewId() !== before || isOnStudyViewReady() || "DIAG:View still " + getActiveViewId(),
      { timeout: 8000, interval: 150, label: `Back from ${before}` }
    ).catch((e) => log(e.message));
  }

  async function ensureStudyViewWithAllClasses() {
    if (isOnStudyViewReady()) return true;

    for (let i = 0; i < 6; i++) {
      if (isOnStudyViewReady()) return true;
      await stepBackOnce();
    }

    if (!isOnStudyViewReady() && typeof window.nav === "function") {
      window.nav("study-view");
      await waitFor(
        () => isOnStudyViewReady() || "DIAG:Waiting for #study-view",
        { timeout: 10000, interval: 200, label: "Study view with All Classes" }
      ).catch((e) => log(e.message));
    }

    return isOnStudyViewReady();
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

  async function clickBestCandidateInView(viewId, selector, queryText, label, minScore = 100) {
    return waitFor(
      () => {
        const viewEl = document.getElementById(viewId.replace(/^#/, "")) || getActiveViewEl();
        if (!viewEl || !isVisible(viewEl)) return `DIAG:${viewId} not visible`;
        if (hasLoadingSpinner(viewEl)) return `DIAG:Spinner active in ${viewId}`;

        const candidates = Array.from(viewEl.querySelectorAll(selector)).filter(isVisible);
        if (candidates.length === 0) return `DIAG:0 visible (${selector}) in ${viewId}`;

        let bestEl = null;
        let bestScore = 0;

        for (const el of candidates) {
          const text = (el.innerText || "").trim();
          const sc = scoreMatch(text, queryText);
          if (sc > bestScore) {
            bestScore = sc;
            bestEl = el;
          }
        }

        if (!bestEl || bestScore < minScore) {
          return `DIAG:No match >=${minScore} for "${queryText}" in ${viewId}`;
        }

        const clickable =
          bestEl.closest(".offering-item, .list-card, .card-custom, .content-card, button, a, [role='button']") ||
          bestEl;
        clickable.scrollIntoView({ behavior: "instant", block: "center" });
        clickable.click();
        log(`Clicked ${label} (score ${bestScore}): ${(bestEl.innerText || "").trim().slice(0, 45)}`);
        return bestEl;
      },
      { timeout: 25000, interval: 220, label }
    );
  }

  function findLectureDownloadTarget(lectureTitle) {
    const viewEl = document.getElementById("content-view") || getActiveViewEl();
    if (!viewEl || !isVisible(viewEl)) return { error: "#content-view not visible" };
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
      return { error: `No card match for "${lectureTitle}"` };
    }

    const dlLink = bestCard.querySelector("a[href*='downloader'], a[href*='videoId']");
    if (dlLink) return { card: bestCard, dlEl: dlLink, href: dlLink.href || "" };

    const dlBtn = bestCard.querySelector(".btn-download, button[class*='download' i], a[class*='download' i]");
    if (dlBtn) return { card: bestCard, dlEl: dlBtn, href: dlBtn.href || "" };

    return { error: "Download button missing on card" };
  }

  function cleanStreamUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
      const u = new URL(rawUrl, window.location.origin);
      const paramUrl = u.searchParams.get("url");
      const target = paramUrl ? decodeURIComponent(paramUrl) : rawUrl;
      return target.replace(/\/(hls\/[^?]+|master\.mpd)(\?.*)?$/i, "/master.m3u8");
    } catch (_) {
      return String(rawUrl).replace(/\/(hls\/[^?]+|master\.mpd)(\?.*)?$/i, "/master.m3u8");
    }
  }

  const origWindowOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    if (typeof url === "string" && url.includes("downloader")) {
      latestDownloaderUrl = url;
      const cleaned = cleanStreamUrl(url);
      if (cleaned) {
        setVaultStatus("CAPTURED", lastCapturedTitle, cleaned);
        log("Captured downloader URL via window.open");
      }
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
    setVaultStatus("RUNNING", item.title, "Starting step flow...");

    log(`[${index + 1}/${total}] ${item.title} (${item.subject})`);

    const ready = await ensureStudyViewWithAllClasses();
    if (!ready) {
      log(`Skip [${index + 1}/${total}]: not on Study View.`);
      return;
    }

    log("Step 1: Opening All Classes...");
    await clickBestCandidateInView("#study-view", ".offering-item, button, a, div, span", "all classes", "All Classes", 500);
    await waitFor(
      () => {
        const v = document.getElementById("all-classes-view");
        if (!v || !isVisible(v)) return "DIAG:Waiting for #all-classes-view";
        if (hasLoadingSpinner(v)) return "DIAG:Loading subjects";
        const subs = Array.from(v.querySelectorAll(".list-card, #subjects-grid > div")).filter(isVisible);
        return subs.length > 0 || "DIAG:Subjects list empty";
      },
      { timeout: 25000, interval: 200, label: "Subjects list" }
    );

    log(`Step 2: Selecting subject "${item.subject}"...`);
    await clickBestCandidateInView("#all-classes-view", ".list-card, #subjects-grid > div", item.subject, `Subject "${item.subject}"`, 100);
    await waitFor(
      () => {
        const v = document.getElementById("chapters-view");
        if (!v || !isVisible(v)) return "DIAG:Waiting for #chapters-view";
        if (hasLoadingSpinner(v)) return "DIAG:Loading chapters";
        const chs = Array.from(v.querySelectorAll("#chapters-list .list-card, #chapters-list > div")).filter(isVisible);
        return chs.length > 0 || "DIAG:Chapters list empty";
      },
      { timeout: 25000, interval: 200, label: "Chapters list" }
    );

    const chapQuery = keywords(item.title).join(" ") || norm(item.title);
    log(`Step 3: Selecting chapter matching "${chapQuery}"...`);
    await clickBestCandidateInView("#chapters-view", "#chapters-list .list-card, #chapters-list > div", chapQuery, `Chapter for "${item.title}"`, 100);
    await waitFor(
      () => {
        const v = document.getElementById("content-view");
        if (!v || !isVisible(v)) return "DIAG:Waiting for #content-view";
        if (hasLoadingSpinner(v)) return "DIAG:Loading lectures";
        const cards = Array.from(v.querySelectorAll(".content-card, .list-group-custom > div")).filter(isVisible);
        return cards.length > 0 || "DIAG:Content cards empty";
      },
      { timeout: 25000, interval: 200, label: "Chapter contents" }
    );

    log(`Step 4: Clicking download for "${item.title}"...`);
    const target = await waitFor(
      () => {
        const res = findLectureDownloadTarget(item.title);
        if (res.dlEl) return res;
        return `DIAG:${res.error || "No match"}`;
      },
      { timeout: 20000, interval: 200, label: `Download button for "${item.title}"` }
    );

    target.card.scrollIntoView({ behavior: "smooth", block: "center" });
    target.dlEl.click();

    const rawDlUrl = await waitFor(
      () => latestDownloaderUrl || target.href || "",
      { timeout: 6000, interval: 150, label: "Downloader URL" }
    ).catch(() => "");

    const cleaned = cleanStreamUrl(rawDlUrl);
    if (cleaned) {
      setVaultStatus("CAPTURED", item.title, cleaned);
      if (!sentUrls.has(cleaned)) {
        const ok = await sendTelegram(`${item.title}\nSubject: ${item.subject}\n\n/s1 ${cleaned}`);
        if (ok) {
          sentUrls.add(cleaned);
          log("Step 5: Sent cleaned link to Telegram.");
        }
      } else {
        log("Step 5: Link already sent; skipped.");
      }
    } else {
      setVaultStatus("NO_URL", item.title, "Downloader URL not captured");
      log("Warning: downloader URL not captured.");
    }

    log("Step 6: Returning to Study View...");
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

    setVaultStatus("DONE", lastCapturedTitle, lastCapturedUrl);
    log("All queued items processed.");
    isCrawling = false;
    startBtn.disabled = false;
    startBtn.style.opacity = "1";
  };
})();
