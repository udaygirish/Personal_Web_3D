// ========================================
// Animation Loop
// ========================================

// Idle Orbit Screensaver
let lastActivityTime = Date.now();
const IDLE_TIMEOUT_MS = 60000;
let idleOrbitActive = false;

function resetIdleTimer() {
    lastActivityTime = Date.now();
    if (idleOrbitActive) {
        idleOrbitActive = false;
        if (autopilotActive) disableAutopilot();
        warpActive = false;
        if (typeof playWarpSpoolSound === 'function') playWarpSpoolSound(false);
        const notice = document.getElementById('idle-screensaver-notice');
        if (notice) notice.classList.remove('visible');
    }
}

function animate() { UniverseClock.start(simulateFrame, () => { composer.render(); }); }

function simulateFrame() {

    if (currentScene === SCENES.OPEN_SPACE || currentScene === SCENES.COCKPIT) {
        if (currentScene === SCENES.OPEN_SPACE) {
            updateFlightControls();
            checkWormholeProximity();
        }
        if (!window.universeReducedMotion) animateWormholes();
        animateSpaceCrystals();
        if (!window.universeReducedMotion) animateWarpLines();
        
        // Cockpit shield regeneration (dependent on powerMode shunts)
        if (shieldEnergy < 100) {
            let regenRate = 0.05; // systems balanced
            if (powerMode === 'shields') {
                regenRate = 0.20; // 4x fast regen
            } else if (powerMode === 'engines') {
                regenRate = 0.0; // offline!
            }
            if (regenRate > 0) {
                shieldEnergy = Math.min(100, shieldEnergy + regenRate);
                updateShieldUI();
            }
        }
        
        // Update 3D target lock reticle ring
        if (hudReticle) {
            let nearest = null;
            let minDist = Infinity;
            wormholes.forEach(w => {
                const dist = camera.position.distanceTo(w.group.position);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = w;
                }
            });
            
            if (nearest && minDist < 250) {
                hudReticle.visible = true;
                hudReticle.position.copy(nearest.group.position);
                hudReticle.lookAt(camera.position);
                
                // Pulsing animation
                const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.08;
                
                if (minDist > 85) {
                    hudReticle.scale.set(pulse * 1.5, pulse * 1.5, 1);
                    hudReticle.material.color.setHex(0xffaa00); // orange scan
                    hudReticle.material.opacity = 0.5;
                    hudReticle.rotation.z += 0.01;
                    nearest.group.userData.lockAnnounced = false; // reset flag
                } else if (minDist > 30) {
                    const progress = (minDist - 30) / 55;
                    const scaleFactor = 0.8 + progress * 0.7;
                    hudReticle.scale.set(pulse * scaleFactor, pulse * scaleFactor, 1);
                    hudReticle.material.color.setHex(0xffaa00);
                    hudReticle.material.opacity = 0.75;
                    hudReticle.rotation.z += 0.035;
                } else {
                    hudReticle.scale.set(pulse * 0.75, pulse * 0.75, 1);
                    hudReticle.material.color.setHex(0x00ff88); // green lock-on!
                    hudReticle.material.opacity = 0.95;
                    hudReticle.rotation.z += 0.08;
                    
                    // Show wormhole destination tooltip
                    const tt = document.getElementById('wormhole-tooltip');
                    const ttLabel = document.getElementById('wt-label');
                    const ttSwatch = document.getElementById('wt-swatch');
                    if (tt && nearest) {
                        if (ttLabel) ttLabel.textContent = nearest.config.label.toUpperCase();
                        if (ttSwatch) ttSwatch.style.background = '#' + nearest.color.toString(16).padStart(6, '0');
                        tt.style.opacity = '1';
                    }
                    
                    if (!nearest.group.userData.lockAnnounced && currentScene === SCENES.OPEN_SPACE) {
                        nearest.group.userData.lockAnnounced = true;
                        playLockChirp();
                        speakCoPilot(`Course locked on target ${nearest.config.label.toUpperCase()}`);
                    }
                }
            } else {
                hudReticle.visible = false;
                // Hide tooltip when no lock
                const tt = document.getElementById('wormhole-tooltip');
                if (tt) tt.style.opacity = '0';
            }

        }
        
        // Update physics of crystal debris particles
        for (let i = crystalDebris.length - 1; i >= 0; i--) {
            const debris = crystalDebris[i];
            debris.position.add(debris.userData.velocity);
            debris.scale.multiplyScalar(debris.userData.scaleDecay);
            debris.material.opacity = debris.scale.x;
            if (debris.scale.x < 0.05) {
                scene.remove(debris);
                debris.geometry.dispose();
                debris.material.dispose();
                crystalDebris.splice(i, 1);
            }
        }
        
        // Update physics of energy matrixes (tractor beam pull)
        for (let i = energyMatrixes.length - 1; i >= 0; i--) {
            const em = energyMatrixes[i];
            em.rotation.x += 0.02;
            em.rotation.y += 0.02;
            
            // Lerp towards camera position
            em.position.lerp(camera.position, 0.035);
            
            const dist = em.position.distanceTo(camera.position);
            if (dist < 6.0) {
                scene.remove(em);
                em.geometry.dispose();
                em.material.dispose();
                energyMatrixes.splice(i, 1);
                
                // Recover shield
                shieldEnergy = Math.min(100, shieldEnergy + 12.0);
                updateShieldUI();
                playPickupSound();
                writeToConsole("[INFO] ENERGY HARVESTED. SHIELDS INCREASED +12.0%.");
                speakCoPilot("Energy matrix harvested. Shields restored.");
            }
        }
        
        // Rare Solar Supernova Event triggers (1/8000 chance per frame)
        if (!window.universeReducedMotion && !supernovaActive && Math.random() < 0.00012) {
            supernovaActive = true;
            supernovaTime = 100; // lasts 100 frames
            playRumbleSound();
            
            // Flash scene white
            scene.fog.color.setHex(0xffffff);
            scene.fog.density = 0.025;
            
            writeToConsole("[WARNING] SOLAR CORONAL MASS EJECTION DETECTED. ELECTROMAGNETIC FLUX WARNING.");
            speakCoPilot("Caution! Solar radiation flare detected. Cockpit shields dampening interference.");
        }
        
        // Decaying solar flare fog and HUD flicker effect
        if (supernovaActive) {
            supernovaTime--;
            
            const uiEl = document.getElementById('ui-container');
            if (supernovaTime > 0) {
                // Glitchy HUD opacity flickers
                if (uiEl) {
                    uiEl.style.opacity = Math.random() > 0.35 ? '0.9' : '0.2';
                }
                // Fog decay slerp
                scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.001, 0.02);
                scene.fog.color.lerp(new THREE.Color(0x000000), 0.02);
            } else {
                supernovaActive = false;
                if (uiEl) uiEl.style.opacity = '1.0';
                scene.fog.color.setHex(0x000000);
                scene.fog.density = 0.001;
            }
        }
        
        // Dynamic engine hum frequency and volume scaling
        if (soundEnabled && audioCtx && engineOsc && engineGain) {
            let speedC = 0;
            if (autopilotActive) {
                speedC = baseSpeed * 1.5 * 0.01;
            } else {
                speedC = velocity.length() * 0.01;
            }
            const targetFreq = 45 + speedC * 2000;
            engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.15);
            
            const targetVolume = 0.12 + speedC * 1.5;
            engineGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.1);
        }
        
        // Apply camera shake if active
        if (cameraShakeAmount > 0.005) {
            const shakeX = (Math.random() - 0.5) * cameraShakeAmount;
            const shakeY = (Math.random() - 0.5) * cameraShakeAmount;
            const shakeZ = (Math.random() - 0.5) * cameraShakeAmount;
            
            // Ensure Euler rotation is synchronized with the quaternion (essential for autopilot slerp)
            camera.rotation.setFromQuaternion(camera.quaternion);
            
            camera.rotation.x += shakeX;
            camera.rotation.y += shakeY;
            camera.rotation.z += shakeZ;
            
            cameraShakeAmount *= 0.88;
        } else {
            cameraShakeAmount = 0;
        }
        
        if (typeof updateRadar === 'function') {
            updateRadar();
        }

        // Idle Screensaver check
        if (!document.querySelector("dialog[open]") && !idleOrbitActive && Date.now() - lastActivityTime > IDLE_TIMEOUT_MS && wormholes.length > 0) {
            idleOrbitActive = true;
            warpActive = true;
            if (typeof playWarpSpoolSound === 'function') playWarpSpoolSound(true);
            // Pick the nearest wormhole as orbit target
            let nearestWH = wormholes[0];
            let nearestDist = Infinity;
            wormholes.forEach(w => {
                const d = camera.position.distanceTo(w.group.position);
                if (d < nearestDist) { nearestDist = d; nearestWH = w; }
            });
            setAutopilotTarget(nearestWH);
            enableAutopilot();
            const notice = document.getElementById('idle-screensaver-notice');
            if (notice) notice.classList.add('visible');
        }
    } else if (currentScene === SCENES.WORMHOLE_TRAVEL) {
        // Check if this is a reverse travel (returning)
        if (scene.userData.exitWormhole) {
            animateReverseWormholeTravel();
        } else {
            animateWormholeTravel();
        }
    }


}

function updateFlightControls() {
    if (document.querySelector("dialog[open]")) return;
    // Autopilot check override
    if (autopilotActive && autopilotTarget) {
        if (moveForward || moveBackward || moveLeft || moveRight || moveUp || moveDown || barrelRoll !== 0) {
            disableAutopilot();
            showNavAlert('AUTOPILOT CANCELLED', 'MANUAL OVERRIDE DETECTED');
        }
    }

    if (autopilotActive && autopilotTarget) {
        // Lock onto target smoothly
        const targetPos = autopilotTarget.group.position;
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(camera.position, targetPos, new THREE.Vector3(0, 1, 0))
        );
        camera.quaternion.slerp(targetQuaternion, 0.04); // Smooth transition
        
        // Synchronize targetRotation values to match the current camera quaternion
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        targetRotationY = euler.y;
        targetRotationX = euler.x;
        mouseX = targetRotationY / (Math.PI * 0.3);
        mouseY = targetRotationX / (Math.PI * 0.15);
        
        // Apply autopilot forward cruise speed
        const apSpeed = baseSpeed * 1.2;
        camera.translateZ(-apSpeed);
        
        // Proximity entry trigger
        const distance = camera.position.distanceTo(targetPos);
        if (distance < 25 && (Date.now() - lastWormholeExitTime > 3000)) {
            const targetWH = autopilotTarget;
            disableAutopilot();
            enterWormhole(targetWH);
        }
    } else {
        // Manual flight controls
        if (steeringMode === 'free') {
            // Steering is only active when mouse is within the central viewport (outside the cockpit panels)
            const insideControlsZone = Math.abs(mouseX) < 0.72 && mouseY > -0.62;
            
            if (insideControlsZone) {
                // Apply a small deadzone to prevent drift when centering mouse
                const deadzone = 0.08;
                let inputYaw = 0;
                let inputPitch = 0;

                if (Math.abs(mouseX) > deadzone) {
                    inputYaw = (mouseX - Math.sign(mouseX) * deadzone) / (1 - deadzone);
                }
                if (Math.abs(mouseY) > deadzone) {
                    inputPitch = (mouseY - Math.sign(mouseY) * deadzone) / (1 - deadzone);
                }

                const yawSpeed = 0.025;
                const pitchSpeed = 0.018;

                targetRotationY -= inputYaw * yawSpeed;
                targetRotationX += inputPitch * pitchSpeed;

                const maxPitch = Math.PI * 0.45;
                targetRotationX = Math.max(-maxPitch, Math.min(maxPitch, targetRotationX));
            }
        } else {
            // Direct clamped look mode
            targetRotationY = mouseX * Math.PI * 0.3;
            targetRotationX = mouseY * Math.PI * 0.15;
        }

        camera.rotation.y = targetRotationY;
        camera.rotation.x = targetRotationX;

        // Apply barrel roll
        if (barrelRoll !== 0) {
            camera.rotation.z += barrelRoll * 0.05;
            barrelRoll *= 0.95;
            if (Math.abs(barrelRoll) < 0.01) barrelRoll = 0;
        }

        // Calculate speed
        const moveSpeed = speedBoost ? baseSpeed * 2 : baseSpeed;

        // Movement with inertia
        const targetVelocity = new THREE.Vector3();

        if (moveForward) targetVelocity.z -= moveSpeed;
        if (moveBackward) targetVelocity.z += moveSpeed;
        if (moveLeft) targetVelocity.x -= moveSpeed;
        if (moveRight) targetVelocity.x += moveSpeed;
        if (moveUp) targetVelocity.y += moveSpeed;
        if (moveDown) targetVelocity.y -= moveSpeed;

        // Smoothly interpolate current velocity towards target (creates momentum/drift)
        velocity.lerp(targetVelocity, 0.08);

        // Apply movement in camera's local space
        camera.translateX(velocity.x);
        camera.translateY(velocity.y);
        camera.translateZ(velocity.z);
    }

    // Dynamic FOV for warp sensation
    const baseFov = 75;
    const isWarping = (autopilotActive && autopilotTarget) || (speedBoost && moveForward);
    const targetFov = isWarping ? 105 : baseFov;
    
    if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * 0.05;
        camera.updateProjectionMatrix();
    }

    // Explicitly update camera matrix so other computations use the current position/quaternion immediately
    camera.updateMatrixWorld();

    // Update HUD
    updateHUD();
}

function checkWormholeProximity() {
    if (document.querySelector("dialog[open]")) return;
    if (Date.now() - lastWormholeExitTime < 3000) return; // 3-second cooldown after exiting!
    
    wormholes.forEach(wormhole => {
        const distance = camera.position.distanceTo(wormhole.group.position);

        // Check if close enough and moving forward
        if (distance < 25 && moveForward) {
            enterWormhole(wormhole);
        }
    });
}

function animateWormholes() {
    const time = Date.now() * 0.001;
    let dt = time - lastWormholeUpdateTime;
    if (dt > 0.1) dt = 0.1;
    lastWormholeUpdateTime = time;

    wormholes.forEach((wormhole, wormholeIndex) => {
        // Position and distance used for multiple visual effects
        const wormholeWorldPos = new THREE.Vector3();
        wormhole.group.getWorldPosition(wormholeWorldPos);
        const distance = camera.position.distanceTo(wormholeWorldPos);

        // Overall gentle rotation
        wormhole.group.rotation.z += 0.002;

        // Gentle breathing scale
        const baseScale = 1 + Math.sin(time * 0.5 + wormholeIndex * Math.PI) * 0.03;
        wormhole.group.scale.set(baseScale, baseScale, baseScale);

        // 1. Pulsating Event Horizon Core
        const eventHorizon = wormhole.group.getObjectByName('eventHorizon');
        if (eventHorizon) {
            const pulse = 1.0 + Math.sin(time * 3 + wormholeIndex * Math.PI) * 0.05;
            eventHorizon.scale.set(pulse, pulse, pulse);
        }

        // Animate energy rings - rotate at different speeds
        const energyRings = wormhole.group.getObjectByName('energyRings');
        if (energyRings) {
            energyRings.children.forEach((ring, ringIndex) => {
                // Each ring rotates at its own speed (stored in userData)
                if (ring.userData.rotationSpeed) {
                    ring.rotation.z += ring.userData.rotationSpeed;
                }

                // Subtle pulsing opacity
                const pulseFactor = Math.sin(time * 2 + ringIndex * 0.5) * 0.1;
                if (ring.material) {
                    const baseOpacity = 0.9 - ringIndex * 0.15;
                    ring.material.opacity = baseOpacity + pulseFactor;
                }
            });
        }

        // Animate light rays - slow rotation
        const lightRays = wormhole.group.getObjectByName('lightRays');
        if (lightRays) {
            lightRays.rotation.z += 0.005;

            // Pulse light ray opacity
            lightRays.children.forEach((ray, rayIndex) => {
                if (ray.material) {
                    const pulse = Math.sin(time * 3 + rayIndex * 0.2) * 0.03;
                    ray.material.opacity = 0.08 + pulse;
                }
            });
        }

        // 2. Turbulent Proximity Swirl
        // Map distance: under 150 units, speed increases from 1x up to 4.0x at 25 units.
        let speedMultiplier = 1.0;
        if (distance < 150) {
            const normDist = Math.max(0, Math.min(1, (150 - distance) / (150 - 25)));
            speedMultiplier = 1.0 + normDist * 3.0; // 1.0x to 4.0x
        }

        if (wormhole.particleTime === undefined) {
            wormhole.particleTime = time;
        }
        wormhole.particleTime += dt * speedMultiplier;

        const particlesGroup = wormhole.group.getObjectByName('particles');
        if (particlesGroup) {
            const particles = particlesGroup.getObjectByName('accretionParticles');
            if (particles && particles.material && particles.material.uniforms) {
                particles.material.uniforms.time.value = wormhole.particleTime;
            }
        }

        // 3. Dynamic Electro-Magnetic Arcs (Space Lightning)
        const lightningGroup = wormhole.group.getObjectByName('lightning');
        if (lightningGroup) {
            const pointsPerLine = 10;
            lightningGroup.children.forEach(line => {
                if (line.userData.active) {
                    // Decay opacity
                    line.userData.opacity -= 0.08;
                    if (line.userData.opacity <= 0) {
                        line.userData.opacity = 0;
                        line.userData.active = false;
                    }
                    if (line.material) {
                        line.material.opacity = line.userData.opacity;
                    }
                } else {
                    // Randomly trigger a bolt
                    if (Math.random() < 0.015) {
                        line.userData.active = true;
                        line.userData.opacity = 0.8 + Math.random() * 0.2;
                        
                        // Determine start point on event horizon (radius 3.5)
                        const startAngle = Math.random() * Math.PI * 2;
                        const startX = Math.cos(startAngle) * 3.5;
                        const startY = Math.sin(startAngle) * 3.5;
                        const startZ = 0;

                        // Determine end point on outer rings (radius 7 to 12)
                        const endAngle = Math.random() * Math.PI * 2;
                        const outerRadius = 7 + Math.random() * 5;
                        const endX = Math.cos(endAngle) * outerRadius;
                        const endY = Math.sin(endAngle) * outerRadius;
                        const endZ = (Math.random() - 0.5) * 2;

                        const posAttr = line.geometry.getAttribute('position');
                        const positions = posAttr.array;

                        for (let j = 0; j < pointsPerLine; j++) {
                            const t = j / (pointsPerLine - 1);
                            const baseX = startX + (endX - startX) * t;
                            const baseY = startY + (endY - startY) * t;
                            const baseZ = startZ + (endZ - startZ) * t;

                            let dx = 0, dy = 0, dz = 0;
                            if (j > 0 && j < pointsPerLine - 1) {
                                const factor = Math.sin(t * Math.PI) * 1.5;
                                dx = (Math.random() - 0.5) * factor;
                                dy = (Math.random() - 0.5) * factor;
                                dz = (Math.random() - 0.5) * factor;
                            }

                            positions[j * 3]     = baseX + dx;
                            positions[j * 3 + 1] = baseY + dy;
                            positions[j * 3 + 2] = baseZ + dz;
                        }
                        posAttr.needsUpdate = true;
                        if (line.material) {
                            line.material.opacity = line.userData.opacity;
                        }
                    } else {
                        if (line.material) {
                            line.material.opacity = 0;
                        }
                    }
                }
            });
        }

        // Animate spacetime grid - fixed opacity to prevent blinking
        const grid = wormhole.group.getObjectByName('spacetimeGrid');
        if (grid) {
            // Grid no longer pulses to prevent blinking effect
            // Opacity remains constant at 0.04
        }

        // Animate throat - gentle rotation
        const throat = wormhole.group.getObjectByName('throat');
        if (throat) {
            throat.rotation.z += 0.003;
        }

        // Animate lens flare - dynamic based on viewing angle
        const lensFlare = wormhole.group.getObjectByName('lensFlare');
        if (lensFlare) {
            // Slow rotation for dynamic effect
            lensFlare.rotation.z += 0.002;

            // Calculate angle between camera and wormhole
            const directionToWormhole = new THREE.Vector3();
            directionToWormhole.subVectors(wormholeWorldPos, camera.position).normalize();

            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);

            // Dot product gives us angle alignment (-1 to 1)
            const alignment = cameraDirection.dot(directionToWormhole);

            // Distance-based scaling
            const distanceFactor = Math.max(0, 1 - distance / 150);

            // Adjust opacity based on viewing angle and distance
            // Brightest when looking directly at it
            const targetOpacity = Math.max(0, alignment) * 0.3 * distanceFactor;

            lensFlare.children.forEach(spike => {
                if (spike.material) {
                    spike.material.opacity = targetOpacity;
                }
            });

            // Scale with distance (larger when closer)
            const scale = 1 + distanceFactor * 0.5;
            lensFlare.scale.set(scale, scale, scale);
        }
    });

    // Parallax starfield rotation
    if (starLayers.near) starLayers.near.rotation.y += 0.0005;
    if (starLayers.mid) starLayers.mid.rotation.y += 0.0003;
    if (starLayers.far) starLayers.far.rotation.y += 0.0001;
}

function animateWormholeTravel() {
    const tunnelSegments = scene.children.filter(child => child.name === 'tunnelSegment');
    const particles = scene.children.filter(child => child.name === 'tunnelParticle');

    // Animate tunnel rings
    tunnelSegments.forEach((segment) => {
        segment.position.z += 1.2; // Faster movement

        if (segment.position.z > camera.position.z + 15) {
            segment.position.z -= 156;
        }

        const distance = Math.abs(segment.position.z - camera.position.z);
        segment.material.opacity = Math.max(0.2, 1 - distance / 60);
    });

    // Animate particles (green streaks)
    particles.forEach((particleSystem) => {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += 2; // Z movement (faster than rings)

            if (positions[i + 2] > camera.position.z + 20) {
                positions[i + 2] -= 170;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    });

    // Barrel roll effect
    camera.rotation.z += 0.02;

    const travelTime = Date.now() - wormholeEntryTime;
    
    // Parallax stars spin for wormhole effect
    if (starLayers.near) starLayers.near.rotation.y += 0.01;
    if (starLayers.mid) starLayers.mid.rotation.y += 0.008;
    if (starLayers.far) starLayers.far.rotation.y += 0.005;

    // Hyper speed lines
    animateWarpLines();
    
    // Intense Post-Processing Effect (Bloom white-out)
    if (bloomPass) {
        // Normal strength is 1.5. Smoothly ramp up to 10 as we get closer to 4000ms
        const progress = Math.min(1.0, travelTime / 3500);
        // Exponential curve for dramatic flash at the end
        bloomPass.strength = 1.5 + Math.pow(progress, 4) * 15.0; 
    }

    // Fade to white / redirect logic handled by setTimeout in enterWormhole
}

// ========================================
// Tactical Navigation Radar Drawing
// ========================================

function updateRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw radar circles
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.4, 0, Math.PI * 2);
    ctx.arc(cx, cy, cx * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw axis lines
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();
    
    // Draw sweep lines
    const sweepAngle = (Date.now() * 0.0022) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.26)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * cx, cy + Math.sin(sweepAngle) * cy);
    ctx.stroke();
    
    // Sweep glow background
    ctx.fillStyle = 'rgba(0, 255, 136, 0.02)';
    ctx.beginPath();
    ctx.arc(cx, cy, cx, 0, Math.PI * 2);
    ctx.fill();
    
    // Central ship blip
    ctx.fillStyle = (Date.now() % 1000 > 500) ? '#ffffff' : '#00ff88';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw coordinate target blips
    const maxRange = 300;
    wormholes.forEach(wh => {
        const localPos = new THREE.Vector3().subVectors(wh.group.position, camera.position);
        localPos.applyQuaternion(camera.quaternion.clone().invert());
        
        const dist = localPos.length();
        if (dist < maxRange) {
            // Project X -> X and Z -> Y (since -Z is forward in WebGL space)
            const bx = cx + (localPos.x / maxRange) * (cx * 0.85);
            const by = cy + (localPos.z / maxRange) * (cy * 0.85);
            
            const colorHex = wh.color;
            const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
            
            ctx.shadowColor = colorStr;
            ctx.shadowBlur = 5;
            ctx.fillStyle = colorStr;
            ctx.beginPath();
            ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            
            // Draw Target text tag
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.font = '5px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(wh.config.label.toUpperCase().substring(0, 4), bx, by - 5);
        }
    });
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);

    // Reset idle timer on any user interaction
    ['keydown','mousedown','touchstart'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // Inject idle screensaver notice if not already present
    if (!document.getElementById('idle-screensaver-notice')) {
        const notice = document.createElement('div');
        notice.id = 'idle-screensaver-notice';
        notice.innerHTML = '<span>SCREENSAVER MODE — Press any key to take control</span>';
        notice.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,255,136,0.15);border:1px solid rgba(0,255,136,0.4);color:#00ff88;font-family:Orbitron,sans-serif;font-size:12px;padding:10px 24px;border-radius:6px;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.5s;';
        document.body.appendChild(notice);
        // CSS trick: add 'visible' class to show it
        const style = document.createElement('style');
        style.textContent = '#idle-screensaver-notice.visible { opacity: 1; }';
        document.head.appendChild(style);
    }

    // Inject wormhole destination preview tooltip
    if (!document.getElementById('wormhole-tooltip')) {
        const tt = document.createElement('div');
        tt.id = 'wormhole-tooltip';
        tt.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%, -120px);background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);color:#fff;font-family:Orbitron,sans-serif;padding:10px 16px;border-radius:8px;z-index:5000;pointer-events:none;opacity:0;transition:opacity 0.3s;text-align:center;min-width:140px;';
        tt.innerHTML = '<div id="wt-swatch" style="width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle;"></div><span id="wt-label">TARGET</span>';
        document.body.appendChild(tt);
    }

    // Initialize mobile controls if on mobile device
    if (typeof initMobileControls === 'function') {
        initMobileControls();
    }

    // Initialize autopilot UI controls
    initAutopilotUI();

    // Initialize interactive console controls
    initConsole();

    // Initialize cockpit view toggle button
    initCockpitToggle();

    // Initialize interactive sound toggle listener
    const soundToggle = document.getElementById('cp-sound-val');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            toggleSound();
        });
        if (!soundEnabled) {
            soundToggle.textContent = 'OFF';
            soundToggle.className = 'pv alert';
        }
    }

    // Initialize interactive steering mode toggle listener
    const steerToggle = document.getElementById('cp-steer-val');
    if (steerToggle) {
        steerToggle.addEventListener('click', () => {
            toggleSteeringMode();
        });
    }

    // Click on canvas or background viewport to fire mining laser
    window.addEventListener('click', (event) => {
        if (currentScene !== SCENES.OPEN_SPACE || isConsoleTyping || document.querySelector('dialog[open]') || event.target.closest?.('.universe-nav, .u-tour, a, button')) return;
        
        // Block firing when clicking on interactive cockpit buttons/inputs/panels
        const target = event.target;
        if (target.closest('.cockpit-panel') || target.closest('.cockpit-bottom') || target.closest('.hud-toggle-btn') || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') {
            return;
        }
        
        fireMiningLaser();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update rotation targets only if in direct cone mode
    if (steeringMode === 'cone') {
        targetRotationY = mouseX * Math.PI * 0.3;
        targetRotationX = mouseY * Math.PI * 0.15;
    }
}

function initMobileControls() {
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
}

function onTouchStart(event) {
    if (document.querySelector("dialog[open]") || event.target.closest?.(".universe-nav, .u-tour, a, button, input, select, label")) return;
    if (isConsoleTyping) return;
    
    // Ignore UI touches
    const target = event.target;
    if (target.closest('.cockpit-panel') || target.closest('.cockpit-bottom') || target.closest('.hud-toggle-btn') || target.tagName === 'BUTTON') {
        return;
    }

    if (event.touches.length > 0) {
        const touch = event.touches[0];
        mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        if (currentScene === SCENES.COCKPIT) {
            startFlight();
            return;
        }

        if (steeringMode === 'cone') {
            targetRotationY = mouseX * Math.PI * 0.3;
            targetRotationX = mouseY * Math.PI * 0.15;
        }

        // Tap with two fingers or hold screen = move forward
        if (event.touches.length >= 2 && currentScene === SCENES.OPEN_SPACE) {
            moveForward = true;
            setCockpitKey('w', true);
        } else {
            // Mobile auto-forward: simple tap starts moving forward if in open space
            if (currentScene === SCENES.OPEN_SPACE) {
                moveForward = true;
                setCockpitKey('w', true);
            }
        }
    }
}

function onTouchMove(event) {
    if (document.querySelector("dialog[open]") || event.target.closest?.(".universe-nav, .u-tour, a, button, input, select, label")) return;
    if (event.touches.length > 0 && currentScene === SCENES.OPEN_SPACE) {
        // Prevent default scrolling on canvas
        const target = event.target;
        if (!target.closest('.cockpit-panel')) {
            event.preventDefault(); 
        }
        
        const touch = event.touches[0];
        mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        if (steeringMode === 'cone') {
            targetRotationY = mouseX * Math.PI * 0.3;
            targetRotationX = mouseY * Math.PI * 0.15;
        }
    }
}

function onTouchEnd(event) {
    if (event.touches.length === 0) {
        moveForward = false;
        setCockpitKey('w', false);
    }
}

function onKeyDown(event) {
    if (event.target.closest?.("input, textarea, select, [contenteditable], dialog[open]")) return;
    if (isConsoleTyping) return;
    const key = event.key.toLowerCase();

    // Toggle Cockpit View
    if (key === 'c' && currentScene === SCENES.OPEN_SPACE) {
        toggleCockpitView();
        return;
    }

    // Toggle Steering Mode
    if (key === 'm' && currentScene === SCENES.OPEN_SPACE) {
        toggleSteeringMode();
        return;
    }

    // Start flight from cockpit
    if ((key === 'w' || key === 'arrowup') && currentScene === SCENES.COCKPIT) {
        startFlight();
        return;
    }

    // Flight controls
    if (currentScene === SCENES.OPEN_SPACE) {
        switch (key) {
            case 'w':
            case 'arrowup':
                moveForward = true;
                break;
            case 's':
            case 'arrowdown':
                moveBackward = true;
                break;
            case 'a':
            case 'arrowleft':
                moveLeft = true;
                break;
            case 'd':
            case 'arrowright':
                moveRight = true;
                break;
            case ' ':
                event.preventDefault();
                moveUp = true;
                break;
            case 'q':
                barrelRoll = -5; // Roll left
                break;
            case 'e':
                barrelRoll = 5; // Roll right
                break;
        }

        // Shift = speed boost only (not forced moveDown — that was a bug)
        if (event.shiftKey) {
            speedBoost = true;
        }

        // Light up the matching cockpit key indicator
        setCockpitKey(key, true);
        if (event.shiftKey) setCockpitKey('shift', true);

        // Dismiss the direction beacon on first movement key
        if (typeof dismissBeacon === 'function') dismissBeacon();
    }
}

function onKeyUp(event) {
    if (isConsoleTyping) return;
    const key = event.key.toLowerCase();

    switch (key) {
        case 'w':
        case 'arrowup':
            moveForward = false;
            break;
        case 's':
        case 'arrowdown':
            moveBackward = false;
            break;
        case 'a':
        case 'arrowleft':
            moveLeft = false;
            break;
        case 'd':
        case 'arrowright':
            moveRight = false;
            break;
        case ' ':
            moveUp = false;
            break;
    }

    // Reset speed boost when Shift is released
    if (!event.shiftKey) {
        speedBoost = false;
    }

    // Extinguish the cockpit key indicator
    setCockpitKey(key, false);
    if (!event.shiftKey) setCockpitKey('shift', false);
}

