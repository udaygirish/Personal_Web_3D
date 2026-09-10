/* Shared navigation and device-local preferences; never used for authorization. */
(() => {
  const script = document.currentScript;
  const root = new URL("../", script.src);
  const url = (path) => new URL(path, root).href;
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };
  window.UniversePreferences = store;
  const destinations = [
    ["Personal", "Life beyond the lab", "personal/index.html"],
    ["Work", "Experience, skills & publications", "work/index.html"],
    [
      "My World View",
      "Explore four planets and their exhibits",
      "my_world_view/index.html",
    ],
    ["Research", "Papers and repositories", "my_web/index.html"],
    ["Transmission Archive", "Read the blog", "blog/index.html"],
    [
      "Beyond the Résumé",
      "Ideas, philosophy & creative work",
      "worlds/index.html",
    ],
    ["Command Deck", "Owner access", "command/index.html"],
  ];
  const tours = {
    professional: [
      [
        "work/index.html#about",
        "Professional introduction",
        "An overview of my engineering work.",
      ],
      [
        "work/index.html#experience",
        "Career journey",
        "Explore the roles and research behind my experience.",
      ],
      [
        "my_web/index.html#publications",
        "Research",
        "Read about my publications and supporting work.",
      ],
      [
        "work/index.html#contact",
        "Connect",
        "Reach me through the contact links below.",
      ],
    ],
    explorer: [
      [
        "my_world_view/index.html?planet=Projects",
        "Projects world",
        "Inspect a project exhibit or land and explore by rover.",
      ],
      [
        "my_world_view/index.html?planet=Skills",
        "Skills world",
        "See the tools behind the projects.",
      ],
      [
        "blog/index.html",
        "Transmission Archive",
        "Read the thinking behind the work.",
      ],
      [
        "worlds/index.html",
        "Beyond the résumé",
        "Explore the creative side and ideas still taking shape.",
      ],
    ],
  };
  function navigateTour(kind, step) {
    const steps = tours[kind];
    const target = new URL(steps[step][0], root);
    target.searchParams.set("tour", kind);
    target.searchParams.set("step", String(step));
    location.href = target.href;
  }
  function stopMovement() {
    if (typeof controls !== "undefined")
      Object.keys(controls).forEach((k) => (controls[k] = false));
    [
      "moveForward",
      "moveBackward",
      "moveLeft",
      "moveRight",
      "moveUp",
      "moveDown",
    ].forEach((k) => {
      if (k in window) window[k] = false;
    });
    if (typeof disableAutopilot === "function") disableAutopilot();
  }
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("nav");
    bar.className = "universe-nav";
    bar.setAttribute("aria-label", "Universe navigation");
    bar.innerHTML =
      '<button type="button">Star map</button><a href="' +
      url("index.html") +
      '">Home</a>';
    document.body.append(bar);
    const dialog = document.createElement("dialog");
    dialog.className = "u-dialog";
    dialog.setAttribute("aria-labelledby", "universe-title");
    dialog.innerHTML = `<button class="u-close" aria-label="Close star map">Close</button><p class="u-eyebrow">UDAY’S UNIVERSE / NAVIGATION</p><h2 id="universe-title">Choose your journey.</h2><p class="u-muted">Explore freely, follow a route, or go straight to a destination.</p><div class="u-grid"><button class="u-card" data-mode="explore"><span>01 / Free flight</span><strong>Explore</strong><span>Wormholes, planets and rover expeditions.</span></button><button class="u-card" data-mode="guided"><span>02 / Follow a route</span><strong>Guided tour</strong><span>A short, self-paced introduction.</span></button><button class="u-card" data-mode="quick"><span>03 / Direct navigation</span><strong>Quick access</strong><span>Get to the content in one click.</span></button></div><div id="u-route-picker" hidden><h3>Pick a route</h3><div class="u-actions"><button data-tour="professional">Professional · 4 stops</button><button data-tour="explorer">Explorer · 4 stops</button></div></div><div id="u-destinations"><h3>Destinations</h3><div class="u-grid">${destinations.map(([title, desc, path]) => `<a class="u-card" href="${url(path)}"><strong>${title}</strong><span>${desc}</span></a>`).join("")}</div></div><p class="u-muted" id="u-preference"></p><label><input type="checkbox" id="u-quiet"> Reduce decorative motion</label>`;
    document.body.append(dialog);
    function open() {
      stopMovement();
      if (document.pointerLockElement) document.exitPointerLock();
      if (!dialog.open) dialog.showModal();
    }
    window.openUniverseMap = open;
    bar.querySelector("button").onclick = open;
    dialog.querySelector(".u-close").onclick = () => dialog.close();
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          dialog.close();
      }
    });
    const remembered = store.get("universe-mode");
    dialog.querySelector("#u-preference").textContent = remembered
      ? `Last choice on this device: ${remembered}. Change it anytime.`
      : "";
    dialog.querySelectorAll("[data-mode]").forEach(
      (button) =>
        (button.onclick = () => {
          const mode = button.dataset.mode;
          store.set("universe-mode", mode);
          dialog.querySelector("#u-route-picker").hidden = mode !== "guided";
          dialog.querySelector("#u-destinations").hidden = mode === "guided";
          if (mode === "explore") {
            dialog.close();
            if (
              typeof startFlight === "function" &&
              window.scene &&
              window.camera
            ) {
              document
                .getElementById("loading-screen")
                ?.classList.add("hidden");
              if (typeof stopMatrixRain === "function") stopMatrixRain();
              if (currentScene === SCENES.COCKPIT) startFlight();
            } else if (!isHome) location.href = url("index.html?mode=explore");
            else {
              open();
              dialog.querySelector("#u-preference").textContent =
                "3D is unavailable on this device. Use a direct destination below.";
            }
          }
        }),
    );
    dialog
      .querySelectorAll("[data-tour]")
      .forEach((b) => (b.onclick = () => navigateTour(b.dataset.tour, 0)));
    const quiet = dialog.querySelector("#u-quiet");
    quiet.checked =
      store.get("universe-motion") === "off" ||
      (!store.get("universe-motion") &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
    function motion() {
      document.body.classList.toggle("u-motion-off", quiet.checked);
      window.universeReducedMotion = quiet.checked;
    }
    quiet.onchange = () => {
      store.set("universe-motion", quiet.checked ? "off" : "on");
      motion();
    };
    motion();
    const params = new URLSearchParams(location.search);
    const kind = params.get("tour");
    const step = Number(params.get("step") || 0);
    if (
      tours[kind] &&
      Number.isInteger(step) &&
      step >= 0 &&
      step < tours[kind].length
    ) {
      const steps = tours[kind];
      const panel = document.createElement("aside");
      panel.className = "u-tour";
      panel.setAttribute("aria-label", "Guided tour");
      panel.innerHTML = `<span class="u-eyebrow">${kind} tour / ${step + 1} of ${steps.length}</span><p><strong>${steps[step][1]}</strong></p><p>${steps[step][2]}</p><div class="u-actions"><button id="tour-prev" ${step === 0 ? "disabled" : ""}>Back</button><button id="tour-next">${step === steps.length - 1 ? "Finish tour" : "Next stop"}</button><button id="tour-narrate" aria-pressed="false">Read aloud</button><button id="tour-exit">Exit</button></div>`;
      document.body.append(panel);
      const end = () => {
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        panel.remove();
        params.delete("tour");
        params.delete("step");
        history.replaceState(
          {},
          "",
          location.pathname + (params.size ? "?" + params : "") + location.hash,
        );
      };
      panel.querySelector("#tour-prev").onclick = () =>
        navigateTour(kind, step - 1);
      panel.querySelector("#tour-next").onclick = () =>
        step === steps.length - 1 ? end() : navigateTour(kind, step + 1);
      panel.querySelector("#tour-exit").onclick = end;
      panel.querySelector("#tour-narrate").onclick = (e) => {
        if (!("speechSynthesis" in window)) return;
        const b = e.currentTarget;
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          b.setAttribute("aria-pressed", "false");
          return;
        }
        const voice = new SpeechSynthesisUtterance(
          steps[step][1] + ". " + steps[step][2],
        );
        voice.onend = () => b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-pressed", "true");
        speechSynthesis.speak(voice);
      };
    }
    const isHome =
      location.pathname === root.pathname ||
      location.pathname === new URL("index.html", root).pathname;
    if (isHome && !params.has("from")) {
      if (params.get("mode") === "explore" || remembered === "explore")
        dialog.querySelector('[data-mode="explore"]').click();
      else {
        open();
        if (remembered === "guided")
          dialog.querySelector('[data-mode="guided"]').click();
      }
    }
    window.addEventListener("blur", stopMovement);
  });
})();
