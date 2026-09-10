// ========================================
// Loading Simulation - Fullscreen Terminal
// ========================================

const PHYSICS_EQUATIONS = [
    // Quantum Mechanics
    'iℏ∂ψ/∂t = Ĥψ',
    'ΔxΔp ≥ ℏ/2',
    '[x̂, p̂] = iℏ',
    'Ĥψ = Eψ',
    '⟨ψ|ψ⟩ = 1',
    'ψ(x,t) = Σ cₙφₙ(x)e^(-iEₙt/ℏ)',

    // Relativity
    'E = mc²',
    'E² = (pc)² + (mc²)²',
    'ds² = -c²dt² + dx² + dy² + dz²',
    'Rμν - ½Rgμν + Λgμν = 8πGTμν',
    't\' = γ(t - vx/c²)',
    'L = L₀√(1 - v²/c²)',

    // Electromagnetism
    '∇ × E = -∂B/∂t',
    '∇ · B = 0',
    '∇ × B = μ₀J + μ₀ε₀∂E/∂t',
    '∇ · E = ρ/ε₀',
    'F = q(E + v × B)',

    // Classical Mechanics  
    'F = ma',
    'L = T - V',
    'd/dt(∂L/∂q̇) - ∂L/∂q = 0',
    'H = Σpᵢq̇ᵢ - L',
    'τ = r × F',

    // Rocket/Propulsion
    'Δv = vₑ ln(m₀/mf)',
    'F = ṁvₑ + (pₑ - p₀)Aₑ',
    'Isp = F/(ṁg₀)',
    'a = F/m - g',

    // Thermodynamics
    'dU = δQ - δW',
    'dS ≥ δQ/T',
    'PV = nRT',
    'G = H - TS',

    // Gravity
    'F = Gm₁m₂/r²',
    'g = GM/r²',
    'v = √(GM/r)',
    'T² = (4π²/GM)a³',

    // Wave Mechanics
    'v = fλ',
    '∇²ψ - (1/c²)∂²ψ/∂t² = 0',
    'ω = 2πf',

    // Conservation Laws
    'p = mv',
    'L = r × p',
    'E = K + U',

    // Quantum Field Theory
    'S = ∫d⁴x ℒ',
    '⟨0|φ(x)φ(y)|0⟩ = D(x-y)'
];

function simulateLoading() {
    const terminalOutput = document.getElementById('terminal-output');
    const loadingScreen = document.getElementById('loading-screen');

    // Start Matrix rain
    startMatrixRain();

    // Guard: skip can only fire once
    let skipAllowed = false;
    let skipFired = false;
    let completed = false;

    function skipLoading() {
        if (!skipAllowed || skipFired) return;
        skipFired = true;
        completeLoading();
    }

    // Attach skip listeners — keydown or click anywhere
    document.addEventListener('keydown', skipLoading);
    document.addEventListener('click', skipLoading);

    // Step 1: Show blinking cursor with Matrix rain
    function showCursor() {
        const cursorLine = document.createElement('div');
        cursorLine.className = 'terminal-line prompt';
        cursorLine.innerHTML = '<span class="cursor-block"></span>';
        terminalOutput.appendChild(cursorLine);

        // Show skip hint bottom-right after cursor appears
        const skipHint = document.createElement('div');
        skipHint.id = 'skip-hint';
        skipHint.textContent = 'PRESS ANY KEY TO SKIP';
        skipHint.style.cssText = 'position:fixed;bottom:20px;right:20px;color:rgba(0,255,0,0.45);font-family:"Courier New",monospace;font-size:0.75rem;letter-spacing:2px;pointer-events:none;z-index:5;animation:blink-hint 1.5s infinite;';
        document.body.appendChild(skipHint);

        setTimeout(() => {
            skipAllowed = true;  // Allow skip once cursor has shown
            executeScript();
        }, 2000); // Let Matrix rain for 2 seconds
    }

    // Step 2: Execute create_world.sh
    function executeScript() {
        if (skipFired) return;
        terminalOutput.innerHTML = '';

        const promptLine = document.createElement('div');
        promptLine.className = 'terminal-line prompt';
        promptLine.textContent = '$ ./create_world.sh';
        terminalOutput.appendChild(promptLine);

        // Random glitch on command
        if (Math.random() > 0.7) {
            promptLine.classList.add('glitch');
        }

        setTimeout(showEquations, 300);
    }

    // Step 3: Display random physics equations with world creation stages
    function showEquations() {
        const startTime = Date.now();
        const duration = 5000; // 5 seconds

        const stages = [
            { time: 0, message: '> Creating gravitational field...' },
            { time: 1000, message: '> Initializing quantum fields...' },
            { time: 2000, message: '> Modelling uncertainty principles...' },
            { time: 3000, message: '> Generating spacetime manifold...' },
            { time: 4000, message: '> Coupling fundamental forces...' }
        ];

        let currentStage = 0;

        // Create a circular progress indicator in bottom right
        const progressContainer = document.createElement('div');
        progressContainer.style.position = 'fixed';
        progressContainer.style.bottom = '30px';
        progressContainer.style.right = '30px';
        progressContainer.style.width = '80px';
        progressContainer.style.height = '80px';
        progressContainer.style.zIndex = '100';
        progressContainer.style.display = 'flex';
        progressContainer.style.alignItems = 'center';
        progressContainer.style.justifyContent = 'center';

        // SVG Circle for progress
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '80');
        svg.setAttribute('height', '80');
        svg.style.transform = 'rotate(-90deg)'; // Start from top

        const circleBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleBg.setAttribute('cx', '40');
        circleBg.setAttribute('cy', '40');
        circleBg.setAttribute('r', '36');
        circleBg.setAttribute('stroke', '#003300');
        circleBg.setAttribute('stroke-width', '4');
        circleBg.setAttribute('fill', 'none');

        const circleProgress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleProgress.setAttribute('cx', '40');
        circleProgress.setAttribute('cy', '40');
        circleProgress.setAttribute('r', '36');
        circleProgress.setAttribute('stroke', '#00ff00');
        circleProgress.setAttribute('stroke-width', '4');
        circleProgress.setAttribute('fill', 'none');
        circleProgress.setAttribute('stroke-dasharray', '226'); // 2 * pi * 36
        circleProgress.setAttribute('stroke-dashoffset', '226');
        circleProgress.style.transition = 'stroke-dashoffset 0.1s linear';

        svg.appendChild(circleBg);
        svg.appendChild(circleProgress);

        // Text for percentage
        const text = document.createElement('div');
        text.style.position = 'absolute';
        text.style.color = '#00ff00';
        text.style.fontFamily = "'Courier New', monospace";
        text.style.fontWeight = 'bold';
        text.style.fontSize = '16px';
        text.textContent = '0%';

        progressContainer.appendChild(svg);
        progressContainer.appendChild(text);
        terminalOutput.appendChild(progressContainer);

        function updateProgress(percent) {
            // Update circle
            const circumference = 226;
            const offset = circumference - (percent / 100) * circumference;
            circleProgress.setAttribute('stroke-dashoffset', offset);

            // Update text
            text.textContent = `${percent}%`;
        }

        function addRandomEquation() {
            const elapsed = Date.now() - startTime;
            const percent = Math.min(100, Math.floor((elapsed / duration) * 100));

            updateProgress(percent);

            if (elapsed >= duration || skipFired) {
                progressContainer.remove(); // Remove progress circle when done
                completeLoading();
                return;
            }

            // Check if we should display a stage message
            if (currentStage < stages.length && elapsed >= stages[currentStage].time) {
                const stageLine = document.createElement('div');
                stageLine.className = 'terminal-line command';
                stageLine.textContent = stages[currentStage].message;
                // Insert before progress container (though it's fixed, so order in DOM matters less for visual, but good for structure)
                terminalOutput.appendChild(stageLine);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
                currentStage++;
            }

            // Randomly show system messages (errors, warnings, successes)
            if (Math.random() > 0.92) {
                const systemMessages = [
                    { type: 'error', text: '[ERROR] Wormhole instability detected - stabilizing...' },
                    { type: 'warning', text: '[WARNING] Anomaly detected in sector 7' },
                    { type: 'success', text: '[OK] Quantum entanglement stable' },
                    { type: 'error', text: '[FAIL] Timeline convergence error - retrying...' },
                    { type: 'warning', text: '[WARNING] Dark matter fluctuation: 12.4%' },
                    { type: 'success', text: '[OK] Gravitational waves normalized' },
                    { type: 'error', text: '[EXCEPTION] Paradox detected - resolving...' },
                    { type: 'warning', text: '[WARNING] Temporal drift: +0.003s' },
                    { type: 'success', text: '[OK] Spacetime fabric integrity: 99.7%' },
                    { type: 'error', text: '[ERROR] Reality.matrix overflow - handled' },
                    { type: 'warning', text: '[WARNING] Unknown signal from deep space' },
                    { type: 'success', text: '[OK] Dimensional barriers stable' }
                ];

                const msg = systemMessages[Math.floor(Math.random() * systemMessages.length)];
                const msgLine = document.createElement('div');
                msgLine.className = `terminal-line ${msg.type}`;
                msgLine.textContent = msg.text;
                terminalOutput.appendChild(msgLine);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            // Pick random equation
            const equation = PHYSICS_EQUATIONS[Math.floor(Math.random() * PHYSICS_EQUATIONS.length)];

            const eqLine = document.createElement('div');
            eqLine.className = 'terminal-line equation';
            eqLine.textContent = equation;

            // Random glitch effect on some lines
            if (Math.random() > 0.85) {
                eqLine.classList.add('glitch');
                setTimeout(() => eqLine.classList.remove('glitch'), 300);
            }

            terminalOutput.appendChild(eqLine);

            // Auto-scroll
            terminalOutput.scrollTop = terminalOutput.scrollHeight;

            // Random delay between equations (50-150ms for faster scroll)
            const delay = 50 + Math.random() * 100;
            setTimeout(addRandomEquation, delay);
        }

        addRandomEquation();
    }

    // Step 4: Complete and launch
    function completeLoading() {
        if (completed) return;
        completed = true;
        // Remove skip hint
        const skipHint = document.getElementById('skip-hint');
        if (skipHint) skipHint.remove();
        // Remove skip listeners in case they haven't fired yet
        document.removeEventListener('keydown', skipLoading);
        document.removeEventListener('click', skipLoading);

        const completeLine = document.createElement('div');
        completeLine.className = 'terminal-line command';
        completeLine.textContent = '\n[WORLD INITIALIZED]\n';
        terminalOutput.appendChild(completeLine);

        setTimeout(() => {
            stopMatrixRain();
            loadingScreen.classList.add('hidden');
            showScene(SCENES.COCKPIT);
        }, 500);
    }

    // Start sequence
    showCursor();
}

// ========================================
// Helper Functions for Enhanced Wormhole
// ========================================

function createSpacetimeGrid(color) {
    const gridGroup = new THREE.Group();

    // Create circular concentric rings that fade out radially
    const numRings = 25;
    const maxRadius = 50;

    for (let i = 0; i < numRings; i++) {
        const radius = (i / numRings) * maxRadius;
        const ringGeometry = new THREE.RingGeometry(radius, radius + 0.3, 64);

        // Calculate opacity - stronger at center, fades to edges
        const normalizedDistance = i / numRings;
        const opacity = 0.15 * Math.pow(1 - normalizedDistance, 2); // Quadratic fade

        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: Math.max(0.01, opacity), // Minimum 0.01 for visibility
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        // Create top ring
        const topRing = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        topRing.rotation.x = Math.PI / 2;
        topRing.position.y = 5; // Slightly above center
        gridGroup.add(topRing);

        // Create bottom ring
        const bottomRing = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        bottomRing.rotation.x = -Math.PI / 2;
        bottomRing.position.y = -5; // Slightly below center
        gridGroup.add(bottomRing);
    }

    gridGroup.name = 'spacetimeGrid';
    return gridGroup;
}

function createEnergyRings(color) {
    const ringsGroup = new THREE.Group();
    const numRings = 5;

    for (let i = 0; i < numRings; i++) {
        const radius = 6 + i * 2.5;
        const thickness = 0.3 - i * 0.03;
        const opacity = 0.9 - i * 0.15;

        const ringGeometry = new THREE.TorusGeometry(radius, thickness, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.name = `energyRing_${i}`;
        ring.userData.rotationSpeed = 0.01 - i * 0.002; // Slower for outer rings
        ringsGroup.add(ring);
    }

    ringsGroup.name = 'energyRings';
    return ringsGroup;
}

function createWormholeThroat(color) {
    // Create hourglass/funnel shape using LatheGeometry
    const points = [];
    const segments = 25;

    for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        const angle = t * Math.PI;

        // Hourglass curve: wide at ends, narrow in middle
        const radius = 4 + Math.sin(angle) * 6;
        const y = (t - 0.5) * 35;

        points.push(new THREE.Vector2(radius, y));
    }

    const throatGeometry = new THREE.LatheGeometry(points, 32);
    const throatMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    const throat = new THREE.Mesh(throatGeometry, throatMaterial);
    throat.rotation.x = Math.PI / 2;
    throat.name = 'throat';

    return throat;
}

function createEventHorizon() {
    // Black sphere at center
    const horizonGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const horizonMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.98
    });

    const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    horizon.name = 'eventHorizon';

    return horizon;
}

function createLightRays(color) {
    const raysGroup = new THREE.Group();
    const numRays = 16;

    for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;

        // Create cone for light ray
        const rayGeometry = new THREE.ConeGeometry(0.3, 25, 4);
        const rayMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending
        });

        const ray = new THREE.Mesh(rayGeometry, rayMaterial);
        ray.rotation.x = Math.PI / 2;
        ray.rotation.z = angle;
        ray.position.x = Math.cos(angle) * 10;
        ray.position.y = Math.sin(angle) * 10;
        ray.name = `lightRay_${i}`;

        raysGroup.add(ray);
    }

    raysGroup.name = 'lightRays';
    return raysGroup;
}

function createAccretionParticles(color) {
    const particlesGroup = new THREE.Group();
    const numParticles = 500;
    const maxRadius = 35;

    // Per-particle immutable attributes stored on GPU buffers.
    // The vertex shader reads these along with a time uniform to compute
    // the animated position, eliminating per-frame CPU trig work.
    const initialAngles  = new Float32Array(numParticles);
    const initialRadii   = new Float32Array(numParticles);
    const heights        = new Float32Array(numParticles);
    const sizes          = new Float32Array(numParticles);
    const baseOpacities  = new Float32Array(numParticles);
    // orbitSpeeds encodes a per-particle random speed variation (GPU-side).
    const orbitSpeeds    = new Float32Array(numParticles);

    for (let i = 0; i < numParticles; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * maxRadius;
        const heightFactor = 1 - (radius / maxRadius) * 0.5;
        const height = (Math.random() - 0.5) * 10 * heightFactor;
        const distanceFromCenter = radius / maxRadius;
        const falloff = Math.pow(1 - distanceFromCenter, 2);

        initialAngles[i]  = angle;
        initialRadii[i]   = radius;
        heights[i]        = height;
        sizes[i]          = (1 - distanceFromCenter * 0.5) * (Math.random() * 1.5 + 0.5);
        baseOpacities[i]  = falloff * (0.7 + Math.random() * 0.3);
        // Outer particles orbit slightly slower (realistic accretion dynamics).
        orbitSpeeds[i]    = 1.0 + (1.0 - distanceFromCenter) * 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('initialAngle',  new THREE.BufferAttribute(initialAngles, 1));
    particleGeometry.setAttribute('initialRadius', new THREE.BufferAttribute(initialRadii,  1));
    particleGeometry.setAttribute('height',        new THREE.BufferAttribute(heights,       1));
    particleGeometry.setAttribute('size',          new THREE.BufferAttribute(sizes,         1));
    particleGeometry.setAttribute('baseOpacity',   new THREE.BufferAttribute(baseOpacities, 1));
    particleGeometry.setAttribute('orbitSpeed',    new THREE.BufferAttribute(orbitSpeeds,   1));

    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color:     { value: new THREE.Color(color) },
            time:      { value: 0.0 },
            maxRadius: { value: maxRadius }
        },
        vertexShader: `
            attribute float initialAngle;
            attribute float initialRadius;
            attribute float height;
            attribute float size;
            attribute float baseOpacity;
            attribute float orbitSpeed;

            uniform float time;
            uniform float maxRadius;

            varying float vOpacity;

            void main() {
                // Particles slowly spiral inward; when too close they reset to outer edge.
                // All arithmetic runs in parallel on the GPU.
                float angle  = initialAngle + time * 0.5 * orbitSpeed;
                float radius = initialRadius;

                // Compute animated XY position in the disk plane.
                float x = cos(angle) * radius;
                float y = sin(angle) * radius;

                // Opacity fades smoothly from center to edge.
                float distNorm = radius / maxRadius;
                float falloff  = pow(1.0 - distNorm, 2.0);
                vOpacity = falloff * baseOpacity;

                vec4 mvPosition = modelViewMatrix * vec4(x, y, height, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position  = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vOpacity;

            void main() {
                // Circular soft-edged particle.
                vec2  center = gl_PointCoord - vec2(0.5);
                float dist   = length(center);
                if (dist > 0.5) discard;
                float alpha = (1.0 - dist * 2.0) * vOpacity;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.name = 'accretionParticles';
    particlesGroup.add(particles);

    particlesGroup.name = 'particles';
    return particlesGroup;
}

function createLensFlare(color) {
    // Create 8-pointed star-burst lens flare
    const flareGroup = new THREE.Group();
    const numSpikes = 8;

    for (let i = 0; i < numSpikes; i++) {
        const angle = (i / numSpikes) * Math.PI * 2;

        // Create elongated rectangular plane for each spike
        const spikeGeometry = new THREE.PlaneGeometry(0.5, 25);
        const spikeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.rotation.z = angle;
        flareGroup.add(spike);
    }

    flareGroup.name = 'lensFlare';
    return flareGroup;
}


function createLightningGroup(color) {
    const group = new THREE.Group();
    group.name = 'lightning';

    const numLines = 3;
    const pointsPerLine = 10;

    for (let i = 0; i < numLines; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(pointsPerLine * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);
        line.name = `bolt_${i}`;
        line.userData = {
            active: false,
            opacity: 0.0
        };
        group.add(line);
    }

    return group;
}

function createWormholeGroup(color, label) {
    const group = new THREE.Group();

    // 1. Spacetime grid showing gravitational warping
    const grid = createSpacetimeGrid(color);
    group.add(grid);

    // 2. Concentric energy rings
    const rings = createEnergyRings(color);
    group.add(rings);

    // 3. Funnel/throat geometry
    const throat = createWormholeThroat(color);
    group.add(throat);

    // 4. Event horizon (black hole center)
    const eventHorizon = createEventHorizon();
    group.add(eventHorizon);

    // 5. Light rays emanating from center
    const lightRays = createLightRays(color);
    group.add(lightRays);

    // 6. Accretion disk particles
    const particles = createAccretionParticles(color);
    group.add(particles);

    // 7. Lens flare (cinematic star-burst effect)
    const lensFlare = createLensFlare(color);
    group.add(lensFlare);

    // 8. Space Lightning (electro-magnetic arcs)
    const lightning = createLightningGroup(color);
    group.add(lightning);

    // 9. Label
    const labelSprite = createTextLabel(label, color);
    labelSprite.position.y = 18;
    group.add(labelSprite);

    return group;
}

function createTextLabel(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = 'bold 64px Orbitron, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(15, 3.5, 1);
    sprite.name = 'label';

    return sprite;
}

function createWormholeTunnel(color) {
    scene.children.filter(child => child.name === 'tunnelSegment' || child.name === 'tunnelParticle').forEach(child => {
        scene.remove(child);
    });

    // Create large tunnel rings (camera will be INSIDE)
    const segmentCount = 50;
    for (let i = 0; i < segmentCount; i++) {
        const geometry = new THREE.RingGeometry(15, 16, 32); // Much larger rings
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.z = camera.position.z - i * 3 - 10;
        ring.name = 'tunnelSegment';
        scene.add(ring);
    }

    // Add particle streaks outside the tunnel (green lines in space)
    const particleCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 17 + Math.random() * 30; // Outside the tunnel
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
}

