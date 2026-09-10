// ========================================
// Web Audio Synthesizer & AI Co-Pilot
// ========================================

function initAudioSynth() {
    if (audioCtx) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        
        // --- 1. Engine Hum Synth ---
        engineOsc = audioCtx.createOscillator();
        engineFilter = audioCtx.createBiquadFilter();
        engineGain = audioCtx.createGain();
        
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(45, audioCtx.currentTime); // low sub frequency
        
        engineFilter.type = 'lowpass';
        engineFilter.frequency.setValueAtTime(120, audioCtx.currentTime); // cut harsh harmonics
        
        engineGain.gain.setValueAtTime(0, audioCtx.currentTime); // start silent
        
        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.start();
        
        // --- 2. Warp Spool-up & Flight Noise ---
        warpOsc = audioCtx.createOscillator();
        warpOsc.type = 'triangle';
        warpOsc.frequency.setValueAtTime(80, audioCtx.currentTime);
        
        warpGainNode = audioCtx.createGain();
        warpGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        
        // White noise generator for warp wind slipstream
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        warpNoiseNode = audioCtx.createBufferSource();
        warpNoiseNode.buffer = noiseBuffer;
        warpNoiseNode.loop = true;
        
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(350, audioCtx.currentTime);
        noiseFilter.Q.setValueAtTime(3.0, audioCtx.currentTime);
        
        warpNoiseGain = audioCtx.createGain();
        warpNoiseGain.gain.setValueAtTime(0, audioCtx.currentTime); // start silent
        
        warpOsc.connect(warpGainNode);
        warpNoiseNode.connect(noiseFilter);
        noiseFilter.connect(warpNoiseGain);
        
        warpGainNode.connect(audioCtx.destination);
        warpNoiseGain.connect(audioCtx.destination);
        
        warpOsc.start();
        warpNoiseNode.start();
    } catch (e) {
        console.error("Failed to initialize AudioContext:", e);
    }
}

function toggleSound(forcedState) {
    soundEnabled = forcedState !== undefined ? forcedState : !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    const soundToggle = document.getElementById('cp-sound-val');
    
    if (soundEnabled) {
        // Initialize if not already initialized
        if (!audioCtx) {
            initAudioSynth();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        if (soundToggle) {
            soundToggle.textContent = 'ON';
            soundToggle.className = 'pv ok';
        }
        
        // Start engine hum at low base volume
        if (engineGain) {
            engineGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.1);
        }
        
        writeToConsole("AUDIO SUBSYSTEMS: INITIALIZED & ONLINE.");
        speakCoPilot("Audio systems online. Co-pilot initialized.");
    } else {
        if (soundToggle) {
            soundToggle.textContent = 'OFF';
            soundToggle.className = 'pv alert';
        }
        // Fade out engine hum
        if (engineGain) {
            engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        }
        // Fade out warp sound
        if (warpGainNode) {
            warpGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        }
        if (warpNoiseGain) {
            warpNoiseGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        }
        writeToConsole("AUDIO SUBSYSTEMS: OFFLINE.");
        
        // Cancel speech synthesis
        window.speechSynthesis.cancel();
    }
}

function toggleSteeringMode(forcedState) {
    if (forcedState !== undefined) {
        steeringMode = forcedState;
    } else {
        steeringMode = steeringMode === 'free' ? 'cone' : 'free';
    }
    
    // Play tactical sound confirmation
    playLockChirp();
    
    const steerToggle = document.getElementById('cp-steer-val');
    
    if (steeringMode === 'free') {
        if (steerToggle) {
            steerToggle.textContent = 'FREE';
            steerToggle.className = 'pv ok';
        }
        writeToConsole("STEERING INTERFACE: FREE-FLIGHT MODE (360° MOTION).");
        speakCoPilot("Free flight steering online. 360-degree control active.");
    } else {
        if (steerToggle) {
            steerToggle.textContent = 'CONE';
            steerToggle.className = 'pv alert';
        }
        
        // Clamp current camera orientation to direct cone limits
        const maxY = Math.PI * 0.3;
        const maxX = Math.PI * 0.15;
        targetRotationY = Math.max(-maxY, Math.min(maxY, targetRotationY));
        targetRotationX = Math.max(-maxX, Math.min(maxX, targetRotationX));
        camera.rotation.y = targetRotationY;
        camera.rotation.x = targetRotationX;
        
        writeToConsole("STEERING INTERFACE: CLAMPED DIRECT-VIEW CONE.");
        speakCoPilot("Direct view steering online. Clamped cone limit active.");
    }
}

function speakCoPilot(text) {
    if (!soundEnabled) return;
    try {
        // Cancel currently speaking messages to prevent queue overlap
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.08; // slightly faster
        utterance.pitch = 0.95; // slightly deeper / robotic
        
        // Find a suitable voice if available (optional, defaults to browser default)
        const voices = window.speechSynthesis.getVoices();
        const roboticVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Robotic') || v.name.includes('Zira')));
        if (roboticVoice) {
            utterance.voice = roboticVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("Co-pilot voice error:", e);
    }
}

function playClickSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, audioCtx.currentTime); // high pitch tick
        
        gain.gain.setValueAtTime(0.008, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.025); // very short tick
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
}

function playExplosionSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        // Low pitch blast sweep
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.6);
        
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        
        // White noise explosion blast
        const noise = audioCtx.createBufferSource();
        const noiseFilter = audioCtx.createBiquadFilter();
        const noiseGain = audioCtx.createGain();
        
        const bufferSize = audioCtx.sampleRate * 0.7; // 0.7 second blast
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        noise.buffer = noiseBuffer;
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(250, audioCtx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        
        noiseGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.65);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.65);
        noise.start();
        noise.stop(audioCtx.currentTime + 0.7);
    } catch (e) {}
}

function playWarpSpoolSound(isActive) {
    if (!soundEnabled || !audioCtx) return;
    try {
        if (isActive) {
            // Sweep frequency up
            if (warpGainNode) {
                warpGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                warpGainNode.gain.setValueAtTime(warpGainNode.gain.value, audioCtx.currentTime);
                warpGainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 1.5);
            }
            if (warpOsc) {
                warpOsc.frequency.cancelScheduledValues(audioCtx.currentTime);
                warpOsc.frequency.setValueAtTime(80, audioCtx.currentTime);
                warpOsc.frequency.exponentialRampToValueAtTime(950, audioCtx.currentTime + 2.2);
            }
            if (warpNoiseGain) {
                warpNoiseGain.gain.cancelScheduledValues(audioCtx.currentTime);
                warpNoiseGain.gain.setValueAtTime(warpNoiseGain.gain.value, audioCtx.currentTime);
                warpNoiseGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 1.5);
            }
        } else {
            // Fade warp sound down
            if (warpGainNode) {
                warpGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                warpGainNode.gain.setValueAtTime(warpGainNode.gain.value, audioCtx.currentTime);
                warpGainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
            }
            if (warpNoiseGain) {
                warpNoiseGain.gain.cancelScheduledValues(audioCtx.currentTime);
                warpNoiseGain.gain.setValueAtTime(warpNoiseGain.gain.value, audioCtx.currentTime);
                warpNoiseGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
            }
        }
    } catch (e) {}
}

// --- Interactive Shunting Logic ---
function shuntPower(mode) {
    powerMode = mode;
    const reactorVal = document.getElementById('cp-reactor-val');
    const reactorBar = document.getElementById('cp-reactor-bar');
    const coolantVal = document.getElementById('cp-coolant-val');
    
    if (mode === 'engines') {
        baseSpeed = 0.6; // double speed
        
        if (reactorVal) {
            reactorVal.textContent = '125.0%';
            reactorVal.className = 'pv warn';
        }
        if (reactorBar) {
            reactorBar.style.width = '100%';
            reactorBar.style.backgroundColor = '#ffaa00';
            reactorBar.style.boxShadow = '0 0 6px rgba(255, 170, 0, 0.7)';
        }
        if (coolantVal) {
            coolantVal.textContent = 'HIGH TEMP';
            coolantVal.className = 'pv warn';
        }
        const speedElOC = document.getElementById('cp-speed');
        if (speedElOC) { speedElOC.style.color = '#ffaa00'; speedElOC.title = 'OVERCLOCKED'; }
        
        writeToConsole("REACTOR PATHWAY: DIVERTER SHUNTED TO PROPULSION VECTOR. REACTOR OVERLOAD DETECTED.");
        speakCoPilot("Engines shunted. Shield grid offline. Coolant temperature rising.");
    } else if (mode === 'shields') {
        baseSpeed = 0.15; // half speed
        
        if (reactorVal) {
            reactorVal.textContent = '85.0%';
            reactorVal.className = 'pv ok';
        }
        if (reactorBar) {
            reactorBar.style.width = '85%';
            reactorBar.style.backgroundColor = '#00ff88';
            reactorBar.style.boxShadow = '0 0 6px rgba(0, 255, 136, 0.7)';
        }
        if (coolantVal) {
            coolantVal.textContent = 'NOMINAL';
            coolantVal.className = 'pv ok';
        }
        const speedElTH = document.getElementById('cp-speed');
        if (speedElTH) { speedElTH.style.color = '#4cc9f0'; speedElTH.title = 'THROTTLED'; }
        
        writeToConsole("REACTOR PATHWAY: DIVERTER SHUNTED TO SHIELD AMPLIFIERS. PROPULSION OUTPUT THROTTLED.");
        speakCoPilot("Deflector grid shunted. Engines output restricted.");
    } else { // balanced 'systems'
        baseSpeed = 0.3; // standard speed
        
        if (reactorVal) {
            reactorVal.textContent = '98.4%';
            reactorVal.className = 'pv ok';
        }
        if (reactorBar) {
            reactorBar.style.width = '98.4%';
            reactorBar.style.backgroundColor = '#00ff88';
            reactorBar.style.boxShadow = '0 0 6px rgba(0, 255, 136, 0.7)';
        }
        if (coolantVal) {
            coolantVal.textContent = 'NOMINAL';
            coolantVal.className = 'pv ok';
        }
        const speedElBL = document.getElementById('cp-speed');
        if (speedElBL) { speedElBL.style.color = ''; speedElBL.title = ''; }
        
        writeToConsole("REACTOR PATHWAY: CONDUIT DIVERTERS BALANCED. ALL SYSTEMS INTEGRATED.");
        speakCoPilot("Grid power levels balanced.");
    }
}

// --- Active Defence Weapon System (Laser) ---
function fireMiningLaser() {
    // Play laser sound
    playLaserSound();
    
    // Laser start point (ship nose in camera space)
    const start = new THREE.Vector3(0, -0.8, -1.5).applyMatrix4(camera.matrixWorld);
    
    // Raycaster to check intersection with space crystals
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = spaceCrystalsMesh ? raycaster.intersectObject(spaceCrystalsMesh) : [];
    
    let end = new THREE.Vector3();
    let hitCrystalIndex = -1;
    
    if (intersects.length > 0 && intersects[0].distance < 160) {
        end.copy(intersects[0].point);
        hitCrystalIndex = intersects[0].instanceId;
    } else {
        // endpoint is 160 units forward
        end.set(0, 0, -160).applyMatrix4(camera.matrixWorld);
    }
    
    // Draw 3D laser cylinder
    const distance = start.distanceTo(end);
    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
    laserGeo.rotateX(Math.PI / 2); // align along Z
    
    const laserMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
    });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.scale.set(1, 1, distance);
    laserMesh.position.copy(start).add(end).multiplyScalar(0.5);
    laserMesh.lookAt(end);
    
    scene.add(laserMesh);
    
    setTimeout(() => {
        scene.remove(laserMesh);
    }, 100);
    
    // If we hit a crystal, shatter it!
    if (hitCrystalIndex !== -1) {
        shatterCrystal(hitCrystalIndex, end);
    }
}

function shatterCrystal(index, point) {
    const data = spaceCrystalsData[index];
    if (!data || data.scale.x <= 0.01) return; // already shattered

    // Play explosion sound
    playExplosionSound();
    
    const debrisColor = data.originalColor || 0x00ff88;
    
    // 1. Spawn debris shards
    const debrisGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const numDebris = 12;
    for (let i = 0; i < numDebris; i++) {
        const debrisMat = new THREE.MeshBasicMaterial({
            color: debrisColor,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const debris = new THREE.Mesh(debrisGeo.clone(), debrisMat);
        debris.position.copy(point);
        
        debris.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5
            ),
            scaleDecay: 0.94 + Math.random() * 0.03
        };
        scene.add(debris);
        crystalDebris.push(debris);
    }
    
    debrisGeo.dispose();
    // 2. Spawn harvestable energy matrix octahedron
    const matrixGeo = new THREE.OctahedronGeometry(0.5, 0);
    const matrixMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
        flatShading: true
    });
    const matrixMesh = new THREE.Mesh(matrixGeo, matrixMat);
    matrixMesh.position.copy(data.position);
    scene.add(matrixMesh);
    energyMatrixes.push(matrixMesh);
    
    // 3. Object Pool Respawn: Move crystal way in front so corridor stays populated
    data.position.set(
        (Math.random() - 0.5) * 360,
        (Math.random() - 0.5) * 220,
        camera.position.z - (Math.random() * 200 + 150)
    );
    data.collided = false;
    // reset scale immediately
    data.scale.set(data.size, data.size, data.size);
    
    writeToConsole(`MINING LASER SUCCESS. CRYSTAL YIELD OBTAINED.`);
    speakCoPilot("Crystal shattered. Energy matrix exposed.");
}

// --- Dynamic Audio Beeps ---
function playLaserSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } catch(e){}
}

function playPickupSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch(e){}
}

function playLockChirp() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.012, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch(e){}
}

function playRumbleSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(15, audioCtx.currentTime + 1.2);
        
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.25);
    } catch(e){}
}

