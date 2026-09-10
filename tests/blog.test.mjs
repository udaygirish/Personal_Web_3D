import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
test("publication builds sanitized articles, math, absolute RSS and removes newly drafted pages", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "universe-publish-"));
  try {
    fs.mkdirSync(path.join(temp, "scripts"));
    fs.mkdirSync(path.join(temp, "worlds"));
    fs.copyFileSync(
      path.join(root, "scripts/build-blog.mjs"),
      path.join(temp, "scripts/build-blog.mjs"),
    );
    fs.copyFileSync(
      path.join(root, "worlds/content.js"),
      path.join(temp, "worlds/content.js"),
    );
    fs.cpSync(path.join(root, "blog/posts"), path.join(temp, "blog/posts"), {
      recursive: true,
    });
    fs.symlinkSync(
      path.join(root, "node_modules"),
      path.join(temp, "node_modules"),
      "dir",
    );
    const metadata =
      "const BLOG_CONFIG={posts:[{id:'test-transmission',title:'Test transmission',date:'2026-09-10',author:'Test',file:'fixture.md',excerpt:'A test',tags:['Robotics']}]};";
    fs.writeFileSync(path.join(temp, "blog/blog-config.js"), metadata);
    fs.writeFileSync(
      path.join(temp, "blog/posts/fixture.md"),
      "# Safe title\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)\n\n$$\nx^2+y^2\n$$\n\n```javascript\nconst value = 42;\n```",
    );
    const build = () => {
      const run = spawnSync(
        process.execPath,
        [path.join(temp, "scripts/build-blog.mjs")],
        {
          env: { ...process.env, SITE_URL: "https://portfolio.example/base/" },
          encoding: "utf8",
        },
      );
      assert.equal(run.status, 0, run.stderr);
    };
    build();
    const article = fs.readFileSync(
      path.join(temp, "blog/articles/test-transmission/index.html"),
      "utf8",
    );
    assert.ok(!article.includes("<script>alert"));
    assert.ok(!article.includes('href="javascript:'));
    assert.ok(article.includes("katex"));
    assert.ok(article.includes("hljs-keyword"));
    assert.ok(
      article.includes(
        "https://portfolio.example/base/blog/articles/test-transmission/",
      ),
    );
    const rss = fs.readFileSync(path.join(temp, "blog/feed.xml"), "utf8");
    assert.ok(
      rss.includes(
        "https://portfolio.example/base/blog/articles/test-transmission/",
      ),
    );
    fs.appendFileSync(
      path.join(temp, "blog/blog-config.js"),
      "BLOG_CONFIG.posts[0].draft=true;",
    );
    build();
    assert.ok(
      !fs.existsSync(
        path.join(temp, "blog/articles/test-transmission/index.html"),
      ),
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
