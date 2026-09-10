import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { Parser } from "htmlparser2";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
let failures = [];
let scripts = 0,
  pages = 0;
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const source = [
  ...walk("js"),
  ...walk("shared"),
  ...walk("command"),
  ...walk("server"),
  ...walk("scripts"),
  ...walk("tests"),
  ...walk("my_world_view"),
  ...walk("blog"),
  ...walk("worlds"),
  "config.js",
  "hud.js",
  "matrix.js",
  "mobile.js",
  "personal/script.js",
  "work/script.js",
  "my_web/script.js",
];
for (const file of source.filter((f) => /\.(m?js)$/.test(f))) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status) failures.push(file + ": " + result.stderr);
  scripts++;
}
const htmlFiles = [
  "index.html",
  "personal/index.html",
  "work/index.html",
  "my_web/index.html",
  "my_world_view/index.html",
  "worlds/index.html",
  "command/index.html",
  "server/deck.html",
  ...walk("blog").filter((f) => f.endsWith(".html")),
];
for (const file of htmlFiles) {
  pages++;
  const html = fs.readFileSync(file, "utf8");
  const ids = new Set();
  new Parser({
    onopentag(tag, attrs) {
      if (attrs.id) {
        if (ids.has(attrs.id))
          failures.push(`${file}: duplicate id ${attrs.id}`);
        ids.add(attrs.id);
      }
      for (const attr of ["src", "href"]) {
        const value = attrs[attr];
        if (!value || /^(https?:|mailto:|tel:|data:|#|javascript:)/.test(value))
          continue;
        if (value.startsWith("/auth/") || value.startsWith("/private/"))
          continue;
        const bare = decodeURIComponent(value.split(/[?#]/)[0]);
        if (!bare) continue;
        let target = bare.startsWith("/")
          ? path.join(root, bare.slice(1))
          : path.resolve(path.dirname(file), bare);
        if (fs.existsSync(target) && fs.statSync(target).isDirectory())
          target = path.join(target, "index.html");
        if (!fs.existsSync(target)) failures.push(`${file}: missing ${value}`);
      }
    },
  }).end(html);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Checked ${scripts} JavaScript files and ${pages} HTML pages with local asset references.`,
);
