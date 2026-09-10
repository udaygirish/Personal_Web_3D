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
