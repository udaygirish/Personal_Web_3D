(() => {
  const search = document.getElementById("archive-search"),
    channel = document.getElementById("archive-channel"),
    toggle = document.getElementById("queue-toggle");
  let onlySaved = false;
  const params = new URLSearchParams(location.search);
  search.value = params.get("q") || "";
  channel.value = params.get("channel") || "";
  function filter() {
    const q = search.value.trim().toLowerCase(),
      saved = window.readingQueue();
    let count = 0;
    TRANSMISSIONS.forEach((post) => {
      const matches =
        (!q ||
          (
            post.title +
            " " +
            post.excerpt +
            " " +
            post.text +
            " " +
            post.tags.join(" ")
          )
            .toLowerCase()
            .includes(q)) &&
        (!channel.value || post.tags.includes(channel.value)) &&
        (!onlySaved || saved.includes(post.id));
      const card = document.querySelector(`[data-post="${post.id}"]`);
      card.hidden = !matches;
      if (matches) count++;
    });
    document.getElementById("archive-count").textContent =
      `${count} transmission${count === 1 ? "" : "s"}${onlySaved ? " in your reading queue" : ""}`;
    document.getElementById("archive-empty").hidden = count > 0;
    const p = new URLSearchParams(location.search);
    q ? p.set("q", q) : p.delete("q");
    channel.value ? p.set("channel", channel.value) : p.delete("channel");
    history.replaceState({}, "", location.pathname + (p.size ? "?" + p : ""));
  }
  search.oninput = filter;
  channel.onchange = filter;
  toggle.onclick = () => {
    onlySaved = !onlySaved;
    toggle.setAttribute("aria-pressed", String(onlySaved));
    filter();
  };
  window.addEventListener("reading-change", filter);
  filter();
})();
