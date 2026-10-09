// ========================================
// HUD Updates
// ========================================

function updateHUD() {
    // Calculate actual speed from movement
    const moveSpeed = speedBoost ? baseSpeed * 2 : baseSpeed;
    let actualSpeed = 0;

    // Count how many directions we're moving
    if (moveForward || moveBackward) actualSpeed += moveSpeed;
    if (moveLeft || moveRight) actualSpeed += moveSpeed;
    if (moveUp || moveDown) actualSpeed += moveSpeed;

    // Convert to cosmic units (fraction of light speed)
    const speedC = actualSpeed * 0.01;
    document.getElementById('hud-speed').textContent = speedC.toFixed(3) + 'c';

    // Coordinates in light years (scaled down for readability)
    // 1 unit = 0.001 light years
    const lyScale = 0.001;
    document.getElementById('hud-x').textContent = (camera.position.x * lyScale).toFixed(4);
    document.getElementById('hud-y').textContent = (camera.position.y * lyScale).toFixed(4);
    document.getElementById('hud-z').textContent = (camera.position.z * lyScale).toFixed(4);

    // Target (nearest wormhole) in light years
    if (wormholes.length > 0) {
        let nearest = null;
        let minDist = Infinity;

        wormholes.forEach(w => {
            const dist = camera.position.distanceTo(w.group.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = w;
            }
        });

        if (nearest) {
            const distLY = (minDist * lyScale).toFixed(3);
            document.getElementById('hud-target').textContent = nearest.type.toUpperCase();
            document.getElementById('hud-distance').textContent = `${distLY} LY`;

            // Add target lock effect when close
            const hudDistance = document.getElementById('hud-distance');
            if (minDist < 30) {
                hudDistance.classList.add('hud-target-lock');
            } else {
                hudDistance.classList.remove('hud-target-lock');
            }

            // Warning for My World View
            const hudTarget = document.getElementById('hud-target');
            if (nearest.type === 'my_world_view') {
                hudTarget.textContent += ' [⚠️ CONSTRUCTION ZONE]';
                hudTarget.style.color = '#ff9e3d';
                hudTarget.classList.add('warning-pulse');
            } else {
                hudTarget.style.color = ''; // Reset color
                hudTarget.classList.remove('warning-pulse');
            }
        }

        // Check if in deep space - only sides, up/down, or way behind wormholes
        const deepSpaceWarning = document.getElementById('deep-space-warning');
        const hud = document.getElementById('hud');

        // Trigger warning if:
        // - Too far left/right (|x| > 150)
        // - Too far up/down (|y| > 120)  
        // - Way past wormholes into deep space behind (z < -300)
        const tooFarSides = Math.abs(camera.position.x) > 150;
        const tooFarVertical = Math.abs(camera.position.y) > 120;
        const tooFarBehind = camera.position.z < -300;

        if (tooFarSides || tooFarVertical || tooFarBehind) {
            deepSpaceWarning.classList.remove('hidden');
            hud.classList.add('deep-space-mode');
        } else {
            deepSpaceWarning.classList.add('hidden');
            hud.classList.remove('deep-space-mode');
        }
    } else {
        document.getElementById('hud-target').textContent = '---';
        document.getElementById('hud-distance').textContent = '---';
    }

    // ---- Mirror data into cockpit side panels ----
    // These elements only exist when the cockpit bezel is visible,
    // so guard every update with a null check.

    // Left panel: live sector coordinates
    const cpX = document.getElementById('cp-x');
    const cpY = document.getElementById('cp-y');
    const cpZ = document.getElementById('cp-z');
    if (cpX) cpX.textContent = (camera.position.x * lyScale).toFixed(4);
    if (cpY) cpY.textContent = (camera.position.y * lyScale).toFixed(4);
    if (cpZ) cpZ.textContent = (camera.position.z * lyScale).toFixed(4);

    // Right panel: velocity, boost status
    const cpVel   = document.getElementById('cp-vel');
    const cpBoost = document.getElementById('cp-boost');
    if (cpVel)   cpVel.textContent = speedC.toFixed(3) + 'c';
    if (cpBoost) {
        cpBoost.textContent = speedBoost ? 'ACTIVE' : 'STANDBY';
        cpBoost.className   = 'pv ' + (speedBoost ? 'warn' : 'ok');
    }

    // Bottom panel: throttle bar + speed readout (max ≈ 0.06c with boost)
    const cpThrottle = document.getElementById('cp-throttle');
    const cpSpeed    = document.getElementById('cp-speed');
    const maxC = 0.06;
    if (cpThrottle) cpThrottle.style.width = Math.min(100, (speedC / maxC) * 100).toFixed(1) + '%';
    if (cpSpeed)    cpSpeed.textContent = speedC.toFixed(3) + 'c';

    // Right panel: nearest wormhole target (reuse already-computed nearest)
    if (wormholes.length > 0) {
        let cpNearest = null, cpMinDist = Infinity;
        wormholes.forEach(w => {
            const d = camera.position.distanceTo(w.group.position);
            if (d < cpMinDist) { cpMinDist = d; cpNearest = w; }
        });
        if (cpNearest) {
            const cpTarget = document.getElementById('cp-target');
            const cpDist   = document.getElementById('cp-dist');
            if (cpTarget) cpTarget.textContent = cpNearest.type.toUpperCase();
            if (cpDist)   cpDist.textContent   = (cpMinDist * lyScale).toFixed(3) + ' LY';
        }
    }
}


// ========================================
// 3D Enhancements - Nebula Clouds
// ========================================

function createNebula() {
    const nebulaGroup = new THREE.Group();

    // Create 3 colored fog clouds (subtle background elements)
    const colors = [0x00ff88, 0x06ffa5, 0xff6b35];

    colors.forEach((color, i) => {
        const geometry = new THREE.SphereGeometry(15, 16, 16); // Smaller - was 30
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.03, // Much more transparent - was 0.1
            blending: THREE.AdditiveBlending
        });

        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.set(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 150,
            -250 + Math.random() * -100 // Much farther away - was -150
        );
        nebulaGroup.add(nebula);
    });

    nebulaGroup.name = 'nebula';
    scene.add(nebulaGroup);
}
