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
