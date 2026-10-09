(async () => {
  const title = document.getElementById("gate-title"),
    status = document.getElementById("gate-status"),
    logEl = document.getElementById("gate-log");
  const setState = (state) => {
    document.body.classList.remove("gate-pending", "gate-locked", "gate-open", "gate-offline");
    document.body.classList.add("gate-" + state);
  };
  const check = (name, state) =>
    document.querySelector(`[data-check="${name}"]`)?.setAttribute("data-state", state);
  const log = (line) => {
    const li = document.createElement("li");
    li.textContent = line;
    logEl.append(li);
  };
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  ["gateway", "identity", "session"].forEach((c) => check(c, "idle"));
  check("gateway", "pending");
  log("> handshake --target gateway");
  try {
    const gateway = new URL(window.COMMAND_GATEWAY_ORIGIN || location.origin);
    if (gateway.origin !== location.origin) {
      if (gateway.protocol !== "https:") throw new Error("invalid gateway");
      check("gateway", "ok");
      log("gateway located on secure host");
      title.textContent = "Private gateway";
      status.textContent = "Continue to the secure host to authenticate.";
      const link = document.getElementById("gate-login");
      link.href = gateway.origin + "/command/index.html";
      link.textContent = "Continue to private gateway";
      link.hidden = false;
      setState("locked");
      return;
    }
    const response = await fetch("/auth/status", {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error("gateway unavailable");
    const state = await response.json();
    check("gateway", "ok");
    log("gateway online");
    await pause(250);
    if (!state.configured) {
      check("identity", "fail");
      log("identity provider not configured");
      title.textContent = "Gateway awaiting setup";
      status.textContent = "Owner access is not enabled on this host yet.";
      setState("offline");
      return;
    }
    check("identity", "pending");
    log("> verify --owner");
    await pause(350);
    if (state.signedIn) {
      check("identity", "ok");
      check("session", "ok");
      log("owner identity confirmed");
      log("session active — airlock unsealed");
    } else {
      check("identity", "locked");
      check("session", "idle");
      log("no active session — authentication required");
    }
    title.textContent = state.signedIn ? "Welcome back, Commander." : "Authenticate to enter.";
    status.textContent = state.signedIn
      ? "Your owner session is active."
      : "Only the configured owner account can enter.";
    const link = document.getElementById(state.signedIn ? "gate-open" : "gate-login");
    link.href = state.signedIn ? "/private/" : "/auth/google";
    link.hidden = false;
    setState(state.signedIn ? "open" : "locked");
  } catch {
    check("gateway", "fail");
    log("ERR: no response from gateway");
    log("this host serves the public universe only");
    title.textContent = "Gateway unavailable";
    status.textContent = "The private gateway is offline or this is a public-only host.";
    const retry = document.getElementById("gate-retry");
    retry.hidden = false;
    retry.onclick = () => location.reload();
    setState("offline");
  }
})();
