(function (root) {
  function createStepper(step, render) {
    let last = null,
      accumulator = 0;
    return function advance(now) {
      if (last === null) last = now;
      accumulator += Math.max(0, Math.min(now - last, 100));
      last = now;
      while (accumulator + 1e-7 >= 1000 / 60) {
        step();
        accumulator -= 1000 / 60;
      }
      render();
    };
  }
  root.UniverseClock = {
    createStepper,
    start(step, render) {
      const advance = createStepper(step, render);
      function frame(now) {
        advance(now);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },
  };
})(typeof window === "undefined" ? globalThis : window);
