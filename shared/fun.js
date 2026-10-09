/* Fun + accessibility layer shared by every page (loaded by universe.js):
   badges ("Captain's Log"), toasts, Konami-code hyperdrive, "?" keyboard
   help, skip link and screen-reader labels for the 3D canvases.
   Badge progress is a device-local nicety in localStorage, nothing more. */
(() => {
  const script = document.currentScript;
  const root = new URL("../", script.src);
  const path = location.pathname.replace(root.pathname, "/");
  const reducedMotion = () =>
    window.universeReducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    has(key) {
      try {
        return localStorage.getItem(key) !== null;
      } catch {
        return false;
      }
    },
    keys() {
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    },
  };

  // ------------------------------------------------------------- badges --
  const PAGES = ["personal", "work", "research", "blog", "world", "beyond"];
  const BADGES = [
    ["first_flight", "Ignition", "Leave the cockpit and take your first flight.", "Press W in the cockpit."],
    ["cartographer", "Cartographer", "Visit all six public destinations.", "Personal, Work, Research, Blog, World View and Beyond."],
    ["autopilot", "Hands Off the Wheel", "Let the autopilot fly you somewhere.", "Try 'ap work' in the nav terminal."],
    ["miner", "Asteroid Miner", "Shatter a crystal with the mining laser.", "Click a glowing crystal while flying."],
    ["first_landing", "First Landing", "Set foot on another world.", "Pick a planet in My World View and land."],
    ["data_log", "Data Archaeologist", "Recover a hidden data fragment on a planet surface.", "Drive the rover around a landed world."],
    ["reader", "Signal Received", "Read a transmission from the archive.", "Open any blog article."],
    ["comms", "Open Channel", "Send a message over the comms link.", "Press Chat in the top bar."],
    ["hacker", "Terminal Velocity", "Run 10 commands in a nav terminal.", "Type 'help' to start."],
    ["konami", "Cheat Code", "Overload the hyperdrive.", "Some codes never die: ↑↑↓↓←→←→BA."],
    ["night_owl", "Night Shift", "Explore the universe between midnight and 5 a.m.", "Come back late."],
    ["completionist", "Fleet Admiral", "Earn every other badge.", "Collect them all."],
  ];
  const byId = Object.fromEntries(BADGES.map((b) => [b[0], b]));

  const earned = () => {
    const set = new Set(store.get("universe-badges", []));
    // Badges My World View records with its own keys.
    if (store.has("ach_first_landing")) set.add("first_landing");
    if (store.keys().some((k) => k.startsWith("ach_collected_"))) set.add("data_log");
    return set;
  };

  let toastHost;
  function toast(eyebrow, title, desc) {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "u-toasts";
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.append(toastHost);
    }
    const t = document.createElement("div");
    t.className = "u-toast";
    t.innerHTML = '<span class="u-eyebrow"></span><strong></strong><span></span>';
    t.children[0].textContent = eyebrow;
    t.children[1].textContent = title;
    t.children[2].textContent = desc;
    toastHost.append(t);
    if (typeof playLockChirp === "function" && window.soundEnabled) playLockChirp();
    setTimeout(() => t.classList.add("out"), 4500);
    setTimeout(() => t.remove(), 5200);
  }

  function unlock(id) {
    if (!byId[id]) return false;
    const set = earned();
    if (set.has(id)) return false;
    const saved = store.get("universe-badges", []);
    saved.push(id);
    store.set("universe-badges", saved);
    const [, title, desc] = byId[id];
    toast("BADGE UNLOCKED", title, desc);
    if (typeof writeToConsole === "function") writeToConsole(`[BADGE] ${title.toUpperCase()} UNLOCKED.`);
    renderLog();
    const all = earned();
    if (id !== "completionist" && BADGES.every(([b]) => b === "completionist" || all.has(b)))
      setTimeout(() => unlock("completionist"), 1200);
    return true;
  }

  function progressText() {
    const set = earned();
    return (
      `CAPTAIN'S LOG — ${set.size}/${BADGES.length} BADGES\n` +
      BADGES.map(([id, title, desc]) => (set.has(id) ? `[x] ${title}: ${desc}` : `[ ] ${title}`)).join("\n")
    );
  }

  function hint() {
    const set = earned();
    const locked = BADGES.filter(([id]) => !set.has(id));
    if (!locked.length) return "ALL BADGES EARNED. THE FLEET SALUTES YOU, ADMIRAL.";
    const [, title, , h] = locked[Math.floor(Math.random() * locked.length)];
    return `HINT — ${title.toUpperCase()}: ${h}`;
  }

  // Captain's Log section inside the star map dialog.
  function renderLog() {
    const dialog = document.querySelector('.u-dialog[aria-labelledby="universe-title"]');
    if (!dialog) return;
    let log = dialog.querySelector(".u-log");
    if (!log) {
      log = document.createElement("section");
      log.className = "u-log";
      log.setAttribute("aria-label", "Captain's log badges");
      dialog.append(log);
    }
    const set = earned();
    log.innerHTML = `<h3>Captain's log · ${set.size}/${BADGES.length}</h3><div class="u-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${BADGES.length}" aria-valuenow="${set.size}"><span style="width:${(set.size / BADGES.length) * 100}%"></span></div><ul class="u-badges"></ul>`;
    const list = log.querySelector("ul");
    for (const [id, title, desc, h] of BADGES) {
      const li = document.createElement("li");
      const on = set.has(id);
      li.className = on ? "on" : "";
      li.innerHTML = "<strong></strong><span></span>";
      li.children[0].textContent = on ? title : "Locked";
      li.children[1].textContent = on ? desc : h;
      li.setAttribute("aria-label", on ? `${title}: earned. ${desc}` : `Locked badge. Hint: ${h}`);
      list.append(li);
    }
  }

  // ------------------------------------------------------ page tracking --
  const PAGE_OF = [
    [/^\/personal\//, "personal"],
    [/^\/work\//, "work"],
    [/^\/my_web\//, "research"],
    [/^\/blog\//, "blog"],
    [/^\/my_world_view\//, "world"],
    [/^\/worlds\//, "beyond"],
  ];
  function trackVisit() {
    const page = PAGE_OF.find(([re]) => re.test(path))?.[1];
    if (page) {
      const seen = new Set(store.get("universe-visited", []));
      seen.add(page);
      store.set("universe-visited", [...seen]);
      if (PAGES.every((p) => seen.has(p))) unlock("cartographer");
    }
    if (/^\/blog\/articles\//.test(path)) unlock("reader");
    const h = new Date().getHours();
    if (h < 5) unlock("night_owl");
  }

  let commandCount = store.get("universe-commands", 0);
  function countCommand() {
    commandCount += 1;
    store.set("universe-commands", commandCount);
    if (commandCount >= 10) unlock("hacker");
  }

  // ---------------------------------------------------- Konami hyperdrive --
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let konamiPos = 0;
  function hyperdrive() {
    unlock("konami");
    if (typeof writeToConsole === "function")
      writeToConsole("!!! HYPERDRIVE OVERLOAD — REALITY.MATRIX RECALIBRATING !!!");
    if (typeof speakCoPilot === "function") speakCoPilot("Warning. Hyperdrive overload. Hold on to something.");
    if (typeof playWarpSpoolSound === "function") playWarpSpoolSound(true);
    if (typeof warpActive !== "undefined") warpActive = true;
    if (!reducedMotion()) document.body.classList.add("u-hyper");
    setTimeout(() => {
      document.body.classList.remove("u-hyper");
      if (typeof playWarpSpoolSound === "function") playWarpSpoolSound(false);
      if (typeof warpActive !== "undefined") warpActive = false;
    }, 6000);
  }

  // ------------------------------------------------------- keyboard help --
  const CONTROLS = {
    home: [
      ["W / ↑", "Leave the cockpit, then thrust forward"],
      ["S / ↓", "Reverse"],
      ["A D / ← →", "Strafe"],
      ["Space / Shift", "Climb / descend"],
      ["Q / E", "Barrel roll"],
      ["Mouse", "Steer (M switches free / cone steering)"],
      ["Click", "Fire the mining laser at crystals"],
      ["C", "Toggle cockpit view"],
      ["Fly into a wormhole", "Travel to that page"],
    ],
    world: [
      ["W A S D", "Fly / drive the rover"],
      ["Mouse", "Look around"],
      ["Click a planet", "Inspect it, then land"],
      ["Shift / Space", "Rover boost / jump"],
      ["E", "Launch back to orbit"],
      ["F", "Use a kiosk"],
    ],
  };
  const GLOBAL_KEYS = [
    ["?", "This help"],
    ["/", "Focus the nav terminal"],
    ["Esc", "Close any panel"],
    ["Tab", "Move between buttons and links; completes terminal commands"],
  ];
  let helpDialog;
  function openHelp() {
    if (!helpDialog) {
      helpDialog = document.createElement("dialog");
      helpDialog.className = "u-dialog u-help";
      helpDialog.setAttribute("aria-labelledby", "u-help-title");
      const scene = document.getElementById("canvas3d") ? "world" : document.getElementById("loading-screen") ? "home" : null;
      const rows = (list) => list.map(([k, v]) => `<tr><th scope="row"><kbd>${k}</kbd></th><td>${v}</td></tr>`).join("");
      helpDialog.innerHTML = `<button class="u-close" aria-label="Close help">Close</button><p class="u-eyebrow">FLIGHT MANUAL</p><h2 id="u-help-title">Controls</h2>${scene ? `<h3>${scene === "home" ? "Open space" : "My World View"}</h3><table>${rows(CONTROLS[scene])}</table>` : ""}<h3>Everywhere</h3><table>${rows(GLOBAL_KEYS)}</table><p class="u-muted">No 3D needed: use <strong>Quick access</strong> in the top bar for a plain menu of every page, or type <code>help</code> in a nav terminal.</p>`;
      document.body.append(helpDialog);
      helpDialog.querySelector(".u-close").onclick = () => helpDialog.close();
    }
    if (!helpDialog.open) helpDialog.showModal();
  }

  function isTyping(e) {
    return e.target.closest?.("input, textarea, select, [contenteditable]");
  }

  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      hyperdrive();
    }
    if (isTyping(e) || document.querySelector("dialog[open]")) return;
    if (e.key === "?") {
      e.preventDefault();
      openHelp();
    } else if (e.key === "/") {
      const term = document.getElementById("ap-console-input-bottom");
      if (term && term.offsetParent) {
        e.preventDefault();
        term.focus();
      }
    }
  });

  // ------------------------------------------------------------- a11y --
  function a11y() {
    for (const id of ["canvas", "canvas3d"]) {
      const c = document.getElementById(id);
      if (c) {
        c.setAttribute("role", "img");
        c.setAttribute("aria-label", "Interactive 3D space scene. Use Quick access in the top bar for a text menu of every page, or press ? for controls.");
      }
    }
    const out = document.getElementById("ap-console-out");
    if (out) {
      out.setAttribute("role", "log");
      out.setAttribute("aria-live", "polite");
      out.setAttribute("aria-label", "Ship console");
    }
    const term = document.getElementById("ap-console-input-bottom");
    if (term) term.setAttribute("aria-label", "Nav terminal command. Type help for a list.");
    const skip = document.createElement("a");
    skip.className = "u-skip";
    skip.href = "#";
    skip.textContent = "Skip the 3D: open Quick access";
    skip.onclick = (e) => {
      e.preventDefault();
      document.querySelector('.universe-nav [data-open="quick"]')?.click();
    };
    if (document.getElementById("canvas") || document.getElementById("canvas3d")) document.body.prepend(skip);
  }

  window.UniverseFun = { renderLog, unlock, earned, progressText, hint, openHelp, countCommand, hyperdrive, toast };

  document.addEventListener("DOMContentLoaded", () => {
    a11y();
    trackVisit();
    renderLog();
  });
  if (document.readyState !== "loading") {
    a11y();
    trackVisit();
    renderLog();
  }
})();
