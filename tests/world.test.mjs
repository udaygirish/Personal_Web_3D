import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = (p) =>
  fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("fixed-step simulation advances equally at 30, 60 and 144Hz", () => {
  const ctx = {};
  vm.runInNewContext(read("shared/clock.js"), ctx);
  for (const fps of [30, 60, 144]) {
    let steps = 0;
    const advance = ctx.UniverseClock.createStepper(
      () => steps++,
      () => {},
    );
    for (let i = 0; i <= fps; i++) advance((i * 1000) / fps);
    assert.equal(steps, 60);
  }
  let steps = 0;
  const advance = ctx.UniverseClock.createStepper(
    () => steps++,
    () => {},
  );
  advance(0);
  advance(60000);
  assert.ok(
    steps <= 6,
    "background tabs cannot accumulate unbounded simulation work",
  );
});
test("shared-global root scripts parse together without redeclaration collisions", () => {
  const names = [
    "shared/clock.js",
    "js/state.js",
    "config.js",
    "matrix.js",
    "hud.js",
    "mobile.js",
    "js/environment.js",
    "js/audio.js",
    "js/weapons.js",
    "js/flight.js",
    "js/ui_systems.js",
    "js/core.js",
  ];
  new vm.Script(names.map(read).join("\n"));
});
test("planet data expands public moons without fabricated published content", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("my_world_view/world-content.js"), ctx);
  Object.assign(ctx, ctx.window);
  vm.runInNewContext(read("my_world_view/world-enhancements.js"), ctx);
  const systems = [
    {
      planets: Object.keys(ctx.WORLD_CONTENT).map((name) => ({
        name,
        content: {},
        billboards: [{ title: "Sample", desc: "Existing" }],
      })),
    },
  ];
  ctx.enrichWorldSystems(systems);
  assert.equal(systems[0].planets.length, 10);
  assert.equal(systems[0].planets.filter((p) => p.href).length, 6);
  assert.ok(systems[0].planets[2].billboards[0].href);
});
test("console retains a bounded log and safely renders text", () => {
  const output = {
    replaceChildren(...children) {
      this.children = children;
    },
    scrollHeight: 0,
  };
  const ctx = {
    document: { getElementById: () => output, createElement: () => ({}) },
  };
  vm.runInNewContext(read("js/weapons.js"), ctx);
  for (let i = 0; i < 25; i++) ctx.writeToConsole("<tag>" + i);
  assert.equal(output.children.length, 20);
  assert.equal(output.children[0].textContent, "<tag>5");
  assert.equal(output.children.at(-1).textContent, "<tag>24");
});
