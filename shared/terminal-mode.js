/* UDAY-OS: a full-screen, text-only way to explore the whole site.
   Content is read live from the real pages and the blog index, so the
   terminal never drifts from what the pages say. Open with the ` key, the
   `terminal` command, the star map, or ?mode=terminal. */
(() => {
  const script = document.currentScript;
  const root = new URL("../", script.src);
  const url = (p) => new URL(p, root).href;

  // ------------------------------------------------------------ content --
  const PAGES = {
    work: { path: "work/index.html", about: "Experience, skills & publications" },
    research: { path: "my_web/index.html", about: "Research focus, papers & repositories" },
    personal: { path: "personal/index.html", about: "Life beyond the lab" },
    worlds: { path: "worlds/index.html", about: "Ideas, philosophy & creative work" },
  };
  const pageCache = {};
  const SKIP = ".section-title, .section-eyebrow, script, style, svg, noscript, button, form, [data-mail-mount], .scroll-indicator, [aria-hidden='true'], .u-actions";
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

  function extract(el, out) {
    for (const child of el.children) {
      if (child.matches(SKIP) || /icon/.test(child.className)) continue;
      const tag = child.tagName;
      const text = clean(child.textContent);
      if (!text) continue;
      if (/^H[1-6]$/.test(tag)) {
        out.push("", (tag <= "H3" ? "■ " : "  ") + text);
      } else if (child.matches(".tech-stack, .tags, .project-tags, .about-tags, .skill-tags")) {
        out.push("  " + [...child.children].map((c) => `[${clean(c.textContent)}]`).join(" "));
      } else if (child.matches(".u-chip, .tag, .project-tag")) {
        out.push("  [" + text + "]");
      } else if (tag === "A" && child.href && /^https?:|^mailto:/.test(child.getAttribute("href") || "") && !child.querySelector("h3,h4,p")) {
        out.push(`  ↗ ${text}: ${child.href.replace(/^mailto:/, "")}`);
      } else if (tag === "P" || tag === "LI" || child.matches(".timeline-date, .skill-info, .stat-card") || !child.children.length) {
        out.push((tag === "LI" ? "  • " : "") + text);
      } else {
        extract(child, out);
      }
    }
    return out;
  }

  async function loadPage(key) {
    if (pageCache[key]) return pageCache[key];
    const html = await (await fetch(url(PAGES[key].path))).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const files = {};
    doc.querySelectorAll("section[id]").forEach((s) => {
      if (s.id === "hero") return;
      const title = clean(s.querySelector(".section-title, h2")?.textContent) || s.id;
      const lines = extract(s, []);
      // drop the duplicated first heading on pages whose title is an h2
      while (lines.length && (!lines[0] || lines[0].endsWith(title))) lines.shift();
      files[s.id + ".txt"] = { title, text: lines.join("\n").replace(/\n{3,}/g, "\n\n"), href: url(PAGES[key].path) + "#" + s.id };
    });
    return (pageCache[key] = files);
  }

  let posts = null;
  function loadPosts() {
    if (posts) return Promise.resolve(posts);
    if (window.TRANSMISSIONS) return Promise.resolve((posts = window.TRANSMISSIONS));
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url("blog/search-data.js");
      s.onload = () => resolve((posts = window.TRANSMISSIONS || []));
      s.onerror = () => reject(new Error("blog index unavailable"));
      document.head.append(s);
    });
  }

  const P = () => window.UniverseMail?.profile || {};
  const ROOT_FILES = {
    "readme.txt": () =>
      "Welcome to UDAY-OS — the text-mode console for Uday's Universe.\n\n" +
      "Everything on the site lives in these directories. Try:\n" +
      "  ls                 list what's here\n" +
      "  cd work            enter a directory\n" +
      "  cat experience     read a file (the .txt is optional)\n" +
      "  read <post>        read a blog transmission\n" +
      "  chat               talk to (AI) Uday\n" +
      "  message            send the real Uday an email\n" +
      "  help               every command\n" +
      "  exit               back to the 3D universe",
    "about.txt": () =>
      `${P().name || "Uday Girish Maradana"}\n${P().tagline || ""}\n\n` +
      "Machine learning engineer and robotics researcher. Builds production ML\n" +
      "platforms by day; explores perception, manipulation and clinical computer\n" +
      "vision in research. Curious about intelligence, physics and philosophy.\n\n" +
      "More: cat work/about · cat research/about · cat personal/about",
    "contact.txt": () =>
      `email     ${P().email}\nlinkedin  ${P().linkedin}\ngithub    ${P().github}\ncv        ${P().cv}\n\n` +
      "Or type `message` to send an email right from this terminal.",
  };

  // ------------------------------------------------------------ the fs --
  // Directories: "/", "/work", "/research", "/personal", "/worlds", "/blog"
  const DIRS = ["work", "research", "personal", "worlds", "blog"];
  let cwd = "/";

  function resolve(path) {
    if (!path) return cwd;
    if (path === "~") return "/";
    let parts = (path.startsWith("/") || path.startsWith("~") ? [] : cwd.split("/").filter(Boolean));
    for (const seg of path.replace(/^~\/?/, "").split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    }
    return "/" + parts.join("/");
  }

  async function list(dir) {
    if (dir === "/") return [...DIRS.map((d) => d + "/"), ...Object.keys(ROOT_FILES)];
    const name = dir.slice(1);
    if (name === "blog") return (await loadPosts()).map((p) => p.id + ".md");
    if (PAGES[name]) return Object.keys(await loadPage(name));
    return null;
  }

  async function readFile(path) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 1) {
      const f = ROOT_FILES[parts[0]] || ROOT_FILES[parts[0] + ".txt"];
      return f ? { text: f() } : null;
    }
    if (parts.length !== 2) return null;
    const [dir, file] = parts;
    if (dir === "blog") {
      const id = file.replace(/\.md$/, "");
      const p = (await loadPosts()).find((x) => x.id === id);
      if (!p) return null;
      return {
        text:
          `${p.title}\n${"═".repeat(Math.min(60, p.title.length))}\n` +
          `${p.date} · ${p.minutes} min read · ${p.tags.map((t) => "[" + t + "]").join(" ")}\n\n` +
          p.text.trim() +
          `\n\n— read it with formatting: ${url("blog/articles/" + p.id + "/")}`,
        href: url("blog/articles/" + p.id + "/"),
      };
    }
    if (PAGES[dir]) {
      const files = await loadPage(dir);
      const f = files[file] || files[file + ".txt"];
      return f ? { text: `${f.title.toUpperCase()}\n${"─".repeat(Math.min(60, f.title.length))}\n${f.text}`, href: f.href } : null;
    }
    return null;
  }

  // ------------------------------------------------------------- ui --
  let dialog, out, input, promptEl, mode = "shell", openedFromURL = false;
  const hist = [];
  let histPos = -1;
  const promptText = () =>
    mode === "chat" ? "you › " : mode === "mail" ? mailStep().prompt : `guest@uday-universe:${cwd === "/" ? "~" : "~" + cwd}$ `;

  function linkify(text) {
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(/https?:\/\/[^\s)]+/g)) {
      frag.append(text.slice(last, m.index));
      const a = document.createElement("a");
      a.href = m[0];
      a.textContent = m[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      frag.append(a);
      last = m.index + m[0].length;
    }
    frag.append(text.slice(last));
    return frag;
  }
  function print(text = "", cls = "") {
    const line = document.createElement("div");
    line.className = "uos-l " + cls;
    line.append(linkify(String(text)));
    out.append(line);
    out.scrollTop = out.scrollHeight;
    return line;
  }
  const setPrompt = () => (promptEl.textContent = promptText());

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "uos";
    dialog.setAttribute("aria-label", "Terminal mode");
    dialog.innerHTML = `<div class="uos-bar"><span>UDAY-OS · tty1</span><span class="uos-hint">help · Tab completes · ↑↓ history · exit</span><button type="button" class="uos-x" aria-label="Exit terminal mode">exit ✕</button></div><div class="uos-out" role="log" aria-live="polite" aria-label="Terminal output"></div><form class="uos-line"><label class="uos-prompt" for="uos-in"></label><input id="uos-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal command"></form>`;
    document.body.append(dialog);
    out = dialog.querySelector(".uos-out");
    input = dialog.querySelector("input");
    promptEl = dialog.querySelector(".uos-prompt");
    dialog.querySelector(".uos-x").onclick = close;
    dialog.addEventListener("click", (e) => {
      if (!e.target.closest("a, button") && !getSelection().toString()) input.focus();
    });
    dialog.addEventListener("cancel", (e) => {
      if (mode !== "shell") {
        e.preventDefault();
        leaveMode("cancelled.");
      }
    });
    dialog.addEventListener("close", () => {
      if (openedFromURL) {
        const u = new URL(location.href);
        u.searchParams.delete("mode");
        history.replaceState({}, "", u);
        openedFromURL = false;
      }
    });
    dialog.addEventListener("keydown", (e) => {
      e.stopPropagation(); // never steer the ship from here
      if (e.key === "ArrowUp" && mode === "shell") {
        e.preventDefault();
        if (histPos < hist.length - 1) input.value = hist[++histPos];
      } else if (e.key === "ArrowDown" && mode === "shell") {
        e.preventDefault();
        histPos = Math.max(-1, histPos - 1);
        input.value = histPos < 0 ? "" : hist[histPos];
      } else if (e.key === "Tab" && mode === "shell") {
        e.preventDefault();
        complete();
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        out.replaceChildren();
      }
    });
    dialog.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const raw = input.value;
      input.value = "";
      print(promptText() + raw, "uos-echo");
      if (mode === "chat") return chatLine(raw);
      if (mode === "mail") return mailLine(raw);
      if (raw.trim()) {
        hist.unshift(raw.trim());
        histPos = -1;
      }
      await run(raw.trim());
      setPrompt();
    };
  }

  function banner() {
    const art = [
      "  _   _ ___   _ __   __      ___  ___",
      " | | | |   \\ /_\\\\ \\ / /____ / _ \\/ __|",
      " | |_| | |) / _ \\\\ V /_____| (_) \\__ \\",
      "  \\___/|___/_/ \\_\\|_|       \\___/|___/",
    ];
    art.forEach((l) => print(l, "uos-art"));
    print("UDAY-OS 2.6 · text-mode console for Uday's Universe", "uos-dim");
    print("Type `help` for commands, `cat readme` to start, `exit` to return to 3D.", "uos-dim");
    print("");
  }

  async function open() {
    if (!dialog) build();
    if (!dialog.open) {
      if (document.pointerLockElement) document.exitPointerLock();
      dialog.showModal();
      if (!out.children.length) banner();
    }
    mode = "shell";
    setPrompt();
    input.focus();
    window.UniverseFun?.unlock("root_access");
  }
  function close() {
    dialog?.close();
  }

  // ------------------------------------------------------- commands --
  const COMMANDS = {
    help: "show this list",
    ls: "list a directory (ls, ls work)",
    cd: "change directory (cd work, cd .., cd ~)",
    pwd: "print the current directory",
    cat: "print a file (cat experience, cat blog/fed-learning)",
    read: "read a blog transmission (read fed-learning)",
    tree: "show every directory and file",
    open: "open the real page for a file or directory",
    search: "search the blog (search robotics)",
    whoami: "who built this place",
    contact: "how to reach Uday",
    cv: "open the CV",
    chat: "talk to (AI) Uday — type exit to leave",
    message: "send the real Uday an email",
    history: "previous commands",
    clear: "clear the screen (Ctrl+L)",
    exit: "return to the 3D universe",
  };

  async function run(line) {
    if (!line) return;
    window.UniverseFun?.countCommand();
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    const c = cmd.toLowerCase();
    try {
      switch (c) {
        case "help":
        case "?":
          print("COMMANDS", "uos-h");
          Object.entries(COMMANDS).forEach(([k, v]) => print(`  ${k.padEnd(9)} ${v}`));
          print("Also: badges, hint, fortune, date, goto <page>, echo, sudo …", "uos-dim");
          return;
        case "ls":
        case "dir": {
          const dir = resolve(arg);
          const items = await list(dir);
          if (!items) return print(`ls: ${arg}: no such directory`, "uos-err");
          if (dir === "/") {
            DIRS.forEach((d) => print(`  ${(d + "/").padEnd(12)} ${d === "blog" ? "Transmission archive" : PAGES[d].about}`, "uos-dir"));
            Object.keys(ROOT_FILES).forEach((f) => print("  " + f));
          } else if (dir === "/blog") {
            (await loadPosts()).forEach((p) => print(`  ${(p.id + ".md").padEnd(24)} ${p.date}  ${p.title}`));
          } else items.forEach((f) => print("  " + f));
          return;
        }
        case "cd": {
          const dir = resolve(arg || "~");
          if (dir === "/" || (DIRS.includes(dir.slice(1)) && dir.split("/").length === 2)) cwd = dir;
          else print(`cd: ${arg}: no such directory`, "uos-err");
          return;
        }
        case "pwd":
          return print(cwd === "/" ? "~" : "~" + cwd);
        case "cat":
        case "less":
        case "more":
        case "type":
        case "read": {
          if (!arg) return print(`${c}: which file? try \`ls\``, "uos-err");
          let path = resolve(arg);
          if (c === "read" && !arg.includes("/")) path = "/blog/" + arg;
          const f = await readFile(path);
          if (!f) return print(`${c}: ${arg}: no such file`, "uos-err");
          f.text.split("\n").forEach((l) => print(l));
          if (path.startsWith("/blog/")) window.UniverseFun?.unlock("reader");
          return;
        }
        case "tree": {
          print("~");
          for (const d of DIRS) {
            print(`├── ${d}/`, "uos-dir");
            const items = (await list("/" + d)) || [];
            items.forEach((f, i) => print(`│   ${i === items.length - 1 ? "└──" : "├──"} ${f}`));
          }
          Object.keys(ROOT_FILES).forEach((f, i, a) => print(`${i === a.length - 1 ? "└──" : "├──"} ${f}`));
          return;
        }
        case "open": {
          const path = resolve(arg || ".");
          const parts = path.split("/").filter(Boolean);
          let href = null;
          if (!parts.length) href = url("index.html");
          else if (parts[0] === "blog") href = parts[1] ? (await readFile(path))?.href : url("blog/index.html");
          else if (PAGES[parts[0]]) href = parts[1] ? (await readFile(path))?.href : url(PAGES[parts[0]].path);
          if (!href) return print(`open: ${arg}: nothing to open`, "uos-err");
          print("opening " + href);
          setTimeout(() => (location.href = href), 300);
          return;
        }
        case "search":
        case "grep": {
          if (!arg) return print("search: what for?", "uos-err");
          const q = arg.toLowerCase();
          const hits = (await loadPosts()).filter((p) => (p.title + " " + p.tags.join(" ") + " " + p.text).toLowerCase().includes(q));
          if (!hits.length) return print(`no transmissions mention "${arg}"`, "uos-dim");
          hits.forEach((p) => print(`  ${p.id.padEnd(20)} ${p.title}`));
          print("read one with: read <id>", "uos-dim");
          return;
        }
        case "whoami":
          return ROOT_FILES["about.txt"]().split("\n").forEach((l) => print(l));
        case "contact":
          return ROOT_FILES["contact.txt"]().split("\n").forEach((l) => print(l));
        case "cv":
        case "resume":
          print("opening CV in a new tab…");
          return window.open(P().cv, "_blank", "noopener");
        case "chat":
          mode = "chat";
          print("Comms link open. Ask anything — `exit` to hang up.", "uos-dim");
          if (arg) {
            print("you › " + arg, "uos-echo");
            await chatLine(arg);
          }
          return;
        case "message":
        case "mail":
        case "email":
          mode = "mail";
          mail = {};
          print("New transmission to Uday's inbox. Esc or `cancel` to abort.", "uos-dim");
          return;
        case "history":
          return [...hist].reverse().forEach((h, i) => print(`  ${String(i + 1).padStart(3)}  ${h}`));
        case "clear":
        case "cls":
          return out.replaceChildren();
        case "echo":
          return print(arg);
        case "exit":
        case "quit":
        case "logout":
        case "gui":
          return close();
        case "rm":
          return print(arg.includes("-rf") ? "rm: refusing to delete the universe. it took a while to build." : "rm: read-only filesystem", "uos-err");
        case "vim":
        case "nano":
        case "emacs":
          return print(`${c}: editors are disabled in orbit. (and you'd never get out of vim anyway)`, "uos-dim");
        default: {
          // Shared nav-terminal commands: badges, hint, fortune, goto, date…
          const handled = window.UniverseTerminal?.run(c, line.slice(cmd.length), (t) => String(t).split("\n").forEach((l) => print(l)), () => out.replaceChildren());
          if (handled) return;
          // `cat` without the word: typing a file name works too
          const f = await readFile(resolve(line));
          if (f) return f.text.split("\n").forEach((l) => print(l));
          print(`${cmd}: command not found. try \`help\``, "uos-err");
        }
      }
    } catch (err) {
      print(`error: ${err.message}`, "uos-err");
    }
  }

  // -------------------------------------------------------- chat mode --
  async function chatLine(raw) {
    const text = raw.trim();
    if (!text) return setPrompt();
    if (/^(exit|quit|\/exit|bye)$/i.test(text)) return leaveMode("comms link closed.");
    const line = print("uday › …", "uos-ai");
    await window.UniverseChat?.ask(text, (reply) => {
      line.replaceChildren(linkify("uday › " + reply));
      out.scrollTop = out.scrollHeight;
    });
    setPrompt();
  }

  // -------------------------------------------------------- mail mode --
  let mail = {};
  const topics = () => window.UniverseMail?.topics || ["Just saying hi"];
  function mailStep() {
    if (mail.name === undefined) return { key: "name", prompt: "your name › " };
    if (mail.email === undefined) return { key: "email", prompt: "your email › " };
    if (mail.topic === undefined) return { key: "topic", prompt: `topic [1-${topics().length}] › ` };
    if (mail.message === undefined) return { key: "message", prompt: "message › " };
    return { key: "confirm", prompt: "send it? [y/n] › " };
  }
  async function mailLine(raw) {
    const v = raw.trim();
    if (/^(cancel|exit|quit)$/i.test(v)) return leaveMode("transmission cancelled.");
    const step = mailStep();
    if (step.key === "name") {
      if (!v) return print("a name helps Uday reply :)", "uos-err"), setPrompt();
      mail.name = v;
    } else if (step.key === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return print("that doesn't look like an email address", "uos-err"), setPrompt();
      mail.email = v;
      topics().forEach((t, i) => print(`  ${i + 1}. ${t}`));
    } else if (step.key === "topic") {
      const i = Number(v || 1) - 1;
      mail.topic = topics()[i] || topics()[0];
    } else if (step.key === "message") {
      if (!v) return print("the message is empty", "uos-err"), setPrompt();
      mail.message = v;
      print(`to: Uday · from: ${mail.name} <${mail.email}> · topic: ${mail.topic}`, "uos-dim");
    } else if (step.key === "confirm") {
      if (!/^y(es)?$/i.test(v)) return leaveMode("transmission discarded.");
      print("transmitting…", "uos-dim");
      try {
        await window.UniverseMail.deliver({ ...mail, where: "terminal mode" });
        print(`✓ delivered. Uday will reply to ${mail.email}.`, "uos-ok");
      } catch (err) {
        print(`✗ couldn't send (${err.message}). email ${P().email} directly.`, "uos-err");
      }
      return leaveMode();
    }
    setPrompt();
  }

  function leaveMode(msg) {
    if (msg) print(msg, "uos-dim");
    mode = "shell";
    mail = {};
    setPrompt();
  }

  // ------------------------------------------------------- completion --
  async function complete() {
    const value = input.value;
    const parts = value.split(/\s+/);
    if (parts.length === 1) {
      const all = [...Object.keys(COMMANDS), ...(window.UniverseTerminal?.commands || [])];
      const hits = [...new Set(all)].filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (hits.length === 1) input.value = hits[0] + " ";
      else if (hits.length > 1) print(hits.join("  "), "uos-dim");
      return;
    }
    const partial = parts.pop();
    const slash = partial.lastIndexOf("/");
    const base = slash >= 0 ? partial.slice(0, slash + 1) : "";
    const stem = partial.slice(slash + 1).toLowerCase();
    let dir = resolve(base || ".");
    if (parts[0] === "read" && !base) dir = "/blog";
    const items = ((await list(dir)) || []).filter((f) => f.toLowerCase().startsWith(stem));
    if (items.length === 1) input.value = [...parts, base + items[0]].join(" ");
    else if (items.length > 1) print(items.join("  "), "uos-dim");
  }

  // ----------------------------------------------------------- entry --
  document.addEventListener("keydown", (e) => {
    if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
    e.preventDefault();
    open();
  });
  const start = () => {
    if (new URLSearchParams(location.search).get("mode") === "terminal") {
      openedFromURL = true;
      open();
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.UniverseOS = { open, close, run };
})();
