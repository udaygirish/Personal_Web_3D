// ========================================
// Solar System 3D - Three.js Portfolio
// ========================================

let scene, camera, renderer;
let camera3D, camera2D;
let currentView = '3D'; // '3D' or '2D'
let planets = [];
let controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};

// 2D View Controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };
let zoomLevel = 1;

const baseSpeed = 0.5;
const starSystems = [];

// Rover Mode State
let isRoverMode = false;
let isLandingAnim = false;
let roverScene = new THREE.Group(); // Holds the planet surface and rover
let rover = null;
let currentPlanetData = null;
let roverVelocity = 0;
let roverTurn = 0;
let launchPad = null;
let currentInteractiveKioskBoard = null;

// Spaceship Rotation State
let shipPitch = 0;
let shipYaw = 0;
const SHIP_ROTATION_SPEED = 0.002;

// Rover mouse-look state
// Tracks angular offsets applied to the chase camera so the player can
// look around independently of the rover's heading.
let roverLookYaw   = 0;   // horizontal look offset (radians)
let roverLookPitch = 0;   // vertical look offset (radians)
const ROVER_LOOK_SENSITIVITY = 0.003;
const ROVER_PITCH_LIMIT      = Math.PI / 4; // ±45°

// Surface ambient particles (dust, fireflies, spores, snow)
let surfaceParticles = null;
let surfaceParticleTime = 0;

// WebAudio
let audioCtx = null;
let droneOsc = null;
let droneGain = null;
let droneFilter = null;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

// ========================================
// Terminal / Cockpit Output
// ========================================
function writeToConsole(msg) {
    const out = document.getElementById('ap-console-out');
    if (!out) return;
    out.textContent += "\n> " + msg;
    out.scrollTop = out.scrollHeight; // Auto-scroll
}

function toggleSound(forcedState) {
    soundEnabled = forcedState !== undefined ? forcedState : !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    const soundToggle = document.getElementById('cp-sound-val');
    
    if (soundEnabled) {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (soundToggle) {
            soundToggle.textContent = 'ON';
            soundToggle.className = 'pv ok';
        }
        writeToConsole("AUDIO SUBSYSTEMS: ONLINE.");
    } else {
        if (soundToggle) {
            soundToggle.textContent = 'OFF';
            soundToggle.className = 'pv alert';
        }
        if (droneGain && audioCtx) {
            droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        }
        writeToConsole("AUDIO SUBSYSTEMS: OFFLINE.");
    }
}

// Procedural Environment
let asteroidBelt = null;
let surfaceSun = null;
let surfaceTime = 0;

// ========================================
// Achievement System & Tracking
// ========================================
function unlockAchievement(id, title, desc) {
    const key = `ach_${id}`;
    if (localStorage.getItem(key)) return; // Already unlocked
    localStorage.setItem(key, 'true');

    const toast = document.getElementById('achievement-toast');
    const titleEl = document.getElementById('achievement-title');
    const descEl = document.getElementById('achievement-desc');
    if (toast && titleEl && descEl) {
        titleEl.textContent = title;
        descEl.textContent = desc;
        toast.style.display = 'block';
        setTimeout(() => toast.style.opacity = '1', 50);
        
        // Hide after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 500);
        }, 5000);
        
        // Optional: play a nice chime
        if (soundEnabled && typeof playLockChirp === 'function') {
            playLockChirp();
            setTimeout(() => { if (typeof playLockChirp === 'function') playLockChirp(); }, 150);
        }
    }
}

// ========================================
// Initialization
// ========================================

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0005);
    
    // Rover scene setup
    roverScene.visible = false;
    scene.add(roverScene);

    // 3D Camera (Perspective)
    camera3D = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera3D.position.set(0, 50, 200);

    // 2D Camera (Orthographic - Top Down)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 600;
    camera2D = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,
        1000
    );
    camera2D.position.set(0, 500, 0);
    camera2D.lookAt(0, 0, 0);
    camera2D.rotation.z = Math.PI; // Rotate to align with 3D view orientation

    // Set initial camera
    camera = camera3D;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas3d'),
        antialias: true,
        alpha: true
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add directional light (like a distant sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(100, 100, 100);
    scene.add(sunLight);

    // Create starfield background
    createStarfield();

    // Create solar systems
    createSolarSystems();

    // Create asteroid belt
    asteroidBelt = createAsteroidField();

    // Event listeners
    setupEventListeners();

    // Terminal Input Listener
    const terminalInput = document.getElementById('ap-console-input-bottom');
    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = terminalInput.value.trim().toLowerCase();
                terminalInput.value = '';
                if (cmd) {
                    writeToConsole(cmd.toUpperCase());
                    const args = cmd.split(' ');
                    const mainCmd = args[0];
                    const isHelp = args.includes('--help');

                    if (isHelp || mainCmd === 'help') {
                        if (mainCmd === 'sound' || (mainCmd === 'help' && args[1] === 'sound')) {
                            writeToConsole("SOUND [no args]: Toggles the audio feedback on or off.");
                        } else if (mainCmd === 'land' || (mainCmd === 'help' && args[1] === 'land')) {
                            writeToConsole("LAND [no args]: Initiates atmospheric entry on the currently locked planetary target.");
                        } else {
                            writeToConsole("COMMANDS LOG:\n- help: show options\n- sound: toggle audio feedback\n- land: initiate landing on target\nUsage: <command> --help");
                        }
                    } else if (mainCmd === 'sound') {
                        toggleSound();
                    } else if (mainCmd === 'land') {
                        if (document.getElementById('cockpit-land-btn').style.display === 'block') {
                            document.getElementById('cockpit-land-btn').click();
                        } else {
                            writeToConsole("ERROR: NO PLANETARY TARGET LOCKED.");
                        }
                    } else {
                        writeToConsole("UNRECOGNIZED COMMAND.");
                    }
                }
            }
        });
    }

    // Sound Toggle Click Listener
    const soundToggle = document.getElementById('cp-sound-val');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => toggleSound());
        if (!soundEnabled) {
            soundToggle.textContent = 'OFF';
            soundToggle.className = 'pv alert';
        }
    }

    window.addEventListener("DOMContentLoaded", initWorldExplorer);
    // Start animation
    animate();

    // Enable cockpit bezel
    const cockpitBezel = document.getElementById('cockpit-bezel');
    if (cockpitBezel) {
        cockpitBezel.classList.remove('hidden');
        document.body.classList.add('space-theme-active', 'cockpit-bezel-active');
    }
}

// ========================================
// Create Background Stars
// ========================================

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starVertices = [];

    for (let i = 0; i < 3000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Nebula Parallax Layers
    window.nebulaLayers = [];
    const createNebulaLayer = (color, opacity, size, zPos, count) => {
        const geo = new THREE.BufferGeometry();
        const verts = [];
        for (let i = 0; i < count; i++) {
            verts.push((Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000, zPos + (Math.random() - 0.5) * 500);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        const mat = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Points(geo, mat);
        scene.add(mesh);
        window.nebulaLayers.push(mesh);
    };

    createNebulaLayer(0x8800ff, 0.05, 300, -1000, 50);
    createNebulaLayer(0x00aaff, 0.05, 400, -1500, 40);
    createNebulaLayer(0xff00aa, 0.03, 500, -2000, 30);
}

// ========================================
// Create Solar Systems
// ========================================

function createSolarSystems() {
    const systems = [
        {
            name: 'My Journey',
            position: { x: 0, y: 0, z: 0 }, // Center system
            starColor: 0xffffff,
            hasPath: false,
            planets: [
                {
                    name: 'Experience', orbit: 120, size: 18, color: 0xf77f00, speed: 0.0012, content: {
                        title: 'Experience',
                        description: 'My Professional Journey',
                        details: ['Click to land and explore my work history.']
                    },
                    billboards: [
                        { title: 'Quantiphi', desc: 'Machine Learning Engineer (May 2019 - Feb 2021)' },
                        { title: 'New Space', desc: 'ML Engineer II (Feb 2021 - Jul 2021)' },
                        { title: 'Tiger Analytics', desc: 'Machine Learning Engineer (Jan 2022 - Jul 2023)' },
                        { title: 'WPI Perception', desc: 'Graduate Researcher (Aug 2023 - Feb 2024)' },
                        { title: 'J&J', desc: 'SDS Intern - LLMs (Jun 2024 - Sep 2024)' },
                        { title: 'WPI ELPIS', desc: 'Graduate Researcher (Jan 2024 - May 2025)' },
                        { title: 'webAI', desc: 'Senior ML Engineer (May 2025 - Dec 2025)' },
                        { title: 'Tiger Analytics', desc: 'Senior Machine Learning Engineer (Dec 2025 - Present)' }
                    ]
                },
                {
                    name: 'Skills', orbit: 220, size: 14, color: 0x06ffa5, speed: 0.0008, content: {
                        title: 'Skills',
                        description: 'The tools and technologies I master.',
                        details: ['Click to land and explore my skills.']
                    },
                    billboards: [
                        { title: 'AI & ML', desc: 'Deep Learning, CV, RL' },
                        { title: 'Programming', desc: 'Python, C++, JS' },
                        { title: 'Cloud & Ops', desc: 'AWS, GCP, Docker' }
                    ]
                },
                {
                    name: 'Projects', orbit: 320, size: 16, color: 0x9d4edd, speed: 0.0005, content: {
                        title: 'Projects',
                        description: 'Creative and technical projects.',
                        details: ['Click to land and explore my projects.']
                    },
                    billboards: [
                        { title: 'MinNav', desc: 'ICRA 2026' },
                        { title: 'Robot Grasping', desc: 'ELPIS Lab' },
                        { title: 'RIGGU V2', desc: 'Interactive Platform' },
                        { title: 'Indoor Nav', desc: 'Motion Planning' },
                        { title: '3R Manipulator', desc: 'Dynamics' },
                        { title: 'Alien Catcher', desc: 'UAV Control' }
                    ]
                },
                {
                    name: 'Education', orbit: 420, size: 15, color: 0x4361ee, speed: 0.0003, content: {
                        title: 'Education',
                        description: 'Academic background and achievements.',
                        details: ['Click to land and explore my education.']
                    },
                    billboards: [
                        { title: 'WPI', desc: 'MS Robotics Engineering' },
                        { title: 'IGNOU', desc: 'MA Philosophy' },
                        { title: 'Hyderabad Univ', desc: 'PG Diploma AI' },
                        { title: 'NIT Calicut', desc: 'B.Tech Mech Eng' }
                    ]
                }
            ]
        }
    ];

    enrichWorldSystems(systems);
    systems.forEach(systemData => {
        const system = createSystem(systemData);
        starSystems.push(system);
        scene.add(system.group);

        // Create path if enabled
        if (systemData.hasPath) {
            createSystemPath(system);
        }
    });
}

function createSystemPath(system) {
    // Sort planets by sequence
    const sortedPlanets = system.planets
        .filter(p => p.userData.sequence)
        .sort((a, b) => a.userData.sequence - b.userData.sequence);

    if (sortedPlanets.length < 2) return;

    const points = sortedPlanets.map(p => p.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 2,
        gapSize: 1,
        opacity: 0.3,
        transparent: true
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Required for dashed lines

    system.group.add(line);
    system.pathLine = line;
    system.sortedPlanets = sortedPlanets;
}

function createSystem(data) {
    const group = new THREE.Group();
    group.position.set(data.position.x, data.position.y, data.position.z);
    group.userData.name = data.name;

    // Star
    const starGeo = new THREE.SphereGeometry(data.planets[0].orbit * 0.2, 128, 128); // high res for displacement
    const starMat = typeof createSunMaterial === 'function' ? createSunMaterial() : new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const star = new THREE.Mesh(starGeo, starMat);
    group.add(star);

    // Multiple Star glow halos for an intense emissive look
    const glow1 = new THREE.Mesh(
        new THREE.SphereGeometry(15, 32, 32),
        new THREE.MeshBasicMaterial({ color: data.starColor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
    );
    const glow2 = new THREE.Mesh(
        new THREE.SphereGeometry(25, 32, 32),
        new THREE.MeshBasicMaterial({ color: data.starColor, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending })
    );
    const glow3 = new THREE.Mesh(
        new THREE.SphereGeometry(45, 32, 32),
        new THREE.MeshBasicMaterial({ color: data.starColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending })
    );
    group.add(glow1, glow2, glow3);

    // Star PointLight — illuminates planet day-sides, dims night-sides
    const starLight = new THREE.PointLight(data.starColor, 1.8, 700);
    group.add(starLight);

    // Create planets + orbit rings
    const systemPlanets = [];
    data.planets.forEach(planetData => {
        const planet = createPlanet(planetData);
        planet.userData.href = planetData.href;
        planet.userData.size = planetData.size;
        planet.userData.orbit       = planetData.orbit;
        planet.userData.speed       = planetData.speed;
        planet.userData.angle       = Math.random() * Math.PI * 2;
        planet.userData.content     = planetData.content;
        planet.userData.systemName  = data.name;
        planet.userData.sequence    = planetData.sequence;
        planet.userData.billboards  = planetData.billboards; // carry billboard data

        planet.position.x = Math.cos(planet.userData.angle) * planetData.orbit;
        planet.position.z = Math.sin(planet.userData.angle) * planetData.orbit;

        group.add(planet);
        systemPlanets.push(planet);
        planets.push(planet);

        // Orbit ring — faint dashed ellipse lying flat on Y=0
        const orbitPoints = [];
        const SEG = 128;
        for (let i = 0; i <= SEG; i++) {
            const a = (i / SEG) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                Math.cos(a) * planetData.orbit,
                0,
                Math.sin(a) * planetData.orbit
            ));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMat = new THREE.LineBasicMaterial({
            color: planetData.color,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending
        });
        group.add(new THREE.LineLoop(orbitGeo, orbitMat));
    });

    return {
        group: group,
        planets: systemPlanets,
        name: data.name,
        hasPath: data.hasPath
    };
}

function updateSystemPaths() {
    starSystems.forEach(system => {
        if (system.pathLine && system.sortedPlanets) {
            const points = system.sortedPlanets.map(p => p.position);
            system.pathLine.geometry.setFromPoints(points);
            system.pathLine.computeLineDistances(); // Recompute for dashed effect
            system.pathLine.geometry.attributes.position.needsUpdate = true;
        }
    });
}

function createPlanet(data) {
    const planetGroup = new THREE.Group();

    // Create procedural texture for planet surface
    const surfaceTexture = createPlanetTexture(data.color, data.size);

    // Main planet with textured surface
    const geometry = new THREE.SphereGeometry(data.size, 64, 64);

    // Use more realistic material with texture
    const material = new THREE.MeshStandardMaterial({
        map: surfaceTexture,
        roughness: 0.8,
        metalness: 0.2,
        emissive: data.color,
        emissiveIntensity: 0.1,
        bumpMap: surfaceTexture,
        bumpScale: 0.3
    });

    const planet = new THREE.Mesh(geometry, material);
    planet.rotation.x = Math.random() * Math.PI;
    planet.rotation.y = Math.random() * Math.PI;
    planetGroup.add(planet);

    // Add slowly rotating animation
    planetGroup.userData.rotationSpeed = 0.001 + Math.random() * 0.002;

    // Cloud layer for some variety
    if (data.name === 'Skills' || data.name === 'Education') {
        const cloudGeometry = new THREE.SphereGeometry(data.size * 1.015, 32, 32);
        const cloudTexture = createCloudTexture(data.size);
        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.4,
            roughness: 1.0,
            metalness: 0.0,
            depthWrite: false
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        clouds.userData.cloudRotation = 0.0005;
        planetGroup.add(clouds);
        planetGroup.userData.clouds = clouds;
    }

    // Enhanced atmosphere with gradient
    const atmosphereGeometry = new THREE.SphereGeometry(data.size * 1.15, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(data.color) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(color, 1.0) * intensity;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planetGroup.add(atmosphere);

    // Directional light for better shading
    const light = new THREE.PointLight(0xffffff, 0.3, data.size * 3);
    light.position.set(data.size * 2, data.size, data.size * 2);
    planetGroup.add(light);

    // Saturn-style rings on Education (Ice) planet
    if (data.name === 'Education') {
        const ringGeo = new THREE.RingGeometry(data.size * 1.5, data.size * 2.5, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            roughness: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.2;
        ring.rotation.y = Math.PI / 8;
        planetGroup.add(ring);
    }

    planetGroup.userData.name = data.name;
    planetGroup.userData.planet = planet; // Store reference for rotation

    return planetGroup;
}

// Create procedural planet texture
function createPlanetTexture(baseColor, size) {
    const canvas = document.createElement('canvas');
    const resolution = 512;
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    // Convert hex color to RGB
    const color = new THREE.Color(baseColor);
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    // Create base gradient
    const gradient = ctx.createLinearGradient(0, 0, resolution, resolution);
    gradient.addColorStop(0, `rgb(${r * 0.6}, ${g * 0.6}, ${b * 0.6})`);
    gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    gradient.addColorStop(1, `rgb(${r * 0.8}, ${g * 0.8}, ${b * 0.8})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, resolution, resolution);

    // Add noise for surface detail
    const imageData = ctx.getImageData(0, 0, resolution, resolution);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 40;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
    }

    // Add some "continents" or features
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * resolution;
        const y = Math.random() * resolution;
        const radius = 30 + Math.random() * 60;

        const featureGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const darken = Math.random() > 0.5 ? 0.7 : 1.3;
        featureGradient.addColorStop(0, `rgba(${r * darken}, ${g * darken}, ${b * darken}, 0.6)`);
        featureGradient.addColorStop(1, 'transparent');

        ctx.putImageData(imageData, 0, 0);
        ctx.fillStyle = featureGradient;
        ctx.fillRect(0, 0, resolution, resolution);
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create procedural cloud texture
function createCloudTexture(size) {
    const canvas = document.createElement('canvas');
    const resolution = 256;
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    // Transparent base
    ctx.clearRect(0, 0, resolution, resolution);

    // Add white cloud patches
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * resolution;
        const y = Math.random() * resolution;
        const radius = 15 + Math.random() * 30;

        const cloudGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        cloudGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        cloudGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = cloudGradient;
        ctx.fillRect(0, 0, resolution, resolution);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create Asteroid Field
function createAsteroidField() {
    const asteroidGeo = new THREE.DodecahedronGeometry(1, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1
    });

    const count = 1000;
    const instanced = new THREE.InstancedMesh(asteroidGeo, asteroidMat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 120 + Math.random() * 300;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 30; // Belt thickness

        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const scale = 0.5 + Math.random() * 3.5;
        dummy.scale.set(scale, scale, scale);
        
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instanced);
    return instanced;
}

// ========================================
// Animation Loop
// ========================================

// Tracks launch pad pulse animation
let launchPadPulseTime = 0;

function animate() { UniverseClock.start(simulateFrame, () => { renderer.render(scene, camera); }); }

function simulateFrame() {

    if (isRoverMode) {
        updateRoverMovement();

        // Pulse the launch pad light if present
        if (launchPad && launchPad.userData.light) {
            launchPadPulseTime += 0.05;
            launchPad.userData.light.intensity = 1.5 + Math.sin(launchPadPulseTime) * 1.0;
        }

        // Animate surface ambient particles
        if (surfaceParticles) {
            surfaceParticleTime += 0.016;
            const positions = surfaceParticles.geometry.attributes.position;
            const biome = roverScene.userData.biome;

            for (let i = 0; i < positions.count; i++) {
                let py = positions.getY(i);
                const px = positions.getX(i);
                const pz = positions.getZ(i);

                if (biome === 'ice') {
                    // Snow: fall downward and drift
                    py -= 0.15 + Math.random() * 0.05;
                    positions.setX(i, px + Math.sin(surfaceParticleTime + i) * 0.02);
                    if (py < 0) py += 100;
                } else if (biome === 'desert') {
                    // Dust: fast horizontal drift
                    positions.setX(i, px - 0.5); // wind blowing left
                    positions.setZ(i, pz - 0.2);
                    if (px < -200) positions.setX(i, px + 400);
                    if (pz < -200) positions.setZ(i, pz + 400);
                } else if (biome === 'forest') {
                    // Rain: fast falling down
                    py -= 0.8 + Math.random() * 0.4;
                    if (py < 0) py += 100;
                } else if (biome === 'alien') {
                    // Spores: drift upward and spiral slowly
                    positions.setX(i, px + Math.cos(surfaceParticleTime * 0.2 + i) * 0.02);
                    py += 0.05;
                    if (py > 100) py -= 100;
                }
                positions.setY(i, py);
            }
            positions.needsUpdate = true;
        }

        // Day/Night Cycle
        if (surfaceSun) {
            surfaceTime += 0.001; // slow sun rotation
            // Sun orbits over the X axis
            const sunDist = 300;
            surfaceSun.position.x = Math.cos(surfaceTime) * sunDist;
            surfaceSun.position.y = Math.sin(surfaceTime) * sunDist;
            
            // Adjust light intensity based on height
            if (surfaceSun.position.y > 0) {
                surfaceSun.intensity = Math.min(1.2, surfaceSun.position.y / 50);
                scene.background = new THREE.Color().lerpColors(new THREE.Color(0x000000), roverScene.userData.skyColor, surfaceSun.intensity);
            } else {
                surfaceSun.intensity = 0;
                scene.background = new THREE.Color(0x000000); // Night sky
            }
        }

        // Update 2D planet labels if in 2D mode
        if (currentView === '2D') {
            update2DLabels();
        } else {
            const labelsContainer = document.getElementById('labels-2d-container');
            if (labelsContainer) labelsContainer.style.display = 'none';
        }


        return;
    }

    // Update camera based on controls
    updateMovement();
    
    // Update Cockpit Telemetry
    if (!isRoverMode) {
        const cpx = document.getElementById('cp-x');
        const cpy = document.getElementById('cp-y');
        const cpz = document.getElementById('cp-z');
        if (cpx) cpx.textContent = camera3D.position.x.toFixed(4);
        if (cpy) cpy.textContent = camera3D.position.y.toFixed(4);
        if (cpz) cpz.textContent = camera3D.position.z.toFixed(4);
    }

    // Rotate Asteroid Belt
    if (asteroidBelt) {
        asteroidBelt.rotation.y += 0.0005;
    }

    // Rotate Nebula Layers
    if (window.nebulaLayers) {
        window.nebulaLayers.forEach((layer, index) => {
            // Parallax effect: inner layers rotate slower, outer layers faster, alternating direction
            const direction = index % 2 === 0 ? 1 : -1;
            const speed = 0.0001 * (index + 1);
            layer.rotation.z += speed * direction;
            layer.rotation.x += speed * 0.5 * direction;
        });
    }

    // Asteroid collision wobble
    if (!isRoverMode && currentView === '3D') {
        const d = Math.sqrt(camera3D.position.x**2 + camera3D.position.z**2);
        if (d > 120 && d < 420 && Math.abs(camera3D.position.y) < 15) {
            camera3D.position.y += (Math.random() - 0.5) * 0.4;
            camera3D.position.x += (Math.random() - 0.5) * 0.4;
            if (Math.random() < 0.02) {
                writeToConsole("WARNING: DEBRIS COLLISION DETECTED.");
            }
        }
    }

    // Update Sun Shader Time
    if (window.sunUniforms) {
        window.sunUniforms.time.value = performance.now() * 0.001;
    }

    // Update planet orbits and rotation
    starSystems.forEach(system => {
        system.planets.forEach(planet => {
            // Orbit rotation
            planet.userData.angle += planet.userData.speed;
            planet.position.x = Math.cos(planet.userData.angle) * planet.userData.orbit;
            planet.position.z = Math.sin(planet.userData.angle) * planet.userData.orbit;

            // Planet axis rotation
            if (planet.userData.planet) {
                planet.userData.planet.rotation.y += planet.userData.rotationSpeed || 0.002;
            }

            // Cloud rotation
            if (planet.userData.clouds) {
                planet.userData.clouds.rotation.y += planet.userData.clouds.userData.cloudRotation || 0.0005;
            }

            // Proximity approach HUD — show landing hint, never auto-land
            const worldPos = new THREE.Vector3();
            planet.getWorldPosition(worldPos);
            const dist = camera3D.position.distanceTo(worldPos);
            const planetRadius = planet.userData.size || 15;
            
            if (currentView === '3D') {
                const approachEl = document.getElementById('planet-approach-hud');
                if (approachEl) {
                    if (dist < 80 && dist > planetRadius + 8) {
                        approachEl.textContent = `PLANET: ${planet.userData.name}  |  DIST: ${Math.round(dist)}u  |  CLICK TO LAND`;
                        approachEl.classList.add('visible');
                    } else {
                        approachEl.classList.remove('visible');
                    }
                }
                
                // Collision Auto-Evade
                if (!isRoverMode && !isLandingAnim && dist < planetRadius + 3) {
                    const bounceDir = camera3D.position.clone().sub(worldPos).normalize();
                    camera3D.position.add(bounceDir.multiplyScalar(3));
                    writeToConsole("WARNING: COLLISION AVOIDANCE TRIGGERED.");
                }
            }
        });
    });

    // Check proximity to systems
    updateSystemInfo();

    // Update sequential paths
    updateSystemPaths();

    // Update Info Card Position
    updateInfoCardPosition();

    // Update 2D Labels
    if (currentView === '2D') {
        update2DLabels();
    } else {
        const labelsContainer = document.getElementById('labels-2d-container');
        if (labelsContainer) labelsContainer.style.display = 'none';
    }


}

// ========================================
// Movement
// ========================================

function updateRoverMovement() {
    if (!rover || isLandingAnim || isLaunching || document.querySelector("dialog[open]")) return;

    const biome = roverScene.userData.biome;
    const ground = roverScene.userData.ground;
    let isGroundedState = rover.userData.grounded !== false;

    // Check Water Physics
    let inWater = false;
    if (biome === 'forest' && rover.position.y < -1) {
        inWater = true;
    }

    // Acceleration & Friction
    const isBoosting = controls.down; // Shift
    const accel = inWater ? 0.02 : (isBoosting ? 0.15 : 0.05);
    const maxSpeed = inWater ? 0.5 : (isBoosting ? 4.0 : 2.0);
    const friction = inWater ? 0.8 : (isGroundedState ? 0.9 : 0.98); // Less friction in air

    if (roverScene.userData.boostFlame) {
        roverScene.userData.boostFlame.visible = isBoosting && controls.forward;
        if (isBoosting) {
            roverScene.userData.boostFlame.scale.setScalar(0.8 + Math.random() * 0.4);
        }
    }

    if (controls.forward) roverVelocity += accel;
    else if (controls.backward) roverVelocity -= accel;
    else roverVelocity *= friction;

    roverVelocity = Math.max(-maxSpeed/2, Math.min(roverVelocity, maxSpeed));

    // Steering
    const steerSpeed = inWater ? 0.02 : 0.05;
    if (controls.left) rover.rotation.y += steerSpeed;
    if (controls.right) rover.rotation.y -= steerSpeed;

    // Apply Velocity horizontally
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(rover.quaternion);
    // Project direction onto XZ plane to drive flat
    dir.y = 0;
    dir.normalize();
    
    rover.position.addScaledVector(dir, roverVelocity);

    // Animate wheels
    if (rover.userData.wheels) {
        // Circumference = 2 * PI * r (r=1.2) => ~7.5. Rotation = Distance / Radius
        const rotationAmount = -roverVelocity / 1.2; 
        rover.userData.wheels.forEach(w => {
            w.rotation.x += rotationAmount;
        });
    }

    // Terrain Raycasting Physics
    if (ground) {
        const raycaster = new THREE.Raycaster();
        const origin = rover.position.clone();
        origin.y = 100; // Raycast from high up
        const down = new THREE.Vector3(0, -1, 0);
        raycaster.set(origin, down);

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const hit = intersects[0];
            const targetY = hit.point.y;
            
            // Apply Gravity
            rover.userData.velocityY = (rover.userData.velocityY || 0) - 0.12; 
            rover.position.y += rover.userData.velocityY;

            // Ground Collision
            if (rover.position.y <= targetY) {
                rover.position.y = targetY;
                rover.userData.velocityY = 0;
                isGroundedState = true;
            } else {
                isGroundedState = false;
            }

            // Jump
            if (isGroundedState && controls.up) {
                rover.userData.velocityY = 2.5;
            }

            // Tilt Chassis to match terrain normal (only strongly if grounded)
            const slerpFactor = isGroundedState ? 0.2 : 0.05;
            const normal = hit.face.normal.clone();
            // Transform normal to world space if ground is rotated
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(ground.matrixWorld);
            normal.applyMatrix3(normalMatrix).normalize();

            // Calculate target quaternion to align up vector with normal
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            // Apply heading rotation
            const headingQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rover.rotation.y);
            targetQuat.multiply(headingQuat);

            // Smooth slerp rotation
            rover.quaternion.slerp(targetQuat, slerpFactor);
        } else {
            // Fallback: stay on ground if raycast misses
            rover.position.y = Math.max(rover.position.y, 0);
        }
    }

    rover.userData.grounded = isGroundedState;

    // Boundary check: Warn and return to base if wandering too far
    const distFromBase = Math.sqrt(rover.position.x**2 + rover.position.z**2);
    const warnEl = document.getElementById('boundary-warning');
    if (distFromBase > 350 && distFromBase <= 400) {
        if (warnEl) warnEl.style.display = 'block';
    } else if (distFromBase > 400) {
        // Teleport back
        rover.position.set(0, 0, 0);
        rover.rotation.y = 0;
        roverLookYaw = 0;
        roverLookPitch = 0;
        if (warnEl) warnEl.style.display = 'none';
        
        // Brief white flash
        const overlay = document.getElementById('landing-overlay');
        overlay.style.transition = 'none';
        overlay.style.opacity = '1';
        setTimeout(() => {
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.opacity = '0';
        }, 50);
    } else {
        if (warnEl) warnEl.style.display = 'none';
    }

    // Chase Camera with mouse-look yaw/pitch offset
    const baseOffset = new THREE.Vector3(0, 12, 30);
    baseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rover.rotation.y + roverLookYaw);
    const targetPos = rover.position.clone().add(baseOffset);
    camera3D.position.lerp(targetPos, 0.1);

    // Look-at point: rover center + pitch offset
    const lookTarget = rover.position.clone().add(new THREE.Vector3(0, 3, 0));
    // Apply vertical look by shifting target up/down
    lookTarget.y += Math.tan(roverLookPitch) * 30;
    camera3D.lookAt(lookTarget);

    // Update rover HUD speed display
    const speedEl = document.getElementById('rover-speed');
    if (speedEl) speedEl.textContent = Math.abs(roverVelocity).toFixed(2) + ' m/s';

    // Update Compass
    const compassNeedle = document.getElementById('compass-needle');
    if (compassNeedle) {
        const deg = rover.rotation.y * (180 / Math.PI);
        compassNeedle.style.transform = `rotate(${-deg}deg)`;
    }

    // Check Kiosk Proximity
    if (roverScene.userData.kiosks) {
        let nearKiosk = null;
        for (let k of roverScene.userData.kiosks) {
            if (rover.position.distanceTo(k.position) < 8) {
                nearKiosk = k;
                break;
            }
        }
        
        const hintEl = document.getElementById('interact-hint');
        if (nearKiosk) {
            currentInteractiveKioskBoard = nearKiosk.userData.board;
            if (hintEl) hintEl.style.display = 'flex';
        } else {
            currentInteractiveKioskBoard = null;
            if (hintEl) hintEl.style.display = 'none';
        }
    }

    // Animate aliens
    const time = performance.now();
    if (roverScene.userData.rockyOrb) {
        roverScene.userData.rockyOrb.position.y = 11.5 + Math.sin(time * 0.005) * 0.5;
        roverScene.userData.rockyLight.intensity = 1 + Math.sin(time * 0.01) * 0.5;
    }
    if (roverScene.userData.greenAlien) {
        roverScene.userData.greenAlien.position.y = Math.abs(Math.sin(time * 0.005)); // Hopping
    }
    if (roverScene.userData.energyAlien) {
        roverScene.userData.energyAlien.rotation.y += 0.02;
        roverScene.userData.energyAlien.rotation.x += 0.01;
        roverScene.userData.energyAlien.position.y = Math.sin(time * 0.003) * 1.5; // Floating
    }

    // Weather
    if (surfaceParticles) {
        surfaceParticleTime += 0.01;
        const pos = surfaceParticles.geometry.attributes.position.array;
        const b = roverScene.userData.biome;
        for (let i = 0; i < pos.length; i += 3) {
            if (b === 'forest' || b === 'ice') { // rain/snow falls
                pos[i+1] -= (b === 'forest' ? 2 : 0.5);
                if (pos[i+1] < 0) pos[i+1] = 100;
            } else { // drifting particles
                pos[i] += Math.sin(surfaceParticleTime + i) * 0.1;
                pos[i+1] += Math.cos(surfaceParticleTime + i) * 0.1;
            }
        }
        surfaceParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Collectibles Proximity
    if (roverScene.userData.collectibles) {
        for (let c of roverScene.userData.collectibles) {
            if (!c.userData.collected) {
                c.rotation.y += 0.05;
                c.position.y += Math.sin(time * 0.005 + c.position.x) * 0.02;
                if (rover.position.distanceTo(c.position) < 5) {
                    c.userData.collected = true;
                    roverScene.remove(c);
                    unlockAchievement('collected_' + c.id, 'Data Log Found', 'You discovered a hidden data fragment.');
                    if (typeof speakCoPilot === 'function') speakCoPilot("Data log recovered.");
                }
            }
        }
    }

    // Footprints
    if (!roverScene.userData.footprints) roverScene.userData.footprints = [];
    if (isGroundedState && Math.abs(roverVelocity) > 0.1) {
        if (!roverScene.userData.lastFootprintTime || time - roverScene.userData.lastFootprintTime > 200) {
            roverScene.userData.lastFootprintTime = time;
            
            const fGeo = new THREE.PlaneGeometry(1.5, 0.5);
            const fMat = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false});
            const footprint = new THREE.Mesh(fGeo, fMat);
            footprint.rotation.x = -Math.PI / 2;
            footprint.rotation.z = -rover.rotation.y;
            footprint.position.copy(rover.position);
            footprint.position.y += 0.05;
            roverScene.add(footprint);
            
            roverScene.userData.footprints.push(footprint);
            if (roverScene.userData.footprints.length > 50) {
                const old = roverScene.userData.footprints.shift();
                roverScene.remove(old);
                old.geometry.dispose();
                old.material.dispose();
            }
        }
    }

    drawMinimap();
}

function drawMinimap() {
    const canvas = document.getElementById('rover-minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;
    const scale = 0.1;
    
    // Draw Base
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(cx, cy, 15 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw Kiosks
    if (roverScene.userData.kiosks) {
        ctx.fillStyle = '#00aaff';
        roverScene.userData.kiosks.forEach(k => {
            ctx.beginPath();
            ctx.arc(cx + k.position.x * scale, cy + k.position.z * scale, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw Collectibles
    if (roverScene.userData.collectibles) {
        ctx.fillStyle = '#ffaa00';
        roverScene.userData.collectibles.forEach(c => {
            if (!c.userData.collected) {
                ctx.beginPath();
                ctx.arc(cx + c.position.x * scale, cy + c.position.z * scale, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Draw Rover
    const rx = cx + rover.position.x * scale;
    const rz = cy + rover.position.z * scale;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(
        rx + Math.sin(rover.rotation.y) * 4,
        rz + Math.cos(rover.rotation.y) * 4
    );
    ctx.lineTo(
        rx - Math.sin(rover.rotation.y + Math.PI*0.8) * 3,
        rz - Math.cos(rover.rotation.y + Math.PI*0.8) * 3
    );
    ctx.lineTo(
        rx - Math.sin(rover.rotation.y - Math.PI*0.8) * 3,
        rz - Math.cos(rover.rotation.y - Math.PI*0.8) * 3
    );
    ctx.closePath();
    ctx.fill();
}


function updateMovement() {
    if (document.querySelector("dialog[open]")) return;
    if (currentView !== '3D') return;

    const speed = baseSpeed;
    const direction = new THREE.Vector3();

    if (controls.forward) {
        camera.getWorldDirection(direction);
        camera.position.addScaledVector(direction, speed);
    }
    if (controls.backward) {
        camera.getWorldDirection(direction);
        camera.position.addScaledVector(direction, -speed);
    }
    if (controls.left) {
        direction.set(-1, 0, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(direction, speed);
    }
    if (controls.right) {
        direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(direction, speed);
    }
    if (controls.up) {
        direction.set(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(direction, speed);
    }
    if (controls.down) {
        direction.set(0, -1, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(direction, speed);
    }
}

let selectedObject = null;

function updateInfoCardPosition() {
    const card = document.getElementById('planetInfoCard');
    if (!selectedObject || !card.classList.contains('active')) return;

    // Project world position to 2D screen space.
    const position = new THREE.Vector3();
    selectedObject.getWorldPosition(position);
    position.project(camera);

    const rawX = (position.x *  0.5 + 0.5) * window.innerWidth;
    const rawY = (-(position.y * 0.5) + 0.5) * window.innerHeight;

    // Clamp so the card (300 × ~280 px) stays fully inside the viewport.
    // The card is offset by transform: translate(-50%, -100%), so:
    //   horizontal: half of card width (150) from each edge
    //   vertical:   card height (280) from the top, 10px from the bottom
    const CARD_HALF_W = 150;
    const CARD_H      = 280;
    const MARGIN      = 10;

    const clampedX = Math.max(CARD_HALF_W + MARGIN,
                     Math.min(rawX, window.innerWidth  - CARD_HALF_W - MARGIN));
    const clampedY = Math.max(CARD_H + MARGIN,
                     Math.min(rawY, window.innerHeight - MARGIN));

    card.style.left = `${clampedX}px`;
    card.style.top  = `${clampedY}px`;
}

function update2DLabels() {
    const container = document.getElementById('labels-2d-container');
    if (!container) return;
    
    container.style.display = 'block';
    
    // Create/update labels
    planets.forEach((planet, index) => {
        let label = document.getElementById(`label-2d-${index}`);
        if (!label) {
            label = document.createElement('div');
            label.id = `label-2d-${index}`;
            label.className = 'label-2d';
            label.textContent = planet.userData.name || 'Unknown';
            container.appendChild(label);
        }
        
        // Project position
        const pos = new THREE.Vector3();
        planet.getWorldPosition(pos);
        pos.project(camera2D);
        
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
        
        // Offset slightly
        label.style.left = `${x}px`;
        label.style.top = `${y - 15}px`;
    });
}

function updateSystemInfo() {
    let nearestSystem = null;
    let minDistance = Infinity;

    starSystems.forEach(system => {
        const distance = camera.position.distanceTo(system.group.position);
        if (distance < minDistance) {
            minDistance = distance;
            nearestSystem = system;
        }
    });

    if (nearestSystem && minDistance < 150) {
        document.getElementById('systemName').textContent = `Near: ${nearestSystem.name} System`;
    } else {
        document.getElementById('systemName').textContent = 'Deep Space';
    }
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Mobile Controls dispatcher
    window.dispatchKey = function(key) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: key }));
    };
    window.releaseKey = function(key) {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: key }));
    };

    window.addEventListener('resize', onWindowResize);

    window.addEventListener('keydown', (e) => {
        if (e.target.closest?.('input, textarea, select, [contenteditable], dialog[open]')) return;
        switch (e.key.toLowerCase()) {
            case 'w': controls.forward  = true; break;
            case 's': controls.backward = true; break;
            case 'a': controls.left     = true; break;
            case 'd': controls.right    = true; break;
            case ' ':
                controls.up = true;
                e.preventDefault();
                break;
            case 'shift':
                controls.down = true;
                break;
            case 'e':
                // E key = Launch from planet surface
                if (isRoverMode) returnToOrbit();
                break;
            case 'f':
                // F key = Interact with Kiosk
                if (isRoverMode && currentInteractiveKioskBoard) showWorldExhibit(currentInteractiveKioskBoard);
                break;
            case 'escape':
                document.getElementById('kiosk-modal').style.display = 'none';
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w': controls.forward = false; break;
            case 's': controls.backward = false; break;
            case 'a': controls.left = false; break;
            case 'd': controls.right = false; break;
            case ' ': controls.up = false; break;
            case 'shift': controls.down = false; break;
        }
    });

    // View Toggle
    document.getElementById('btn3D').addEventListener('click', () => switchView('3D'));
    document.getElementById('btn2D').addEventListener('click', () => switchView('2D'));

    // 2D Pan/Zoom Controls
    const canvas = document.getElementById('canvas3d');

    canvas.addEventListener('mousedown', (e) => {
        if (currentView === '2D') {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        // Spaceship mouse-look
        if (!isRoverMode && currentView === '3D' && (e.buttons === 2 || document.pointerLockElement === canvas)) {
            shipYaw -= e.movementX * SHIP_ROTATION_SPEED;
            shipPitch -= e.movementY * SHIP_ROTATION_SPEED;
            shipPitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, shipPitch));
            camera3D.quaternion.setFromEuler(new THREE.Euler(shipPitch, shipYaw, 0, 'YXZ'));
            return;
        }

        // Rover mouse-look (right-mouse-button held or pointer locked)
        if (isRoverMode && (e.buttons === 2 || document.pointerLockElement === canvas)) {
            roverLookYaw   -= e.movementX * ROVER_LOOK_SENSITIVITY;
            roverLookPitch  = Math.max(-ROVER_PITCH_LIMIT,
                              Math.min(ROVER_PITCH_LIMIT,
                              roverLookPitch - e.movementY * ROVER_LOOK_SENSITIVITY));
            return;
        }
        // Reset look toward rover heading when no mouse button held
        if (isRoverMode && e.buttons === 0) {
            roverLookYaw   *= 0.92; // Spring back
            roverLookPitch *= 0.92;
        }

        if (currentView === '2D' && isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            // Adjust camera position based on zoom level
            const moveSpeed = 2 / zoomLevel;
            camera2D.position.x -= deltaX * moveSpeed;
            camera2D.position.z -= deltaY * moveSpeed;

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    // Right-click on canvas requests pointer lock for full mouse-look
    canvas.addEventListener('contextmenu', (e) => {
        if (currentView === '3D') {
            e.preventDefault();
            canvas.requestPointerLock();
        }
    });
    // Release pointer lock on E (launch) or Escape
    document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
            roverLookYaw   = 0;
            roverLookPitch = 0;
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // { passive: false } is required so we can call e.preventDefault() inside
    // and avoid the browser warning: "Unable to preventDefault inside passive
    // event listener invocation."
    canvas.addEventListener('wheel', (e) => {
        if (currentView === '2D') {
            e.preventDefault();
            const zoomSpeed = 0.001;
            zoomLevel += e.deltaY * -zoomSpeed;
            zoomLevel = Math.min(Math.max(0.5, zoomLevel), 3); // Clamp zoom

            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = 600 / zoomLevel;

            camera2D.left   = frustumSize * aspect / -2;
            camera2D.right  = frustumSize * aspect / 2;
            camera2D.top    = frustumSize / 2;
            camera2D.bottom = frustumSize / -2;
            camera2D.updateProjectionMatrix();
        }
    }, { passive: false });

    // Mouse click to select planet
    canvas.addEventListener('click', onCanvasClick);

    // Close card
    document.getElementById('closeCardBtn').addEventListener('click', () => {
        document.getElementById('planetInfoCard').classList.remove('active');
        selectedObject = null;
        
        const cockpitLandBtn = document.getElementById('cockpit-land-btn');
        if (cockpitLandBtn) cockpitLandBtn.style.display = 'none';
        enhancePlanetCard(planet);
    const cpTarget = document.getElementById('cp-target');
        if (cpTarget) cpTarget.textContent = '---';
    });

    // Close kiosk modal
    document.getElementById('closeKioskBtn').addEventListener('click', () => {
        document.getElementById('kiosk-modal').style.display = 'none';
    });
}

function switchView(view) {
    currentView = view;

    // Update buttons
    document.getElementById('btn3D').classList.toggle('active', view === '3D');
    document.getElementById('btn2D').classList.toggle('active', view === '2D');

    // Switch camera
    if (view === '3D') {
        camera = camera3D;
        scene.fog.density = 0.0005; // Enable fog in 3D
        controls.forward = false; // Reset movement
    } else {
        camera = camera2D;
        scene.fog.density = 0; // Disable fog in 2D for clear view

        // Reset 2D camera position to center
        camera2D.position.set(0, 500, 0);
        zoomLevel = 1;
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 600;
        camera2D.left = frustumSize * aspect / -2;
        camera2D.right = frustumSize * aspect / 2;
        camera2D.top = frustumSize / 2;
        camera2D.bottom = frustumSize / -2;
        camera2D.updateProjectionMatrix();
    }
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;

    // Update 3D Camera
    camera3D.aspect = aspect;
    camera3D.updateProjectionMatrix();

    // Update 2D Camera
    const frustumSize = 600 / zoomLevel;
    camera2D.left = frustumSize * aspect / -2;
    camera2D.right = frustumSize * aspect / 2;
    camera2D.top = frustumSize / 2;
    camera2D.bottom = frustumSize / -2;
    camera2D.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCanvasClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Get all planets and stars
    const interactables = [];
    starSystems.forEach(system => {
        interactables.push(...system.planets);
        // Add the star mesh (first child of group usually)
        const star = system.group.children[0];
        if (star) {
            star.userData.isStar = true;
            star.userData.system = system;
            interactables.push(star);
        }
    });

    const intersects = raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
        let object = intersects[0].object;

        // Handle Star Click
        if (object.userData.isStar || (object.parent && object.parent.userData.isStar)) {
            const system = object.userData.system || object.parent.userData.system;
            selectedObject = system.group.children[0]; // Track the star mesh
            showSystemInfo(system);
            return;
        }

        // Handle Planet Click
        while (object.parent && !object.userData.content) {
            object = object.parent;
        }

        if (object.userData.content) {
            selectedObject = object; // Track the planet group
            showPlanetInfo(object);
        }
    } else {
        // Clicked empty space - close card
        document.getElementById('planetInfoCard').classList.remove('active');
        selectedObject = null;
    }
}

function showSystemInfo(system) {
    document.getElementById('cardTitle').textContent = system.name + ' System';

    let description = '';
    if (system.name === 'Experience') description = 'A journey through my professional career.';
    if (system.name === 'Skills') description = 'The tools and technologies I master.';
    if (system.name === 'Projects') description = 'Creative and technical projects.';
    if (system.name === 'Education') description = 'Academic background and achievements.';

    const contentHTML = `
        <p>${description}</p>
        <h3>Planets (In Order)</h3>
        <ul>
            ${system.planets.map(p => `<li>${p.userData.content.title}</li>`).join('')}
        </ul>
    `;

    document.getElementById('cardContent').innerHTML = contentHTML;
    document.getElementById('planetInfoCard').classList.add('active');
    
    // Hide landing button for system
    const landBtn = document.getElementById('land-btn');
    if (landBtn) landBtn.style.display = 'none';
}

function showPlanetInfo(planet) {
    const content = planet.userData.content;
    const billboards = planet.userData.billboards || [];

    let titleText = content.title;
    if (localStorage.getItem(`visited_${content.title}`)) {
        titleText += ' [VISITED ✓]';
    }
    document.getElementById('cardTitle').textContent = titleText;

    let billboardHTML = '';
    if (billboards.length > 0) {
        billboardHTML = '<h3>Features</h3><ul>';
        billboards.slice(0, 4).forEach(b => {
            billboardHTML += `<li><strong>${b.title}</strong>: ${b.desc}</li>`;
        });
        if (billboards.length > 4) {
            billboardHTML += `<li>...and ${billboards.length - 4} more.</li>`;
        }
        billboardHTML += '</ul>';
    }

    const contentHTML = `
        <p>${content.description}</p>
        ${billboardHTML}
        <h3>Details</h3>
        <ul>
            ${content.details.map(detail => `<li>${detail}</li>`).join('')}
        </ul>
    `;

    document.getElementById('cardContent').innerHTML = contentHTML;
    document.getElementById('planetInfoCard').classList.add('active');
    
    const landBtn = document.getElementById('land-btn');
    if (landBtn) {
        landBtn.style.display = 'none'; // Hidden in favor of the cockpit land button
        landBtn.onclick = () => {
            initiateLanding(planet);
        };
    }
    
    const cockpitLandBtn = document.getElementById('cockpit-land-btn');
    if (cockpitLandBtn) {
        cockpitLandBtn.style.display = 'block';
        cockpitLandBtn.onclick = () => {
            initiateLanding(planet);
        };
    }

    enhancePlanetCard(planet);
    const cpTarget = document.getElementById('cp-target');
    if (cpTarget) cpTarget.textContent = content.title.toUpperCase();
}

// ========================================
// Surface Environment Generation
// ========================================

function createSurfaceEnvironment(planetData) {
    const name = planetData.name;
    let skyColor, groundColor, fogDensity;
    let biome = 'desert';

    // Biome-tuned fog: thick enough that the terrain edge is NEVER visible.
    // The world wraps seamlessly under the fog cover.
    if (name === 'Experience') {
        skyColor = 0x8c5946; groundColor = 0x9a6144; fogDensity = 0.009; biome = 'desert';
    } else if (name === 'Skills') {
        skyColor = 0x284c52; groundColor = 0x32604b; fogDensity = 0.008; biome = 'forest';
    } else if (name === 'Projects') {
        skyColor = 0x15192e; groundColor = 0x3c3555; fogDensity = 0.010; biome = 'alien';
    } else {
        skyColor = 0x789bad; groundColor = 0xc6dce2; fogDensity = 0.009; biome = 'ice';
    }

    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, fogDensity);

    // 1. Terrain — smaller tile (fog hides edges), world-wrap boundary keeps it infinite-feeling
    // TERRAIN_HALF must match WRAP constant in updateRoverMovement
    const groundGeo = new THREE.PlaneGeometry(800, 800, 80, 80);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const dist = Math.sqrt(x*x + y*y);
        let height = 0;
        
        // Flat path down the center Z-axis for rover
        const isPath = Math.abs(x) < 30;
        
        if (dist > 40 && !isPath) {
            if (biome === 'forest') height = Math.sin(x/30)*5 + Math.cos(y/30)*5;
            else if (biome === 'desert') height = Math.sin(x/20)*6 + Math.cos(y/20)*6 + (Math.random()-0.5)*1.5;
            else if (biome === 'alien') height = Math.abs(Math.sin(x/15)*10) + Math.cos(y/15)*5;
            else height = (Math.random() * 0.8) + Math.sin(x/40)*2; // ice
        }
        pos.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    groundGeo.computeBoundingBox();
    groundGeo.computeBoundingSphere();

    const groundMat = new THREE.MeshStandardMaterial({
        color: groundColor,
        roughness: biome === 'ice' ? 0.1 : 0.9,
        metalness: biome === 'ice' ? 0.8 : 0.1,
        flatShading: biome === 'alien'
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.rotation.x = -Math.PI / 2;
    roverScene.add(ground);
    ground.updateMatrixWorld(true);

    roverScene.userData.ground = ground;
    roverScene.userData.biome = biome;
    roverScene.userData.skyColor = new THREE.Color(skyColor);
    addWorldLandmarks(planetData);

    // Water for forest
    if (biome === 'forest') {
        const waterGeo = new THREE.PlaneGeometry(1000, 1000);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1ca3ec,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.8
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -1; // Fill valleys
        roverScene.add(water);
    }

    // Instanced Objects
    let objCount = 250;
    let objGeo, objMat;
    
    if (biome === 'forest') {
        objGeo = new THREE.ConeGeometry(3, 15, 8);
        objGeo.translate(0, 7.5, 0); 
        objMat = new THREE.MeshStandardMaterial({color: 0x004400, roughness: 1.0});
    } else if (biome === 'desert') {
        objGeo = new THREE.DodecahedronGeometry(3, 1);
        objGeo.translate(0, 1.5, 0);
        objMat = new THREE.MeshStandardMaterial({color: 0x8a3324, roughness: 1.0});
    } else if (biome === 'alien') {
        objCount = 150;
        objGeo = new THREE.CylinderGeometry(0, 2, 20, 6);
        objGeo.translate(0, 10, 0);
        objMat = new THREE.MeshStandardMaterial({color: 0x00ffcc, emissive: 0x005544});
    } else {
        objCount = 100;
        objGeo = new THREE.IcosahedronGeometry(4, 0);
        objGeo.translate(0, 2, 0);
        objMat = new THREE.MeshStandardMaterial({color: 0xaaddff, roughness: 0.1, metalness: 0.9});
    }

    const instancedMesh = new THREE.InstancedMesh(objGeo, objMat, objCount);
    const dummy = new THREE.Object3D();
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    for (let i = 0; i < objCount; i++) {
        let x = (Math.random() - 0.5) * 800;
        let z = (Math.random() - 0.5) * 800;
        if (Math.abs(x) < 50) continue; // Keep driving path clear
        
        raycaster.set(new THREE.Vector3(x, 100, z), down);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const y = intersects[0].point.y;
            if (biome === 'forest' && y < -1) continue; // Don't spawn underwater
            
            dummy.position.set(x, y, z);
            if (biome !== 'forest' && biome !== 'alien') {
                dummy.rotation.x = Math.random() * Math.PI;
                dummy.rotation.z = Math.random() * Math.PI;
            }
            dummy.scale.setScalar(0.5 + Math.random() * 1.5);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
    }
    roverScene.add(instancedMesh);

    // Ambient Particles (Dynamic Weather)
    const particleCount = (biome === 'forest' || biome === 'ice') ? 1500 : 500;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        particlePos[i*3] = (Math.random() - 0.5) * 400; // x
        particlePos[i*3+1] = Math.random() * 100; // y
        particlePos[i*3+2] = (Math.random() - 0.5) * 400; // z
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    
    let particleColor = 0xffffff;
    let particleSize = 1;
    let particleOpacity = 0.6;
    
    if (biome === 'ice') { 
        particleColor = 0xffffff; particleSize = 1.5; particleOpacity = 0.8;
    } else if (biome === 'desert') { 
        particleColor = 0xdab894; particleSize = 2; particleOpacity = 0.4;
    } else if (biome === 'forest') { 
        particleColor = 0x88ccff; particleSize = 0.5; particleOpacity = 0.5; // Rain
    } else if (biome === 'alien') { 
        particleColor = 0xd400ff; particleSize = 2.5; particleOpacity = 0.8;
    }
    
    const particleMat = new THREE.PointsMaterial({
        color: particleColor,
        size: particleSize,
        transparent: true,
        opacity: particleOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    surfaceParticles = new THREE.Points(particleGeo, particleMat);
    roverScene.add(surfaceParticles);
    surfaceParticleTime = 0;

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    roverScene.add(ambientLight);

    surfaceSun = new THREE.DirectionalLight(0xffffff, 1.2);
    surfaceSun.position.set(200, 300, 100); // Initial day position
    surfaceSun.castShadow = true;
    surfaceSun.shadow.mapSize.width = 2048;
    surfaceSun.shadow.mapSize.height = 2048;
    surfaceSun.shadow.camera.near = 0.5;
    surfaceSun.shadow.camera.far = 1000;
    surfaceSun.shadow.camera.left = -200;
    surfaceSun.shadow.camera.right = 200;
    surfaceSun.shadow.camera.top = 200;
    surfaceSun.shadow.camera.bottom = -200;
    roverScene.add(surfaceSun);
    surfaceTime = Math.PI / 4; // Start at morning

    // Asteroid field
    const asteroids = new THREE.Group();
    for (let i = 0; i < 30; i++) {
        const geo = new THREE.IcosahedronGeometry(Math.random() * 5 + 2, 0);
        const mat = new THREE.MeshStandardMaterial({color: 0x888888, flatShading: true});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random()-0.5)*1000, 100 + Math.random()*100, (Math.random()-0.5)*1000);
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        asteroids.add(mesh);
    }
    roverScene.add(asteroids);
    roverScene.userData.asteroids = asteroids;

    // 3. Rover Mesh (Upgraded Design)
    rover = new THREE.Group();
    
    // Main Chassis Body
    const chassisGeo = new THREE.BoxGeometry(4, 1.2, 7);
    const chassisMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc, 
        metalness: 0.7, 
        roughness: 0.4
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 1.8;
    rover.add(chassis);

    // Front Sloped Nose
    const noseGeo = new THREE.CylinderGeometry(2, 2, 4, 3);
    noseGeo.rotateZ(Math.PI / 2);
    noseGeo.rotateX(Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({color: 0xaaaaaa, metalness: 0.8, roughness: 0.3});
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.8, -3.5);
    rover.add(nose);

    // Cockpit Window / Sensor block
    const cockpitGeo = new THREE.BoxGeometry(2.5, 0.8, 2);
    const cockpitMat = new THREE.MeshStandardMaterial({color: 0x050505, metalness: 1.0, roughness: 0.0});
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 2.8, -1.5);
    rover.add(cockpit);

    // Rear Cargo Deck / RTG Power Source
    const rtgGeo = new THREE.CylinderGeometry(0.8, 0.8, 2, 16);
    rtgGeo.rotateZ(Math.PI / 2);
    const rtgMat = new THREE.MeshStandardMaterial({color: 0x444444, metalness: 0.9, roughness: 0.5});
    const rtg = new THREE.Mesh(rtgGeo, rtgMat);
    rtg.position.set(0, 2.8, 2);
    rover.add(rtg);
    
    // RTG Fins
    const finsGeo = new THREE.BoxGeometry(2, 2.2, 1.8);
    const finsMat = new THREE.MeshStandardMaterial({color: 0x222222, metalness: 0.5, roughness: 0.8});
    const fins = new THREE.Mesh(finsGeo, finsMat);
    fins.position.set(0, 2.8, 2);
    rover.add(fins);

    // Camera Mast
    const mastGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
    const mastMat = new THREE.MeshStandardMaterial({color: 0x888888});
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(1.5, 3.5, -1.5);
    rover.add(mast);
    
    // Camera Head (Stereo Cameras)
    const headGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({color: 0xeeeeee});
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(1.5, 4.8, -1.5);
    rover.add(head);

    const lensGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({color: 0x00aaff});
    const lens1 = new THREE.Mesh(lensGeo, lensMat);
    lens1.position.set(1.2, 4.8, -1.7);
    rover.add(lens1);
    const lens2 = new THREE.Mesh(lensGeo, lensMat);
    lens2.position.set(1.8, 4.8, -1.7);
    rover.add(lens2);

    // Boost Flame
    const flameGeo = new THREE.ConeGeometry(0.8, 3, 8);
    const flameMat = new THREE.MeshBasicMaterial({color: 0x00ffff, transparent: true, opacity: 0.8});
    const boostFlame = new THREE.Mesh(flameGeo, flameMat);
    boostFlame.rotation.x = -Math.PI / 2;
    boostFlame.position.set(0, 1.2, 4); // Rear of chassis
    boostFlame.visible = false;
    rover.add(boostFlame);
    roverScene.userData.boostFlame = boostFlame;

    // Wheels, Hubcaps, and Suspension Arms
    const wheelGeo = new THREE.CylinderGeometry(1.2, 1.2, 1, 24);
    wheelGeo.rotateZ(Math.PI/2);
    const wheelMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 1.0});
    
    const hubcapGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.05, 12);
    hubcapGeo.rotateZ(Math.PI/2);
    const hubcapMat = new THREE.MeshStandardMaterial({color: 0xd4af37, metalness: 1.0, roughness: 0.3}); // Gold accent hubcaps
    
    const suspensionGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5);
    const suspensionMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8});

    const wheelPositions = [
        [-3.2, 1.2, 3], [3.2, 1.2, 3], [-3.2, 1.2, -3], [3.2, 1.2, -3]
    ];
    
    rover.userData.wheels = [];
    
    wheelPositions.forEach(p => {
        const wheelGroup = new THREE.Group();
        
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        wheelGroup.add(w);
        
        const h = new THREE.Mesh(hubcapGeo, hubcapMat);
        wheelGroup.add(h);
        
        wheelGroup.position.set(...p);
        rover.add(wheelGroup);
        rover.userData.wheels.push(wheelGroup);

        // Suspension Arm
        const arm = new THREE.Mesh(suspensionGeo, suspensionMat);
        // Connect arm from chassis side to wheel center
        const isLeft = p[0] < 0;
        arm.position.set(isLeft ? p[0] + 0.8 : p[0] - 0.8, 1.6, p[2]);
        arm.rotation.z = isLeft ? Math.PI/4 : -Math.PI/4;
        rover.add(arm);
    });

    // Dual Headlights
    const headlightMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    const lightGeo = new THREE.CircleGeometry(0.4, 16);
    
    const hl1 = new THREE.Mesh(lightGeo, headlightMat);
    hl1.position.set(-1.2, 1.5, -4.01);
    hl1.rotation.y = Math.PI;
    rover.add(hl1);
    
    const hl2 = new THREE.Mesh(lightGeo, headlightMat);
    hl2.position.set(1.2, 1.5, -4.01);
    hl2.rotation.y = Math.PI;
    rover.add(hl2);

    const headlightSpot1 = new THREE.SpotLight(0xffffff, 1.5, 200, Math.PI/5, 0.5, 1);
    headlightSpot1.position.set(-1.2, 1.5, -4);
    const target1 = new THREE.Object3D();
    target1.position.set(-1.2, 0, -20);
    rover.add(target1);
    headlightSpot1.target = target1;
    rover.add(headlightSpot1);
    
    const headlightSpot2 = new THREE.SpotLight(0xffffff, 1.5, 200, Math.PI/5, 0.5, 1);
    headlightSpot2.position.set(1.2, 1.5, -4);
    const target2 = new THREE.Object3D();
    target2.position.set(1.2, 0, -20);
    rover.add(target2);
    headlightSpot2.target = target2;
    rover.add(headlightSpot2);

    // Tail lights
    const tailMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const tl1 = new THREE.Mesh(lightGeo, tailMat);
    tl1.position.set(-1.2, 1.5, 4.01);
    rover.add(tl1);
    const tl2 = new THREE.Mesh(lightGeo, tailMat);
    tl2.position.set(1.2, 1.5, 4.01);
    rover.add(tl2);

    rover.position.set(0, 0, 0);
    roverScene.add(rover);

    // Kiosks array for interaction
    roverScene.userData.kiosks = [];

    let hubGeo, hubMat;
    if (biome === 'desert') {
        hubGeo = new THREE.TetrahedronGeometry(40, 0); // Pyramid-like
        hubMat = new THREE.MeshStandardMaterial({color: 0xffaa00, metalness: 0.5, roughness: 0.8, flatShading: true});
        
        // --- Rocky from Project Hail Mary (Desert/Rocky Planet) ---
        const rockyGroup = new THREE.Group();
        // Rocky Mountain Pedestal
        const rockGeo = new THREE.DodecahedronGeometry(8, 1);
        const rockMat = new THREE.MeshStandardMaterial({color: 0x886644, roughness: 1.0, flatShading: true});
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = 2;
        rockyGroup.add(rock);

        // Carapace (pentagonal rough dome)
        const carapaceGeo = new THREE.DodecahedronGeometry(2, 1);
        const carapaceMat = new THREE.MeshStandardMaterial({color: 0x554433, roughness: 1.0, bumpScale: 0.5});
        const carapace = new THREE.Mesh(carapaceGeo, carapaceMat);
        carapace.position.y = 10;
        rockyGroup.add(carapace);
        
        // 5 Legs radiating outwards
        const legGeo = new THREE.CylinderGeometry(0.3, 0.1, 3.5);
        const legMat = new THREE.MeshStandardMaterial({color: 0x443322, roughness: 0.9});
        for (let i = 0; i < 5; i++) {
            const leg = new THREE.Mesh(legGeo, legMat);
            const angle = (i / 5) * Math.PI * 2;
            leg.position.set(Math.cos(angle) * 1.5, 8.5, Math.sin(angle) * 1.5);
            leg.lookAt(Math.cos(angle) * 4, 6, Math.sin(angle) * 4);
            leg.rotateX(Math.PI / 2);
            rockyGroup.add(leg);
        }
        
        // Eridian musical communication orb
        const orbGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({color: 0x00ffff});
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(2, 11.5, 2);
        
        const orbLight = new THREE.PointLight(0x00ffff, 1.5, 15);
        orbLight.position.set(2, 11.5, 2);
        rockyGroup.add(orb);
        rockyGroup.add(orbLight);
        
        rockyGroup.position.set(25, 0, 50); // Near the hub
        roverScene.add(rockyGroup);
        roverScene.userData.rockyOrb = orb;
        roverScene.userData.rockyLight = orbLight;
        
    } else if (biome === 'forest') {
        hubGeo = new THREE.IcosahedronGeometry(35, 2); // Dome-like
        hubMat = new THREE.MeshStandardMaterial({color: 0x11ff44, wireframe: true, emissive: 0x003300});
        
        // --- Green Alien Sprite (Forest Planet) ---
        const greenAlien = new THREE.Group();
        const bodyGeo = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({color: 0x00ff00, roughness: 0.4});
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2;
        greenAlien.add(body);
        
        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.05, 0.05, 1);
        const ant1 = new THREE.Mesh(antGeo, bodyMat);
        ant1.position.set(-0.5, 3.5, 0);
        ant1.rotation.z = Math.PI/6;
        greenAlien.add(ant1);
        const ant2 = new THREE.Mesh(antGeo, bodyMat);
        ant2.position.set(0.5, 3.5, 0);
        ant2.rotation.z = -Math.PI/6;
        greenAlien.add(ant2);

        greenAlien.position.set(15, 0, 45);
        roverScene.add(greenAlien);
        roverScene.userData.greenAlien = greenAlien;

    } else if (biome === 'alien') {
        hubGeo = new THREE.ConeGeometry(15, 80, 4); // Spire
        hubMat = new THREE.MeshStandardMaterial({color: 0xaa00ff, metalness: 0.8, roughness: 0.1, flatShading: true});
        
        // --- Purple Energy Alien (Purple Planet) ---
        const energyAlien = new THREE.Group();
        const coreGeo = new THREE.OctahedronGeometry(1.5, 0);
        const coreMat = new THREE.MeshStandardMaterial({color: 0xcc00ff, emissive: 0x5500aa, wireframe: true});
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 4;
        energyAlien.add(core);

        const innerCoreGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const innerCoreMat = new THREE.MeshBasicMaterial({color: 0xffaaff});
        const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
        innerCore.position.y = 4;
        energyAlien.add(innerCore);

        energyAlien.position.set(20, 0, 50);
        roverScene.add(energyAlien);
        roverScene.userData.energyAlien = energyAlien;

    } else { // ice
        hubGeo = new THREE.OctahedronGeometry(30, 0);
        hubMat = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.8});
        
        // --- Ice Yeti (Ice Planet) ---
        const yeti = new THREE.Group();
        const yetiMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 1.0, flatShading: true});
        const torso = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 2), yetiMat);
        torso.position.y = 4;
        yeti.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), yetiMat);
        head.position.y = 7;
        yeti.add(head);
        const armGeo = new THREE.BoxGeometry(1, 4, 1);
        const lArm = new THREE.Mesh(armGeo, yetiMat);
        lArm.position.set(-2.5, 4, 0);
        yeti.add(lArm);
        const rArm = new THREE.Mesh(armGeo, yetiMat);
        rArm.position.set(2.5, 4, 0);
        yeti.add(rArm);
        
        yeti.position.set(-20, 0, 50);
        roverScene.add(yeti);
    }
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, 20, 60); // Placed behind the rover start position
    roverScene.add(hub);

    // 4. Billboards (Experiences) — with text wrapping for long descriptions
    if (planetData.billboards) {
        let zPos = -30;
        planetData.billboards.forEach((board, index) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 320; // Taller for wrapped text
            const ctx = canvas.getContext('2d');

            // Background with rounded feel
            ctx.fillStyle = 'rgba(0, 10, 8, 0.92)';
            ctx.fillRect(0, 0, 512, 320);
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, 506, 314);

            // Title
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 36px "Orbitron", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(board.title, 256, 80);

            // Separator line
            ctx.strokeStyle = 'rgba(0,255,136,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 105); ctx.lineTo(472, 105);
            ctx.stroke();

            // Description or Data Viz
            if (planetData.name === 'Skills') {
                // Render simple Bar Chart instead of text
                ctx.fillStyle = 'rgba(255,255,255,0.88)';
                ctx.font = '20px "Inter", sans-serif';
                ctx.fillText('Proficiency Metrics', 256, 140);
                
                // Draw 3 dummy bars based on string length hash for variety
                const seed = board.desc.length;
                const colors = ['#ff0055', '#00ddff', '#ffdd00'];
                for (let b = 0; b < 3; b++) {
                    const val = 0.4 + (Math.sin(seed + b * 2) * 0.5 + 0.5) * 0.5; // 0.4 to 0.9
                    const yOff = 180 + b * 35;
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(80, yOff, 350, 20);
                    ctx.fillStyle = colors[b];
                    ctx.fillRect(80, yOff, 350 * val, 20);
                }
            } else {
                // Standard text wrap
                ctx.fillStyle = 'rgba(255,255,255,0.88)';
                ctx.font = '22px "Inter", sans-serif';
                const words = board.desc.split(' ');
                let line = '';
                let lineY = 150;
                const maxWidth = 440;
                words.forEach((word, wi) => {
                    const testLine = line + (line ? ' ' : '') + word;
                    if (ctx.measureText(testLine).width > maxWidth && line) {
                        ctx.fillText(line, 256, lineY);
                        line = word;
                        lineY += 32;
                    } else {
                        line = testLine;
                    }
                    if (wi === words.length - 1) ctx.fillText(line, 256, lineY);
                });
            }

            const tex = new THREE.CanvasTexture(canvas);
            const planeGeo = new THREE.PlaneGeometry(18, 11); // Taller billboard
            const planeMat = new THREE.MeshBasicMaterial({map: tex, transparent: true, side: THREE.DoubleSide});
            const mesh = new THREE.Mesh(planeGeo, planeMat);

            const isLeft = index % 2 !== 0; // Wait, index % 2 === 0 was x=18
            const bx = isLeft ? -18 : 18;
            mesh.position.set(bx, 7, zPos);
            mesh.rotation.y = isLeft ? Math.PI/6 : -Math.PI/6;

            roverScene.add(mesh);

            // Create Kiosk for interaction
            const kioskGeo = new THREE.BoxGeometry(2, 4, 2);
            const kioskMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8});
            const kiosk = new THREE.Mesh(kioskGeo, kioskMat);
            // Emissive screen on kiosk
            const screenGeo = new THREE.PlaneGeometry(1.5, 1.2);
            const screenMat = new THREE.MeshBasicMaterial({color: 0x00ff88});
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.position.set(0, 1, 1.01);
            kiosk.add(screen);
            
            // Place kiosk closer to the path
            const kx = isLeft ? -8 : 8;
            kiosk.position.set(kx, 2, zPos + 5);
            kiosk.rotation.y = isLeft ? Math.PI/4 : -Math.PI/4;
            kiosk.userData.board = board;
            roverScene.add(kiosk);
            roverScene.userData.kiosks.push(kiosk);

            zPos -= 55;
        });

        // 5. Base Station at the center (0, 0, 0)
        const baseGroup = new THREE.Group();
        
        // Main Platform
        const padGeo = new THREE.CylinderGeometry(15, 18, 2, 8);
        const padMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.5
        });
        const platform = new THREE.Mesh(padGeo, padMat);
        platform.position.set(0, 0.5, 0);
        baseGroup.add(platform);

        // Landing Ring Glow
        const ringGeo = new THREE.RingGeometry(8, 9, 32);
        const ringMat = new THREE.MeshBasicMaterial({color: 0x00ff88, side: THREE.DoubleSide, transparent: true, opacity: 0.8});
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI/2;
        ring.position.set(0, 1.6, 0);
        baseGroup.add(ring);

        // Support Struts
        const strutGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 4);
        const strutMat = new THREE.MeshStandardMaterial({color: 0x222222, metalness: 0.9});
        for (let i = 0; i < 4; i++) {
            const strut = new THREE.Mesh(strutGeo, strutMat);
            const angle = (i / 4) * Math.PI * 2 + Math.PI/4;
            strut.position.set(Math.cos(angle) * 12, 5, Math.sin(angle) * 12);
            strut.lookAt(0, 10, 0);
            baseGroup.add(strut);
        }

        // Pulsing point light above pad
        const padLight = new THREE.PointLight(0x00ff88, 2.5, 60);
        padLight.position.set(0, 20, 0);
        baseGroup.userData.light = padLight;
        baseGroup.add(padLight);

        // LAUNCH label above pad
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256; labelCanvas.height = 128;
        const lctx = labelCanvas.getContext('2d');
        lctx.fillStyle = '#00ff88';
        lctx.font = 'bold 48px "Orbitron", sans-serif';
        lctx.textAlign = 'center';
        lctx.textBaseline = 'middle';
        lctx.fillText('[ BASE STATION ]', 128, 64);
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(24, 12),
            new THREE.MeshBasicMaterial({map: labelTex, transparent: true, side: THREE.DoubleSide, depthTest: false})
        );
        labelMesh.position.set(0, 28, 0);
        baseGroup.add(labelMesh);

        launchPad = baseGroup;
        roverScene.add(launchPad);
    }
    
    createCollectibles(biome, ground);
}

function createCollectibles(biome, ground) {
    roverScene.userData.collectibles = [];
    const count = 10;
    const geo = new THREE.OctahedronGeometry(1.5, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5, transparent: true, opacity: 0.9
    });
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    for (let i=0; i<count; i++) {
        const x = (Math.random() - 0.5) * 600;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue; // Not too close to base

        raycaster.set(new THREE.Vector3(x, 100, z), down);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const y = intersects[0].point.y + 2; // hover above ground
            if (biome === 'forest' && y < 4) continue; // not underwater
            
            const crystal = new THREE.Mesh(geo, mat);
            crystal.position.set(x, y, z);
            
            const light = new THREE.PointLight(0xffaa00, 1, 10);
            crystal.add(light);
            
            crystal.userData.collected = false;
            crystal.id = Math.random().toString(36).substr(2, 9);
            roverScene.add(crystal);
            roverScene.userData.collectibles.push(crystal);
        }
    }
}

// ========================================
// Rover and Landing Mechanics
// ========================================

function initiateLanding(planet) {
    if (isRoverMode || planet.userData.href) return;
    isRoverMode = true;
    isLandingAnim = true;
    camera = camera3D;
    currentPlanetData = planet.userData;

    // Stop spaceship movement
    controls.forward = false;
    controls.backward = false;
    document.getElementById('planetInfoCard').classList.remove('active');
    
    // Hide Space UI elements
    const titleOverlay = document.querySelector('.title-overlay');
    if (titleOverlay) titleOverlay.style.display = 'none';
    const viewToggle = document.querySelector('.view-toggle');
    if (viewToggle) viewToggle.style.display = 'none';

    // --- Cinematic Descent ---
    // Phase 1 (0-1.5s): Camera zooms toward planet surface
    const targetPos = new THREE.Vector3();
    planet.getWorldPosition(targetPos);
    const descentStart = camera3D.position.clone();
    // Aim slightly above the planet surface
    const descentEnd = targetPos.clone().add(new THREE.Vector3(0, (planet.userData.size || 15) * 2.5, 0));
    const descentDuration = 1500;
    const descentStartTime = performance.now();

    function descentStep(now) {
        const t = Math.min(1, (now - descentStartTime) / descentDuration);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out
        camera3D.position.lerpVectors(descentStart, descentEnd, ease);
        camera3D.lookAt(targetPos);
        renderer.render(scene, camera3D);
        if (t < 1) {
            requestAnimationFrame(descentStep);
        } else {
            // Phase 2 (1.5-2.5s): Atmosphere flash to white
            const overlay = document.getElementById('landing-overlay');
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.opacity = '1';
            setTimeout(showSurface, 1000);
        }
    }
    requestAnimationFrame(descentStep);

    function showSurface() {
        // Hide cockpit
        const cockpitBezel = document.getElementById('cockpit-bezel');
        if (cockpitBezel) cockpitBezel.classList.add('hidden');
        // Hide solar system, show rover scene
        starSystems.forEach(system => system.group.visible = false);
        roverScene.visible = true;
        createSurfaceEnvironment(currentPlanetData);

        // Tracking & Achievements
        const pName = currentPlanetData.content?.title || currentPlanetData.name;
        if (pName) {
            localStorage.setItem(`visited_${pName}`, 'true');
        }
        unlockAchievement('first_landing', 'First Landing', 'You set foot on another world.');
        
        // Biome Narration
        const biome = roverScene.userData.biome;
        if (typeof speakCoPilot === 'function') {
            speakCoPilot(`Entering ${biome} biome on ${pName}. Surface systems online.`);
        }


        // Reset rover starting position, rotation, velocity and mouse-look state
        if (rover) { 
            rover.position.set(0, 0, 0); 
            rover.rotation.y = 0;
        }
        roverVelocity = 0;
        roverLookYaw = 0;
        roverLookPitch = 0;

        // Show rover HUD
        const roverHud = document.getElementById('rover-hud');
        if (roverHud) {
            roverHud.style.display = 'flex';
            const biomeEl = document.getElementById('rover-biome');
            if (biomeEl) biomeEl.textContent = roverScene.userData.biome?.toUpperCase() || '---';
        }

        // Web Audio Ambient Drone
        if (!audioCtx && soundEnabled) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (soundEnabled && audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            if (droneOsc) {
                try { droneOsc.stop(); } catch(e) {}
            }
            droneOsc = audioCtx.createOscillator();
            droneGain = audioCtx.createGain();
            droneFilter = audioCtx.createBiquadFilter();

            droneOsc.connect(droneFilter);
            droneFilter.connect(droneGain);
            droneGain.connect(audioCtx.destination);

            const biome = roverScene.userData.biome;
            if (biome === 'desert') {
                droneOsc.type = 'triangle'; droneOsc.frequency.value = 60;
                droneFilter.type = 'lowpass'; droneFilter.frequency.value = 200;
            } else if (biome === 'ice') {
                droneOsc.type = 'sine'; droneOsc.frequency.value = 300;
                droneFilter.type = 'bandpass'; droneFilter.frequency.value = 800;
            } else if (biome === 'forest') {
                droneOsc.type = 'sine'; droneOsc.frequency.value = 150;
                droneFilter.type = 'lowpass'; droneFilter.frequency.value = 400;
            } else if (biome === 'alien') {
                droneOsc.type = 'sawtooth'; droneOsc.frequency.value = 80;
                droneFilter.type = 'lowpass'; droneFilter.frequency.value = 300;
            }

            droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
            droneGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 2);
            droneOsc.start();
        }
        
        // Phase 3: Dropship Cinematic Landing
        isLandingAnim = true;
        
        // Hide rover initially
        rover.visible = false;
        document.getElementById('rover-hud').style.display = 'none'; // hide HUD during anim

        // Create Dropship
        const dropshipGroup = new THREE.Group();
        const hullGeo = new THREE.CylinderGeometry(2.5, 4, 10, 8);
        const hullMat = new THREE.MeshStandardMaterial({color: 0x999999, metalness: 0.9, roughness: 0.3});
        const hull = new THREE.Mesh(hullGeo, hullMat);
        dropshipGroup.add(hull);

        // Retro Thruster Flame
        const flameGeo = new THREE.ConeGeometry(2, 6, 8);
        const flameMat = new THREE.MeshBasicMaterial({color: 0xffaa00, transparent: true, opacity: 0.8});
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = -7;
        flame.rotation.x = Math.PI;
        dropshipGroup.add(flame);

        dropshipGroup.position.set(0, 150, 0); // Start high
        roverScene.add(dropshipGroup);

        // Start fading from white immediately
        const overlay = document.getElementById('landing-overlay');
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';

        const dropStart = performance.now();
        const dropDuration = 2500; // 2.5 seconds to land

        function dropStep(now) {
            const t = Math.min(1, (now - dropStart) / dropDuration);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            
            // Move dropship down
            dropshipGroup.position.y = 150 - (148 * ease);
            
            // Flicker flame
            flame.scale.setScalar(0.8 + Math.random() * 0.4);
            
            // Camera follows dropship down, looking slightly up at it
            camera3D.position.set(20, dropshipGroup.position.y + 10, 30);
            camera3D.lookAt(dropshipGroup.position);

            renderer.render(scene, camera3D);

            if (t < 1) {
                requestAnimationFrame(dropStep);
            } else {
                // Landed! Screen shake
                let shake = 10;
                flame.visible = false; // cut engines
                
                function shakeStep() {
                    if (shake > 0) {
                        camera3D.position.x = 20 + (Math.random() - 0.5) * shake;
                        camera3D.position.y = 12 + (Math.random() - 0.5) * shake;
                        camera3D.position.z = 30 + (Math.random() - 0.5) * shake;
                        shake -= 1;
                        renderer.render(scene, camera3D);
                        requestAnimationFrame(shakeStep);
                    } else {
                        // Reveal rover, hide dropship (could animate doors but simple fade is robust)
                        roverScene.remove(dropshipGroup);
                        rover.visible = true;
                        rover.position.y = 2; // Ensure it starts above ground
                        rover.userData.velocityY = 0;
                        document.getElementById('rover-hud').style.display = 'flex';
                        isLandingAnim = false; // Unlock controls!
                    }
                }
                shakeStep();
            }
        }
        
        // Slight delay before drop to let white screen clear
        setTimeout(() => requestAnimationFrame(dropStep), 500);
    }
}

// Guard to prevent double-launch
let isLaunching = false;

function returnToOrbit() {
    if (!isRoverMode || isLaunching) return;
    isLaunching = true;

    // Fade out drone
    if (droneGain && audioCtx) {
        droneGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        setTimeout(() => { 
            if (droneOsc) { 
                try { droneOsc.stop(); droneOsc.disconnect(); } catch(e) {} 
                droneOsc = null; 
            }
            if (droneFilter) {
                try { droneFilter.disconnect(); } catch(e) {}
                droneFilter = null;
            }
        }, 1500);
    }

    // --- Cinematic Launch Sequence ---
    // Phase 1 (0-1.2s): Camera tilts upward dramatically
    const launchStartQuat = camera3D.quaternion.clone();
    const lookUpVec = new THREE.Vector3(0, 1, -0.3).normalize();
    const launchEndQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), lookUpVec);
    const tiltDuration = 1200;
    const tiltStartTime = performance.now();

    function tiltStep(now) {
        const t = Math.min(1, (now - tiltStartTime) / tiltDuration);
        const ease = t * t; // ease-in
        camera3D.quaternion.slerpQuaternions(launchStartQuat, launchEndQuat, ease);
        // Drift camera upward slightly
        camera3D.position.y += 0.3 * ease;
        renderer.render(scene, camera3D);
        if (t < 1) {
            requestAnimationFrame(tiltStep);
        } else {
            // Phase 2 (1.2-2.2s): Fog ramps to white-out
            atmosphericWhiteout();
        }
    }
    requestAnimationFrame(tiltStep);

    function atmosphericWhiteout() {
        const overlay = document.getElementById('landing-overlay');
        overlay.style.transition = 'opacity 1s ease';
        overlay.style.opacity = '1';
        setTimeout(showOrbit, 1000);
    }

    function showOrbit() {
        isRoverMode = false;
        isLaunching = false;
        roverScene.visible = false;

        // Restore space environment
        scene.background = null;
        scene.fog.color.setHex(0x000000);
        scene.fog.density = 0.0005;
        starSystems.forEach(system => system.group.visible = true);
        
        // Show cockpit
        const cockpitBezel = document.getElementById('cockpit-bezel');
        if (cockpitBezel) cockpitBezel.classList.remove('hidden');

        // Position camera back at a safe distance from where we landed
        if (currentPlanetData) {
            // Find the planet group still in the scene
            let planetGroup = null;
            starSystems.forEach(sys => {
                sys.planets.forEach(p => {
                    if (p.userData.name === currentPlanetData.name) planetGroup = p;
                });
            });
            if (planetGroup) {
                const worldPos = new THREE.Vector3();
                planetGroup.getWorldPosition(worldPos);
                const dir = worldPos.clone().normalize().negate();
                camera3D.position.copy(worldPos).add(dir.multiplyScalar(60));
                
                // Align camera pitch/yaw to look at planet
                camera3D.lookAt(0, 0, 0);
                const euler = new THREE.Euler().setFromQuaternion(camera3D.quaternion, 'YXZ');
                shipPitch = euler.x;
                shipYaw = euler.y;
            }
        }

        // Restore UI
        document.querySelector('.view-toggle').style.display = 'flex';
        const titleOverlay = document.querySelector('.title-overlay');
        if (titleOverlay) titleOverlay.style.display = 'block';
        
        const roverHud = document.getElementById('rover-hud');
        if (roverHud) roverHud.style.display = 'none';
        const approachEl = document.getElementById('planet-approach-hud');
        if (approachEl) approachEl.classList.remove('visible');

        // Clear surface to free memory
        while (roverScene.children.length > 0) {
            const child = roverScene.children[0];
            roverScene.remove(child);
            disposeHierarchy(child);
        }
        surfaceParticles = null;
        surfaceSun = null;
        roverScene.userData = {};
        rover = null;
        launchPad = null;
        launchPadPulseTime = 0;

        // Phase 3 (pull back from planet over 1s while fading in)
        const overlay = document.getElementById('landing-overlay');
        overlay.style.transition = 'opacity 1.2s ease';
        overlay.style.opacity = '0';
    }
}

// ========================================
// Start
// ========================================

init();

// ========================================
// Memory Management
// ========================================
function disposeHierarchy(node) {
    if (!node) return;
    if (node.geometry) {
        node.geometry.dispose();
    }
    if (node.material) {
        if (Array.isArray(node.material)) {
            node.material.forEach(m => disposeMaterial(m));
        } else {
            disposeMaterial(node.material);
        }
    }
    while (node.children.length > 0) {
        const child = node.children[0];
        node.remove(child);
        disposeHierarchy(child);
    }
}

function disposeMaterial(mat) {
    if (!mat) return;
    if (mat.map) mat.map.dispose();
    if (mat.lightMap) mat.lightMap.dispose();
    if (mat.bumpMap) mat.bumpMap.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.specularMap) mat.specularMap.dispose();
    if (mat.envMap) mat.envMap.dispose();
    if (mat.alphaMap) mat.alphaMap.dispose();
    if (mat.aoMap) mat.aoMap.dispose();
    if (mat.displacementMap) mat.displacementMap.dispose();
    if (mat.emissiveMap) mat.emissiveMap.dispose();
    if (mat.gradientMap) mat.gradientMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    mat.dispose();
}
