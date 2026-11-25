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

  // Create  Bottom-Left  Crawl  HUD  Mini  Screen
  const hud = document.createElement("div");
  hud.id = "pw-hud-panel";
  hud.style =
    "position:fixed;bottom:16px;left:16px;background:#05080f;color:#00ff88;padding:12px;z-index:2147483647;border:2px solid #00ff88;border-radius:10px;font-family:monospace;width:300px;max-width:calc(100vw - 32px);font-size:12px;box-shadow:0 0 18px rgba(0,255,136,0.28);";
  hud.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <b>🕵️‍♂️   Deep  Crawl  Ready  !!</b>
      <span id="pw-q-badge" style="color:#38bdf8;font-weight:bold;">Q:  0</span>
    </div>
    <div style="font-size:11px;color:#94a3b8;line-height:1.35;">
      1.  Tap  Lectures  On  Weekly  Schedule  .<br>
      2.  Tap  Start  Crawl  For  Verbose  Run  .
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button id="pw-cp-logs" style="flex:1;background:#00ff88;color:#000;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">📋   Copy  Logs</button>
      <button id="pw-start-btn" style="flex:1;background:#ef4444;color:#fff;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;">🪄   Start  Crawl</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:5px;">
      <button id="pw-clear-q" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🗑️   Clear  Queue</button>
      <button id="pw-dbg-view" style="flex:1;background:#1e293b;color:#38bdf8;border:1px solid #334155;padding:4px;border-radius:5px;cursor:pointer;font-size:11px;">🔍   View  Debug</button>
    </div>
    <div id="pw-log-box" style="max-height:180px;overflow-y:auto;margin-top:8px;border-top:1px solid #1e293b;padding-top:6px;font-size:11px;line-height:1.35;color:#cbd5e1;"></div>
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

  // Append  Explicit  Log  Entry  To  HUD  &  Console
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
      log(`TG  Error:  ${err.message}   ⚠️  .......`);
      return false;
    }
  }

  // Dynamic  Condition  Poller  With  Detailed  Failure  Reporting
  function waitFor(predicate, { timeout = 12000, interval = 120, label = "Condition" } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let settled = false;
      let lastDiag = "";

      const finish = (fn, val) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        fn(val);
      };

      const check = () => {
        if (settled) return;
        try {
          const out = predicate();
          if (out) {
            finish(resolve, out);
            return;
          }
          if (typeof out === "string" && out.startsWith("DIAG:")) {
            lastDiag = out.slice(5);
          }
        } catch (err) {
          lastDiag = err && err.message ? err.message : String(err);
        }

        if (Date.now() - start >= timeout) {
          const detail = lastDiag ? `  [Last  Reason:  ${lastDiag}]` : "";
          finish(reject, new Error(`Timeout  On  ${label}${detail}   ⚠️  .......`));
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
      log("Cannot  Clear  While  Crawl  Is  Running   ⏳  .......");
      return;
    }
    queue.forEach((item) => {
      if (item.cardEl) item.cardEl.style.border = "";
    });
    queue = [];
    updateQueueBadge();
    log("Queue  Cleared  Successfully   🗑️  .......");
  };

  // Print  Detailed  View  &  Element  Diagnostics
  hud.querySelector("#pw-dbg-view").onclick = () => {
    const viewEl = getActiveViewEl();
    const visibleTexts = Array.from(viewEl.querySelectorAll("button, a, div, span, h1, h2, h3, h4"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && el.children.length <= 3;
      })
      .map((el) => (el.innerText || "").trim())
      .filter(Boolean)
      .slice(0, 8);

    log(
      `Debug  View=${getActiveViewId()}  Hash=${window.location.hash}  AllClasses=${hasAllClassesInStudyView()}  Sample=[${visibleTexts.join(" | ")}]   🔍  .......`
    );
  };

  // Copy  Latest  Captured  Link
  vaultBox.querySelector("#pw-copy-link").onclick = () => {
    if (!lastCapturedUrl) {
      log("Missing  Captured  Url  To  Copy   ⚠️  .......");
      return;
    }
    navigator.clipboard?.writeText(lastCapturedUrl).then(() => log("Stream  Link  Copied   🔗  ......."));
  };

  // Resend  Latest  Captured  Link  To  Telegram
  vaultBox.querySelector("#pw-resend-tg").onclick = async () => {
    if (!lastCapturedUrl) {
      log("Missing  Captured  Url  For  Telegram   ⚠️  .......");
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
    return { subject, title, metaLine };
  }

  // Queue  Lectures  When  Tapped  On  Weekly  Schedule
  document.addEventListener(
    "click",
    (e) => {
      if (isCrawling) return;
      if (hud.contains(e.target) || vaultBox.contains(e.target)) return;
      const activeView = getActiveViewId();
      if (activeView !== "#weekly-schedule-view") return;

      const card = findScheduleCard(e.target);
      if (!card) {
        log(`Tap  Ignored:  No  Card  With  Bullet  Found  Near  <${e.target.tagName.toLowerCase()}>   ⚠️  .......`);
        return;
      }

      const { subject, title, metaLine } = parseScheduleCard(card);
      if (!subject || !title) {
        log(
          `Tap  Ignored:  Missing  ${!subject ? "Subject" : "Title"}  (Meta="${metaLine || "None"}",  Title="${title || "None"}")   ⚠️  .......`
        );
        return;
      }

      const key = `${norm(subject)}::${norm(title)}`;
      if (queue.some((q) => q.key === key)) {
        log(`Duplicate  Skipped:  ${title}   ℹ️  .......`);
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

    if (backBtn) {
      log(`Clicking  Back  Button  In  ${beforeView}   ↩️  .......`);
      try {
        backBtn.click();
      } catch (err) {
        log(`Back  Button  Click  Error:  ${err.message}   ⚠️  .......`);
      }
    } else {
      log(`Missing  Back  Button  In  ${beforeView}  ;  Checking  nav()  Fallback   ⚠️  .......`);
    }

    const changed = await waitFor(() => getActiveViewId() !== beforeView || isConfirmedOnStudyView(), {
      timeout: 1200,
      interval: 100,
      label: `Exit  From  ${beforeView}`
    }).catch(() => false);

    if (!changed) {
      if (typeof window.nav === "function") {
        const targetNav =
          beforeView === "#chapters-view"
            ? "all-classes-view"
            : beforeView === "#content-view"
            ? "chapters-view"
            : "study-view";
        log(`Back  Did  Not  Switch  View;  Calling  nav("${targetNav}")   🧭  .......`);
        try {
          window.nav(targetNav);
        } catch (err) {
          log(`nav("${targetNav}")  Error:  ${err.message}   ⚠️  .......`);
        }

        await waitFor(() => getActiveViewId() !== beforeView || isConfirmedOnStudyView(), {
          timeout: 1500,
          interval: 100,
          label: `Fallback  nav("${targetNav}")`
        }).catch(() => false);
      } else {
        log(`Error:  window.nav  Is  Undefined  And  View  Stayed  At  ${beforeView}   ⚠️  .......`);
      }
    }

    log(`After  Back  Step:  View=${getActiveViewId()}  StudyConfirmed=${isConfirmedOnStudyView()}   ℹ️  .......`);
  }

  // Step  Back  Until  Study  View  And  All  Classes  Are  Confirmed
  async function returnToStudyAndVerifyAllClasses() {
    if (isConfirmedOnStudyView()) {
      log("Already  On  Study  View  With  All  Classes  Confirmed   ✅  .......");
      return true;
    }

    log(`Starting  Back  Loop  From  ${getActiveViewId()}   🪄  .......`);
    let attempts = 0;
    const maxAttempts = 6;

    while (attempts < maxAttempts) {
      if (isConfirmedOnStudyView()) {
        log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
        return true;
      }

      attempts++;
      log(`Back  Attempt  ${attempts}/${maxAttempts}  From  ${getActiveViewId()}   ↩️  .......`);
      await clickActiveBackButton();
      await new Promise((r) => setTimeout(r, 250));

      if (isConfirmedOnStudyView()) {
        log("Confirmed  On  Study  View  With  All  Classes   ✅  .......");
        return true;
      }
    }

    const studyEl = document.getElementById("study-view");
    log(
      `Error:  Study  View  Not  Confirmed  After  ${maxAttempts}  Attempts  (View=${getActiveViewId()},  StudyExists=${!!studyEl},  HasAllClasses=${hasAllClassesInStudyView()})   ⚠️  .......`
    );
    return false;
  }

  // Click  Matching  Element  Inside  Active  View  With  Explicit  Diagnostics
  async function clickInActiveView(predicateFn, label, timeout = 15000) {
    log(`Searching  In  ${getActiveViewId()}  For  ${label}   🔎  .......`);
    return waitFor(
      () => {
        const viewEl = getActiveViewEl();
        if (!viewEl) return "DIAG:No  Active  View  Element";

        const allNodes = Array.from(viewEl.querySelectorAll("button, a, div, span, p, h1, h2, h3, h4"));
        const visibleNodes = allNodes.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && el.children.length <= 5;
        });

        const target = visibleNodes.find((el) => predicateFn((el.innerText || "").trim(), el));
        if (!target) {
          const sample = visibleNodes
            .map((el) => (el.innerText || "").trim())
            .filter(Boolean)
            .slice(0, 5)
            .join(" / ");
          return `DIAG:Missing  "${label}"  In  ${getActiveViewId()}  (Visible=${visibleNodes.length},  Sample=[${sample}])`;
        }

        const clickable =
          target.closest(".offering-item, .list-card, .card-custom, button, a, [role='button']") || target;
        clickable.click();
        log(`Clicked  ${label}  (${(target.innerText || "").trim().slice(0, 45)})   ✅  .......`);
        return true;
      },
      { timeout, interval: 150, label }
    );
  }

  // Find  Matching  Content  Card  And  Download  Button  On  Content  View
  function findContentCardAndDownload(lectureTitle) {
    const viewEl = document.getElementById("content-view") || getActiveViewEl();
    if (!viewEl) return { error: "Missing  #content-view  Element" };

    const cards = Array.from(viewEl.querySelectorAll(".content-card, .list-group-custom > div"));
    if (cards.length === 0) return { error: "Zero  Content  Cards  Rendered  Yet" };

    const targetNorm = norm(lectureTitle);
    const words = targetNorm.split(" ").filter((w) => w.length > 2);

    const matches = cards.filter((el) => {
      const n = norm(el.innerText || "");
      if (!n) return false;
      if (n.includes(targetNorm)) return true;
      if (words.length >= 2) {
        const hits = words.filter((w) => n.includes(w)).length;
        return hits >= Math.min(3, words.length);
      }
      return false;
    });

    if (matches.length === 0) {
      return { error: `No  Card  Matched  Title  "${lectureTitle}"  Out  Of  ${cards.length}  Cards` };
    }

    matches.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);

    for (const card of matches) {
      const link = card.querySelector("a[href*='downloader'], a[href*='videoId']");
      if (link && link.href) {
        return { card, dlEl: link, href: link.href };
      }
      const dlBtn = card.querySelector(".btn-download, button[class*='download' i], a[class*='download' i]");
      if (dlBtn) {
        return { card, dlEl: dlBtn, href: dlBtn.href || null };
      }
    }

    return { error: "Matched  Card  Found  But  No  Download  Button  Or  Link  Inside  Card" };
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
    if (!doc) {
      log("Auto-Delete  Skipped:  Missing  Document   ⚠️  .......");
      return false;
    }

    const startBtn = await waitFor(
      () => {
        const btn = doc.getElementById("start-btn");
        if (!btn) return "DIAG:Missing  #start-btn";
        if (btn.disabled) return "DIAG:#start-btn  Still  Disabled";
        return btn;
      },
      { timeout: 15000, interval: 200, label: "Downloader  Start  Button" }
    ).catch((err) => {
      log(`Auto-Download  Skipped:  ${err.message}`);
      return null;
    });

    if (!startBtn) return false;

    setVaultStatus("STARTING", lastCapturedTitle, lastCapturedUrl);
    startBtn.click();
    log("Clicked  Start  Hyper  Download   ⚡  .......");

    const pauseBtn = await waitFor(
      () => {
        const pBtn = doc.getElementById("pause-btn");
        const countEl = doc.getElementById("dl-count");
        const hasChunks = countEl && !/^\s*0\s*\/\s*0\s*chunks/i.test(countEl.innerText || "");
        if (pBtn && (hasChunks || pBtn.offsetParent !== null)) return pBtn;
        return "DIAG:Waiting  For  Chunks  Or  #pause-btn";
      },
      { timeout: 12000, interval: 250, label: "Initial  Chunks  Or  Pause  Button" }
    ).catch((err) => {
      log(`Pause  Wait  Note:  ${err.message}`);
      return doc.getElementById("pause-btn");
    });

    if (pauseBtn) {
      pauseBtn.click();
      setVaultStatus("PAUSING", lastCapturedTitle, lastCapturedUrl);
      log("Clicked  Pause  Button   ⏸️  .......");
    } else {
      log("Warning:  #pause-btn  Not  Found   ⚠️  .......");
    }

    const resetBtn = await waitFor(
      () => {
        const rBtn = doc.getElementById("reset-btn");
        if (!rBtn) return "DIAG:Missing  #reset-btn";
        const pausedLabel = doc.getElementById("dl-status")?.innerText || "";
        const resumeBtn = doc.getElementById("resume-btn");
        const isPaused =
          /paused/i.test(pausedLabel) || (resumeBtn && window.getComputedStyle(resumeBtn).display !== "none");
        return isPaused || rBtn.offsetParent !== null ? rBtn : "DIAG:Waiting  For  Pause  State";
      },
      { timeout: 10000, interval: 250, label: "Reset  Cache  Button" }
    ).catch((err) => {
      log(`Reset  Wait  Note:  ${err.message}`);
      return doc.getElementById("reset-btn");
    });

    if (resetBtn) {
      resetBtn.click();
      setVaultStatus("CLEARED", lastCapturedTitle, lastCapturedUrl);
      log("Auto-Cleared  Local  Vault  Cache   🗑️  .......");
      return true;
    }

    log("Warning:  Could  Not  Click  #reset-btn   ⚠️  .......");
    return false;
  }

  // Intercept  window.open  To  Track  Downloader  Target  Without  Losing  State
  const origWindowOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    if (typeof url === "string" && url.includes("downloader")) {
      latestDownloaderUrl = url;
      const cleaned = cleanStreamUrlFromDownloader(url);
      setVaultStatus("CAPTURED", lastCapturedTitle || "Downloader", cleaned || url);
      log("Captured  Downloader  Url  Via  window.open   🕊️  .......");
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

  // Process  One  Queued  Lecture  With  Step-By-Step  Error  Logs
  async function runSingleItem(item, idx, total) {
    lastCapturedTitle = item.title;
    lastCapturedSubject = item.subject;
    latestDownloaderUrl = "";
    setVaultStatus("RUNNING", item.title, lastCapturedUrl || "Waiting  For  Downloader   ⏳  .......");

    log(`---  [${idx + 1}/${total}]  ${item.title}  (Subject:  ${item.subject})  ---`);

    const onStudy = await returnToStudyAndVerifyAllClasses();
    if (!onStudy) {
      log(`Skipped  [${idx + 1}/${total}]:  Could  Not  Confirm  Study  View  With  All  Classes   ⚠️  .......`);
      return;
    }

    log("Step  1:  Opening  All  Classes   📂  .......");
    await clickInActiveView((t) => norm(t) === "all classes", "All  Classes  Button", 15000);
    await waitFor(
      () =>
        getActiveViewId() === "#all-classes-view" ||
        "DIAG:CurrentView=" + getActiveViewId(),
      { timeout: 12000, interval: 120, label: "#all-classes-view" }
    );

    const subNorm = norm(item.subject);
    log(`Step  2:  Selecting  Subject  "${item.subject}"   📘  .......`);
    await clickInActiveView(
      (t) => norm(t).includes(subNorm) || subNorm.includes(norm(t)),
      `Subject  "${item.subject}"`,
      15000
    );
    await waitFor(
      () =>
        getActiveViewId() === "#chapters-view" ||
        "DIAG:CurrentView=" + getActiveViewId(),
      { timeout: 12000, interval: 120, label: "#chapters-view" }
    );

    const words = norm(item.title)
      .split(" ")
      .filter((w) => w.length > 3);
    const chapKey = words[0] || norm(item.title).split(" ")[0];
    log(`Step  3:  Selecting  Chapter  Matching  "${chapKey}"   📑  .......`);
    await clickInActiveView((t) => norm(t).includes(chapKey), `Chapter  "${chapKey}"`, 15000);
    await waitFor(
      () =>
        getActiveViewId() === "#content-view" ||
        "DIAG:CurrentView=" + getActiveViewId(),
      { timeout: 12000, interval: 120, label: "#content-view" }
    );

    log(`Step  4:  Finding  Lecture  "${item.title}"  And  Download  Button   🔎  .......`);
    const match = await waitFor(
      () => {
        const res = findContentCardAndDownload(item.title);
        if (res && res.dlEl) return res;
        return `DIAG:${res && res.error ? res.error : "Unknown  Content  Match  Error"}`;
      },
      { timeout: 15000, interval: 200, label: `Download  Button  For  "${item.title}"` }
    );

    match.card.scrollIntoView({ behavior: "smooth", block: "center" });
    match.dlEl.click();
    log("Step  5:  Clicked  Download  Button   ⚡  .......");

    await waitFor(() => !!latestDownloaderUrl || !!match.href, {
      timeout: 2500,
      interval: 120,
      label: "Downloader  Url"
    }).catch(() => {
      log("Note:  No  Href  Captured  Within  2.5s  (May  Have  Opened  In  New  Tab  Or  Trigger)   ℹ️  .......");
    });

    const dlUrl = latestDownloaderUrl || match.href || "";
    const cleanedUrl = cleanStreamUrlFromDownloader(dlUrl);

    if (cleanedUrl) {
      setVaultStatus("CAPTURED", item.title, cleanedUrl);
      const sent = await sendTelegram(
        `**${item.title}**\nSubject:  ${item.subject}\n\n/s1  ${cleanedUrl}`
      );
      if (sent) log("Step  6:  Sent  Cleaned  Link  To  Telegram   ✅  .......");
    } else {
      log("Note:  Cleaned  Stream  Url  Empty  (Check  Downloader  Tab  Or  Vault)   ℹ️  .......");
    }

    if (document.getElementById("start-btn")) {
      await runAutoDownloadAndDeleteInDoc(document);
    }

    log("Step  7:  Returning  To  Study  View  For  Next  Item   ↩️  .......");
    await returnToStudyAndVerifyAllClasses();
  }

  // Start  Queue  Execution  On  Button  Click
  hud.querySelector("#pw-start-btn").onclick = async () => {
    if (isCrawling) {
      log("Crawl  Is  Already  Running   ⏳  .......");
      return;
    }
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
        log(`Error  On  Item  ${i + 1}/${queue.length}:  ${err.message}   ⚠️  .......`);
        await returnToStudyAndVerifyAllClasses().catch((backErr) => {
          log(`Recovery  Back  Error:  ${backErr.message}   ⚠️  .......`);
        });
      }
    }

    log("All  Queued  Lectures  Processed   🎉  .......");
    setVaultStatus("DONE", lastCapturedTitle || "Finished", lastCapturedUrl || "Complete  .");
    isCrawling = false;
    btn.disabled = false;
    btn.style.opacity = "1";
  };
})();
