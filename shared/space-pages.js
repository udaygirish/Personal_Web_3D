/* Personal / Work / Research pages: numbered section eyebrows, header
   link that tracks the section in view, and a current-year footer. */
(() => {
  const run = () => {
    const sections = [...document.querySelectorAll("section[id]")].filter((s) =>
      s.querySelector(".section-title"),
    );
    sections.forEach((s, i) => {
      const title = s.querySelector(".section-title");
      if (title.previousElementSibling?.classList.contains("section-eyebrow")) return;
      const eyebrow = document.createElement("span");
      eyebrow.className = "section-eyebrow";
      eyebrow.setAttribute("aria-hidden", "true");
      eyebrow.textContent = `// ${String(i + 1).padStart(2, "0")} · ${s.id}`;
      title.before(eyebrow);
    });
    const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
    if (links.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
          }),
        { rootMargin: "-40% 0px -55% 0px" },
      );
      document.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    }
    document.querySelectorAll(".footer p").forEach((p) => {
      p.innerHTML = p.innerHTML.replace(/©\s*\d{4}|&copy;\s*\d{4}/, "© " + new Date().getFullYear());
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
