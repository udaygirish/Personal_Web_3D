(async () => {
  const title = document.getElementById("gate-title"),
    status = document.getElementById("gate-status");
  try {
    const gateway = new URL(window.COMMAND_GATEWAY_ORIGIN || location.origin);
    if (gateway.origin !== location.origin) {
      if (gateway.protocol !== "https:") throw new Error("invalid gateway");
      title.textContent = "Private gateway";
      status.textContent = "Continue to the secure host to authenticate.";
      const link = document.getElementById("gate-login");
      link.href = gateway.origin + "/command/index.html";
      link.textContent = "Continue to private gateway";
      link.hidden = false;
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
    if (!state.configured) {
      title.textContent = "Gateway awaiting setup";
      status.textContent = "Owner access is not enabled on this host yet.";
      return;
    }
    title.textContent = state.signedIn
      ? "Welcome back, Commander."
      : "Authenticate to enter.";
    status.textContent = state.signedIn
      ? "Your owner session is active."
      : "Only the configured owner account can enter.";
    const link = document.getElementById(
      state.signedIn ? "gate-open" : "gate-login",
    );
    link.href = state.signedIn ? "/private/" : "/auth/google";
    link.hidden = false;
  } catch {
    title.textContent = "Gateway unavailable";
    status.textContent =
      "The private gateway is offline or this is a public-only host.";
    const retry = document.getElementById("gate-retry");
    retry.hidden = false;
    retry.onclick = () => location.reload();
  }
})();
