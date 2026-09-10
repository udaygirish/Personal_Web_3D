// ========================================
// Initialization
// ========================================

function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    // Setup post-processing with bloom
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom pass for glowing wormholes and particles
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,  // strength - intensity of glow
        0.4,  // radius - how far glow spreads
        0.85  // threshold - only bright objects glow
    );
    composer.addPass(bloomPass);

    // Build 3D target lock-on reticle ring
    const reticleGeo = new THREE.RingGeometry(8, 8.8, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    hudReticle = new THREE.Mesh(reticleGeo, reticleMat);
    hudReticle.visible = false;
    scene.add(hudReticle);

    setupEventListeners();
}

function init() {
    initScene();
    createStarfield();

    // Check if returning from a site
    const urlParams = new URLSearchParams(window.location.search);
    const returningFrom = urlParams.get('from');

    if (returningFrom && WORMHOLE_CONFIG.some(w => w.id === returningFrom)) {
        // Skip loading and cockpit - go straight to reverse tunnel
        handleReturnFromSite(returningFrom);
    } else {
        // Normal loading sequence
        document.getElementById("loading-screen").classList.add("hidden");
        showScene(SCENES.COCKPIT);
    }

    animate();
}

function handleReturnFromSite(siteId) {
    // Find the wormhole config
    const wormholeConfig = WORMHOLE_CONFIG.find(w => w.id === siteId);
    if (!wormholeConfig) return;

    // Hide loading screen
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    // Set scene to wormhole travel (reverse)
    currentScene = SCENES.WORMHOLE_TRAVEL;

    // Position camera at tunnel center
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    targetRotationY = 0;
    targetRotationX = 0;

    // Create reverse tunnel
    createReverseWormholeTunnel(wormholeConfig.color, wormholeConfig);

    // After reverse tunnel animation, return to open space
    setTimeout(() => {
        exitToOpenSpace(wormholeConfig);
    }, 3500);
}

function createReverseWormholeTunnel(color, wormholeConfig) {
    // Clear any existing tunnel segments
    scene.children.filter(child => child.name === 'tunnelSegment' || child.name === 'tunnelParticle').forEach(child => {
        scene.remove(child);
    });

    // Create large tunnel rings starting close
    const segmentCount = 50;
    for (let i = 0; i < segmentCount; i++) {
        const geometry = new THREE.RingGeometry(15, 16, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.z = -i * 3 - 10; // Start ahead of camera
        ring.name = 'tunnelSegment';
        scene.add(ring);
    }

    // Add particle streaks
    const particleCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 17 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = Math.random() * -150;
        positions.push(x, y, z);
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.5,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    particleSystem.name = 'tunnelParticle';
    scene.add(particleSystem);

    // Mark as reverse travel
    scene.userData.exitWormhole = wormholeConfig;
}

function animateReverseWormholeTravel() {
    const tunnelSegments = scene.children.filter(child => child.name === 'tunnelSegment');
    const particles = scene.children.filter(child => child.name === 'tunnelParticle');

    // Rings move away from camera (reverse)
    tunnelSegments.forEach((segment) => {
        segment.position.z -= 1.2; // Move backward

        if (segment.position.z < -160) {
            segment.position.z += 156;
        }

        const distance = Math.abs(segment.position.z - camera.position.z);
        segment.material.opacity = Math.max(0.2, 1 - distance / 80);
    });

    // Particles move backward
    particles.forEach((particleSystem) => {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] -= 2; // Move backward faster

            if (positions[i + 2] < -170) {
                positions[i + 2] += 170;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    });

    // Reverse barrel roll
    camera.rotation.z -= 0.02;

    // Parallax stars spin at different speeds
    if (starLayers.near) starLayers.near.rotation.y += 0.001;
    if (starLayers.mid) starLayers.mid.rotation.y += 0.0005;
    if (starLayers.far) starLayers.far.rotation.y += 0.0002;
}

function exitToOpenSpace(wormholeConfig) {
    // Clean up tunnel
    scene.children.filter(child => child.name === 'tunnelSegment' || child.name === 'tunnelParticle').forEach(child => {
        scene.remove(child);
    });

    // Clear reverse travel marker
    delete scene.userData.exitWormhole;

    // Reset camera rotation
    camera.rotation.set(0, 0, 0);
    targetRotationY = 0;
    targetRotationX = 0;

    // Position camera at the wormhole location
    camera.position.set(
        wormholeConfig.position.x,
        wormholeConfig.position.y,
        wormholeConfig.position.z + 20 // Slightly in front of wormhole
    );

    // Set to open space
    currentScene = SCENES.OPEN_SPACE;
    lastWormholeExitTime = Date.now();

    // Create all space objects
    createWormholes();
    createNebula();
    createSpaceCrystals();
    createWarpLines();

    isTransitioning = false;
    showCockpitBezel();

    // Clear URL parameter so reload shows full loading sequence
    if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ========================================
// Scene Creation Functions
// ========================================

function createStarfield() {
    // Create three layers of stars for parallax depth effect

    // Near layer - large, blue-tinted, fast-moving
    const nearGeometry = new THREE.BufferGeometry();
    const nearVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 200;
        nearVertices.push(x, y, z);
    }
    nearGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nearVertices, 3));
    const nearMaterial = new THREE.PointsMaterial({
        color: 0xadd8ff, // Slight blue tint
        size: 0.4,
        transparent: true,
        opacity: 0.9
    });
    starLayers.near = new THREE.Points(nearGeometry, nearMaterial);
    starLayers.near.name = 'starfield-near';
    scene.add(starLayers.near);

    // Mid layer - medium, white, moderate speed
    const midGeometry = new THREE.BufferGeometry();
    const midVertices = [];
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 600;
        const y = (Math.random() - 0.5) * 600;
        const z = (Math.random() - 0.5) * 400;
        midVertices.push(x, y, z);
    }
    midGeometry.setAttribute('position', new THREE.Float32BufferAttribute(midVertices, 3));
    const midMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.25,
        transparent: true,
        opacity: 0.85
    });
    starLayers.mid = new THREE.Points(midGeometry, midMaterial);
    starLayers.mid.name = 'starfield-mid';
    scene.add(starLayers.mid);

    // Far layer - small, red-tinted, slow-moving
    const farGeometry = new THREE.BufferGeometry();
    const farVertices = [];
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 800;
        const y = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 600;
        farVertices.push(x, y, z);
    }
    farGeometry.setAttribute('position', new THREE.Float32BufferAttribute(farVertices, 3));
    const farMaterial = new THREE.PointsMaterial({
        color: 0xffd4aa, // Slight red tint
        size: 0.15,
        transparent: true,
        opacity: 0.7
    });
    starLayers.far = new THREE.Points(farGeometry, farMaterial);
    starLayers.far.name = 'starfield-far';
    scene.add(starLayers.far);
}

// Crystal state is owned by state.js.

function createSpaceCrystals() {
    // Colors matching the wormholes
    const colors = [0x00ff88, 0x06ffa5, 0xff6b35, 0x4cc9f0, 0x9d4edd];
    spaceCrystalsData = [];
    const numCrystals = 45;
    
    // We use a single geometry for the instanced mesh.
    // Random scaling and rotation per-instance will provide organic diversity.
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const posAttr = geometry.attributes.position;
    for (let j = 0; j < posAttr.count; j++) {
        const x = posAttr.getX(j);
        const y = posAttr.getY(j);
        const z = posAttr.getZ(j);
        const factor = 0.82 + Math.random() * 0.36;
        posAttr.setXYZ(j, x * factor, y * factor, z * factor);
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // base color white so instance color multiplies cleanly
        roughness: 0.15,
        metalness: 0.85,
        flatShading: true,
        transparent: true,
        opacity: 0.65,
        emissive: 0xffffff,
        emissiveIntensity: 0.22,
        blending: THREE.AdditiveBlending
    });
    
    spaceCrystalsMesh = new THREE.InstancedMesh(geometry, material, numCrystals);
    spaceCrystalsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();
    
    for (let i = 0; i < numCrystals; i++) {
        const size = Math.random() * 2 + 1; // 1 to 3 units
        const colorHex = colors[i % colors.length];
        colorObj.setHex(colorHex);
        
        // Initial positioning
        dummy.position.set(
            (Math.random() - 0.5) * 360,
            (Math.random() - 0.5) * 220,
            -Math.random() * 320 + 20
        );
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.set(size, size, size);
        dummy.updateMatrix();
        
        spaceCrystalsMesh.setMatrixAt(i, dummy.matrix);
        spaceCrystalsMesh.setColorAt(i, colorObj);
        
        // Spin speed & drift speed data
        spaceCrystalsData.push({
            position: dummy.position.clone(),
            rotation: dummy.rotation.clone(),
            scale: dummy.scale.clone(),
            rotX: (Math.random() - 0.5) * 0.016,
            rotY: (Math.random() - 0.5) * 0.016,
            rotZ: (Math.random() - 0.5) * 0.016,
            drift: new THREE.Vector3(
                (Math.random() - 0.5) * 0.04,
                (Math.random() - 0.5) * 0.04,
                (Math.random() - 0.5) * 0.04
            ),
            originalColor: colorHex,
            size: size,
            collided: false
        });
    }
    
    spaceCrystalsMesh.instanceColor.needsUpdate = true;
    scene.add(spaceCrystalsMesh);
}

function animateSpaceCrystals() {
    if (!spaceCrystalsMesh) return;
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < spaceCrystalsData.length; i++) {
        const data = spaceCrystalsData[i];
        
        data.rotation.x += data.rotX;
        data.rotation.y += data.rotY;
        data.rotation.z += data.rotZ;
        
        data.position.add(data.drift);
        
        // Keep them bounded
        if (Math.abs(data.position.x) > 180) data.drift.x *= -1;
        if (Math.abs(data.position.y) > 110) data.drift.y *= -1;
        if (data.position.z < -340 || data.position.z > 40) data.drift.z *= -1;

        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);
        dummy.scale.copy(data.scale);
        dummy.updateMatrix();
        
        spaceCrystalsMesh.setMatrixAt(i, dummy.matrix);

        // Proximity Collision check
        if (!data.collided && currentScene === SCENES.OPEN_SPACE) {
            const distance = camera.position.distanceTo(data.position);
            const threshold = data.size + 3.5;
            if (distance < threshold) {
                // Pass index instead of mesh to trigger collision color update
                triggerCrystalCollision(i, data);
            }
        }
    }
    spaceCrystalsMesh.instanceMatrix.needsUpdate = true;
}

function updateShieldUI() {
    const shieldValEl = document.getElementById('cp-shield-val');
    const shieldBarEl = document.getElementById('cp-shield-bar');
    if (shieldValEl) {
        shieldValEl.textContent = `${Math.round(shieldEnergy)}%`;
        shieldValEl.className = 'pv';
        if (shieldEnergy > 50) {
            shieldValEl.classList.add('ok');
        } else if (shieldEnergy > 20) {
            shieldValEl.classList.add('warn');
        } else {
            shieldValEl.classList.add('alert');
        }
    }
    if (shieldBarEl) {
        shieldBarEl.style.width = `${shieldEnergy}%`;
        if (shieldEnergy > 50) {
            shieldBarEl.style.backgroundColor = '#00ff88';
            shieldBarEl.style.boxShadow = '0 0 6px rgba(0, 255, 136, 0.7)';
        } else if (shieldEnergy > 20) {
            shieldBarEl.style.backgroundColor = '#ffaa00';
            shieldBarEl.style.boxShadow = '0 0 6px rgba(255, 170, 0, 0.7)';
        } else {
            shieldBarEl.style.backgroundColor = '#ff3333';
            shieldBarEl.style.boxShadow = '0 0 6px rgba(255, 51, 51, 0.7)';
        }
    }
}

function triggerCrystalCollision(index, data) {
    data.collided = true;
    
    // Flash red
    const flashColor = new THREE.Color(0xff0000);
    const origColor = new THREE.Color(data.originalColor);
    spaceCrystalsMesh.setColorAt(index, flashColor);
    spaceCrystalsMesh.instanceColor.needsUpdate = true;
    
    setTimeout(() => {
        data.collided = false;
        if (spaceCrystalsMesh) {
            spaceCrystalsMesh.setColorAt(index, origColor);
            spaceCrystalsMesh.instanceColor.needsUpdate = true;
        }
    }, 5000);

    // Play synthesized collision impact sound
    playExplosionSound();

    // Trigger Camera Shake Amount
    cameraShakeAmount = 0.45;

    // Apply shield damage (15% to 30% random)
    const damage = 15 + Math.random() * 15;
    shieldEnergy = Math.max(0, shieldEnergy - damage);
    updateShieldUI();

    // Alert via HUD warning
    showNavAlert("WARNING: COLLISION DETECTED", "SHIELD ENVELOPE DAMPENING IMPACT", 3000);
    
    // Vocal warning announcements
    speakCoPilot(`Alert! Crystal collision detected. Shields reduced to ${Math.round(shieldEnergy)} percent.`);

    // System diagnostic write to Console
    const cpX = camera.position.x.toFixed(2);
    const cpY = camera.position.y.toFixed(2);
    const cpZ = camera.position.z.toFixed(2);
    writeToConsole(`[WARNING] METEOR COLLISION AT SECTOR (${cpX}, ${cpY}, ${cpZ})`);
    writeToConsole(`SHIELD ENERGY ATTENUATED: ${shieldEnergy.toFixed(1)}%`);


}

function createWarpLines() {
    warpLinesGroup = new THREE.Group();
    warpLinesGroup.name = 'warp-lines';
    
    const colors = [0x00ff88, 0x00d9ff, 0x9d4edd];
    const numLines = 250;
    
    for (let i = 0; i < numLines; i++) {
        const length = Math.random() * 25 + 15;
        const color = colors[i % colors.length];
        
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0,
            0, 0, -length
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0, // start invisible, will slerp in when warp active
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        
        // Scatter lines throughout space
        line.position.set(
            (Math.random() - 0.5) * 400,
            (Math.random() - 0.5) * 400,
            (Math.random() - 0.5) * 400
        );
        
        warpLinesGroup.add(line);
    }
    
    camera.add(warpLinesGroup);
}

function animateWarpLines() {
    if (!warpLinesGroup) return;
    
    // Check warp state
    // Autopilot or shiftKey forces warp drive active
    const isWarping = warpActive || (currentScene === SCENES.OPEN_SPACE && autopilotActive) || (currentScene === SCENES.OPEN_SPACE && speedBoost);
    
    const targetWarpOpacity = isWarping ? 0.75 : 0;
    const targetStarOpacity = isWarping ? 0.05 : 0.85;
    
    // Fade stars in/out
    if (starLayers.near) starLayers.near.material.opacity = THREE.MathUtils.lerp(starLayers.near.material.opacity, targetStarOpacity, 0.06);
    if (starLayers.mid) starLayers.mid.material.opacity = THREE.MathUtils.lerp(starLayers.mid.material.opacity, targetStarOpacity, 0.06);
    if (starLayers.far) starLayers.far.material.opacity = THREE.MathUtils.lerp(starLayers.far.material.opacity, targetStarOpacity, 0.06);
    
    // Accelerate/Decelerate warp line velocity
    const targetWarpSpeed = isWarping ? 20 : 0;
    warpSpeedFactor = THREE.MathUtils.lerp(warpSpeedFactor, targetWarpSpeed, 0.05);
    
    // Trigger warp sound transitions and TTS announcements
    if (isWarping !== lastIsWarping) {
        playWarpSpoolSound(isWarping);
        if (isWarping) {
            speakCoPilot("Hyperdrive engaged. Entering warp speeds.");
        } else {
            speakCoPilot("Hyperdrive disengaged.");
        }
        lastIsWarping = isWarping;
    }
    
    // Align warp lines group rotation with travel direction
    let travelSpeed = 0;
    const targetLookAt = new THREE.Vector3(0, 0, 1);
    if (autopilotActive && autopilotTarget) {
        travelSpeed = baseSpeed * 1.5;
        targetLookAt.set(0, 0, 1);
    } else {
        const velSpeedSq = velocity.lengthSq();
        if (velSpeedSq > 0.0001) {
            travelSpeed = velocity.length();
            targetLookAt.copy(velocity).multiplyScalar(-1).normalize();
        }
    }
    
    const targetQuat = new THREE.Quaternion();
    targetQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetLookAt);
    warpLinesGroup.quaternion.slerp(targetQuat, 0.1);
    
    warpLinesGroup.children.forEach(line => {
        line.material.opacity = THREE.MathUtils.lerp(line.material.opacity, targetWarpOpacity, 0.06);
        
        // Fly forward along Z local
        line.position.z += (warpSpeedFactor + travelSpeed);
        
        // Wrap back around if passing cockpit view
        if (line.position.z > 40) {
            line.position.z = -360;
            line.position.x = (Math.random() - 0.5) * 400;
            line.position.y = (Math.random() - 0.5) * 400;
        }
    });
}

function createWormholes() {
    wormholes.forEach(w => scene.remove(w.group));
    wormholes = [];

    // Create wormholes from config
    WORMHOLE_CONFIG.forEach(config => {
        const group = createWormholeGroup(config.color, config.label);
        group.position.set(config.position.x, config.position.y, config.position.z);
        group.name = `${config.id}Wormhole`;
        scene.add(group);

        wormholes.push({
            group: group,
            type: config.id,
            color: config.color,
            destination: config.destination,
            config: config,
            particleTime: 0.0
        });
    });
}

// ========================================
// Initialize on Load
// ========================================

window.addEventListener('DOMContentLoaded', init);
