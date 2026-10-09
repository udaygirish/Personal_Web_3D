(async () => {
  const status = document.getElementById("deck-status");
  const clock = document.getElementById("deck-clock");
  const tick = () => (clock.textContent = new Date().toLocaleTimeString([], { hour12: false }));
  tick();
  setInterval(tick, 1000);
  try {
    const sessionResponse = await fetch("/api/private/session", {
      cache: "no-store",
    });
    if (sessionResponse.status === 401) {
      location.replace("/command/index.html");
      return;
    }
    if (!sessionResponse.ok) throw new Error("session");
    const owner = await sessionResponse.json();
    document.getElementById("owner-email").textContent = owner.email;
    document.getElementById("logout-csrf").value = owner.csrf;
    document.getElementById("sign-out").disabled = false;
    const response = await fetch("/api/private/apps", { cache: "no-store" });
    if (!response.ok) throw new Error("apps");
    const apps = await response.json();
    const grid = document.getElementById("private-apps");
    apps.forEach((app, i) => {
      const link = document.createElement("a");
      link.className = "deck-module";
      link.href = app.href;
      link.style.setProperty("--i", i);
      const emblem = document.createElement("span");
      emblem.className = "deck-emblem";
      emblem.setAttribute("aria-hidden", "true");
      emblem.textContent = (app.name || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const body = document.createElement("span");
      body.className = "deck-module-body";
      const bay = document.createElement("span");
      bay.className = "u-eyebrow";
      bay.textContent = `BAY ${String(i + 1).padStart(2, "0")}`;
      const h = document.createElement("strong");
      h.textContent = app.name;
      const p = document.createElement("span");
      p.className = "deck-desc";
      p.textContent = app.description || "";
      body.append(bay, h, p);
      const go = document.createElement("span");
      go.className = "deck-launch";
      go.textContent = "Launch ▸";
      link.append(emblem, body, go);
      grid.append(link);
    });
    document.getElementById("deck-empty").hidden = apps.length > 0;
    status.textContent = apps.length
      ? `${apps.length} module${apps.length === 1 ? "" : "s"} docked`
      : "No modules docked";
  } catch {
    status.textContent = "Could not load the Command Deck. Reload to try again.";
  }
})();
