// ========================================
// AI Interactive Console Logic
// ========================================

// Circular command log buffer (last 20 entries)
const consoleLogBuffer = [];
const MAX_LOG_BUFFER = 20;

// Command history for arrow-up recall
const cmdHistory = [];
let cmdHistoryIndex = -1;

function initConsole() {
    const inputLeft = document.getElementById('ap-console-input');
    const inputBottom = document.getElementById('ap-console-input-bottom');
    const output = document.getElementById('ap-console-out');
    if (!output) return;
    
    function attachHistory(input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (cmdHistoryIndex < cmdHistory.length - 1) {
                    cmdHistoryIndex++;
                    input.value = cmdHistory[cmdHistoryIndex];
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (cmdHistoryIndex > 0) {
                    cmdHistoryIndex--;
                    input.value = cmdHistory[cmdHistoryIndex];
                } else {
                    cmdHistoryIndex = -1;
                    input.value = '';
                }
            } else {
                playClickSound();
            }
        });
    }
    
    function attachSubmit(inputEl, otherInput) {
        inputEl.addEventListener('focus', () => { isConsoleTyping = true; });
        inputEl.addEventListener('blur',  () => { isConsoleTyping = false; });
        attachHistory(inputEl);
        inputEl.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const rawVal = inputEl.value;
                const cleanVal = rawVal.trim().toLowerCase();
                inputEl.value = '';
                if (otherInput) otherInput.value = '';
                if (cleanVal.length === 0) return;
                // Save to history
                cmdHistory.unshift(cleanVal);
                if (cmdHistory.length > 50) cmdHistory.pop();
                cmdHistoryIndex = -1;
                writeToConsole(`> ${rawVal}`);
                executeConsoleCommand(cleanVal);
            }
        });
    }
    
    const output2 = output; // same ref
    if (inputLeft) attachSubmit(inputLeft, inputBottom);
    if (inputBottom) attachSubmit(inputBottom, inputLeft);
}

function writeToConsole(text) {
    consoleLogBuffer.push(String(text));
    if (consoleLogBuffer.length > MAX_LOG_BUFFER) consoleLogBuffer.shift();
    const output = document.getElementById('ap-console-out');
    if (!output) return;
    output.replaceChildren(...consoleLogBuffer.map(line => {
        const div = document.createElement('div');
        div.textContent = line;
        return div;
    }));
    output.scrollTop = output.scrollHeight;
}

function executeConsoleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');
    
    const isHelp = parts.includes('--help') || (cmd === 'help' && arg);
    if (isHelp) {
        const targetCmd = cmd === 'help' ? parts[1] : cmd;
        switch (targetCmd) {
            case 'scan': writeToConsole("SCAN [no args]: Pings the nearest target and outputs distance in Light Years (LY)."); return;
            case 'systems': writeToConsole("SYSTEMS [no args]: Runs a diagnostic check on core ship functions."); return;
            case 'ap':
            case 'autopilot': writeToConsole("AP [destination|off]: Engages or disengages autopilot.\nExamples: 'ap work', 'ap off'"); return;
            case 'warp': writeToConsole("WARP [no args]: Toggles hyperspace visual streaks on/off."); return;
            case 'sound': writeToConsole("SOUND [no args]: Toggles the audio feedback on/off."); return;
            case 'steer': writeToConsole("STEER [no args]: Toggles mouse steering between FREE and CONE modes."); return;
            case 'shunt': writeToConsole("SHUNT [engines|shields|systems]: Routes power to a specific subsystem."); return;
            case 'vent': writeToConsole("VENT [no args]: Flushes coolant systems."); return;
            default: writeToConsole(`NO MANUAL ENTRY FOR: ${targetCmd.toUpperCase()}`); return;
        }
    }
    
    switch (cmd) {
        case 'help':
            writeToConsole("COMMANDS LOG:\n- help: show options\n- scan: range to targets\n- systems: diagnostic checks\n- ap [dest]: engage autopilot\n- ap off: disengage autopilot\n- warp: toggle speed streaks\n- sound: toggle audio feedback\n- steer: toggle steering mode (FREE / CONE)\n- shunt [engines|shields|systems]: route power\n- vent: flush coolant systems\n- status: show current ship status\n- logs: show last 10 console entries\nUsage: <command> --help");
            break;
            
        case 'scan':
            if (wormholes.length > 0) {
                let nearest = null;
                let minDist = Infinity;
                wormholes.forEach(w => {
                    const d = camera.position.distanceTo(w.group.position);
                    if (d < minDist) { minDist = d; nearest = w; }
                });
                if (nearest) {
                    writeToConsole(`LOCK TARGET: ${nearest.config.label.toUpperCase()}\nDISTANCE: ${(minDist * 0.001).toFixed(4)} LY`);
                }
            } else {
                writeToConsole("SCAN FAILED: OBJECTS OFFLINE.");
            }
            break;
            
        case 'systems':
            writeToConsole("SHIP SYSTEMS REPORT:\n- HULL HULL CAP: NOMINAL\n- SENSORS SCAN: ONLINE\n- THRUST ENGINES: READY\n- HYPERDRIVE FLUID: ONLINE\n- COMP NAV: OPERATIONAL");
            break;
            
        case 'ap':
        case 'autopilot':
            if (arg === 'off' || arg === 'cancel') {
                if (autopilotActive) {
                    disableAutopilot();
                    writeToConsole("AUTOPILOT TERMINATED. MANUAL LOCK ACTIVE.");
                } else {
                    writeToConsole("AUTOPILOT MODULE IS ALREADY OFFLINE.");
                }
            } else if (arg) {
                const targetWH = wormholes.find(w => w.type === arg || w.config.label.toLowerCase().includes(arg));
                if (targetWH) {
                    setAutopilotTarget(targetWH);
                    enableAutopilot();
                    writeToConsole(`COURSE COMPUTED. LOCK TARGET: ${targetWH.config.label.toUpperCase()}.\nTHRUST ENGAGED.`);
                    showNavAlert('AUTOPILOT ACTIVE', `NAVIGATING TO ${targetWH.config.label.toUpperCase()}`);
                } else {
                    writeToConsole(`TARGET NOT RESOLVED: "${arg}"`);
                }
            } else {
                writeToConsole("ERROR: TARGET REQUIRED (e.g. ap work)");
            }
            break;
            
        case 'warp':
            warpActive = !warpActive;
            writeToConsole(warpActive ? "HYPERDRIVE ACTIVE. STREAKS INITIALIZED." : "WARP DEACTIVATED. RETURN TO COGNITIVE SPACE.");
            break;

        case 'sound':
        case 'audio':
            toggleSound();
            break;
            
        case 'steer':
        case 'steering':
            toggleSteeringMode();
            break;
            
        case 'shunt':
            if (arg === 'engines' || arg === 'engine') {
                shuntPower('engines');
            } else if (arg === 'shields' || arg === 'shield') {
                shuntPower('shields');
            } else if (arg === 'systems' || arg === 'system' || arg === 'normal') {
                shuntPower('systems');
            } else {
                writeToConsole("ERROR: SHUNT TARGET REQUIRED (e.g. shunt engines, shunt shields, shunt systems)");
            }
            break;

        case 'vent':
        case 'purge':
            const coolantEl = document.getElementById('cp-coolant-val');
            if (coolantEl && (coolantEl.textContent === 'HIGH TEMP' || coolantEl.textContent === 'LEAK DETECTED' || supernovaActive)) {
                coolantEl.textContent = 'NOMINAL';
                coolantEl.className = 'pv ok';
                supernovaActive = false;
                writeToConsole("[OK] COOLANT SYSTEMS VENTED. THERMAL NOMINAL.");
                speakCoPilot("Coolant vented. Thermal systems nominal.");
            } else {
                writeToConsole("[INFO] COOLANT SYSTEMS NOMINAL. VENT NOT REQUIRED.");
            }
            break;

        case 'status':
            const posX = camera ? camera.position.x.toFixed(1) : '?';
            const posY = camera ? camera.position.y.toFixed(1) : '?';
            const posZ = camera ? camera.position.z.toFixed(1) : '?';
            let nearestName = 'NONE';
            let nearestDist = 'N/A';
            if (wormholes.length > 0) {
                let min = Infinity;
                wormholes.forEach(w => {
                    const d = camera.position.distanceTo(w.group.position);
                    if (d < min) { min = d; nearestName = w.config.label.toUpperCase(); nearestDist = min.toFixed(0) + 'u'; }
                });
            }
            const shieldStr = typeof shieldEnergy !== 'undefined' ? shieldEnergy.toFixed(1) + '%' : 'N/A';
            const reactorEl = document.getElementById('cp-reactor-val');
            const reactorStr = reactorEl ? reactorEl.textContent : 'N/A';
            writeToConsole(
                `STATUS REPORT:\nPOS: (${posX}, ${posY}, ${posZ})\nNEAREST: ${nearestName} @ ${nearestDist}\nSHIELDS: ${shieldStr}\nREACTOR: ${reactorStr}\nPOWER MODE: ${(powerMode || 'systems').toUpperCase()}\nSOUND: ${soundEnabled ? 'ON' : 'OFF'}\nAUTOPILOT: ${autopilotActive ? 'ENGAGED' : 'OFFLINE'}`
            );
            break;

        case 'logs':
            const last = consoleLogBuffer.slice(-10);
            writeToConsole('LAST ' + last.length + ' LOG ENTRIES:');
            last.forEach(l => writeToConsole(l));
            break;
            
        default:
            writeToConsole(`UNRECOGNIZED: "${cmd}". Type 'help' for options.`);
            break;
    }
}
