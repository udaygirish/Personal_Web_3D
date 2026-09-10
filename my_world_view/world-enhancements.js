/* New scene features extend the original renderer and rover without replacing them. */
function enrichWorldSystems(systems) {
  systems[0].planets.forEach((p) => {
    const info = WORLD_CONTENT[p.name];
    p.content.description = info.description;
    p.billboards = p.billboards.map((board) => ({
      ...board,
      ...WORLD_EXHIBITS[board.title],
      href: WORLD_EXHIBITS[board.title]?.href || info.href,
    }));
  });
  WORLD_MOONS.forEach((m, i) =>
    systems[0].planets.push({
      name: m.name,
      orbit: 510 + i * 42,
      size: 7 + (i % 3),
      color: m.color,
      speed: 0.0002 + i * 0.000015,
      href: `../worlds/index.html#${m.slug}`,
      content: {
        title: m.title,
        description: "A satellite beyond the résumé.",
        details: ["Open the archive to explore this part of the universe."],
      },
    }),
  );
}
function addWorldLandmarks(planetData) {
  const info = WORLD_CONTENT[planetData.name];
  if (!info) return;
  const landmark = new THREE.Group();
  landmark.position.set(0, 0, -95);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x344256,
    metalness: 0.65,
    roughness: 0.4,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: info.accent,
    emissive: info.accent,
    emissiveIntensity: 0.35,
  });
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(21, 24, 2, 48),
    metal,
  );
  platform.position.y = 1;
  landmark.add(platform);
  // Four supporting columns and a recognizable open observation ring.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.8, 16, 12),
      metal,
    );
    pillar.position.set(Math.cos(a) * 16, 9, Math.sin(a) * 16);
    landmark.add(pillar);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(19, 1.4, 12, 64), glow);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 18;
  landmark.add(ring);
  const lamp = new THREE.PointLight(info.accent, 1, 85);
  lamp.position.y = 12;
  landmark.add(lamp);
  if (planetData.name === "Education") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x91bfd8,
        transparent: true,
        opacity: 0.28,
        metalness: 0.6,
        roughness: 0.15,
        side: THREE.DoubleSide,
      }),
    );
    dome.position.y = 18;
    landmark.add(dome);
  } else if (planetData.name === "Projects") {
    const robot = new THREE.Group();
    robot.position.y = 3;
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 2), glow);
      arm.position.set(i * 2, 3 + i * 4, 0);
      arm.rotation.z = -0.35;
      robot.add(arm);
    }
    landmark.add(robot);
  }
  landmark.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  roverScene.add(landmark);
  for (let i = 0; i < 16; i++) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 3), glow);
    marker.position.set(i % 2 ? -25 : 25, 0.25, -i * 16);
    roverScene.add(marker);
  }
  const sun = new THREE.DirectionalLight(0xffe1ba, 0.8);
  sun.position.set(60, 90, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -130,
    right: 130,
    top: 130,
    bottom: -130,
    near: 1,
    far: 350,
  });
  sun.shadow.bias = -0.001;
  roverScene.add(sun);
}
function addOrbitalStation() {
  const station = new THREE.Group();
  station.position.set(0, 55, 60);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(16, 1.6, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0x97b8c7,
      metalness: 0.7,
      roughness: 0.35,
    }),
  );
  ring.rotation.x = 0.55;
  station.add(ring);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 10, 16),
    new THREE.MeshStandardMaterial({ color: 0x81e4df, emissive: 0x164b59 }),
  );
  station.add(hub);
  starSystems[0].group.add(station);
  station.userData.station = true;
}
function showWorldExhibit(board) {
  const dialog = document.getElementById("world-exhibit");
  dialog.querySelector("[data-title]").textContent = board.title;
  dialog.querySelector("[data-description]").textContent =
    board.text || board.desc;
  const img = dialog.querySelector("img");
  img.hidden = !board.image;
  if (board.image) {
    img.src = board.image;
    img.alt = board.title + " project image";
  }
  const link = dialog.querySelector("[data-link]");
  link.href =
    board.href ||
    WORLD_CONTENT[currentPlanetData?.name]?.href ||
    "../my_web/index.html";
  link.textContent = board.label || "Explore the full story";
  const robot = dialog.querySelector("[data-robot]");
  robot.hidden = !/Manipulator|Grasping/.test(board.title);
  if (!robot.hidden) drawRobot();
  Object.keys(controls).forEach((k) => (controls[k] = false));
  if (document.pointerLockElement) document.exitPointerLock();
  dialog.showModal();
}
function drawRobot() {
  const canvas = document.getElementById("robot-demo"),
    ctx = canvas.getContext("2d");
  const joints = [...document.querySelectorAll("[data-joint]")].map(
    (e) => (Number(e.value) * Math.PI) / 180,
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#091322";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1d344c";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  let x = canvas.width / 2,
    y = canvas.height - 25,
    angle = -Math.PI / 2;
  ctx.lineCap = "round";
  joints.forEach((joint, i) => {
    angle += joint;
    const nx = x + Math.cos(angle) * (80 - i * 15),
      ny = y + Math.sin(angle) * (80 - i * 15);
    ctx.strokeStyle = ["#81e4df", "#c7b4ff", "#f4c77e"][i];
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.fillStyle = "#e8eef7";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    x = nx;
    y = ny;
  });
  document.getElementById("robot-position").textContent =
    `End effector: x ${Math.round(x - canvas.width / 2)}, y ${Math.round(canvas.height - 25 - y)} (illustrative units)`;
}
function initWorldExplorer() {
  addOrbitalStation();
  const panel = document.createElement("aside");
  panel.className = "world-directory";
  panel.innerHTML = `<p class="u-eyebrow">ORBITAL STATION / MY JOURNEY</p><h2>Chart your course.</h2><p>Choose a planet to inspect its exhibits or land.</p><div class="world-planet-list">${Object.entries(
    WORLD_CONTENT,
  )
    .map(
      ([name, info]) =>
        `<button data-planet="${name}"><strong>${name}</strong><span>${info.subtitle}</span></button>`,
    )
    .join(
      "",
    )}</div><div class="u-actions"><button id="world-photo">Photo mode</button><button id="world-orbit">Station view</button></div><a href="../worlds/index.html">Explore the outer satellites →</a><label>Graphics <select id="world-quality"><option value="1">Standard</option><option value="1.75">High</option></select></label><button id="world-directory-toggle">Hide directory</button>`;
  document.body.append(panel);
  const exhibit = document.createElement("dialog");
  exhibit.id = "world-exhibit";
  exhibit.className = "u-dialog";
  exhibit.innerHTML = `<button class="u-close">Close</button><p class="u-eyebrow">FIELD ARCHIVE / EXHIBIT</p><h2 data-title></h2><p data-description></p><img hidden style="max-width:100%;max-height:300px;object-fit:contain" alt=""><div data-robot hidden><h3>Explore a planar arm</h3><p class="u-muted">An illustrative forward-kinematics demo, not the project's original simulator.</p><canvas id="robot-demo" width="500" height="280" style="width:100%"></canvas>${[1, 2, 3].map((n) => `<label style="display:block">Joint ${n}<input data-joint type="range" min="-90" max="90" value="${n * 15}" aria-label="Joint ${n} angle"></label>`).join("")}<p id="robot-position" aria-live="polite"></p></div><div class="u-actions"><a data-link class="u-button primary">Explore</a></div>`;
  document.body.append(exhibit);
  exhibit.querySelector("button").onclick = () => exhibit.close();
  exhibit
    .querySelectorAll("[data-joint]")
    .forEach((e) => (e.oninput = drawRobot));
  const choose = (name) => {
    const p = planets.find((p) => p.userData.name === name);
    if (!p || isRoverMode) return;
    camera = camera3D;
    currentView = "3D";
    switchView("3D");
    scene.updateMatrixWorld(true);
    const pos = p.getWorldPosition(new THREE.Vector3());
    camera3D.position.copy(pos).add(new THREE.Vector3(0, 35, 95));
    camera3D.lookAt(pos);
    const euler = new THREE.Euler().setFromQuaternion(
      camera3D.quaternion,
      "YXZ",
    );
    shipPitch = euler.x;
    shipYaw = euler.y;
    selectedObject = p;
    showPlanetInfo(p);
  };
  panel
    .querySelectorAll("[data-planet]")
    .forEach((b) => (b.onclick = () => choose(b.dataset.planet)));
  panel.querySelector("#world-orbit").onclick = () => {
    if (isRoverMode) {
      returnToOrbit();
      return;
    }
    switchView("3D");
    camera3D.position.set(0, 520, 800);
    camera3D.lookAt(0, 0, 0);
    const e = new THREE.Euler().setFromQuaternion(camera3D.quaternion, "YXZ");
    shipPitch = e.x;
    shipYaw = e.y;
    selectedObject = null;
    document.getElementById("planetInfoCard").classList.remove("active");
  };
  panel.querySelector("#world-quality").onchange = (e) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, Number(e.target.value)));
    renderer.shadowMap.enabled = Number(e.target.value) > 1;
    UniversePreferences.set("world-quality", e.target.value);
  };
  const quality = UniversePreferences.get("world-quality") || "1";
  panel.querySelector("#world-quality").value = quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio, Number(quality)));
  renderer.shadowMap.enabled = Number(quality) > 1;
  panel.querySelector("#world-directory-toggle").onclick = (e) => {
    panel.classList.toggle("collapsed");
    e.target.textContent = panel.classList.contains("collapsed")
      ? "Show directory"
      : "Hide directory";
  };
  const photo = document.createElement("div");
  photo.className = "world-photo-controls";
  photo.hidden = true;
  photo.innerHTML =
    "<span>Photo mode · Drag to look around</span><button>Save postcard</button><button>Exit photo mode</button>";
  document.body.append(photo);
  panel.querySelector("#world-photo").onclick = () => {
    document.body.classList.add("world-photo");
    photo.hidden = false;
  };
  photo.lastElementChild.onclick = () => {
    document.body.classList.remove("world-photo");
    photo.hidden = true;
  };
  photo.querySelector("button").onclick = () => {
    renderer.render(scene, camera);
    const c = document.createElement("canvas");
    c.width = renderer.domElement.width;
    c.height = renderer.domElement.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(renderer.domElement, 0, 0);
    ctx.fillStyle = "#07101dcc";
    ctx.fillRect(0, c.height - 70, c.width, 70);
    ctx.fillStyle = "#e8eef7";
    ctx.font = "22px sans-serif";
    ctx.fillText(
      "UDAY’S UNIVERSE · " + (currentPlanetData?.name || "My Journey"),
      25,
      c.height - 27,
    );
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "universe-postcard.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  };
  window.addEventListener("blur", () =>
    Object.keys(controls).forEach((k) => (controls[k] = false)),
  );
  const name = new URLSearchParams(location.search).get("planet");
  if (name) choose(name);
}
function enhancePlanetCard(planet) {
  const land = document.getElementById("land-btn"),
    cockpit = document.getElementById("cockpit-land-btn");
  if (planet.userData.href) {
    land.style.display = "none";
    cockpit.style.display = "none";
    const a = document.createElement("a");
    a.className = "u-button";
    a.href = planet.userData.href;
    a.textContent = "Open satellite archive";
    document.getElementById("cardContent").append(a);
    return;
  }
  land.style.display = "inline-block";
  land.textContent = "Land and explore";
  const content = document.getElementById("cardContent");
  const actions = document.createElement("div");
  actions.className = "u-actions";
  (planet.userData.billboards || []).forEach((board) => {
    const b = document.createElement("button");
    b.className = "u-button";
    b.textContent = board.title;
    b.onclick = () => showWorldExhibit(board);
    actions.append(b);
  });
  content.append(actions);
}
