// ========================================
// Scene Transitions
// ========================================

function showScene(sceneName) {
    currentScene = sceneName;

    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    if (sceneName === SCENES.COCKPIT) {
        document.getElementById('entry-screen').classList.add('active');
        document.getElementById('hud').classList.remove('hidden');
    }
}

function startFlight() {
    if (isTransitioning || currentScene !== SCENES.COCKPIT) return;
    isTransitioning = true;
    currentScene = SCENES.OPEN_SPACE;

    document.getElementById('entry-screen').classList.remove('active');
    
    // Remove the UI class that disables key events
    document.body.classList.remove('cockpit-view');

    createWormholes();
    createNebula();
    createSpaceCrystals();
    createWarpLines();
    isTransitioning = false;
    showCockpitBezel();

    // Show direction beacon — fades out on first movement
    const beacon = document.getElementById('direction-beacon');
    if (beacon) {
        beacon.classList.remove('hidden');
        // Auto-dismiss after 8 seconds even if no movement
        setTimeout(() => {
            if (beacon && !beacon.classList.contains('hidden')) {
                dismissBeacon();
            }
        }, 8000);
    }

    // Open-space entry console message
    if (typeof writeToConsole === 'function') {
        setTimeout(() => {
            writeToConsole("NAV SYSTEMS ONLINE. 6 WORMHOLE SIGNATURES DETECTED.");
            setTimeout(() => writeToConsole("LEFT: PERSONAL | RIGHT: WORK | BELOW: BLOG | ABOVE: WORLD VIEW | AHEAD: RESEARCH"), 1800);
        }, 600);
    }
}

// Dismiss the direction beacon with a fade-out
function dismissBeacon() {
    const beacon = document.getElementById('direction-beacon');
    if (!beacon || beacon.classList.contains('hidden')) return;
    beacon.classList.add('fading-out');
    setTimeout(() => beacon.classList.add('hidden'), 800);
}

function enterWormhole(wormhole) {
    if (isTransitioning) return;
    isTransitioning = true;
    currentScene = SCENES.WORMHOLE_TRAVEL;
    wormholeEntryTime = Date.now();
    hideCockpitBezel();
    // Stop all movement
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;

    // Remove wormholes
    wormholes.forEach(w => scene.remove(w.group));
    
    // Vocal announcement
    speakCoPilot("Entering wormhole. Initiating dimensional shift.");
    // playWormholeSound(); // Function was never defined in original app.js
    
    // Remove space crystals to declutter
    if (spaceCrystalsMesh) {
        scene.remove(spaceCrystalsMesh);
        spaceCrystalsMesh = null;
        spaceCrystalsData = [];
    }
    
    const destination = wormhole.destination;
    const color = wormhole.color;
    wormholes = [];

    // CENTER camera inside tunnel (rings are at origin)
    camera.position.x = 0;
    camera.position.y = 0;
    // Keep current Z position

    // Align camera to look straight ahead down the tunnel
    camera.rotation.set(0, 0, 0);
    targetRotationY = 0;
    targetRotationX = 0;

    // Create tunnel
    createWormholeTunnel(color);

    // Navigate after tunnel
    setTimeout(() => {
        window.location.href = destination;
    }, 3500);
}

// ========================================
// Autopilot Navigation System
// ========================================

function initAutopilotUI() {
    const select = document.getElementById('ap-dest-select');
    if (!select) return;
    
    // Clear current options beyond the first placeholder
    select.innerHTML = '<option value="">SELECT DEST</option>';
    
    WORMHOLE_CONFIG.forEach(config => {
        const opt = document.createElement('option');
        opt.value = config.id;
        opt.textContent = config.label.toUpperCase();
        select.appendChild(opt);
    });
    
    const toggleBtn = document.getElementById('ap-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAutopilot);
    }
    
    select.addEventListener('change', (e) => {
        const destId = e.target.value;
        if (destId) {
            const targetWH = wormholes.find(w => w.type === destId);
            if (targetWH) {
                setAutopilotTarget(targetWH);
                if (!autopilotActive) {
                    enableAutopilot();
                    showNavAlert('AUTOPILOT ENGAGED', `NAVIGATING TO ${targetWH.config.label.toUpperCase()}`);
                } else {
                    showNavAlert('NAV COORDINATES UPDATED', `NEW TARGET: ${targetWH.config.label.toUpperCase()}`);
                }
            }
        } else {
            autopilotTarget = null;
            disableAutopilot();
            showNavAlert('AUTOPILOT DISENGAGED', 'MANUAL FLIGHT ACTIVE');
        }
    });
}

function setAutopilotTarget(wormhole) {
    autopilotTarget = wormhole;
    // Sync the select dropdown visual value
    const select = document.getElementById('ap-dest-select');
    if (select && select.value !== wormhole.type) {
        select.value = wormhole.type;
    }
}

function toggleAutopilot() {
    if (!autopilotTarget) {
        // Find closest wormhole if none selected, excluding the one we just exited (within 35 units)
        if (wormholes.length > 0) {
            let closest = null;
            let minDist = Infinity;
            wormholes.forEach(w => {
                const dist = camera.position.distanceTo(w.group.position);
                if (dist > 35 && dist < minDist) {
                    minDist = dist;
                    closest = w;
                }
            });

            // Fallback if all are within 35 units (unlikely)
            if (!closest) {
                closest = wormholes[0];
                let d = camera.position.distanceTo(closest.group.position);
                for (let i = 1; i < wormholes.length; i++) {
                    const dist = camera.position.distanceTo(wormholes[i].group.position);
                    if (dist < d) {
                        d = dist;
                        closest = wormholes[i];
                    }
                }
            }
            setAutopilotTarget(closest);
        } else {
            showNavAlert('NO TARGET FOUND', 'WORMHOLES OFFLINE');
            return;
        }
    }
    
    if (autopilotActive) {
        disableAutopilot();
        showNavAlert('AUTOPILOT DISENGAGED', 'MANUAL FLIGHT ACTIVE');
    } else {
        enableAutopilot();
        showNavAlert('AUTOPILOT ENGAGED', `NAVIGATING TO ${autopilotTarget.config.label.toUpperCase()}`);
    }
}

function enableAutopilot() {
    autopilotActive = true;
    
    // Reset manual flight input flags to prevent immediate auto-disengage
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;
    barrelRoll = 0;

    // Clear cockpit dashboard keys from staying lit up
    if (typeof COCKPIT_KEY_MAP !== 'undefined') {
        Object.values(COCKPIT_KEY_MAP).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('pressed');
        });
    }

    const toggleBtn = document.getElementById('ap-toggle-btn');
    const statusText = document.getElementById('ap-status');
    if (toggleBtn) {
        toggleBtn.textContent = 'DISENGAGE AP';
        toggleBtn.classList.add('active');
    }
    if (statusText) {
        statusText.textContent = 'ENGAGED';
        statusText.classList.add('ap-active');
    }
    
    // Vocal announcement
    speakCoPilot("Autopilot engaged. Course locked.");
}

function disableAutopilot() {
    autopilotActive = false;
    const toggleBtn = document.getElementById('ap-toggle-btn');
    const statusText = document.getElementById('ap-status');
    const select = document.getElementById('ap-dest-select');
    if (toggleBtn) {
        toggleBtn.textContent = 'ENGAGE AP';
        toggleBtn.classList.remove('active');
    }
    if (statusText) {
        statusText.textContent = 'OFFLINE';
        statusText.classList.remove('ap-active');
    }
    if (select) {
        select.value = autopilotTarget ? autopilotTarget.type : '';
    }
    
    // Vocal announcement
    speakCoPilot("Manual control override.");
}

function showNavAlert(title, subtitle, duration = 3000) {
    const el = document.getElementById('deep-space-warning');
    if (!el) return;
    
    const originalText = "WARNING: DEEP SPACE DETECTED";
    const originalSub = "Return to navigation zone";
    
    const textEl = el.querySelector('.warning-text');
    const subEl = el.querySelector('.warning-subtext');
    const iconEl = el.querySelector('.warning-icon');
    
    if (textEl) textEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (iconEl) iconEl.textContent = "⚙️";
    
    el.classList.remove('hidden');
    
    // Clear deep space mode class to keep the screen warning looking clean
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('deep-space-mode');
    
    if (window.navAlertTimeout) clearTimeout(window.navAlertTimeout);
    
    window.navAlertTimeout = setTimeout(() => {
        el.classList.add('hidden');
        if (textEl) textEl.textContent = originalText;
        if (subEl) subEl.textContent = originalSub;
        if (iconEl) iconEl.textContent = "⚠️";
    }, duration);
}

// ========================================
// Cockpit Bezel — Show / Hide / Key Sync
// ========================================

// Maps a lowercased event.key to the corresponding cockpit indicator element ID.
const COCKPIT_KEY_MAP = {
    'w':         'ck-w',     'arrowup':    'ck-w',
    's':         'ck-s',     'arrowdown':  'ck-s',
    'a':         'ck-a',     'arrowleft':  'ck-a',
    'd':         'ck-d',     'arrowright': 'ck-d',
    ' ':         'ck-space',
    'q':         'ck-q',
    'e':         'ck-e',
    'shift':     'ck-shift'
};

/**
 * Toggles the `.pressed` state on a cockpit key cap.
 * @param {string} key - event.key.toLowerCase()
 * @param {boolean} active - true = light up, false = dim
 */
function setCockpitKey(key, active) {
    const id = COCKPIT_KEY_MAP[key];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.classList.toggle('pressed', active);
}

function showCockpitBezel() {
    if (!cockpitVisible) return;
    const bezel = document.getElementById('cockpit-bezel');
    if (bezel) bezel.classList.remove('hidden');
    document.body.classList.add('cockpit-bezel-active');
}

function hideCockpitBezel() {
    const bezel = document.getElementById('cockpit-bezel');
    if (bezel) bezel.classList.add('hidden');
    document.body.classList.remove('cockpit-bezel-active');
    // Clear all pressed key states so nothing gets stuck highlighted
    Object.values(COCKPIT_KEY_MAP).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('pressed');
    });
}

function initCockpitToggle() {
    const btn = document.getElementById('cockpit-toggle-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            toggleCockpitView();
        });
    }
}

function toggleCockpitView() {
    cockpitVisible = !cockpitVisible;
    const bezel = document.getElementById('cockpit-bezel');
    const btn = document.getElementById('cockpit-toggle-btn');
    
    if (cockpitVisible) {
        if (bezel) {
            bezel.classList.remove('hidden');
            document.body.classList.add('cockpit-bezel-active');
        }
        if (btn) {
            btn.classList.remove('minimized');
            const txt = btn.querySelector('.toggle-text');
            if (txt) txt.textContent = "COCKPIT VIEW";
        }
        writeToConsole("SYSTEM STATUS: COCKPIT VIEW ENGAGED.");
    } else {
        if (bezel) {
            bezel.classList.add('hidden');
            document.body.classList.remove('cockpit-bezel-active');
        }
        if (btn) {
            btn.classList.add('minimized');
            const txt = btn.querySelector('.toggle-text');
            if (txt) txt.textContent = "NIGHT SKY VIEW";
        }
        writeToConsole("SYSTEM STATUS: WIDE ANGLE SKY VIEW ENGAGED.");
    }
    speakCoPilot("View mode updated.");
}

