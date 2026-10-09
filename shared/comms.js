/* Comms link: "Chat with me" panel + navigation/info commands shared by the
   cockpit terminals. Loaded by shared/universe.js on every page.

   The chat backend is pluggable: set "endpoint" in shared/chat-config.json
   (see docs/chat-backend.md). With no endpoint the panel answers from a small
   offline auto-responder and says so. */
(() => {
  const script = document.currentScript;
  const root = new URL("../", script.src);
  const url = (path) => new URL(path, root).href;

  const PROFILE = {
    name: "Uday Girish Maradana",
    tagline: "Machine Learning Engineer | Robotics Researcher",
    email: "einsteingirish@gmail.com",
    github: "https://github.com/udaygirish",
    linkedin: "https://linkedin.com/in/udaygirish-maradana",
    cv: "https://github.com/udaygirish/udaygirish.github.io/raw/master/assets/Uday_Girish_Maradana_Resume.pdf",
  };

  const DESTINATIONS = {
    home: ["index.html", "Home / cockpit"],
    work: ["work/index.html", "Experience, skills & publications"],
    personal: ["personal/index.html", "Life beyond the lab"],
    research: ["my_web/index.html", "Papers and repositories"],
    world: ["my_world_view/index.html", "My World View planets"],
    blog: ["blog/index.html", "Transmission Archive"],
    beyond: ["worlds/index.html", "Ideas, philosophy & creative work"],
    command: ["command/index.html", "Command Deck (owner access)"],
  };
  const ALIASES = {
    professional: "work", experience: "work", projects: "work",
    publications: "research", papers: "research", my_web: "research",
    planets: "world", my_world_view: "world", worldview: "world",
    archive: "blog", transmissions: "blog", worlds: "beyond",
    deck: "command", index: "home", cockpit: "home",
  };
  const resolveDestination = (arg) => {
    const key = (arg || "").trim().toLowerCase().replace(/^\.?\//, "");
    return DESTINATIONS[key] ? key : ALIASES[key] || null;
  };

  // ---------------------------------------------------------------- chat --
  let config = { endpoint: "", title: "Chat with Uday", timeoutMs: 45000 };
  const configReady = fetch(url("shared/chat-config.json"), { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((c) => (config = { ...config, ...c }))
    .catch(() => config);

  const history = [];
  let dialog, log, input, status;

  function linkify(text) {
    const frag = document.createDocumentFragment();
    const re = /(https?:\/\/[^\s)]+|mailto:[^\s)]+)/g;
    let last = 0;
    for (const m of text.matchAll(re)) {
      frag.append(text.slice(last, m.index));
      const a = document.createElement("a");
      a.href = m[0];
      a.textContent = m[0].replace(/^mailto:/, "");
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      frag.append(a);
      last = m.index + m[0].length;
    }
    frag.append(text.slice(last));
    return frag;
  }

  function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = "u-chat-msg u-chat-" + role;
    const who = document.createElement("span");
    who.className = "u-chat-who";
    who.textContent = role === "user" ? "YOU" : role === "assistant" ? "UDAY" : "SYS";
    const body = document.createElement("p");
    body.append(linkify(text));
    row.append(who, body);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return body;
  }

  function offlineReply(message) {
    const q = message.toLowerCase();
    if (/(cv|resume|résumé)/.test(q)) return `You can grab my CV here: ${PROFILE.cv}`;
    if (/(email|contact|reach|hire|talk)/.test(q))
      return `Best way to reach me is email: mailto:${PROFILE.email} — or LinkedIn: ${PROFILE.linkedin}`;
    if (/(github|code|repo)/.test(q)) return `My code lives on GitHub: ${PROFILE.github}`;
    if (/(research|paper|publication)/.test(q))
      return `My research and publications are on the Research page: ${url(DESTINATIONS.research[0])}`;
    if (/(work|experience|job|skills?)/.test(q))
      return `My experience and skills are on the Work page: ${url(DESTINATIONS.work[0])}`;
    if (/(blog|write|article)/.test(q)) return `I write in the Transmission Archive: ${url(DESTINATIONS.blog[0])}`;
    if (/^(hi|hello|hey|yo)\b/.test(q)) return "Hey! Thanks for flying by. What would you like to know?";
    return `My AI co-pilot isn't connected yet, so I can't answer that one live. Ask about my CV, work, research or how to contact me — or email me at mailto:${PROFILE.email}.`;
  }

  async function askBackend(message, bodyEl) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(config.headers || {}) },
        body: JSON.stringify({
          message,
          history: history.slice(-12),
          context: { page: location.pathname },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const type = res.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        const data = await res.json();
        const reply = data.reply ?? data.message?.content ?? data.choices?.[0]?.message?.content ?? "";
        bodyEl.replaceChildren(linkify(reply));
        return reply;
      }
      // Plain-text (or chunked) streaming: append as it arrives.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        bodyEl.replaceChildren(linkify(reply));
        log.scrollTop = log.scrollHeight;
      }
      return reply;
    } finally {
      clearTimeout(timer);
    }
  }

  async function send(message) {
    message = message.trim();
    if (!message) return;
    addMessage("user", message);
    history.push({ role: "user", content: message });
    await configReady;
    const bodyEl = addMessage("assistant", "…");
    let reply;
    if (config.endpoint) {
      try {
        reply = await askBackend(message, bodyEl);
      } catch (e) {
        reply = offlineReply(message);
        bodyEl.replaceChildren(linkify("(Uplink failed — answering offline.) " + reply));
        setStatus(false);
      }
    } else {
      reply = offlineReply(message);
      bodyEl.replaceChildren(linkify(reply));
    }
    history.push({ role: "assistant", content: reply });
  }

  function setStatus(online) {
    if (!status) return;
    status.textContent = online ? "UPLINK: ONLINE" : "UPLINK: OFFLINE · AUTO-RESPONDER";
    status.classList.toggle("online", online);
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "u-dialog u-chat";
    dialog.setAttribute("aria-labelledby", "u-chat-title");
    dialog.innerHTML = `<button class="u-close" aria-label="Close chat">Close</button><p class="u-eyebrow">COMMS LINK / DIRECT CHANNEL</p><h2 id="u-chat-title"></h2><p class="u-chat-status" role="status"></p><div class="u-chat-log" aria-live="polite"></div><form class="u-chat-form"><input type="text" autocomplete="off" placeholder="Ask me anything…" aria-label="Message"><button type="submit" class="primary">Send</button></form>`;
    document.body.append(dialog);
    dialog.querySelector("#u-chat-title").textContent = config.title;
    log = dialog.querySelector(".u-chat-log");
    input = dialog.querySelector("input");
    status = dialog.querySelector(".u-chat-status");
    setStatus(!!config.endpoint);
    dialog.querySelector(".u-close").onclick = () => dialog.close();
    dialog.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = "";
      send(v);
    };
    // Keep typing in the chat from steering the ship.
    dialog.addEventListener("keydown", (e) => e.stopPropagation());
    addMessage(
      "assistant",
      config.greeting ||
        "Hi, I'm Uday. Ask me about my work, research or how to get in touch.",
    );
  }

  async function open(prefill) {
    await configReady;
    if (!dialog) build();
    if (!dialog.open) dialog.showModal();
    if (prefill) send(prefill);
    input.focus();
  }

  // ------------------------------------------------------------ terminal --
  const HELP =
    "NAVIGATION & COMMS:\n" +
    "- goto <place>: jump to a page (" + Object.keys(DESTINATIONS).join(", ") + ")\n" +
    "- places: list destinations\n" +
    "- map / quick: open star map / quick access\n" +
    "- chat [message]: open the comms link and talk to me\n" +
    "- whoami: who flies this ship\n" +
    "- contact / cv / github / linkedin\n" +
    "- time: ship clock\n" +
    "- clear: clear the console";

  const COMMANDS = [
    "goto", "open", "cd", "places", "ls", "map", "quick", "chat", "ask", "whoami",
    "about", "contact", "cv", "resume", "github", "linkedin", "time", "date", "clear",
  ];

  function run(cmd, rawArg, write, clear) {
    const arg = (rawArg || "").trim();
    switch (cmd) {
      case "goto":
      case "open":
      case "cd": {
        const key = resolveDestination(arg);
        if (!key) {
          write(`DESTINATION NOT FOUND: "${arg || "?"}". Try: ${Object.keys(DESTINATIONS).join(", ")}`);
          return true;
        }
        write(`PLOTTING JUMP TO ${key.toUpperCase()}...`);
        setTimeout(() => (location.href = url(DESTINATIONS[key][0])), 400);
        return true;
      }
      case "places":
      case "ls":
        write("KNOWN DESTINATIONS:\n" + Object.entries(DESTINATIONS).map(([k, [, d]]) => `- ${k}: ${d}`).join("\n"));
        return true;
      case "map":
        window.openUniverseMap?.();
        return true;
      case "quick":
        document.querySelector('.universe-nav [data-open="quick"]')?.click();
        return true;
      case "chat":
      case "ask":
        write(arg ? "OPENING COMMS LINK — TRANSMITTING MESSAGE." : "OPENING COMMS LINK.");
        open(arg);
        return true;
      case "whoami":
      case "about":
        write(`PILOT: ${PROFILE.name.toUpperCase()}\n${PROFILE.tagline}\nType 'goto work' for the full log, or 'chat' to talk.`);
        return true;
      case "contact":
        write(`EMAIL: ${PROFILE.email}\nLINKEDIN: ${PROFILE.linkedin}\nGITHUB: ${PROFILE.github}`);
        return true;
      case "cv":
      case "resume":
        write("DOWNLOADING PILOT DOSSIER (CV)...");
        window.open(PROFILE.cv, "_blank", "noopener");
        return true;
      case "github":
      case "linkedin":
        write(`OPENING ${cmd.toUpperCase()}...`);
        window.open(PROFILE[cmd], "_blank", "noopener");
        return true;
      case "time":
      case "date":
        write("SHIP CLOCK: " + new Date().toString());
        return true;
      case "clear":
        clear?.();
        return true;
      case "sudo":
        write("PERMISSION DENIED. NICE TRY, CADET.");
        return true;
      default:
        return false;
    }
  }

  // Tab-completion over shared + page-specific commands.
  function complete(value, localCommands = []) {
    const [head, ...rest] = value.trimStart().split(" ");
    if (rest.length && ["goto", "open", "cd"].includes(head.toLowerCase())) {
      const hit = Object.keys(DESTINATIONS).find((d) => d.startsWith(rest.join(" ").toLowerCase()));
      return hit ? `${head} ${hit}` : value;
    }
    const all = [...new Set([...localCommands, ...COMMANDS])];
    const hits = all.filter((c) => c.startsWith(head.toLowerCase()));
    return hits.length === 1 ? hits[0] + " " : value;
  }

  window.UniverseChat = { open, send };
  window.UniverseTerminal = { run, complete, help: HELP, commands: COMMANDS };
})();
