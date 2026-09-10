// ========================================
// Global State Management
// ========================================

// We expose state to the window object to allow seamless access 
// across our classic scripts without rewriting 3,400 lines of code.

window.scene = null;
window.camera = null;
window.renderer = null;
window.composer = null;
window.bloomPass = null;
window.starLayers = { near: null, mid: null, far: null };
window.wormholes = [];
window.lastWormholeUpdateTime = Date.now() * 0.001;
window.currentScene = 'loading';
window.isTransitioning = false;
window.lastWormholeExitTime = 0;
window.wormholeEntryTime = 0;
window.cockpitVisible = true;

// Flight controls
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;
window.moveUp = false;
window.moveDown = false;
// THREE needs to be globally accessible here. It's loaded via CDN in index.html.
window.velocity = new THREE.Vector3();
window.baseSpeed = 0.3;
window.speedBoost = false;
window.barrelRoll = 0;

// Mouse look and steering
window.mouseX = 0;
window.mouseY = 0;
window.targetRotationY = 0;
window.targetRotationX = 0;
window.steeringMode = 'cone'; // 'free' or 'cone'

// Autopilot state
window.autopilotActive = false;
window.autopilotTarget = null;

// Space Environment & Console state
window.spaceCrystalsMesh = null;
window.spaceCrystalsData = [];
window.warpLinesGroup = null;
window.warpActive = false;
window.warpSpeedFactor = 0;
window.isConsoleTyping = false;
window.shieldEnergy = 100.0;
window.cameraShakeAmount = 0.0;

// Sound Synthesizer & Co-Pilot voice state
window.audioCtx = null;
window.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
window.engineOsc = null;
window.engineFilter = null;
window.engineGain = null;
window.warpOsc = null;
window.warpNoiseNode = null;
window.warpGainNode = null;
window.warpNoiseGain = null;
window.lastIsWarping = false;

// Upgraded Flight Systems state
window.powerMode = 'systems'; // 'systems', 'engines', 'shields'
window.hudReticle = null; 
window.crystalDebris = []; 
window.energyMatrixes = []; 
window.supernovaActive = false; 
window.supernovaTime = 0; 

window.SCENES = {
    LOADING: 'loading',
    COCKPIT: 'cockpit',
    OPEN_SPACE: 'openSpace',
    WORMHOLE_TRAVEL: 'wormholeTravel'
};
