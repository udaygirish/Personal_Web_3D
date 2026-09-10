import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { Marked, Renderer } from "marked";
import sanitizeHtml from "sanitize-html";
import hljs from "highlight.js";
import katex from "katex";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const context = {};
vm.runInNewContext(
  fs.readFileSync("blog/blog-config.js", "utf8") + ";this.config=BLOG_CONFIG",
  context,
);
const siteURL = process.env.SITE_URL || "";
if (siteURL && !/^https:\/\//.test(siteURL))
  throw new Error(
    "SITE_URL must be an HTTPS URL including any deployment base path",
  );
const abs = (p) =>
  siteURL ? new URL(p, siteURL.replace(/\/?$/, "/")).href : null;
const head = (title, description, prefix, canonical = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Uday’s Universe</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${canonical ? "article" : "website"}">${canonical ? `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">` : ""}<link rel="stylesheet" href="${prefix}shared/universe.css"><link rel="stylesheet" href="${prefix}blog/style.css"><link rel="stylesheet" href="${prefix}blog/vendor/katex/katex.min.css"><script defer src="${prefix}shared/universe.js"></script></head><body class="u-page"><div class="u-container"><nav class="u-nav"><a href="${prefix}index.html">UDAY’S UNIVERSE</a><a href="${prefix}my_world_view/index.html">My World View</a><a href="${prefix}blog/index.html">Transmission Archive</a></nav>`;
const foot = "</div></body></html>";
const clean = sanitizeHtml;
const published = context.config.posts
  .filter((p) => !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date));
const posts = published.map((p) => {
  if (!/^[a-z0-9-]+$/.test(p.id)) throw new Error("Unsafe post ID");
  let md = fs
    .readFileSync(path.join("blog/posts", p.file), "utf8")
    .replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  md = md.replace(
    /https:\/\/github.com\/udaygirish\/udaygirish.github.io\/raw\/master\/_posts\//g,
    "../../../my_web/_posts/",
  );
  // The original welcome post references an image that is absent from the repository.
  md = md.replace(/!\[Space\]\(\.\.\/images\/space-header.jpg\)\s*/, "");
  const math = [];
  const mathExtensions = [
    {
      name: "displayMath",
      level: "block",
      start: (src) => src.indexOf("$$"),
      tokenizer(src) {
        const match = /^\$\$\s*\n?([\s\S]+?)\$\$(?:\n|$)/.exec(src);
        if (match)
          return { type: "displayMath", raw: match[0], text: match[1] };
      },
      renderer(token) {
        const id = math.length;
        math.push(
          katex.renderToString(token.text, {
            displayMode: true,
            throwOnError: false,
            trust: false,
          }),
        );
        return '<span id="math-' + id + '"></span>';
      },
    },
    {
      name: "inlineMath",
      level: "inline",
      start: (src) => src.indexOf("$"),
      tokenizer(src) {
        const match = /^\$([^$\n]+?)\$/.exec(src);
        if (match) return { type: "inlineMath", raw: match[0], text: match[1] };
      },
      renderer(token) {
        const id = math.length;
        math.push(
          katex.renderToString(token.text, {
            throwOnError: false,
            trust: false,
          }),
        );
        return '<span id="math-' + id + '"></span>';
      },
    },
  ];
  const headings = [];
  const renderer = new Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = "section-" + headings.length;
    headings.push({ id, text: text.replace(/<[^>]*>/g, ""), depth });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  renderer.code = function ({ text, lang }) {
    const language = (lang || "").split(/\s/)[0];
    const code = hljs.getLanguage(language)
      ? hljs.highlight(text, { language }).value
      : esc(text);
    return `<pre><code class="hljs">${code}</code></pre>`;
  };
  const parser = new Marked({ renderer, extensions: mathExtensions });
  let html = clean(parser.parse(md), {
    allowedTags: clean.defaults.allowedTags.concat(["img", "h1", "h2", "span"]),
    allowedAttributes: {
      ...clean.defaults.allowedAttributes,
      "*": ["id", "class"],
      img: ["src", "alt", "title", "loading"],
      a: ["href", "title", "rel"],
    },
    transformTags: {
      img: clean.simpleTransform("img", { loading: "lazy" }),
      a: clean.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
  html = html.replace(
    /<span id="math-(\d+)"><\/span>/g,
    (_, id) => math[Number(id)] || "",
  );
  const text = clean(html, { allowedTags: [], allowedAttributes: {} });
  const minutes = Math.max(1, Math.ceil(text.split(/\s+/).length / 220));
  return { ...p, minutes, html, headings, text, series: p.series || null };
});
const card = (p, prefix = "") =>
  `<article class="u-card transmission" data-post="${esc(p.id)}"><p class="u-eyebrow">${esc(p.tags[0] || "Field notes")} / ${esc(p.date)}</p><h2><a href="${prefix}articles/${p.id}/">${esc(p.title)}</a></h2><p class="u-muted">${esc(p.excerpt)}</p><div>${p.tags.map((t) => `<span class="u-chip">${esc(t)}</span>`).join("")}</div><div class="u-actions"><span class="u-muted">${p.minutes} min read</span><button data-save="${p.id}" aria-pressed="false">Save</button></div></article>`;
fs.rmSync("blog/articles", { recursive: true, force: true });
fs.mkdirSync("blog/articles", { recursive: true });
for (const p of posts) {
  const related = posts
    .filter((q) => q.id !== p.id && q.tags.some((t) => p.tags.includes(t)))
    .slice(0, 3);
  const siblings = p.series
    ? posts
        .filter((q) => q.series === p.series)
        .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0))
    : [];
  const html =
    head(p.title, p.excerpt, "../../../", abs(`blog/articles/${p.id}/`)) +
    `<main><header class="u-hero article-hero"><p class="u-eyebrow">TRANSMISSION / ${esc(p.date)} / ${p.minutes} MIN READ</p><h1>${esc(p.title)}</h1><p class="u-muted">${esc(p.author)}${p.updated ? " · Updated " + esc(p.updated) : ""}</p><div class="u-actions"><a class="u-button" href="../../index.html">All transmissions</a><button data-save="${p.id}" aria-pressed="false">Save to reading queue</button><button id="copy-link">Copy link</button></div><p id="reader-status" role="status"></p></header><div class="reading-layout"><aside class="article-toc"><p class="u-eyebrow">ON THIS FREQUENCY</p>${p.headings
      .filter((h) => h.depth <= 3)
      .map((h) => `<a href="#${h.id}">${esc(h.text)}</a>`)
      .join(
        "",
      )}</aside><article class="article-body">${p.html}</article></div>${siblings.length ? `<section><h2>${esc(p.series)}</h2><ol>${siblings.map((q) => `<li><a href="../${q.id}/" ${q.id === p.id ? 'aria-current="page"' : ""}>${esc(q.title)}</a></li>`).join("")}</ol></section>` : ""}<section class="related"><p class="u-eyebrow">CONNECTED SIGNALS</p><h2>Continue exploring.</h2><div class="u-grid">${related.map((q) => card(q, "../../")).join("")}</div></section></main><footer class="u-footer">Transmission Archive · <a href="../../feed.xml">RSS feed</a> · <a href="../../../my_world_view/index.html?planet=Projects">Explore projects in orbit</a></footer><script src="../../reader.js"></script>` +
    foot;
  fs.mkdirSync(`blog/articles/${p.id}`, { recursive: true });
  fs.writeFileSync(`blog/articles/${p.id}/index.html`, html);
}
fs.writeFileSync(
  "blog/index.html",
  head(
    "Transmission Archive",
    "Notes on AI, robotics and the ideas behind the work.",
    "../",
  ) +
    `<main><header class="u-hero archive-hero"><div><p class="u-eyebrow">ORBITAL LIBRARY / ${posts.length} TRANSMISSIONS</p><h1>Thoughts from<br>the frontier.</h1><p class="u-muted">AI, robotics and the ideas behind the work. Tune into a channel, or follow a thread.</p></div><div class="archive-signal" aria-hidden="true"><span>ARCHIVE</span><strong>${String(posts.length).padStart(2, "0")}</strong><span>PUBLIC TRANSMISSIONS</span></div></header><section aria-label="Search transmissions" class="archive-controls"><label>Search the archive<input id="archive-search" type="search" placeholder="Title, topic or article text…"></label><label>Channel<select id="archive-channel"><option value="">All channels</option>${[
      ...new Set(posts.flatMap((p) => p.tags)),
    ]
      .sort()
      .map((t) => `<option>${esc(t)}</option>`)
      .join(
        "",
      )}</select></label><button id="queue-toggle" aria-pressed="false">Reading queue</button><a class="u-button" href="feed.xml">RSS</a></section><p id="archive-count" role="status">${posts.length} transmissions</p><div class="u-grid" id="posts-grid">${posts.map((p) => card(p)).join("")}</div><p id="archive-empty" hidden>No transmissions match. Try a different channel or search.</p></main><footer class="u-footer">Reading queue is saved on this device. <a href="../worlds/index.html#philosophy">Visit the Philosophy Observatory</a></footer><script src="search-data.js"></script><script src="reader.js"></script><script src="script.js"></script>` +
    foot,
);
fs.writeFileSync(
  "blog/search-data.js",
  "window.TRANSMISSIONS = " +
    JSON.stringify(posts.map(({ html, headings, ...p }) => p)).replace(
      /</g,
      "\\u003c",
    ) +
    ";\n",
);
const feedLink = abs("blog/index.html") || "index.html";
fs.writeFileSync(
  "blog/feed.xml",
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Uday’s Transmission Archive</title><link>${esc(feedLink)}</link><description>AI, robotics and ideas.</description>${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${esc(abs("blog/articles/" + p.id + "/") || "articles/" + p.id + "/")}</link><guid isPermaLink="false">uday-transmission-${p.id}</guid><pubDate>${new Date(p.date + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join("")}</channel></rss>`,
);
const worldContext = { window: {} };
vm.runInNewContext(fs.readFileSync("worlds/content.js", "utf8"), worldContext);
fs.writeFileSync(
  "worlds/index.html",
  head(
    "Beyond the Résumé",
    "Outer satellites: ideas, creativity, reflections and future directions.",
    "../",
  ) +
    `<main><header class="u-hero"><p class="u-eyebrow">OUTER SATELLITES / PERSONAL UNIVERSE</p><h1>There’s more<br>out here.</h1><p class="u-muted">A growing archive of ideas and creative work. Unpublished collections are marked clearly.</p><div class="u-actions">${worldContext.window.OUTER_WORLDS.map((w) => `<a class="u-button" href="#${w.id}">${w.title}</a>`).join("")}</div></header>${worldContext.window.OUTER_WORLDS.map((w) => `<section class="outer-world" id="${w.id}"><p class="u-eyebrow">${esc(w.kind)}</p><h2>${esc(w.title)}</h2><p class="u-muted">${esc(w.description)}</p>${w.items.length ? `<div class="u-grid">${w.items.map((i) => `<a class="u-card" href="${esc(i.href)}">${i.image ? `<img src="${esc(i.image)}" alt="${esc(i.title)}" loading="lazy">` : ""}${i.status ? `<span class="u-chip">${esc(i.status)}</span>` : ""}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></a>`).join("")}</div>` : `<p class="u-card u-muted">${esc(w.empty)}</p>`}</section>`).join("")}</main><footer class="u-footer"><a href="../my_world_view/index.html">Return to orbit</a> · <a href="../blog/index.html">Read published transmissions</a></footer>` +
    foot,
);
fs.mkdirSync("blog/vendor/katex", { recursive: true });
fs.cpSync(
  "node_modules/katex/dist/katex.min.css",
  "blog/vendor/katex/katex.min.css",
  { recursive: true },
);
fs.cpSync("node_modules/katex/dist/fonts", "blog/vendor/katex/fonts", {
  recursive: true,
});
fs.copyFileSync("node_modules/katex/LICENSE", "blog/vendor/katex/LICENSE");
console.log(
  `Built ${posts.length} articles, archive and outer satellites; RSS is emitted when SITE_URL is configured.`,
);
if (!siteURL)
  console.log(
    "Set SITE_URL to the production origin/base path and rebuild for absolute RSS and canonical URLs.",
  );

if (!siteURL) {
  fs.rmSync("blog/feed.xml", { force: true });
  for (const file of [
    "blog/index.html",
    ...posts.map((p) => "blog/articles/" + p.id + "/index.html"),
  ]) {
    const page = fs
      .readFileSync(file, "utf8")
      .replace(/<a[^>]*href="(?:\.\.\/)*feed\.xml"[^>]*>[^<]*<\/a>/g, "");
    fs.writeFileSync(file, page);
  }
}
