(async () => {
  const status = document.getElementById("deck-status");
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
    apps.forEach((app) => {
      const link = document.createElement("a");
      link.className = "u-card";
      link.href = app.href;
      const h = document.createElement("h2");
      h.textContent = app.name;
      const p = document.createElement("p");
      p.textContent = app.description;
      link.append(h, p);
      grid.append(link);
    });
    document.getElementById("deck-empty").hidden = apps.length > 0;
    status.textContent = apps.length
      ? `${apps.length} private destination${apps.length === 1 ? "" : "s"} available.`
      : "";
  } catch {
    status.textContent =
      "Could not load the Command Deck. Reload to try again.";
  }
})();
