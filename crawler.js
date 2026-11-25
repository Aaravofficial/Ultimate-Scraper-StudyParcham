(function () {
  // Bot  Configuration  For  Sending  Cleaned  Stream  Links
  const BOT_TOKEN = "9094938339:AAGWney_azeyTCNdrqJrsUK15EHVeo9bOzI";
  const CHAT_ID = "-1004420381389";

  // Prevent  Duplicate  Script  Injection  On  Same  Page
  if (window.__pwCrawlerActive) {
    console.warn("PW  Crawler  Is  Already  Active   ⚠️  .......");
    return;
  }
  window.__pwCrawlerActive = true;

  // Normalize  Text  For  Reliable  Matching
  const norm = (s = "") =>
    s
      .replace(/\s+/g, " ")
      .replace(/[|•–—:()-]+/g, " ")
      .trim()
      .toLowerCase();

  // Dynamic  Condition  Poller  With  Safe  Cleanup
  function waitFor(predicate, { timeout = 12000, interval = 120, label = "Condition" } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let settled = false;

      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        fn(arg);
      };

      const check = () => {
        if (settled) return;
        try {
          const out = predicate();
          if (out) {
            finish(resolve, out);
            return;
          }
        } catch (_) {}

        if (Date.now() - start >= timeout) {
          finish(reject, new Error(`Timeout  Waiting  For  ${label}   ⚠️  .......`));
        }
      };

      check();
      const timer = setInterval(check, interval);
    });
  }

  // Locate  Currently  Visible  View  Section
  function getActiveViewEl() {
    const active = document.querySelector(".view-section.active-view");
    if (active) return active;

    const visible = Array.from(document.querySelectorAll(".view-section")).find((v) => {
      const st = window.getComputedStyle(v);
      return st.display !== "none" && st.visibility !== "hidden";
    });
    return visible || document.body;
  }

  // Read  Active  View  Identifier
  function getActiveViewId() {
    const el = getActiveViewEl();
    if (el && el.id) return `#${el.id}`;
    return window.location.hash || "";
  }

  // Send  Formatted  Message  To  Telegram  Bot
  async function sendTelegram(text) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text })
      });
      if (!resp.ok) throw new Error(`HTTP  ${resp.status}`);
      return true;
    } catch (err) {
      log(`Telegram  Send  Failed  (${err.message})   ⚠️  .......`);
      return false;
    }
  }

  // Create  Bottom-Left  Crawl  HUD  Mini  Screen
  const hud = document.createElement("div");
  hud.id = "pw-hud-panel";
  hud.style =
    "position:fixed;bottom:16px;left:16px;background:#05080f;color:#00ff88;padding:12px;z-index:2147483647;border:2px solid #00ff88;border-radius:10px;font-family:monospace;width:295px;max-width:calc(100vw - 32px);font-size:12px;box-shadow:0 0 18px rgba(0,255,136,0.28);";
  hud.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <b>🕵️‍♂️   Deep  Crawl  Ready  !!</b>
      <span id="pw-q-badge" style="color:#38bdf8;font-weight:bold;">Q:  0</span>
    </div>
    <div style="font-size:11px;color:#94a3b8;line-height:1.35;">
      1.  Tap  Lectures  On  Weekly  Schedule  .<br>
      2.  Tap  Start  Crawl  For  Smart  Run  .
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button id="pw-cp-logs" style="flex:1;background:#00ff88;color:#000;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">📋   Copy  Logs</button>
      <button id="pw-start-btn" style="flex:1;background:#ef4444;color:#fff;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">🪄   Start  Crawl</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:5px;">
      <button id="pw-clear-q" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🗑️   Clear  Queue</button>
      <button id="pw-dbg-view" style="flex:1;background:#1e293b;color:#38bdf8;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🔍   View  Debug</button>
    </div>
    <div id="pw-log-box" style="max-height:165px;overflow-y:auto;margin-top:8px;border-top:1px solid #1e293b;padding-top:6px;font-size:11px;line-height:1.35;color:#cbd5e1;"></div>
  `;
  document.body.appendChild(hud);

  // Create  Bottom-Right  Vault  &  Auto-Delete  Mini  Screen
  const vaultBox = document.createElement("div");
  vaultBox.id = "pw-vault-mini";
  vaultBox.style =
    "position:fixed;bottom:16px;right:16px;background:#0b1120;color:#f8fafc;padding:12px;z-index:2147483646;border:2px solid #38bdf8;border-radius:10px;font-family:monospace;width:275px;max-width:calc(100vw - 32px);font-size:11px;box-shadow:0 0 18px rgba(56,189,248,0.28);";
  vaultBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <b style="color:#38bdf8;">⚡   Vault  Monitor</b>
      <span id="pw-vault-state" style="color:#facc15;font-weight:bold;">IDLE</span>
    </div>
    <div id="pw-vault-title" style="color:#e2e8f0;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;">No  Active  Target  .</div>
    <div id="pw-vault-url" style="color:#94a3b8;word-break:break-all;max-height:54px;overflow-y:auto;background:#020617;padding:6px;border-radius:6px;border:1px solid #1e293b;">Waiting  For  Download  Action   ⏳  .......</div>
    <div style="display:flex;gap:6px;margin-top:7px;">
      <button id="pw-copy-link" style="flex:1;background:#0284c7;color:#fff;border:none;padding:5px;border-radius:5px;cursor:pointer;font-weight:bold;">🔗   Copy  Link</button>
      <button id="pw-resend-tg" style="flex:1;background:#16a34a;color:#fff;border:none;padding:5px;border-radius:5px;cursor:pointer;font-weight:bold;">🕊️   Send  TG</button>
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

  // Append  Formatted  Log  Line  To  HUD  &  Console
  function log(msg) {
    const stamp = new Date().toLocaleTimeString();
    const line = `[${stamp}]  >  ${msg}`;
    fullLog += line + "\n";
    const div = document.createElement("div");
    div.textContent = line;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
    console.log("[PW-CRAWLER]", line);
  }

  // Update  Bottom-Right  Vault  Mini  Screen
  function setVaultStatus(state, title, url) {
    if (state) vaultStateEl.textContent = state;
    if (title) {
      lastCapturedTitle = title;
      vaultTitleEl.textContent = title;
    }
    if (url) {
      lastCapturedUrl = url;
      vaultUrlEl.textContent = url;
    }
  }

  // Refresh  Queued  Lecture  Counter
  function updateQueueBadge() {
    qBadge.textContent = `Q:  ${queue.length}`;
  }

  // Copy  Full  Crawl  Logs
  hud.querySelector("#pw-cp-logs").onclick = () => {
    navigator.clipboard
      ?.writeText(fullLog)
      .then(() => log("Logs  Copied  Successfully   📋  ......."))
      .catch(() => log("Clipboard  Copy  Blocked   ⚠️  ......."));
  };

  // Clear  Selected  Schedule  Queue
  hud.querySelector("#pw-clear-q").onclick = () => {
    if (isCrawling) {
      log("Crawl  Is  Running   ⏳  .......");
      return;
    }
    queue.forEach((item) => {
      if (item.cardEl) item.cardEl.style.border = "";
    });
    queue = [];
    updateQueueBadge();
    log("Queue  Cleared  Successfully   🗑️  .......");
  };

  // Print  Current  View  Debug  Info
  hud.querySelector("#pw-dbg-view").onclick = () => {
    log(
      `Debug  View=${getActiveViewId()}  Hash=${window.location.hash}  AllClasses=${hasAllClassesInStudyView()}   🔍  .......`
    );
  };

  // Copy  Latest  Captured  Link
  vaultBox.querySelector("#pw-copy-link").onclick = () => {
    if (!lastCapturedUrl) {
      log("No  Link  Available  To  Copy   ⚠️  .......");
      return;
    }
    navigator.clipboard?.writeText(lastCapturedUrl).then(() => log("Stream  Link  Copied   🔗  ......."));
  };

  // Resend  Latest  Captured  Link  To  Telegram
  vaultBox.querySelector("#pw-resend-tg").onclick = async () => {
    if (!lastCapturedUrl) {
      log("No  Link  Available  For  Telegram   ⚠️  .......");
      return;
    }
    const ok = await sendTelegram(
      `**${lastCapturedTitle || "Lecture"}**\nSubject:  ${lastCapturedSubject || "General"}\n\n/s1  ${lastCapturedUrl}`
    );
    if (ok) log("Sent  Link  To  Telegram   🕊️  .......");
  };

  // Find  Schedule  Card  On  Weekly  Schedule  View
  function findScheduleCard(target) {
    const viewEl = getActiveViewEl();
    let curr = target;
    let steps = 0;
    let fallbackCard = null;

    while (curr && curr !== viewEl && curr !== document.body && steps < 14) {
      const txt = (curr.innerText || "").trim();
      const hasBullet = txt.includes("•");
      const reasonableSize = txt.length >= 15 && txt.length <= 1400;
      const hasAction = /\b(watch|resume|notes\s*&\s*more|view\s*note)\b/i.test(txt);

      if (hasBullet && reasonableSize) {
        if (!fallbackCard) fallbackCard = curr;
        if (hasAction) return curr;
      }

      curr = curr.parentElement;
      steps++;
    }

    return fallbackCard;
  }

  // Parse  Subject  &  Lecture  Title  From  Schedule  Card
  function parseScheduleCard(card) {
    const lines = (card.innerText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const metaLine = lines.find((l) => l.includes("•")) || "";
    const afterBullet = metaLine.includes("•") ? metaLine.split("•").slice(1).join("•").trim() : "";
    const subject = afterBullet.split(/\s+by\s+/i)[0].trim();

    const filtered = lines.filter(
      (l) =>
        l !== metaLine &&
        !/^\d{1,2}:\d{2}$/.test(l) &&
        !/^\d+\s*h(?:\s*\d+\s*m)?$/i.test(l) &&
        !/^(watch|resume|notes\s*&\s*more|view\s*note)$/i.test(l)
    );

    const title = filtered[0] || "";
    return { subject, title };
  }

  // Queue  Lectures  When  Tapped  On  Weekly  Schedule
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
        log("Ignored  Non-Lecture  Schedule  Row   ℹ️  .......");
        return;
      }

      const key = `${norm(subject)}::${norm(title)}`;
      if (queue.some((q) => q.key === key)) {
        log(`Already  In  Queue:  ${title}   ℹ️  .......`);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      card.style.border = "2px solid #00ff88";
      queue.push({ key, subject, title, cardEl: card });
      updateQueueBadge();
      log(`Queued  [${subject}]  ->  ${title}   ✅  .......`);
    },
    true
  );

  // Verify  All  Classes  Exists  Inside  Active  Study  View
  function hasAllClassesInStudyView() {
    const studyEl = document.getElementById("study-view");
    if (!studyEl) return false;
    const st = window.getComputedStyle(studyEl);
    const visible = studyEl.classList.contains("active-view") || st.display !== "none";
    if (!visible) return false;

    const offering = studyEl.querySelector(".offering-item");
    if (offering && norm(offering.innerText).includes("all classes")) {
      return true;
    }

    return Array.from(studyEl.querySelectorAll("button, a, div, span")).some(
      (el) => norm(el.innerText) === "all classes"
    );
  }

  // Confirm  Script  Is  On  Study  View  With  All  Classes  Present
  function isConfirmedOnStudyView() {
    return getActiveViewId() === "#study-view" && hasAllClassesInStudyView();
  }

  // Click  Active  View  Back  Button  Or  Direct  Navigation  Fallback
  async function clickActiveBackButton() {
    const beforeView = getActiveViewId();
    const viewEl = getActiveViewEl();

    const backBtn =
      viewEl?.querySelector(".breadcrumb-pw .back-btn, .back-btn, button[aria-label*='back' i]") ||
      document.querySelector(".view-section.active-view .back-btn");

    try {
      if (backBtn) {
        backBtn.click();
      }
    } catch (_) {}

    const changed = await waitFor(() => getActiveViewId() !== beforeView || isConfirmedOnStudyView(), {
      timeout: 1200,
      interval: 100,
      label: "Back  Transition"
    }).catch(() => false);

    if (!changed && typeof window.nav === "function") {
      try {
        if (beforeView === "#weekly-schedule-view" || beforeView === "#all-classes-view") {
          window.nav("study-view");
        } else if (beforeView === "#chapters-view") {
          window.nav("all-classes-view");
        } else if (beforeView === "#content-view") {
          window.nav("chapters-view");
        } else {
          window.nav("study-view");
        }
      } catch (_) {}

      await waitFor(() => getActiveViewId() !== beforeView || isConfirmedOnStudyView(), {
        timeout: 1500,
        interval: 100,
        label: "Fallback  Nav"
      }).catch(() => false);
    }
  }

  // Step  Back  Until  Study  View  And  All  Classes  Are  Confirmed
  async function returnToStudyAndVerifyAllClasses() {
    if (isConfirmedOnStudyView()) {
      log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
      return true;
    }

    log("Navigating  Back  To  Study  View   🪄  .......");
    let attempts = 0;
    const maxAttempts = 6;

    while (attempts < maxAttempts) {
      if (isConfirmedOnStudyView()) {
        log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
        return true;
      }

      attempts++;
      log(`Back  Attempt  ${attempts}  From  ${getActiveViewId()}   ↩️  .......`);
      await clickActiveBackButton();

      const confirmed = await waitFor(() => isConfirmedOnStudyView(), {
        timeout: 1200,
        interval: 120,
        label: "Study  View  Verify"
      }).catch(() => false);

      if (confirmed) {
        log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
        return true;
      }
    }

    if (isConfirmedOnStudyView()) {
      log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
      return true;
    }

    log("Failed  To  Confirm  All  Classes  On  Study  View   ⚠️  .......");
    return false;
  }

  // Click  Matching  Element  Inside  Active  View
  async function clickInActiveView(predicateFn, label, timeout = 15000) {
    return waitFor(
      () => {
        const viewEl = getActiveViewEl();
        const nodes = Array.from(viewEl.querySelectorAll("button, a, div, span, p, h1, h2, h3, h4"));
        const target = nodes.find((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          if (el.children.length > 5) return false;
          return predicateFn((el.innerText || "").trim(), el);
        });
        if (!target) return false;

        const clickable =
          target.closest(".offering-item, .list-card, .card-custom, button, a, [role='button']") || target;
        clickable.click();
        return true;
      },
      { timeout, interval: 150, label }
    );
  }

  // Find  Matching  Content  Card  And  Download  Button  On  Content  View
  function findContentCardAndDownload(lectureTitle) {
    const viewEl = document.getElementById("content-view") || getActiveViewEl();
    const targetNorm = norm(lectureTitle);
    const words = targetNorm.split(" ").filter((w) => w.length > 2);

    const cards = Array.from(viewEl.querySelectorAll(".content-card, .list-group-custom > div")).filter((el) => {
      const n = norm(el.innerText || "");
      if (!n) return false;
      if (n.includes(targetNorm)) return true;
      if (words.length >= 2) {
        const hits = words.filter((w) => n.includes(w)).length;
        return hits >= Math.min(3, words.length);
      }
      return false;
    });

    cards.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);

    for (const card of cards) {
      const link = card.querySelector("a[href*='downloader'], a[href*='videoId']");
      if (link && link.href) {
        return { card, dlEl: link, href: link.href };
      }
      const dlBtn = card.querySelector(".btn-download, button[class*='download' i], a[class*='download' i]");
      if (dlBtn) {
        return { card, dlEl: dlBtn, href: dlBtn.href || null };
      }
    }
    return null;
  }

  // Extract  And  Clean  Stream  Url  From  Downloader  Url
  function cleanStreamUrlFromDownloader(rawUrl) {
    if (!rawUrl) return "";
    try {
      const parsed = new URL(rawUrl);
      const paramUrl = parsed.searchParams.get("url");
      const candidate = paramUrl ? decodeURIComponent(paramUrl) : rawUrl;
      return candidate.replace(/\/(hls\/[^?]+|master\.mpd)(\?.*)?$/i, "/master.m3u8");
    } catch (_) {
      return rawUrl.replace(/\/(hls\/[^?]+|master\.mpd)(\?.*)?$/i, "/master.m3u8");
    }
  }

  // Run  Auto-Download,  Pause,  And  Auto-Delete  On  Same-Origin  Downloader  Document
  async function runAutoDownloadAndDeleteInDoc(doc) {
    if (!doc) return false;

    const startBtn = await waitFor(
      () => {
        const btn = doc.getElementById("start-btn");
        return btn && !btn.disabled ? btn : null;
      },
      { timeout: 15000, interval: 200, label: "Downloader  Start  Button" }
    ).catch(() => null);

    if (!startBtn) {
      log("Downloader  Start  Button  Not  Ready   ⚠️  .......");
      return false;
    }

    setVaultStatus("STARTING", lastCapturedTitle, lastCapturedUrl);
    startBtn.click();
    log("Clicked  Start  Hyper  Download   ⚡  .......");

    const pauseBtn = await waitFor(
      () => {
        const pBtn = doc.getElementById("pause-btn");
        const countEl = doc.getElementById("dl-count");
        const hasChunks = countEl && !/^\s*0\s*\/\s*0\s*chunks/i.test(countEl.innerText || "");
        if (pBtn && (hasChunks || pBtn.offsetParent !== null)) return pBtn;
        return null;
      },
      { timeout: 12000, interval: 250, label: "Initial  Chunks  Or  Pause  Button" }
    ).catch(() => doc.getElementById("pause-btn"));

    if (pauseBtn) {
      pauseBtn.click();
      setVaultStatus("PAUSING", lastCapturedTitle, lastCapturedUrl);
      log("Paused  Download  After  Initial  Chunks   ⏸️  .......");
    }

    const resetBtn = await waitFor(
      () => {
        const rBtn = doc.getElementById("reset-btn");
        if (!rBtn) return null;
        const pausedLabel = doc.getElementById("dl-status")?.innerText || "";
        const resumeBtn = doc.getElementById("resume-btn");
        const isPaused =
          /paused/i.test(pausedLabel) || (resumeBtn && window.getComputedStyle(resumeBtn).display !== "none");
        return isPaused || rBtn.offsetParent !== null ? rBtn : null;
      },
      { timeout: 10000, interval: 250, label: "Reset  Cache  Button" }
    ).catch(() => doc.getElementById("reset-btn"));

    if (resetBtn) {
      resetBtn.click();
      setVaultStatus("CLEARED", lastCapturedTitle, lastCapturedUrl);
      log("Auto-Cleared  Local  Vault  Cache   🗑️  .......");
      return true;
    }

    return false;
  }

  // Intercept  window.open  To  Track  Downloader  Target  Without  Losing  State
  const origWindowOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    if (typeof url === "string" && url.includes("downloader")) {
      latestDownloaderUrl = url;
      const cleaned = cleanStreamUrlFromDownloader(url);
      setVaultStatus("CAPTURED", lastCapturedTitle || "Downloader", cleaned || url);
      log("Captured  Downloader  Url   🕊️  .......");
      if (cleaned) {
        sendTelegram(
          `**${lastCapturedTitle || "Lecture"}**\nSubject:  ${lastCapturedSubject || "General"}\n\n/s1  ${cleaned}`
        ).then((ok) => {
          if (ok) log("Sent  Cleaned  Link  To  Telegram   ✅  .......");
        });
      }
    }
    return origWindowOpen(url, target, features);
  };

  // Process  One  Queued  Lecture  End-To-End
  async function runSingleItem(item, idx, total) {
    lastCapturedTitle = item.title;
    lastCapturedSubject = item.subject;
    latestDownloaderUrl = "";
    setVaultStatus("RUNNING", item.title, lastCapturedUrl || "Waiting  For  Downloader   ⏳  .......");

    log(`---  [${idx + 1}/${total}]  ${item.title}  ---`);

    const onStudy = await returnToStudyAndVerifyAllClasses();
    if (!onStudy) return;

    log("Opening  All  Classes   📂  .......");
    await clickInActiveView((t) => norm(t) === "all classes", "All  Classes  Button", 15000);
    await waitFor(() => getActiveViewId() === "#all-classes-view", {
      timeout: 12000,
      interval: 120,
      label: "All  Classes  View"
    });

    const subNorm = norm(item.subject);
    log(`Selecting  Subject  ${item.subject}   📘  .......`);
    await clickInActiveView(
      (t) => norm(t).includes(subNorm) || subNorm.includes(norm(t)),
      `Subject  ${item.subject}`,
      15000
    );
    await waitFor(() => getActiveViewId() === "#chapters-view", {
      timeout: 12000,
      interval: 120,
      label: "Chapters  View"
    });

    const words = norm(item.title)
      .split(" ")
      .filter((w) => w.length > 3);
    const chapKey = words[0] || norm(item.title).split(" ")[0];
    log(`Selecting  Chapter  Matching  ${chapKey}   📑  .......`);
    await clickInActiveView((t) => norm(t).includes(chapKey), `Chapter  ${chapKey}`, 15000);
    await waitFor(() => getActiveViewId() === "#content-view", {
      timeout: 12000,
      interval: 120,
      label: "Content  View"
    });

    log("Finding  Lecture  Card  And  Download  Button   🔎  .......");
    const match = await waitFor(() => findContentCardAndDownload(item.title), {
      timeout: 15000,
      interval: 200,
      label: `Download  Button  For  ${item.title}`
    });

    match.card.scrollIntoView({ behavior: "smooth", block: "center" });
    match.dlEl.click();
    log("Clicked  Download  Button   ⚡  .......");

    await waitFor(() => !!latestDownloaderUrl || !!match.href, {
      timeout: 2500,
      interval: 120,
      label: "Downloader  Url"
    }).catch(() => {});

    const dlUrl = latestDownloaderUrl || match.href || "";
    const cleanedUrl = cleanStreamUrlFromDownloader(dlUrl);

    if (cleanedUrl) {
      setVaultStatus("CAPTURED", item.title, cleanedUrl);
      const sent = await sendTelegram(
        `**${item.title}**\nSubject:  ${item.subject}\n\n/s1  ${cleanedUrl}`
      );
      if (sent) log("Sent  Cleaned  Link  To  Telegram   ✅  .......");
    }

    if (document.getElementById("start-btn")) {
      await runAutoDownloadAndDeleteInDoc(document);
    }

    await returnToStudyAndVerifyAllClasses();
  }

  // Start  Queue  Execution  On  Button  Click
  hud.querySelector("#pw-start-btn").onclick = async () => {
    if (isCrawling) return;
    if (queue.length === 0) {
      alert("Tap  Lectures  On  Weekly  Schedule  First   ⚠️  .......");
      return;
    }

    isCrawling = true;
    const btn = hud.querySelector("#pw-start-btn");
    btn.disabled = true;
    btn.style.opacity = "0.6";
    log(`Start  Crawl  Initiated  For  ${queue.length}  Items   🪄  .......`);

    for (let i = 0; i < queue.length; i++) {
      try {
        await runSingleItem(queue[i], i, queue.length);
      } catch (err) {
        log(`Item  Error:  ${err.message}   ⚠️  .......`);
        await returnToStudyAndVerifyAllClasses().catch(() => {});
      }
    }

    log("All  Queued  Lectures  Completed   🎉  .......");
    setVaultStatus("DONE", lastCapturedTitle || "Finished", lastCapturedUrl || "Complete  .");
    isCrawling = false;
    btn.disabled = false;
    btn.style.opacity = "1";
  };
})();
