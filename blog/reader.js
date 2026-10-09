(() => {
  function queue() {
    try {
      const v = JSON.parse(localStorage.getItem("universe-reading") || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  window.readingQueue = queue;
  window.syncReadingButtons = () =>
    document.querySelectorAll("[data-save]").forEach((b) => {
      const saved = queue().includes(b.dataset.save);
      b.setAttribute("aria-pressed", String(saved));
      b.textContent = saved ? "Saved · remove" : "Save to reading queue";
    });
  document.querySelectorAll("[data-save]").forEach((b) =>
    b.addEventListener("click", () => {
      const list = queue(),
        id = b.dataset.save;
      try {
        localStorage.setItem(
          "universe-reading",
          JSON.stringify(
            list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
          ),
        );
        window.syncReadingButtons();
        window.dispatchEvent(new Event("reading-change"));
      } catch {
        b.textContent = "Storage unavailable";
      }
    }),
  );
  window.syncReadingButtons();
  window.addEventListener("storage", () => {
    window.syncReadingButtons();
    window.dispatchEvent(new Event("reading-change"));
  });
  // Reading options: page width (compact / wide / full), text size, PDF.
  const tools = document.querySelector(".reader-tools");
  if (tools) {
    const root = document.documentElement;
    const SIZES = [0.9, 1, 1.1, 1.2, 1.35];
    const pref = (key, fallback) => {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    };
    const save = (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    };
    let view = pref("reader-view", "wide");
    let size = Math.min(SIZES.length - 1, Math.max(0, Number(pref("reader-size", 1)) || 1));
    const apply = () => {
      root.dataset.view = view;
      root.style.setProperty("--reader-scale", SIZES[size]);
      tools.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
      tools.querySelector(".rt-size").textContent = Math.round(SIZES[size] * 100) + "%";
      tools.querySelector('[data-size="-1"]').disabled = size === 0;
      tools.querySelector('[data-size="1"]').disabled = size === SIZES.length - 1;
    };
    tools.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => {
        view = b.dataset.view;
        save("reader-view", view);
        apply();
      }),
    );
    tools.querySelectorAll("[data-size]").forEach((b) =>
      b.addEventListener("click", () => {
        size = Math.min(SIZES.length - 1, Math.max(0, size + Number(b.dataset.size)));
        save("reader-size", size);
        apply();
      }),
    );
    // The print stylesheet turns the article into a clean document; the
    // browser's print dialog offers "Save as PDF".
    tools.querySelector("[data-pdf]").addEventListener("click", () => window.print());
    tools.hidden = false;
    apply();
  }

  // Reading progress beam + "on this frequency" section tracking.
  const body = document.querySelector(".article-body");
  if (body) {
    const beam = document.createElement("div");
    beam.className = "u-progress";
    beam.setAttribute("aria-hidden", "true");
    document.body.append(beam);
    const update = () => {
      const r = body.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const done = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
      beam.style.transform = `scaleX(${done})`;
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    const links = [...document.querySelectorAll(".article-toc a[href^='#']")];
    if (links.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            links.forEach((a) =>
              a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id),
            );
          }),
        { rootMargin: "0px 0px -70% 0px" },
      );
      links.forEach((a) => {
        const t = document.getElementById(a.getAttribute("href").slice(1));
        if (t) io.observe(t);
      });
    }
  }
  document.getElementById("copy-link")?.addEventListener("click", async () => {
    const status = document.getElementById("reader-status");
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = "Link copied.";
    } catch {
      status.textContent =
        "Copy this address from your browser: " + location.href;
    }
  });
})();
