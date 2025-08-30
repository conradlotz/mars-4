// Enhanced mobile detection with improved heuristics
function isMobileDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Traditional UA detection
  const uaCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Enhanced detection for newer iPads and tablets that report as desktop
  const touchCheck = navigator.maxTouchPoints > 0 && window.innerWidth < 1024;
  
  // Additional mobile indicators
  const orientationCheck = 'orientation' in window;
  const smallScreenCheck = window.innerWidth <= 768;
  
  return uaCheck || touchCheck || (orientationCheck && smallScreenCheck);
}

// Advanced Game Systems
function initializeGameSystems(rover, wheels, scene) {
  const perfSettings = getPerformanceSettings();
  const gameSystem = {
    repairKits: [],
    fuelCells: [],
    collectibles: [],
    damageEffects: [],
    notifications: []
  };
  
  // Initialize Rover Health System
  if (perfSettings.enableDamageSystem) {
    rover.health = 100;
    rover.maxHealth = 100;
    rover.lastDamageTime = 0;
    
    // Add damage method
    rover.takeDamage = function(amount) {
      this.health = Math.max(0, this.health - amount);
      this.lastDamageTime = Date.now();
      
      // Visual feedback
      if (this.health < 30) {
        showNotification("⚠️ Structural damage critical!", 2000);
      }
      
      // Spark effect (simplified)
      createDamageEffect(this.position);
      
      console.log(`Rover took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
    };
    
    // Add repair method
    rover.repair = function(amount) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      showNotification("🔧 Rover repaired! +" + amount + " HP", 2000);
      console.log(`Rover repaired by ${amount}. Health: ${this.health}/${this.maxHealth}`);
    };
    
    // Create repair kits scattered around the map
    createRepairKits(gameSystem, scene);
  }
  
  // Initialize Fuel System
  if (perfSettings.enableFuelSystem) {
    rover.fuel = 1000;
    rover.maxFuel = 1000;
    rover.fuelConsumption = 0.5; // fuel per second when moving
    
    // Add fuel methods
    rover.consumeFuel = function(amount) {
      this.fuel = Math.max(0, this.fuel - amount);
      if (this.fuel < 100) {
        showNotification("⛽ Fuel running low!", 1500);
      }
    };
    
    rover.addFuel = function(amount) {
      this.fuel = Math.min(this.maxFuel, this.fuel + amount);
      showNotification("⛽ Fuel cell collected! +" + amount + " fuel", 2000);
    };
    
    // Create fuel cells
    createFuelCells(gameSystem, scene);
  }
  
  // Initialize Easter Eggs
  if (perfSettings.enableEasterEggs) {
    createEasterEggs(gameSystem, scene);
  }
  
  return gameSystem;
}

// Create repair kits scattered around the map
function createRepairKits(gameSystem, scene) {
  const repairKitCount = 15;
  
  for (let i = 0; i < repairKitCount; i++) {
    const kit = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, 
        emissive: 0x004400, 
        emissiveIntensity: 0.3 
      })
    );
    
    // Position randomly around the map
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 300;
    kit.position.x = Math.cos(angle) * distance;
    kit.position.z = Math.sin(angle) * distance;
    kit.position.y = 5; // Above ground
    
    // Add pulsing animation
    kit.userData = { 
      type: 'repairKit', 
      originalY: kit.position.y,
      animationTime: Math.random() * Math.PI * 2 
    };
    
    scene.add(kit);
    gameSystem.repairKits.push(kit);
  }
}

// Create fuel cells
function createFuelCells(gameSystem, scene) {
  const fuelCellCount = 10;
  
  for (let i = 0; i < fuelCellCount; i++) {
    const cell = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 4, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x0066ff, 
        emissive: 0x001144, 
        emissiveIntensity: 0.4 
      })
    );
    
    // Position randomly around the map
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 400;
    cell.position.x = Math.cos(angle) * distance;
    cell.position.z = Math.sin(angle) * distance;
    cell.position.y = 6;
    
    // Add rotation animation
    cell.userData = { 
      type: 'fuelCell', 
      rotationSpeed: 0.02 + Math.random() * 0.02 
    };
    
    scene.add(cell);
    gameSystem.fuelCells.push(cell);
  }
}

// Create easter eggs
function createEasterEggs(gameSystem, scene) {
  // Create the monolith
  const monolith = new THREE.Mesh(
    new THREE.BoxGeometry(2, 12, 4),
    new THREE.MeshStandardMaterial({ 
      color: 0x111111, 
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x000011,
      emissiveIntensity: 0.1
    })
  );
  
  // Position in a random distant location
  const angle = Math.random() * Math.PI * 2;
  const distance = 800 + Math.random() * 500;
  monolith.position.x = Math.cos(angle) * distance;
  monolith.position.z = Math.sin(angle) * distance;
  monolith.position.y = 6;
  
  monolith.userData = { 
    type: 'monolith', 
    discovered: false 
  };
  
  scene.add(monolith);
  gameSystem.collectibles.push(monolith);
  
  console.log(`Monolith hidden at coordinates: (${Math.round(monolith.position.x)}, ${Math.round(monolith.position.z)})`);
}

// Create damage effect
function createDamageEffect(position) {
  // Simple particle effect for damage
  const particleCount = 10;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xff6600 })
    );
    
    particle.position.copy(position);
    particle.position.add(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    ));
    
    // Add to scene temporarily
    scene.add(particle);
    particles.push(particle);
    
    // Remove after 1 second
    setTimeout(() => {
      scene.remove(particle);
    }, 1000);
  }
}

// Update game systems in the animation loop
function updateGameSystems(time, delta) {
  const perfSettings = getPerformanceSettings();
  
  if (!gameSystem || !rover) return;
  
  // Update damage system
  if (perfSettings.enableDamageSystem && rover.health !== undefined) {
    updateDamageSystem(time, delta);
  }
  
  // Update fuel system
  if (perfSettings.enableFuelSystem && rover.fuel !== undefined) {
    updateFuelSystem(time, delta);
  }
  
  // Update collectibles
  updateCollectibles(time, delta);
  
  // Update visual effects
  updateVisualEffects(time, delta);
}

// Update damage system
function updateDamageSystem(time, delta) {
  // Apply limp effect when health is low
  if (rover.health < 30 && wheels) {
    wheels.forEach(wheel => {
      if (wheel.rotation) {
        wheel.rotation.x *= 0.98; // Limp effect
      }
    });
  }
  
  // Random damage from rough terrain (very rare)
  if (isMoving && Math.random() < 0.0001) { // 0.01% chance per frame when moving
    rover.takeDamage(Math.random() * 5 + 1);
  }
}

// Update fuel system
function updateFuelSystem(time, delta) {
  // Consume fuel while moving
  if (isMoving && rover.fuel > 0) {
    rover.consumeFuel(rover.fuelConsumption * delta / 16.67); // Normalize to 60fps
  }
  
  // Prevent movement if no fuel
  if (rover.fuel <= 0 && isMoving) {
    showNotification("⛽ Out of fuel! Find fuel cells to continue.", 3000);
    // Stop movement by resetting position
    rover.position.copy(previousPosition);
    isMoving = false;
  }
}

// Update collectibles (repair kits, fuel cells, easter eggs)
function updateCollectibles(time, delta) {
  // Check repair kit pickups
  if (gameSystem.repairKits) {
    gameSystem.repairKits.forEach((kit, index) => {
      if (kit.visible && rover.position.distanceTo(kit.position) < 8) {
        kit.visible = false;
        rover.repair(25);
        // Remove from array after pickup
        setTimeout(() => {
          scene.remove(kit);
          gameSystem.repairKits.splice(index, 1);
        }, 100);
      }
      
      // Animate pulsing
      if (kit.visible && kit.userData) {
        kit.userData.animationTime += delta * 0.003;
        kit.position.y = kit.userData.originalY + Math.sin(kit.userData.animationTime) * 0.5;
      }
    });
  }
  
  // Check fuel cell pickups
  if (gameSystem.fuelCells) {
    gameSystem.fuelCells.forEach((cell, index) => {
      if (cell.visible && rover.position.distanceTo(cell.position) < 8) {
        cell.visible = false;
        rover.addFuel(200);
        // Remove from array after pickup
        setTimeout(() => {
          scene.remove(cell);
          gameSystem.fuelCells.splice(index, 1);
        }, 100);
      }
      
      // Animate rotation
      if (cell.visible && cell.userData) {
        cell.rotation.y += cell.userData.rotationSpeed;
      }
    });
  }
  
  // Check easter egg interactions
  if (gameSystem.collectibles) {
    gameSystem.collectibles.forEach((item) => {
      if (item.userData.type === 'monolith' && !item.userData.discovered) {
        if (rover.position.distanceTo(item.position) < 10) {
          item.userData.discovered = true;
          showNotification("🗿 MONOLITH DISCOVERED! You've found the ancient artifact!", 5000);
          // Play a sound effect here if audio is enabled
          console.log("🗿 MONOLITH DISCOVERED! Achievement unlocked!");
          
          // Unlock golden rover skin
          if (rover.material && rover.material.color) {
            rover.material.color.setHex(0xFFD700); // Gold color
            showNotification("🏆 Golden Rover skin unlocked!", 3000);
          }
        }
      }
    });
  }
}

// Update visual effects
function updateVisualEffects(time, delta) {
  // Update HUD with game system info
  updateGameHUD();
}

// Update HUD with game system information
function updateGameHUD() {
  if (!rover) return;
  
  // Update health display
  if (rover.health !== undefined) {
    const healthElement = document.getElementById('rover-health');
    if (healthElement) {
      healthElement.textContent = Math.round(rover.health);
      
      // Change color based on health
      if (rover.health < 30) {
        healthElement.style.color = '#ff4444';
      } else if (rover.health < 60) {
        healthElement.style.color = '#ffaa44';
      } else {
        healthElement.style.color = '#44ff44';
      }
    }
  }
  
  // Update fuel display
  if (rover.fuel !== undefined) {
    const fuelElement = document.getElementById('rover-fuel');
    if (fuelElement) {
      fuelElement.textContent = Math.round(rover.fuel);
      
      // Change color based on fuel
      if (rover.fuel < 100) {
        fuelElement.style.color = '#ff4444';
      } else if (rover.fuel < 300) {
        fuelElement.style.color = '#ffaa44';
      } else {
        fuelElement.style.color = '#44aaff';
      }
    }
  }
}

// Photo mode functionality
function togglePhotoMode() {
  const photoMode = document.getElementById('photo-mode');
  if (photoMode) {
    photoMode.remove();
    return;
  }
  
  // Create photo mode overlay
  const overlay = document.createElement('div');
  overlay.id = 'photo-mode';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: monospace;
  `;
  
  // Hide HUD
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  
  // Create photo controls
  overlay.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2>📸 PHOTO MODE</h2>
      <p>Press SPACE to capture • Press P to exit</p>
    </div>
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <button id="filter-normal" style="padding: 10px 20px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">Normal</button>
      <button id="filter-sepia" style="padding: 10px 20px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">Sepia</button>
      <button id="filter-retro" style="padding: 10px 20px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">Retro</button>
    </div>
    <canvas id="photo-canvas" style="max-width: 80%; max-height: 60%; border: 2px solid #fff;"></canvas>
  `;
  
  document.body.appendChild(overlay);
  
  // Capture current frame
  capturePhoto();
  
  // Add event listeners
  document.addEventListener('keydown', photoModeKeyHandler);
  document.getElementById('filter-normal').addEventListener('click', () => applyFilter('normal'));
  document.getElementById('filter-sepia').addEventListener('click', () => applyFilter('sepia'));
  document.getElementById('filter-retro').addEventListener('click', () => applyFilter('retro'));
}

// Photo mode key handler
function photoModeKeyHandler(event) {
  if (event.key.toLowerCase() === 'p') {
    exitPhotoMode();
  } else if (event.key === ' ') {
    event.preventDefault();
    capturePhoto();
  }
}

// Exit photo mode
function exitPhotoMode() {
  const photoMode = document.getElementById('photo-mode');
  if (photoMode) photoMode.remove();
  
  // Show HUD
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'block';
  
  // Remove event listener
  document.removeEventListener('keydown', photoModeKeyHandler);
}

// Capture photo
function capturePhoto() {
  const canvas = document.getElementById('photo-canvas');
  if (!canvas) return;
  
  // Copy renderer canvas to photo canvas
  const ctx = canvas.getContext('2d');
  canvas.width = renderer.domElement.width;
  canvas.height = renderer.domElement.height;
  ctx.drawImage(renderer.domElement, 0, 0);
  
  // Show capture effect
  showNotification("📸 Photo captured!", 1000);
}

// Apply photo filter
function applyFilter(filterType) {
  const canvas = document.getElementById('photo-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    switch (filterType) {
      case 'sepia':
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        break;
      case 'retro':
        data[i] = Math.min(255, r * 1.2);
        data[i + 1] = Math.min(255, g * 0.8);
        data[i + 2] = Math.min(255, b * 0.6);
        break;
      case 'normal':
      default:
        // Keep original colors
        break;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Konami code activation
function activateKonamiCode() {
  showNotification("🎮 KONAMI CODE ACTIVATED! Infinite fuel for 60 seconds!", 5000);
  console.log("🎮 KONAMI CODE ACTIVATED! Infinite fuel mode!");
  
  // Store original fuel consumption
  const originalConsumption = rover.fuelConsumption;
  rover.fuelConsumption = 0;
  
  // Restore after 60 seconds
  setTimeout(() => {
    rover.fuelConsumption = originalConsumption;
    showNotification("🎮 Konami code effect expired.", 2000);
  }, 60000);
}

// Help system
function toggleHelpSystem() {
  const helpOverlay = document.getElementById('help-overlay');
  if (helpOverlay) {
    helpOverlay.remove();
    return;
  }
  
  // Create help overlay
  const overlay = document.createElement('div');
  overlay.id = 'help-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: monospace;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  const perfSettings = getPerformanceSettings();
  
  overlay.innerHTML = `
    <div style="max-width: 800px; width: 100%;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ff6b35; margin: 0 0 10px 0;">🚀 MARS ROVER SIMULATOR</h1>
        <p style="color: #888; margin: 0;">Advanced Game Features Guide</p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #00ff88; margin: 0 0 10px 0;">🎮 CONTROLS</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            <div><strong>W/A/S/D</strong> - Move rover</div>
            <div><strong>C</strong> - Toggle camera mode</div>
            <div><strong>L</strong> - Toggle day/night</div>
            <div><strong>P</strong> - Photo mode</div>
            <div><strong>H</strong> - Help (this screen)</div>
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #ff6b35; margin: 0 0 10px 0;">🔧 DAMAGE SYSTEM</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${perfSettings.enableDamageSystem ? 
              `<div>• Rover health: 100%</div>
               <div>• Collect <span style="color: #00ff00;">green repair kits</span></div>
               <div>• Health drops from rough terrain</div>
               <div>• Low health = limping movement</div>` :
              `<div style="color: #888;">Disabled on this device</div>`
            }
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #4488ff; margin: 0 0 10px 0;">⛽ FUEL SYSTEM</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${perfSettings.enableFuelSystem ? 
              `<div>• Fuel depletes while moving</div>
               <div>• Collect <span style="color: #4488ff;">blue fuel cells</span></div>
               <div>• No fuel = no movement</div>
               <div>• Konami code = infinite fuel</div>` :
              `<div style="color: #888;">Disabled on this device</div>`
            }
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #ff44aa; margin: 0 0 10px 0;">📸 PHOTO MODE</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${perfSettings.enablePhotoMode ? 
              `<div>• Press <strong>P</strong> to enter photo mode</div>
               <div>• <strong>SPACE</strong> to capture photo</div>
               <div>• Apply Instagram-style filters</div>
               <div>• <strong>P</strong> again to exit</div>` :
              `<div style="color: #888;">Disabled on this device</div>`
            }
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #ffaa44; margin: 0 0 10px 0;">🎨 CUSTOMIZATION</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${perfSettings.enableCustomization ? 
              `<div>• Color buttons in HUD</div>
               <div>• Click to change rover color</div>
               <div>• Find monolith for gold skin</div>
               <div>• Express your style!</div>` :
              `<div style="color: #888;">Disabled on this device</div>`
            }
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
          <h3 style="color: #aa44ff; margin: 0 0 10px 0;">🗿 EASTER EGGS</h3>
          <div style="font-size: 14px; line-height: 1.5;">
            ${perfSettings.enableEasterEggs ? 
              `<div>• Find the hidden monolith</div>
               <div>• Konami code: ↑↑↓↓←→←→BA</div>
               <div>• Unlocks golden rover skin</div>
               <div>• Infinite fuel for 60 seconds</div>` :
              `<div style="color: #888;">Disabled on this device</div>`
            }
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(255, 107, 53, 0.1); border-radius: 8px;">
        <h3 style="color: #ff6b35; margin: 0 0 10px 0;">🎯 MISSION OBJECTIVES</h3>
        <div style="font-size: 14px; line-height: 1.5;">
          <div>• Explore the Martian landscape</div>
          <div>• Collect samples and resources</div>
          <div>• Maintain your rover's health and fuel</div>
          <div>• Discover hidden secrets</div>
          <div>• Capture stunning photos of Mars</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <button onclick="document.getElementById('help-overlay').remove();" style="
          background: #ff6b35; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          font-size: 16px; 
          border-radius: 6px; 
          cursor: pointer;
          font-family: monospace;
          font-weight: bold;
        ">🚀 START EXPLORING</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add click to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// Welcome message for new game features
function showWelcomeMessage() {
  const perfSettings = getPerformanceSettings();
  
  // Count enabled features
  const enabledFeatures = [
    perfSettings.enableDamageSystem,
    perfSettings.enableFuelSystem,
    perfSettings.enablePhotoMode,
    perfSettings.enableEasterEggs,
    perfSettings.enableCustomization
  ].filter(Boolean).length;
  
  if (enabledFeatures > 0) {
    const message = `
      🚀 Welcome to Mars Rover Simulator!
      
      🎮 ${enabledFeatures} game features enabled
      ${perfSettings.enableDamageSystem ? '🔧 Damage & Repair System' : ''}
      ${perfSettings.enableFuelSystem ? '⛽ Fuel Management' : ''}
      ${perfSettings.enablePhotoMode ? '📸 Photo Mode (Press P)' : ''}
      ${perfSettings.enableEasterEggs ? '🗿 Hidden Easter Eggs' : ''}
      ${perfSettings.enableCustomization ? '🎨 Rover Customization' : ''}
      
      Press H for help anytime!
    `;
    
    showNotification(message, 8000);
  }
}

// Performance-aware initialization with mobile detection
function getPerformanceSettings() {
  const isMobile = isMobileDevice();
  
  // Samsung device detection and GPU identification
  function detectDeviceInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isSamsung = /samsung|sm-|galaxy/i.test(userAgent);
    const isPixel = /pixel/i.test(userAgent);
    
    // Get WebGL renderer info for GPU detection
    let gpuRenderer = 'unknown';
    let isMaliGPU = false;
    let isAdrenoGPU = false;
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
          isMaliGPU = /mali/i.test(gpuRenderer);
          isAdrenoGPU = /adreno/i.test(gpuRenderer);
        }
      }
    } catch (e) {
      console.warn('Could not detect GPU:', e);
    }
    
    return {
      isSamsung,
      isPixel,
      gpuRenderer,
      isMaliGPU,
      isAdrenoGPU
    };
  }
  
  // Enhanced mobile device capability detection
  function getMobileDeviceCapabilities() {
    const deviceMemory = navigator.deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const screenSize = Math.max(window.screen.width, window.screen.height);
    const pixelRatio = window.devicePixelRatio || 1;
    const deviceInfo = detectDeviceInfo();
    
    // Calculate mobile device tier
    let mobileScore = 0;
    if (deviceMemory >= 8) mobileScore += 30;
    else if (deviceMemory >= 6) mobileScore += 20;
    else if (deviceMemory >= 4) mobileScore += 10;
    
    if (hardwareConcurrency >= 8) mobileScore += 25;
    else if (hardwareConcurrency >= 6) mobileScore += 15;
    else if (hardwareConcurrency >= 4) mobileScore += 10;
    
    if (screenSize >= 1920) mobileScore += 20;
    else if (screenSize >= 1440) mobileScore += 15;
    else if (screenSize >= 1080) mobileScore += 10;
    
    if (pixelRatio >= 3) mobileScore += 10;
    else if (pixelRatio >= 2) mobileScore += 5;
    
    // Classify mobile device tier
    let tier = 'low';
    if (mobileScore >= 60) tier = 'high';
    else if (mobileScore >= 30) tier = 'medium';
    
    return {
      tier,
      deviceInfo
    };
  }
  
  // Mobile-specific settings with device tier adaptation
  if (isMobile) {
    const { tier: mobileTier, deviceInfo } = getMobileDeviceCapabilities();
    
    // Samsung-specific rendering adjustments - reduced to prevent overexposure
    const samsungAdjustments = deviceInfo.isSamsung ? {
      // Samsung devices need slightly brighter lighting and different gamma
      gammaCorrection: 2.0,  // Slightly lower gamma for brighter appearance
      ambientLightBoost: 1.2,  // Moderate increase in ambient lighting
      materialBrightness: 1.1,  // Slight boost in material brightness
      fogDensityReduction: 0.85,  // Slight reduction in fog density
      samsungOptimized: true
    } : {
      gammaCorrection: 2.2,
      ambientLightBoost: 1.0,
      materialBrightness: 1.0,
      fogDensityReduction: 1.0,
      samsungOptimized: false
    };
    
    // Base settings for device tier
    let baseSettings = {};
    
    // High-end mobile devices (flagship phones/tablets) - Emergency performance mode
    if (mobileTier === 'high') {
      baseSettings = {
        textureSize: 512, // Drastically reduced for emergency performance
        particleCount: 25, // Minimal particles
        renderDistance: 1500, // Much shorter render distance
        shadowQuality: 'none',
        antialiasing: false, // Disabled for performance
        skyboxResolution: 512, // Much smaller skybox
        detailLevel: 'low',
        fogDistance: 1200,
        graphicsQuality: 'low',
        isMobile: true,
        mobileTier: 'high',
        disableRockets: true, // Disable all heavy effects
        disableMeteors: true,
        disableAtmosphericEffects: true,
        terrainSegments: 48, // Minimal terrain
        frameThrottle: 6, // Aggressive frame throttling
        enableCulling: true,
        maxLights: 2, // Minimal lights
        // Game Features - enabled for high-end mobile
        enableDamageSystem: true,
        enableFuelSystem: true,
        enablePhotoMode: true,
        enableEasterEggs: true,
        enableCustomization: true,
        enableWeatherForecast: false // Disable weather forecast on mobile for performance
      };
    }
    // Mid-range mobile devices - Emergency performance mode
    else if (mobileTier === 'medium') {
      baseSettings = {
        textureSize: 256, // Extremely reduced
        particleCount: 10, // Almost no particles
        renderDistance: 1200,
        shadowQuality: 'none',
        antialiasing: false,
        skyboxResolution: 256, // Tiny skybox
        detailLevel: 'low',
        fogDistance: 1000,
        graphicsQuality: 'low',
        isMobile: true,
        mobileTier: 'medium',
        disableRockets: true, // Disable all effects for performance
        disableMeteors: true,
        disableAtmosphericEffects: true,
        terrainSegments: 32, // Minimal terrain
        frameThrottle: 8, // Very aggressive throttling
        enableCulling: true,
        maxLights: 1, // Single light only
        // Game Features - reduced for medium-end mobile
        enableDamageSystem: true,
        enableFuelSystem: true,
        enablePhotoMode: true,
        enableEasterEggs: false,
        enableCustomization: true,
        enableWeatherForecast: false
      };
    }
    // Low-end mobile devices (budget phones) - Ultra minimal mode
    else {
      baseSettings = {
        textureSize: 128, // Ultra minimal textures
        particleCount: 0, // No particles at all
        renderDistance: 800, // Very short render distance
        shadowQuality: 'none',
        antialiasing: false,
        skyboxResolution: 128, // Minimal skybox
        detailLevel: 'low',
        fogDistance: 600,
        graphicsQuality: 'low',
        isMobile: true,
        mobileTier: 'low',
        disableRockets: true,
        disableMeteors: true,
        disableAtmosphericEffects: true,
        terrainSegments: 16, // Ultra minimal terrain
        frameThrottle: 12, // Skip most frames
        enableCulling: true,
        maxLights: 1, // Single light only
        // Game Features - minimal for low-end mobile
        enableDamageSystem: false,
        enableFuelSystem: false,
        enablePhotoMode: true,
        enableEasterEggs: false,
        enableCustomization: false,
        enableWeatherForecast: false
      };
    }
    
    // Apply Samsung-specific adjustments
    return {
      ...baseSettings,
      ...samsungAdjustments,
      deviceInfo
    };
  }
  
  // Desktop settings - capped to prevent GPU crashes
  return window.GAME_PERFORMANCE_SETTINGS || {
    textureSize: 2048, // Cap at 2048 for safety
    particleCount: 500,
    renderDistance: 5000,
    shadowQuality: 'low',
    antialiasing: true,
    skyboxResolution: 4096, // Cap at 4096 for safety
    detailLevel: 'normal',
    fogDistance: 4000,
    graphicsQuality: 'medium',
    isMobile: false,
    disableRockets: false,
    disableMeteors: false,
    disableAtmosphericEffects: false,
    terrainSegments: 128,
    frameThrottle: 2,
    enableCulling: false,
    maxLights: 8,
    // Game Features
    enableDamageSystem: true,
    enableFuelSystem: true,
    enablePhotoMode: true,
    enableEasterEggs: true,
    enableCustomization: true,
    enableWeatherForecast: true
  };
}

// Global renderer check to prevent multiple contexts
if (window.gameRenderer) {
  console.warn('Disposing existing renderer to prevent multiple WebGL contexts');
  window.gameRenderer.dispose();
  if (window.gameRenderer.domElement && window.gameRenderer.domElement.parentNode) {
    window.gameRenderer.domElement.parentNode.removeChild(window.gameRenderer.domElement);
  }
}

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 10, 20);

// Performance-optimized renderer with adaptive settings - MOBILE EMERGENCY MODE
const perfSettings = getPerformanceSettings();
const renderer = new THREE.WebGLRenderer({
  antialias: false, // Force disabled on ALL devices for performance
  powerPreference: 'low-power', // Force low power on ALL devices
  precision: 'lowp', // Force lowest precision on ALL devices
  alpha: false,
  stencil: false,
  depth: true,
  logarithmicDepthBuffer: false,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
  premultipliedAlpha: false // Reduce GPU load
});

// Store renderer globally to prevent duplicates
window.gameRenderer = renderer;
renderer.setSize(window.innerWidth, window.innerHeight);

// Register renderer with context manager for mobile safety (guard against TDZ)
if (window.webglContextManager && typeof window.webglContextManager.register === 'function') {
  window.webglContextManager.register(renderer);
}

// Adaptive pixel ratio for better visual quality - capped at 1 for mobile emergency performance
const pixelRatio = perfSettings.isMobile ? 1 : // Force pixelRatio to 1 on mobile
                   Math.min(window.devicePixelRatio, perfSettings.graphicsQuality === 'high' ? 2 : 1);
renderer.setPixelRatio(pixelRatio);

  // Mobile-specific renderer optimizations
if (perfSettings.isMobile) {
  renderer.shadowMap.enabled = false;
  
  // Samsung-specific rendering adjustments - reduced exposure to prevent overexposure
  if (perfSettings.samsungOptimized) {
    // Samsung devices need different color encoding and gamma
    renderer.outputEncoding = THREE.LinearEncoding;  // Better for Samsung displays
    renderer.gammaFactor = perfSettings.gammaCorrection;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;  // Slightly brighter exposure for Samsung
    
    console.log('Samsung device detected - applying display optimizations:');
    console.log('- GPU:', perfSettings.deviceInfo.gpuRenderer);
    console.log('- Gamma correction:', perfSettings.gammaCorrection);
    console.log('- Ambient light boost:', perfSettings.ambientLightBoost);
    console.log('- Material brightness:', perfSettings.materialBrightness);
    console.log('- Fog density reduction:', perfSettings.fogDensityReduction);
  } else {
    // Standard mobile encoding
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.gammaFactor = perfSettings.gammaCorrection;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    console.log('Non-Samsung mobile device detected - using standard settings:');
    console.log('- GPU:', perfSettings.deviceInfo.gpuRenderer);
    console.log('- Mobile tier:', perfSettings.mobileTier);
    console.log('- Gamma correction:', perfSettings.gammaCorrection);
  }
  
  // Disable shadows entirely on mobile for performance
  renderer.shadowMap.enabled = false;
  
  // Add WebGL context loss handling for mobile stability
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('WebGL context lost - pausing animation');
    // Stop animation loop
    cancelAnimationFrame(animationId);
  }, false);

  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored - resuming animation');
    // Restart animation with reduced settings
    animate(performance.now());
  }, false);
  
  // Force garbage collection more frequently on mobile
  if (perfSettings.isMobile) {
    setInterval(() => {
      if (window.gc) {
        window.gc();
      }
    }, 5000); // More frequent GC - every 5 seconds
  }
}

// Add comprehensive cleanup to prevent context leaks
const cleanup = () => {
  console.log('Cleaning up WebGL contexts and stopping animation');
  
  // Stop animation loop
  window.gameAnimationRunning = false;
  if (window.gameAnimationId) {
    cancelAnimationFrame(window.gameAnimationId);
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  // Dispose all WebGL contexts
  webglContextManager.disposeAll();
  
  // Dispose renderer and its context
  if (window.gameRenderer) {
    window.gameRenderer.dispose();
    window.gameRenderer.forceContextLoss();
    window.gameRenderer = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  
  // Clear scene
  if (scene) {
    scene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (child.material.normalMap) child.material.normalMap.dispose();
        if (child.material.roughnessMap) child.material.roughnessMap.dispose();
        child.material.dispose();
      }
    });
  }
};

// Multiple cleanup event listeners
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);
window.addEventListener('unload', cleanup);

// Cleanup on visibility change (when tab becomes hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden - pausing animation to save resources');
    window.gameAnimationRunning = false;
  } else {
    console.log('Page visible - resuming animation');
    if (!window.gameAnimationRunning) {
      window.gameAnimationRunning = true;
      animate(performance.now());
    }
  }
});
document.body.appendChild(renderer.domElement);

// Prepare the night skybox (starry sky) for the day/night system
let spaceSkybox = createSpaceSkybox();

// Adaptive fog based on performance settings with Samsung adjustments
const fogColor = perfSettings.samsungOptimized ? 0xd4a574 : 0xb77c5a;  // Lighter fog for Samsung
const fogDensity = perfSettings.samsungOptimized ? perfSettings.fogDensityReduction : 1.0;
scene.fog = new THREE.Fog(fogColor, perfSettings.fogDistance * 0.2 * fogDensity, perfSettings.renderDistance);

// Endless terrain system with reduced complexity
const terrainSystem = {
  chunkSize: 200, // Size of each terrain chunk
  visibleRadius: 1, // Reduced visible radius (3x3 grid instead of 5x5)
  chunks: new Map(), // Store active chunks
  currentChunk: { x: 0, z: 0 }, // Current chunk coordinates
  lastUpdateTime: 0, // Track last update time for throttling

  // Get chunk key from coordinates
  getChunkKey: function (x, z) {
    return `${x},${z}`;
  },

  // Get chunk coordinates from world position
  getChunkCoords: function (worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
  },

  // Update visible chunks based on rover position
  update: function (roverPosition) {
    const perfSettings = getPerformanceSettings();
    
    // More aggressive throttling for mobile devices
    const throttleTime = perfSettings.isMobile ? 5000 : 1000; // 5 seconds on mobile, 1 second on desktop
    
    // Throttle updates based on time instead of frames for more consistent performance
    const now = performance.now();
    if (now - this.lastUpdateTime < throttleTime) return;

    // Skip terrain updates entirely on mobile to save performance
    if (perfSettings.isMobile) {
      this.lastUpdateTime = now;
      return;
    }

    // Get current chunk from rover position
    const newChunk = this.getChunkCoords(roverPosition.x, roverPosition.z);

    // If rover moved to a new chunk, update visible chunks
    if (newChunk.x !== this.currentChunk.x || newChunk.z !== this.currentChunk.z) {
      this.currentChunk = newChunk;
      this.lastUpdateTime = now;
    }
  },
};

// Create and add the realistic Mars terrain
const marsSurface = createRealisticMarsTerrain();
scene.add(marsSurface);

// Improved Rover Model
function createRealisticRover() {
  // Create a group to hold all rover parts
  const roverGroup = new THREE.Group();
  
  // Get performance settings to adjust materials for mobile
  const perfSettings = getPerformanceSettings();

  // Main chassis - lower platform
  const chassisGeometry = new THREE.BoxGeometry(2.4, 0.2, 3.2); // Increased size for better visibility
  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: perfSettings.isMobile ? 0xcccccc : 0x888888, // Brighter on mobile
    roughness: 0.7,
    metalness: 0.3,
    emissive: perfSettings.isMobile ? 0x222222 : 0x000000, // Self-illuminating on mobile
    emissiveIntensity: perfSettings.isMobile ? 0.2 : 0
  });
  const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
  chassis.position.y = 0.6;
  chassis.castShadow = true;
  roverGroup.add(chassis);

  // Main body - central electronics box
  const bodyGeometry = new THREE.BoxGeometry(1.8, 0.6, 2.2);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: perfSettings.isMobile ? 0xffffff : 0xdddddd, // Brighter white on mobile
    roughness: 0.5,
    metalness: 0.5,
    emissive: perfSettings.isMobile ? 0x333333 : 0x000000, // Strong self-illumination on mobile
    emissiveIntensity: perfSettings.isMobile ? 0.3 : 0
  });
  
  // Mark this as the main body for color customization
  bodyMaterial.userData = { isBody: true };
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1.0;
  body.castShadow = true;
  roverGroup.add(body);

  // RTG power source (radioisotope thermoelectric generator)
  const rtgGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
  const rtgMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.8
  });
  const rtg = new THREE.Mesh(rtgGeometry, rtgMaterial);
  rtg.position.set(-0.8, 1.0, -1.2);
  rtg.rotation.x = Math.PI / 2;
  rtg.castShadow = true;
  roverGroup.add(rtg);

  // Heat radiators
  const radiatorGeometry = new THREE.BoxGeometry(1.0, 0.05, 0.6);
  const radiatorMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.2,
    metalness: 0.9
  });

  const radiator1 = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
  radiator1.position.set(0, 1.3, -1.2);
  radiator1.castShadow = true;
  roverGroup.add(radiator1);

  const radiator2 = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
  radiator2.position.set(0, 1.3, 1.2);
  radiator2.castShadow = true;
  roverGroup.add(radiator2);

  // Camera mast
  const mastGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8);
  const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.set(0, 1.9, 0.8);
  mast.castShadow = true;
  roverGroup.add(mast);

  // Mastcam (stereo cameras)
  const cameraBoxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
  const cameraBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const cameraBox = new THREE.Mesh(cameraBoxGeometry, cameraBoxMaterial);
  cameraBox.position.y = 0.6;
  cameraBox.castShadow = true;
  mast.add(cameraBox);

  // Camera lenses
  const lensGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16);
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.1,
    metalness: 0.9
  });

  const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
  leftLens.position.set(-0.08, 0, 0.1);
  leftLens.rotation.x = Math.PI / 2;
  cameraBox.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
  rightLens.position.set(0.08, 0, 0.1);
  rightLens.rotation.x = Math.PI / 2;
  cameraBox.add(rightLens);

  // Solar panels
  const panelGeometry = new THREE.BoxGeometry(2.8, 0.05, 1.8);
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: perfSettings.isMobile ? 0x4466ff : 0x2244aa, // Brighter blue on mobile
    roughness: 0.3,
    metalness: 0.8,
    emissive: perfSettings.isMobile ? 0x001133 : 0x000000, // Blue glow on mobile
    emissiveIntensity: perfSettings.isMobile ? 0.4 : 0 // Strong blue emission for visibility
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.y = 1.5;
  panel.castShadow = true;
  roverGroup.add(panel);

  // Solar panel details - cells
  const panelDetailsGeometry = new THREE.PlaneGeometry(2.7, 1.7);
  const panelDetailsTexture = createSolarPanelTexture();
  const panelDetailsMaterial = new THREE.MeshStandardMaterial({
    map: panelDetailsTexture,
    roughness: 0.5,
    metalness: 0.6
  });

  const panelDetailsTop = new THREE.Mesh(panelDetailsGeometry, panelDetailsMaterial);
  panelDetailsTop.position.set(0, 0.03, 0);
  panelDetailsTop.rotation.x = -Math.PI / 2;
  panel.add(panelDetailsTop);

  const panelDetailsBottom = new THREE.Mesh(panelDetailsGeometry, panelDetailsMaterial);
  panelDetailsBottom.position.set(0, -0.03, 0);
  panelDetailsBottom.rotation.x = Math.PI / 2;
  panel.add(panelDetailsBottom);

  // Communications antenna
  const antennaBaseGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
  const antennaBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const antennaBase = new THREE.Mesh(antennaBaseGeometry, antennaBaseMaterial);
  antennaBase.position.set(0.7, 1.55, 0);
  roverGroup.add(antennaBase);

  const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna.position.y = 0.5;
  antennaBase.add(antenna);

  const dishGeometry = new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMaterial = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.3,
    metalness: 0.7
  });
  const dish = new THREE.Mesh(dishGeometry, dishMaterial);
  dish.position.y = 1.0;
  dish.rotation.x = Math.PI;
  antenna.add(dish);

  // Robotic arm
  const armBaseGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const armBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const armBase = new THREE.Mesh(armBaseGeometry, armBaseMaterial);
  armBase.position.set(0.9, 0.8, 0.8);
  roverGroup.add(armBase);

  const armSegment1Geometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
  const armSegment1Material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const armSegment1 = new THREE.Mesh(armSegment1Geometry, armSegment1Material);
  armSegment1.position.set(0, 0, 0.4);
  armBase.add(armSegment1);

  const armJoint1Geometry = new THREE.SphereGeometry(0.12, 16, 16);
  const armJoint1Material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const armJoint1 = new THREE.Mesh(armJoint1Geometry, armJoint1Material);
  armJoint1.position.set(0, 0, 0.8);
  armSegment1.add(armJoint1);

  const armSegment2Geometry = new THREE.BoxGeometry(0.1, 0.1, 0.6);
  const armSegment2Material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const armSegment2 = new THREE.Mesh(armSegment2Geometry, armSegment2Material);
  armSegment2.position.set(0, 0, 0.3);
  armSegment2.rotation.x = -Math.PI / 4;
  armJoint1.add(armSegment2);

  // Wheels - create 6 wheels with proper suspension mounting points
  const wheels = [];
  // Increase wheel size by making them larger
  const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 24);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
    metalness: 0.1
  });

  // Add treads to wheels
  const wheelTextureCanvas = document.createElement('canvas');
  wheelTextureCanvas.width = 64;
  wheelTextureCanvas.height = 64;
  const wheelContext = wheelTextureCanvas.getContext('2d');

  // Draw wheel treads
  wheelContext.fillStyle = '#222';
  wheelContext.fillRect(0, 0, 64, 64);

  wheelContext.fillStyle = '#444';
  for (let i = 0; i < 8; i++) {
    wheelContext.fillRect(0, i * 8, 64, 4);
  }

  const wheelTexture = new THREE.CanvasTexture(wheelTextureCanvas);
  wheelTexture.wrapS = THREE.RepeatWrapping;
  wheelTexture.wrapT = THREE.RepeatWrapping;
  wheelTexture.repeat.set(6, 1);

  const wheelMaterialWithTexture = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.1,
    map: wheelTexture
  });

  // Wheel positions - 3 on each side (adjust positions for larger wheels)
  const wheelPositions = [
    { x: -1.4, y: 0.5, z: 1.3 },  // Front left
    { x: 1.4, y: 0.5, z: 1.3 },   // Front right
    { x: -1.4, y: 0.5, z: 0 },    // Middle left
    { x: 1.4, y: 0.5, z: 0 },     // Middle right
    { x: -1.4, y: 0.5, z: -1.3 }, // Rear left
    { x: 1.4, y: 0.5, z: -1.3 }   // Rear right
  ];

  const originalWheelPositions = [];

  wheelPositions.forEach((pos, index) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterialWithTexture);
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
    wheel.castShadow = true;

    // Store original position for suspension
    originalWheelPositions.push(pos.y);

    // Create suspension arm
    const suspensionGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const suspensionMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const suspension = new THREE.Mesh(suspensionGeometry, suspensionMaterial);

    // Position suspension to connect wheel to chassis
    if (pos.x < 0) {
      // Left side
      suspension.position.x = (pos.x + chassis.position.x) / 2 + 0.1;
    } else {
      // Right side
      suspension.position.x = (pos.x + chassis.position.x) / 2 - 0.1;
    }
    suspension.position.y = pos.y + 0.1;
    suspension.position.z = pos.z;

    roverGroup.add(suspension);
    roverGroup.add(wheel);
    wheels.push(wheel);
  });

  // Add minimal rover lighting for mobile visibility (reduced for performance)
  if (perfSettings.isMobile) {
    // Only one main rover light to reduce GPU load
    const roverLight = new THREE.PointLight(0xffffff, 1.5, 25);
    roverLight.position.set(0, 2, 0);
    roverGroup.add(roverLight);
    
    console.log('Minimal mobile rover lighting added for performance');
  }

  return {
    rover: roverGroup,
    wheels,
    originalWheelPositions,
    mast,
    armBase,
    armSegment1,
    armJoint1,
    armSegment2,
    dish
  };
}

// Create a solar panel texture
function createSolarPanelTexture() {
  const solarPerfSettings = getPerformanceSettings();
  
  // MOBILE EMERGENCY: Return minimal texture to prevent WebGL context issues
  if (solarPerfSettings.isMobile) {
    const canvas = document.createElement('canvas');
    canvas.width = 16; // Minimal size
    canvas.height = 16;
    const context = canvas.getContext('2d');
    context.fillStyle = '#2244aa'; // Simple blue color
    context.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 64; // Reduced size for all devices
  canvas.height = 64;
  const context = canvas.getContext('2d');

  // Background color
  context.fillStyle = '#2244aa';
  context.fillRect(0, 0, 256, 256);

  // Draw solar cells
  context.fillStyle = '#1a3380';
  const cellSize = 32;

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      context.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }

  // Add highlights
  context.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      if ((x + y) % 2 === 0) {
        context.fillRect(x * cellSize + 4, y * cellSize + 4, cellSize - 8, cellSize - 8);
      }
    }
  }

  return new THREE.CanvasTexture(canvas);
}

const { rover, wheels, originalWheelPositions } = createRealisticRover();
// Set initial rotation to face away from the screen
rover.rotation.y = 0;
scene.add(rover);

// Add enhanced ambient lighting for mobile devices
const perfSettingsForRover = getPerformanceSettings();
if (perfSettingsForRover.isMobile) {
  // Reduce ambient light intensity to prevent GPU overload
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Reduced intensity
  scene.add(ambientLight);
  
  // Remove hemisphere light on mobile to reduce GPU load
  console.log('Mobile lighting optimized for performance');
  
  console.log('Mobile enhanced lighting added for rover visibility');
  console.log('Rover position:', rover.position);
  console.log('Rover visible:', rover.visible);
  console.log('Rover in scene:', scene.children.includes(rover));
  console.log('Camera position:', camera.position);
  console.log('Camera looking at rover area');
  
  // Ensure rover is at a visible position
  rover.position.set(0, 0, 0);
  
  // Force rover to be visible
  rover.visible = true;
  rover.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
    }
  });
  
  // Make sure camera can see rover area
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);
}

// Initialize Game Systems
const gameSystem = initializeGameSystems(rover, wheels, scene);

// Show welcome message with new features (reduced delay)
setTimeout(() => {
  showWelcomeMessage();
}, 1000);

// Dust Particle System
const createDustParticles = () => {
  const perfSettings = getPerformanceSettings();
  const particleCount = Math.min(perfSettings.particleCount || 300, 500);
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Initialize particles off-screen
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -10; // Below the surface
    positions[i * 3 + 2] = 0;
    sizes[i] = Math.random() * 0.1 + 0.05;
  }

  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xaa7755,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);

  return {
    system: particleSystem,
    update: (roverPosition, isMoving) => {
      const positions = particleSystem.geometry.attributes.position.array;

      if (isMoving) {
        for (let i = 0; i < particleCount; i++) {
          // Only update particles that are below the surface or have fallen too far
          if (positions[i * 3 + 1] < 0.1 || positions[i * 3 + 1] > 3) {
            // Create new particles behind the rover
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2;

            positions[i * 3] = roverPosition.x + Math.cos(angle) * radius;
            positions[i * 3 + 1] = 0.1 + Math.random() * 0.2; // Just above the surface
            positions[i * 3 + 2] = roverPosition.z + Math.sin(angle) * radius + 2; // Behind the rover
          } else {
            // Move existing particles
            positions[i * 3] += (Math.random() - 0.5) * 0.05;
            positions[i * 3 + 1] += 0.01; // Float upward
            positions[i * 3 + 2] += (Math.random() - 0.5) * 0.05;
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }
    }
  };
};

const dustParticles = createDustParticles();

// Enhanced Lighting for Mars - update to match the reference image with Samsung adjustments
// Ambient light (stronger reddish to simulate Mars atmosphere) with Samsung brightness boost
const ambientIntensity = perfSettings.samsungOptimized ? 0.6 * perfSettings.ambientLightBoost : 0.6;
const ambientColor = perfSettings.samsungOptimized ? 0xff9977 : 0xff8866;  // Slightly warmer for Samsung
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
scene.add(ambientLight);

// Directional light (sun) - make it more orange/red like in the image with Samsung adjustments
const sunIntensity = perfSettings.samsungOptimized ? 1.0 * perfSettings.materialBrightness : 1.0;
const sunColor = perfSettings.samsungOptimized ? 0xff9955 : 0xff7744;  // Slightly warmer for Samsung
const sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
sunLight.position.set(-50, 30, 50); // Position the sun lower on the horizon
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

// Add a subtle hemisphere light to simulate light bouncing off the surface with Samsung adjustments
const hemisphereIntensity = perfSettings.samsungOptimized ? 0.4 * perfSettings.ambientLightBoost : 0.4;
const hemisphereSkyColor = perfSettings.samsungOptimized ? 0xff7744 : 0xff6633;
const hemisphereGroundColor = perfSettings.samsungOptimized ? 0xbb5511 : 0xaa4400;
const hemisphereLight = new THREE.HemisphereLight(hemisphereSkyColor, hemisphereGroundColor, hemisphereIntensity);
scene.add(hemisphereLight);

// Orbit Controls - Make globally accessible for mobile controls
window.controls = new THREE.OrbitControls(camera, renderer.domElement);
const controls = window.controls;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below the ground
controls.enabled = false; // Disable orbit controls since we're starting in third-person mode

// Movement Logic - Make keys globally accessible for mobile controls
window.keys = { w: false, a: false, s: false, d: false };
const keys = window.keys; // Keep local reference for backward compatibility
const speed = 0.2;
const rotationSpeed = 0.03;
let isMoving = false;
let currentSpeed = 0; // Track the current speed of the rover

// Distance tracking variables
let distanceTraveled = 0;
let lastUpdateTime = 0;
const DISTANCE_SCALE_FACTOR = 50; // Increased scale factor to make distance more visible

// Centralized event listener management to prevent duplicates
if (!window.gameEventListeners) {
  window.gameEventListeners = {
    listeners: new Map(),
    
    add: function(target, event, handler, options = {}) {
      const key = `${target.constructor.name}-${event}`;
      
      // Remove existing listener if it exists
      if (this.listeners.has(key)) {
        const oldHandler = this.listeners.get(key);
        target.removeEventListener(event, oldHandler, options);
      }
      
      // Add new listener
      target.addEventListener(event, handler, options);
      this.listeners.set(key, handler);
    },
    
    remove: function(target, event, options = {}) {
      const key = `${target.constructor.name}-${event}`;
      if (this.listeners.has(key)) {
        const handler = this.listeners.get(key);
        target.removeEventListener(event, handler, options);
        this.listeners.delete(key);
      }
    },
    
    cleanup: function() {
      this.listeners.clear();
    }
  };
}

// Konami code sequence
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konamiIndex = 0;

// Combined keydown handler to prevent duplicate listeners
const keydownHandler = (event) => {
  keys[event.key.toLowerCase()] = true;
  
  // Camera toggle functionality
  if (event.key.toLowerCase() === 'c') {
    toggleCameraMode();
    
    // Update HUD when camera mode changes
    const hud = document.getElementById('cameraHUD');
    if (hud) {
      switch (cameraMode) {
        case 'orbit':
          hud.innerHTML = 'Camera: Orbit Mode (Press C to change)';
          break;
        case 'thirdPerson':
          hud.innerHTML = 'Camera: Third Person Mode (Press C to change)';
          break;
        case 'firstPerson':
          hud.innerHTML = 'Camera: First Person Mode (Press C to change)';
          break;
      }
    }
  }
  
  // Day/night cycle toggle functionality
  if (event.key.toLowerCase() === 'l') {
    if (typeof toggleDayNight === 'function') {
      toggleDayNight();
    }
  }
  
  // Photo mode toggle
  if (event.key.toLowerCase() === 'p') {
    const perfSettings = getPerformanceSettings();
    if (perfSettings.enablePhotoMode) {
      togglePhotoMode();
    }
  }
  
  // Help system toggle
  if (event.key.toLowerCase() === 'h') {
    toggleHelpSystem();
  }
  
  // Konami code easter egg
  if (getPerformanceSettings().enableEasterEggs) {
    if (event.code === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        // Konami code completed!
        activateKonamiCode();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0; // Reset on wrong key
    }
  }
};

const keyupHandler = (event) => {
  keys[event.key.toLowerCase()] = false;
};

// Add event listeners using the centralized system
window.gameEventListeners.add(window, 'keydown', keydownHandler);
window.gameEventListeners.add(window, 'keyup', keyupHandler);

// Add camera modes and third-person view
const cameraOffset = new THREE.Vector3(0, 7, 15); // Positive Z to position behind the rover

// Change default camera mode to thirdPerson - Make globally accessible for mobile controls
window.cameraMode = 'thirdPerson'; // 'orbit', 'thirdPerson', 'firstPerson'
let cameraMode = window.cameraMode;

// Function to toggle between camera modes - Make globally accessible for mobile controls
window.toggleCameraMode = function toggleCameraMode() {
  switch (cameraMode) {
    case 'orbit':
      cameraMode = 'thirdPerson';
      window.cameraMode = cameraMode;
      controls.enabled = false; // Disable orbit controls in third-person mode
      console.log('Camera Mode: Third Person');
      break;
    case 'thirdPerson':
      cameraMode = 'firstPerson';
      window.cameraMode = cameraMode;
      controls.enabled = false; // Disable orbit controls in first-person mode
      console.log('Camera Mode: First Person');
      break;
    case 'firstPerson':
      cameraMode = 'orbit';
      window.cameraMode = cameraMode;
      controls.enabled = true; // Enable orbit controls in orbit mode
      console.log('Camera Mode: Orbit');
      break;
  }
};

// Camera toggle is now handled in the main keydown handler to prevent duplicate listeners

// Add a variable to track the rover's yaw rotation separately - Make globally accessible for mobile controls
window.roverYaw = 0;
let roverYaw = window.roverYaw;

// Add a frame counter for performance optimization
let frameCount = 0;
let lastTime = 0;
let animationId = null; // Track animation frame ID for context loss handling

// Emergency performance mode for mobile
let emergencyPerformanceMode = false;

// Global WebGL context manager to prevent context overflow
const webglContextManager = {
  contexts: new Set(),
  maxContexts: 2, // Very conservative limit for mobile
  
  register: function(renderer) {
    this.contexts.add(renderer);
    if (this.contexts.size > this.maxContexts) {
      console.warn('Too many WebGL contexts, disposing oldest');
      const oldest = this.contexts.values().next().value;
      this.dispose(oldest);
    }
  },
  
  dispose: function(renderer) {
    if (renderer && typeof renderer.dispose === 'function') {
      renderer.dispose();
      this.contexts.delete(renderer);
    }
  },
  
  disposeAll: function() {
    this.contexts.forEach(renderer => this.dispose(renderer));
    this.contexts.clear();
  }
};
// Expose context manager globally for safe early access
window.webglContextManager = webglContextManager;
const FRAME_THROTTLE = 3; // Only perform heavy operations every N frames

// Mobile performance monitoring
const mobilePerformanceMonitor = {
  frameRates: [],
  lastFrameTime: 0,
  targetFPS: 30, // Target 30 FPS on mobile
  frameDropCount: 0,
  
  update: function(currentTime) {
    if (this.lastFrameTime > 0) {
      const frameDelta = currentTime - this.lastFrameTime;
      const fps = 1000 / frameDelta;
      
      this.frameRates.push(fps);
      if (this.frameRates.length > 30) {
        this.frameRates.shift();
      }
      
      // Check if we're dropping frames
      if (fps < this.targetFPS * 0.8) {
        this.frameDropCount++;
      } else {
        this.frameDropCount = Math.max(0, this.frameDropCount - 1);
      }
    }
    
    this.lastFrameTime = currentTime;
  },
  
  getAverageFPS: function() {
    if (this.frameRates.length === 0) return 0;
    return this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length;
  },
  
  isPerformancePoor: function() {
    return this.frameDropCount > 10;
  }
};

// Add previousPosition variable for collision detection
let previousPosition = new THREE.Vector3(0, 0, 0);

// Add these variables at the top level of your script
let isTransitioning = false;
let transitionStartTime = 0;
let transitionDuration = 10000; // 10 seconds in milliseconds
let transitionStartState = 'day'; // or 'night'

// Add a new state variable for realistic mode
let isRealisticMode = true; // Default to realistic mode

// Add a function to toggle between stylized and realistic mode
function toggleRealisticMode() {
  isRealisticMode = !isRealisticMode;
  console.log(`Realistic mode: ${isRealisticMode ? 'ON' : 'OFF'}`);
  updateSkyAppearance();
}

// Meteor System - Create shooting stars in the night sky
class MeteorSystem {
  constructor(skyRadius = 5000, count = null) {
    const perfSettings = getPerformanceSettings();
    const adaptiveCount = count || Math.floor((perfSettings.particleCount || 300) / 8); // More meteors for better effect
    
    this.skyRadius = skyRadius;
    this.meteors = [];
    this.meteorPool = [];
    this.maxMeteors = adaptiveCount;
    this.activeMeteors = 0;
    this.meteorProbability = perfSettings.detailLevel === 'high' ? 0.05 : 
                           perfSettings.detailLevel === 'normal' ? 0.03 : 0.02;

    // Meteor shower system
    this.meteorShowerActive = false;
    this.meteorShowerDuration = 0;
    this.meteorShowerMaxDuration = 30; // 30 seconds
    this.meteorShowerCooldown = 0;
    this.meteorShowerMaxCooldown = 120; // 2 minutes between showers
    this.meteorShowerIntensity = 1.0;
    this.lastMeteorShowerTime = 0;

    // Create meteor textures
    this.createMeteorTextures();

    // Create the meteor pool
    this.createMeteorPool();
  }

  createMeteorTextures() {
    // Create a glow texture for the meteor head
    const glowSize = 128;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowSize;
    glowCanvas.height = glowSize;
    const glowContext = glowCanvas.getContext('2d');

    // Create radial gradient for glow
    const gradient = glowContext.createRadialGradient(
      glowSize / 2, glowSize / 2, 0,
      glowSize / 2, glowSize / 2, glowSize / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 240, 220, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 220, 200, 0.5)');
    gradient.addColorStop(0.8, 'rgba(255, 180, 150, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 120, 100, 0.0)');

    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, glowSize, glowSize);

    this.glowTexture = new THREE.CanvasTexture(glowCanvas);

    // Create a fireball texture for special meteors
    const fireballSize = 128;
    const fireballCanvas = document.createElement('canvas');
    fireballCanvas.width = fireballSize;
    fireballCanvas.height = fireballSize;
    const fireballContext = fireballCanvas.getContext('2d');

    // Create fireball gradient
    const fireballGradient = fireballContext.createRadialGradient(
      fireballSize / 2, fireballSize / 2, 0,
      fireballSize / 2, fireballSize / 2, fireballSize / 2
    );
    fireballGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    fireballGradient.addColorStop(0.1, 'rgba(255, 255, 200, 0.9)');
    fireballGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
    fireballGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
    fireballGradient.addColorStop(0.9, 'rgba(255, 50, 0, 0.2)');
    fireballGradient.addColorStop(1, 'rgba(255, 0, 0, 0.0)');

    fireballContext.fillStyle = fireballGradient;
    fireballContext.fillRect(0, 0, fireballSize, fireballSize);

    this.fireballTexture = new THREE.CanvasTexture(fireballCanvas);

    // Create a spark texture for trail effects
    const sparkSize = 32;
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = sparkSize;
    sparkCanvas.height = sparkSize;
    const sparkContext = sparkCanvas.getContext('2d');

    // Create spark gradient
    const sparkGradient = sparkContext.createRadialGradient(
      sparkSize / 2, sparkSize / 2, 0,
      sparkSize / 2, sparkSize / 2, sparkSize / 2
    );
    sparkGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    sparkGradient.addColorStop(0.3, 'rgba(255, 220, 150, 0.6)');
    sparkGradient.addColorStop(0.7, 'rgba(255, 180, 100, 0.3)');
    sparkGradient.addColorStop(1, 'rgba(255, 150, 50, 0.0)');

    sparkContext.fillStyle = sparkGradient;
    sparkContext.fillRect(0, 0, sparkSize, sparkSize);

    this.sparkTexture = new THREE.CanvasTexture(sparkCanvas);
  }

  createMeteorPool() {
    // Create a pool of meteors to reuse
    for (let i = 0; i < this.maxMeteors; i++) {
      // Create meteor trail geometry - a line with trail
      const meteorGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(20 * 3); // 20 points for the trail

      // Initialize all positions to zero
      for (let j = 0; j < positions.length; j++) {
        positions[j] = 0;
      }

      meteorGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Create meteor trail material with glow effect
      const meteorMaterial = new THREE.LineBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 2 // Note: linewidth may not work in all browsers
      });

      // Create the meteor trail line
      const meteorTrail = new THREE.Line(meteorGeometry, meteorMaterial);
      meteorTrail.frustumCulled = false; // Ensure it's always rendered
      meteorTrail.visible = false; // Start invisible

      // Create meteor head (glowing point)
      const headGeometry = new THREE.PlaneGeometry(20, 20);
      const headMaterial = new THREE.MeshBasicMaterial({
        map: this.glowTexture,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const meteorHead = new THREE.Mesh(headGeometry, headMaterial);
      meteorHead.frustumCulled = false;
      meteorHead.visible = false;

      // Group the trail and head together
      const meteorGroup = new THREE.Group();
      meteorGroup.add(meteorTrail);
      meteorGroup.add(meteorHead);

      // Add meteor data
      meteorGroup.userData = {
        active: false,
        speed: 0,
        direction: new THREE.Vector3(),
        positions: [],
        life: 0,
        maxLife: 0,
        size: 0,
        trail: meteorTrail,
        head: meteorHead
      };

      // Add to scene and pool
      scene.add(meteorGroup);
      this.meteorPool.push(meteorGroup);
    }
  }

  activateMeteor(meteorType = 'normal') {
    // Find an inactive meteor from the pool
    for (let i = 0; i < this.meteorPool.length; i++) {
      const meteorGroup = this.meteorPool[i];

      if (!meteorGroup.userData.active) {
        // Determine meteor properties based on type
        let speed, size, brightness, color, texture, lifespan;
        
        switch (meteorType) {
          case 'fireball':
            speed = 80 + Math.random() * 200;
            size = 3 + Math.random() * 5;
            brightness = 1.5 + Math.random() * 1.5;
            color = new THREE.Color(`hsl(${15 + Math.random() * 15}, 90%, 80%)`); // Red-orange
            texture = this.fireballTexture;
            lifespan = 2 + Math.random() * 3;
            break;
          case 'bright':
            speed = 100 + Math.random() * 300;
            size = 2 + Math.random() * 3;
            brightness = 2 + Math.random() * 2;
            color = new THREE.Color(`hsl(${200 + Math.random() * 60}, 70%, 85%)`); // Blue-white
            texture = this.glowTexture;
            lifespan = 1 + Math.random() * 2;
            break;
          case 'shower':
            speed = 60 + Math.random() * 150;
            size = 1 + Math.random() * 2;
            brightness = 1 + Math.random() * 1;
            color = new THREE.Color(`hsl(${30 + Math.random() * 30}, 80%, 75%)`); // Yellow-orange
            texture = this.sparkTexture;
            lifespan = 1 + Math.random() * 1.5;
            break;
          default: // normal
            speed = 50 + Math.random() * 200;
            size = 1 + Math.random() * 2.5;
            brightness = 0.8 + Math.random() * 1.2;
            color = new THREE.Color(`hsl(${30 + Math.random() * 20}, 80%, 70%)`); // Orange-yellow
            texture = this.glowTexture;
            lifespan = 1.5 + Math.random() * 2;
        }

        // Randomize meteor trajectory
        let phi, theta;
        if (this.meteorShowerActive && meteorType === 'shower') {
          // During shower, meteors come from specific radiant point
          const radiantPhi = Math.PI * 0.75; // Northeast sky
          const radiantTheta = Math.PI * 0.3;
          phi = radiantPhi + (Math.random() - 0.5) * Math.PI * 0.3;
          theta = radiantTheta + (Math.random() - 0.5) * Math.PI * 0.2;
        } else {
          // Random positioning for normal meteors
          phi = Math.random() * Math.PI * 2;
          theta = Math.random() * Math.PI * 0.5;
        }

                  // Calculate start position on the sky dome
          const startX = this.skyRadius * Math.sin(theta) * Math.cos(phi);
          const startY = this.skyRadius * Math.cos(theta);
          const startZ = this.skyRadius * Math.sin(theta) * Math.sin(phi);

        // Calculate end position (opposite side but lower)
        const endPhi = (phi + Math.PI + (Math.random() - 0.5) * Math.PI * 0.5) % (Math.PI * 2);
        const endTheta = Math.min(Math.PI * 0.9, theta + Math.random() * Math.PI * 0.4);

        const endX = this.skyRadius * Math.sin(endTheta) * Math.cos(endPhi);
        const endY = this.skyRadius * Math.cos(endTheta);
        const endZ = this.skyRadius * Math.sin(endTheta) * Math.sin(endPhi);

        // Calculate direction vector
        const direction = new THREE.Vector3(endX - startX, endY - startY, endZ - startZ).normalize();

        // Set meteor properties
        meteorGroup.userData.active = true;
        meteorGroup.userData.speed = speed;
        meteorGroup.userData.direction = direction;
        meteorGroup.userData.positions = [];
        meteorGroup.userData.positions.push(new THREE.Vector3(startX, startY, startZ));
        meteorGroup.userData.life = 0;
        meteorGroup.userData.maxLife = lifespan;
        meteorGroup.userData.size = size;
        meteorGroup.userData.brightness = brightness;
        meteorGroup.userData.meteorType = meteorType;

        // Set meteor color and texture
        meteorGroup.userData.trail.material.color = color;
        meteorGroup.userData.head.material.map = texture;
        meteorGroup.userData.head.material.needsUpdate = true;

        // Initialize the trail with the start position
        const positions = meteorGroup.userData.trail.geometry.attributes.position.array;
        for (let j = 0; j < 20; j++) {
          positions[j * 3] = startX;
          positions[j * 3 + 1] = startY;
          positions[j * 3 + 2] = startZ;
        }
        meteorGroup.userData.trail.geometry.attributes.position.needsUpdate = true;

        // Position the head at the start
        meteorGroup.userData.head.position.set(startX, startY, startZ);

        // Scale the head based on meteor size and brightness
        const headSize = (5 + size * 8) * brightness;
        meteorGroup.userData.head.scale.set(headSize, headSize, headSize);

        // Make meteor visible
        meteorGroup.userData.trail.visible = true;
        meteorGroup.userData.head.visible = true;

        // Increase active meteor count
        this.activeMeteors++;

        // Add to active meteors list
        this.meteors.push(meteorGroup);

        return true;
      }
    }

    return false; // No inactive meteors available
  }

  update(delta) {
    // Update meteor shower system
    this.updateMeteorShower(delta);

    // Calculate current meteor probability
    let currentProbability = this.meteorProbability;
    
    if (this.meteorShowerActive) {
      // During shower, significantly increase meteor frequency
      currentProbability *= (3 + this.meteorShowerIntensity * 2);
    }

    // Try to activate a new meteor based on probability
    if (Math.random() < currentProbability && this.activeMeteors < this.maxMeteors) {
      // Determine meteor type based on current conditions
      let meteorType = 'normal';
      
      if (this.meteorShowerActive) {
        // During shower, mostly shower meteors with occasional special ones
        const rand = Math.random();
        if (rand < 0.7) {
          meteorType = 'shower';
        } else if (rand < 0.85) {
          meteorType = 'bright';
        } else {
          meteorType = 'fireball';
        }
      } else {
        // Normal time - rare special meteors
        const rand = Math.random();
        if (rand < 0.9) {
          meteorType = 'normal';
        } else if (rand < 0.97) {
          meteorType = 'bright';
        } else {
          meteorType = 'fireball';
        }
      }
      
      this.activateMeteor(meteorType);
    }

    // Update active meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteorGroup = this.meteors[i];

      if (meteorGroup.userData.active) {
        // Update life
        meteorGroup.userData.life += delta / 1000; // Convert delta to seconds

        // Check if meteor should be deactivated
        if (meteorGroup.userData.life >= meteorGroup.userData.maxLife) {
          meteorGroup.userData.active = false;
          meteorGroup.userData.trail.visible = false;
          meteorGroup.userData.head.visible = false;
          this.activeMeteors--;
          this.meteors.splice(i, 1);
          continue;
        }

        // Calculate progress (0 to 1)
        const progress = meteorGroup.userData.life / meteorGroup.userData.maxLife;

        // Calculate opacity based on life (fade in and out)
        let opacity = 1.0;
        if (progress < 0.2) {
          // Fade in
          opacity = progress / 0.2;
        } else if (progress > 0.8) {
          // Fade out
          opacity = (1 - progress) / 0.2;
        }

        meteorGroup.userData.trail.material.opacity = opacity * 0.8;
        meteorGroup.userData.head.material.opacity = opacity;

        // Calculate new position
        const lastPos = meteorGroup.userData.positions[meteorGroup.userData.positions.length - 1];
        const newPos = new THREE.Vector3(
          lastPos.x + meteorGroup.userData.direction.x * meteorGroup.userData.speed * delta / 1000,
          lastPos.y + meteorGroup.userData.direction.y * meteorGroup.userData.speed * delta / 1000,
          lastPos.z + meteorGroup.userData.direction.z * meteorGroup.userData.speed * delta / 1000
        );

        // Add new position to the trail
        meteorGroup.userData.positions.push(newPos);

        // Keep only the last 20 positions
        if (meteorGroup.userData.positions.length > 20) {
          meteorGroup.userData.positions.shift();
        }

        // Update trail geometry with trail positions
        const positions = meteorGroup.userData.trail.geometry.attributes.position.array;
        for (let j = 0; j < meteorGroup.userData.positions.length; j++) {
          const pos = meteorGroup.userData.positions[j];
          positions[j * 3] = pos.x;
          positions[j * 3 + 1] = pos.y;
          positions[j * 3 + 2] = pos.z;
        }

        meteorGroup.userData.trail.geometry.attributes.position.needsUpdate = true;

        // Update head position to the latest position
        meteorGroup.userData.head.position.copy(newPos);

        // Make the head always face the camera
        meteorGroup.userData.head.lookAt(camera.position);
      }
    }
  }

  updateMeteorShower(delta) {
    const deltaSeconds = delta / 1000;
    
    if (this.meteorShowerActive) {
      // Update shower duration
      this.meteorShowerDuration += deltaSeconds;
      
      // Calculate shower intensity (starts low, peaks in middle, ends low)
      const progress = this.meteorShowerDuration / this.meteorShowerMaxDuration;
      if (progress < 0.3) {
        this.meteorShowerIntensity = progress / 0.3; // Ramp up
      } else if (progress < 0.7) {
        this.meteorShowerIntensity = 1.0; // Peak
      } else {
        this.meteorShowerIntensity = (1.0 - progress) / 0.3; // Ramp down
      }
      
      // End shower when duration exceeded
      if (this.meteorShowerDuration >= this.meteorShowerMaxDuration) {
        this.meteorShowerActive = false;
        this.meteorShowerDuration = 0;
        this.meteorShowerCooldown = 0;
        this.meteorShowerIntensity = 0;
        
        // Show notification (if HUD system exists)
        if (window.showNotification) {
          window.showNotification('Meteor shower ended', 3000);
        }
      }
    } else {
      // Update cooldown
      this.meteorShowerCooldown += deltaSeconds;
      
      // Start new shower when cooldown finished
      if (this.meteorShowerCooldown >= this.meteorShowerMaxCooldown) {
        this.startMeteorShower();
      }
    }
  }

  startMeteorShower() {
    this.meteorShowerActive = true;
    this.meteorShowerDuration = 0;
    this.meteorShowerIntensity = 0;
    this.meteorShowerMaxDuration = 20 + Math.random() * 30; // 20-50 seconds
    this.meteorShowerMaxCooldown = 60 + Math.random() * 120; // 1-3 minutes until next shower
    
    // Show notification (if HUD system exists)
    if (window.showNotification) {
      window.showNotification('Meteor shower beginning! Look up!', 4000);
    }
  }
}

// Mars Atmospheric Effects System
class MarsAtmosphericEffects {
  constructor(scene) {
    this.scene = scene;
    this.dustDevils = [];
    this.dustDevilPool = [];
    this.maxDustDevils = 3;
    this.dustDevilSpawnRate = 0.001; // Very rare
    this.atmosphericHaze = null;
    this.lastWeatherUpdate = 0;
    this.weatherCycle = 0;
    
    this.createAtmosphericHaze();
    this.createDustDevilPool();
  }

  createAtmosphericHaze() {
    // Create dynamic atmospheric haze that changes based on weather
    const hazeGeometry = new THREE.PlaneGeometry(8000, 8000);
    const hazeMaterial = new THREE.MeshBasicMaterial({
      color: 0xd08050,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    this.atmosphericHaze = new THREE.Mesh(hazeGeometry, hazeMaterial);
    this.atmosphericHaze.rotation.x = -Math.PI / 2;
    this.atmosphericHaze.position.y = 200;
    this.atmosphericHaze.renderOrder = -1;
    this.scene.add(this.atmosphericHaze);
  }

  createDustDevilPool() {
    for (let i = 0; i < this.maxDustDevils; i++) {
      const dustDevil = this.createDustDevil();
      dustDevil.visible = false;
      dustDevil.userData = { active: false };
      this.dustDevilPool.push(dustDevil);
      this.scene.add(dustDevil);
    }
  }

  createDustDevil() {
    const dustDevilGroup = new THREE.Group();
    
    // Create spiral particle system for dust devil
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Initialize particles in a spiral pattern
      const height = (i / particleCount) * 100;
      const angle = (i / particleCount) * Math.PI * 8;
      const radius = Math.sin(height * 0.1) * 15;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Dust color - reddish brown
      colors[i * 3] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.1;
      
      sizes[i] = 2 + Math.random() * 4;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const dustParticles = new THREE.Points(geometry, material);
    dustDevilGroup.add(dustParticles);
    
    return dustDevilGroup;
  }

  spawnDustDevil() {
    // Find inactive dust devil
    for (let i = 0; i < this.dustDevilPool.length; i++) {
      const dustDevil = this.dustDevilPool[i];
      if (!dustDevil.userData.active) {
        // Spawn dust devil at random location
        const spawnRadius = 2000;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spawnRadius;
        
        dustDevil.position.x = Math.cos(angle) * distance;
        dustDevil.position.z = Math.sin(angle) * distance;
        dustDevil.position.y = 0;
        
        dustDevil.userData.active = true;
        dustDevil.userData.life = 0;
        dustDevil.userData.maxLife = 15 + Math.random() * 20; // 15-35 seconds
        dustDevil.userData.speed = 5 + Math.random() * 10; // Movement speed
        dustDevil.userData.direction = Math.random() * Math.PI * 2;
        dustDevil.userData.rotationSpeed = 0.2 + Math.random() * 0.3;
        
        dustDevil.visible = true;
        this.dustDevils.push(dustDevil);
        
        return true;
      }
    }
    return false;
  }

  update(delta, roverPosition) {
    const deltaSeconds = delta / 1000;
    
    // Update weather cycle
    this.weatherCycle += deltaSeconds * 0.1;
    
    // Update atmospheric haze based on weather
    if (this.atmosphericHaze) {
      const hazeTurbulence = Math.sin(this.weatherCycle) * 0.5 + 0.5;
      this.atmosphericHaze.material.opacity = 0.05 + hazeTurbulence * 0.1;
      this.atmosphericHaze.rotation.z += deltaSeconds * 0.01;
    }
    
    // Spawn dust devils occasionally
    if (Math.random() < this.dustDevilSpawnRate) {
      this.spawnDustDevil();
    }
    
    // Update active dust devils
    for (let i = this.dustDevils.length - 1; i >= 0; i--) {
      const dustDevil = this.dustDevils[i];
      
      if (dustDevil.userData.active) {
        dustDevil.userData.life += deltaSeconds;
        
        // Move dust devil
        dustDevil.position.x += Math.cos(dustDevil.userData.direction) * dustDevil.userData.speed * deltaSeconds;
        dustDevil.position.z += Math.sin(dustDevil.userData.direction) * dustDevil.userData.speed * deltaSeconds;
        
        // Rotate dust devil
        dustDevil.rotation.y += dustDevil.userData.rotationSpeed * deltaSeconds;
        
        // Update particle positions for spiral effect
        const particles = dustDevil.children[0];
        if (particles && particles.geometry) {
          const positions = particles.geometry.attributes.position.array;
          const time = dustDevil.userData.life;
          
          for (let j = 0; j < positions.length; j += 3) {
            const height = positions[j + 1];
            const angle = (height * 0.1) + (time * 2);
            const radius = Math.sin(height * 0.1) * (10 + Math.sin(time * 0.5) * 5);
            
            positions[j] = Math.cos(angle) * radius;
            positions[j + 2] = Math.sin(angle) * radius;
          }
          
          particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Fade out near end of life
        const lifeFactor = dustDevil.userData.life / dustDevil.userData.maxLife;
        if (lifeFactor > 0.8) {
          const fadeOpacity = (1 - lifeFactor) / 0.2;
          if (particles && particles.material) {
            particles.material.opacity = 0.6 * fadeOpacity;
          }
        }
        
        // Remove if expired
        if (dustDevil.userData.life >= dustDevil.userData.maxLife) {
          dustDevil.userData.active = false;
          dustDevil.visible = false;
          this.dustDevils.splice(i, 1);
        }
        
        // Change direction occasionally
        if (Math.random() < 0.01) {
          dustDevil.userData.direction += (Math.random() - 0.5) * 0.5;
        }
      }
    }
    
    // Position atmospheric haze around rover
    if (this.atmosphericHaze && roverPosition) {
      this.atmosphericHaze.position.x = roverPosition.x;
      this.atmosphericHaze.position.z = roverPosition.z;
    }
  }
}


// Mars Background Scene Manager
class MarsSceneManager {
  constructor(scene, terrainSize) {
    this.scene = scene;
    //this.terrainSize = terrainSize;
    //this.backgroundElements = new Map();
    this.rocketLaunchSites = [];
    this.marsBases = [];
    this.activeEvents = new Set();
    this.lastPlayerPosition = new THREE.Vector3();
    this.sceneRepeatDistance = 5000; // Distance after which scenes repeat

    // Initialize background elements
    this.initializeBackgroundScenes();
  }

  initializeBackgroundScenes() {
    // Create Mars skyscraper city
    this.createMarsBase();
    // Create rocket launch sites
    this.createLaunchSites();
    // Create SpaceX Starship display lineup
    this.createStarshipDisplay();
    
    // Initialize rocket launch timing system
    this.initializeRocketLaunchSystem();
  }

  initializeRocketLaunchSystem() {
    // Rocket launch timing variables - reduced frequency for better performance
    this.rocketLaunchInterval = 60000; // 1 minute = 60000ms
    this.lastRocketLaunch = 0;
    this.rocketLaunchActive = false; // Disabled by default - starships stay on ground
    this.maxSimultaneousRockets = 3; // Reduced for better performance
    
    // Simplified launch patterns for better performance
    this.launchPatterns = [
      { type: 'single', count: 1, delay: 0 },
      { type: 'double', count: 2, delay: 3000 },
      { type: 'triple', count: 3, delay: 2000 }
    ];
    
    // Start the rocket launch cycle
    this.startRocketLaunchCycle();
  }

  // Control methods for rocket launch system
  setRocketLaunchInterval(milliseconds) {
    this.rocketLaunchInterval = milliseconds;
  }

  enableRocketLaunches() {
    this.rocketLaunchActive = true;
    // Removed notification - starships stay on ground
  }

  disableRocketLaunches() {
    this.rocketLaunchActive = false;
    // Removed notification - starships stay on ground
  }

  triggerManualLaunch(patternType = 'random') {
    if (patternType === 'random') {
      this.triggerRocketLaunchSequence();
    } else {
      const pattern = this.launchPatterns.find(p => p.type === patternType) || this.launchPatterns[0];
      const eventType = Math.random() > 0.5 ? 'launch' : 'landing';
      
      for (let i = 0; i < pattern.count; i++) {
        setTimeout(() => {
          if (this.activeEvents.size < this.maxSimultaneousRockets) {
            this.triggerRocketEvent(eventType);
          }
        }, i * pattern.delay);
      }
    }
  }

  startRocketLaunchCycle() {
    // Schedule the first launch after 15 seconds to allow system to load
    setTimeout(() => {
      this.triggerRocketLaunchSequence();
      
      // Set up recurring launches every minute with performance check
      setInterval(() => {
        if (this.rocketLaunchActive && this.activeEvents.size < this.maxSimultaneousRockets) {
          // Only launch if system isn't overloaded
          if (performance.now() - (window.lastFrameTime || 0) < 100) {
            this.triggerRocketLaunchSequence();
          }
        }
      }, this.rocketLaunchInterval);
    }, 15000);
  }

  triggerRocketLaunchSequence() {
    // Choose a random launch pattern
    const pattern = this.launchPatterns[Math.floor(Math.random() * this.launchPatterns.length)];
    
    // Decide if this is a launch or landing sequence
    const isLaunch = Math.random() > 0.3; // 70% chance of launch, 30% chance of landing
    const eventType = isLaunch ? 'launch' : 'landing';
    
    // Launch notification removed - starships stay on ground
    // if (window.showNotification) {
    //   window.showNotification(`🚀 SpaceX ${eventType.toUpperCase()} Sequence! ${pattern.count} Starship rockets ${eventType === 'launch' ? 'launching' : 'landing'} (${pattern.type})`, 6000);
    // }
    
    // Launch rockets with delays based on pattern
    for (let i = 0; i < pattern.count; i++) {
      setTimeout(() => {
        if (this.activeEvents.size < this.maxSimultaneousRockets) {
          this.triggerRocketEvent(eventType);
        }
      }, i * pattern.delay);
    }
    
    // Schedule additional mixed launches/landings for more activity
    if (Math.random() > 0.5) {
      setTimeout(() => {
        const additionalCount = Math.floor(Math.random() * 2) + 1;
        const additionalType = eventType === 'launch' ? 'landing' : 'launch';
        
        for (let i = 0; i < additionalCount; i++) {
          setTimeout(() => {
            if (this.activeEvents.size < this.maxSimultaneousRockets) {
              this.triggerRocketEvent(additionalType);
            }
          }, i * 2000);
        }
      }, 20000); // 20 seconds after main sequence
    }
  }

  createSingleBase(x, z, type = 'metropolis') {
    const baseGroup = new THREE.Group();
    baseGroup.position.set(x, 0, z);

    // Add base structures based on type
    const structures = this.createBaseStructures(type);
    baseGroup.add(...structures);

    // Add appropriate lighting based on colony type
    let lightColor, lightIntensity;
    switch (type) {
      case 'metropolis':
        lightColor = 0x88aaff;
        lightIntensity = 1.5;
        break;
      case 'research':
        lightColor = 0xaaffaa;
        lightIntensity = 1.0;
        break;
      case 'mining':
        lightColor = 0xffaa88;
        lightIntensity = 1.2;
        break;
      case 'agricultural':
        lightColor = 0xaaffcc;
        lightIntensity = 0.8;
        break;
      case 'industrial':
        lightColor = 0xff8888;
        lightIntensity = 1.3;
        break;
      case 'outpost':
        lightColor = 0xccccff;
        lightIntensity = 0.6;
        break;
      default:
        lightColor = 0x88aaff;
        lightIntensity = 1.0;
    }

    const baseLight = new THREE.PointLight(lightColor, lightIntensity, 800);
    baseLight.position.set(0, 100, 0);
    baseGroup.add(baseLight);

    // Position on terrain
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      baseGroup.position.y = intersects[0].point.y;
    }

    return baseGroup;
  }

  createMarsBase() {
    // Clear any existing bases
    this.marsBases.forEach(base => {
      if (base && base.parent) {
        base.parent.remove(base);
      }
    });
    this.marsBases = [];

    // Create multiple diverse colonies
    const colonies = [
      { x: 1500, z: 1000, type: 'metropolis', name: 'New Olympia' },
      { x: -2000, z: 1500, type: 'research', name: 'Exploration Base Alpha' },
      { x: 2500, z: -800, type: 'mining', name: 'Mineral Extraction Complex' },
      { x: -1200, z: -2000, type: 'agricultural', name: 'Terra Verde Farms' },
      { x: 800, z: 2200, type: 'industrial', name: 'Manufacturing Hub Beta' },
      { x: 3000, z: 500, type: 'outpost', name: 'Frontier Station' }
    ];

    colonies.forEach(colony => {
      const base = this.createSingleBase(colony.x, colony.z, colony.type);
      base.userData = { name: colony.name, type: colony.type };
      this.marsBases.push(base);
      this.scene.add(base);

      // Add atmospheric effects around each colony
      this.addCityAtmosphere(base);
    });
  }

  // Add atmospheric effects around the city
  addCityAtmosphere(city) {
    const cityPosition = city.position;
    
    // Add atmospheric dome around the city
    const atmosphereGeometry = new THREE.SphereGeometry(500, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.position.copy(cityPosition);
    atmosphere.position.y += 200;
    city.add(atmosphere);

    // Add city-wide ambient lighting
    const cityAmbientLight = new THREE.AmbientLight(0x4488ff, 0.3);
    city.add(cityAmbientLight);

    // Add directional light for the city
    const cityDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    cityDirectionalLight.position.set(100, 300, 100);
    cityDirectionalLight.target.position.copy(cityPosition);
    cityDirectionalLight.castShadow = true;
    cityDirectionalLight.shadow.mapSize.width = 2048;
    cityDirectionalLight.shadow.mapSize.height = 2048;
    cityDirectionalLight.shadow.camera.near = 0.5;
    cityDirectionalLight.shadow.camera.far = 1000;
    cityDirectionalLight.shadow.camera.left = -500;
    cityDirectionalLight.shadow.camera.right = 500;
    cityDirectionalLight.shadow.camera.top = 500;
    cityDirectionalLight.shadow.camera.bottom = -500;
    city.add(cityDirectionalLight);
    city.add(cityDirectionalLight.target);

    // Add floating particles around the city
    this.addCityParticles(city);
  }

  // Add floating particles for atmospheric effect
  addCityParticles(city) {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random positions around the city
      const angle = Math.random() * Math.PI * 2;
      const radius = 200 + Math.random() * 300;
      const height = 50 + Math.random() * 400;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Soft blue/white colors
      const intensity = 0.5 + Math.random() * 0.5;
      colors[i * 3] = intensity * 0.8;     // R
      colors[i * 3 + 1] = intensity * 0.9; // G  
      colors[i * 3 + 2] = intensity;       // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 3,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    city.add(particles);

    // Animate particles
    const animateParticles = () => {
      const positions = particles.geometry.attributes.position.array;
      const time = Date.now() * 0.001;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.2;
        
        // Reset particles that drift too high
        if (positions[i * 3 + 1] > 500) {
          positions[i * 3 + 1] = 50;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      requestAnimationFrame(animateParticles);
    };

    animateParticles();
  }

  createBaseStructures(type = 'metropolis') {
    const structures = [];

    switch (type) {
      case 'metropolis':
        return this.createMetropolisStructures();
      case 'research':
        return this.createResearchStructures();
      case 'mining':
        return this.createMiningStructures();
      case 'agricultural':
        return this.createAgriculturalStructures();
      case 'industrial':
        return this.createIndustrialStructures();
      case 'outpost':
        return this.createOutpostStructures();
      default:
        return this.createMetropolisStructures();
    }
  }

  createMetropolisStructures() {
    const structures = [];

    // Create main circular platform foundation
    const basePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(400, 420, 30, 64),
      new THREE.MeshStandardMaterial({
        color: 0x333344,
        roughness: 0.8,
        metalness: 0.4
      })
    );
    basePlatform.position.y = 15;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Create central mega skyscraper
    const centralTower = this.createSkyscraper(0, 0, 80, 600, 0x4455aa, 'central');
    structures.push(...centralTower);

    // Create ring of tall skyscrapers
    const ringCount = 8;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const radius = 250;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 300 + Math.random() * 200;
      const width = 40 + Math.random() * 20;
      const color = [0x5566bb, 0x6677cc, 0x7788dd, 0x4455aa][Math.floor(Math.random() * 4)];
      
      const skyscraper = this.createSkyscraper(x, z, width, height, color, 'residential');
      structures.push(...skyscraper);
    }

    // Create outer ring of medium skyscrapers
    const outerRingCount = 12;
    for (let i = 0; i < outerRingCount; i++) {
      const angle = (i / outerRingCount) * Math.PI * 2;
      const radius = 350;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 150 + Math.random() * 150;
      const width = 25 + Math.random() * 15;
      const color = [0x6677cc, 0x7788dd, 0x8899ee, 0x5566bb][Math.floor(Math.random() * 4)];
      
      const skyscraper = this.createSkyscraper(x, z, width, height, color, 'commercial');
      structures.push(...skyscraper);
    }

    // Create scattered smaller buildings
    const smallBuildingCount = 20;
    for (let i = 0; i < smallBuildingCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 150 + Math.random() * 100;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 50 + Math.random() * 100;
      const width = 15 + Math.random() * 10;
      const color = [0x7788dd, 0x8899ee, 0x99aaff, 0x6677cc][Math.floor(Math.random() * 4)];
      
      const building = this.createSkyscraper(x, z, width, height, color, 'utility');
      structures.push(...building);
    }

    // Add connecting bridges between tall buildings
    this.createSkyBridges(structures);

    return structures;
  }

  createResearchStructures() {
    const structures = [];

    // Create research base platform
    const basePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(200, 220, 20, 32),
      new THREE.MeshStandardMaterial({
        color: 0x444455,
        roughness: 0.6,
        metalness: 0.6
      })
    );
    basePlatform.position.y = 10;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Central research tower
    const centralTower = this.createSkyscraper(0, 0, 40, 200, 0x55aa55, 'research');
    structures.push(...centralTower);

    // Laboratory domes
    const domeCount = 6;
    for (let i = 0; i < domeCount; i++) {
      const angle = (i / domeCount) * Math.PI * 2;
      const radius = 120;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(25, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x77dd77,
          roughness: 0.3,
          metalness: 0.8,
          transparent: true,
          opacity: 0.8
        })
      );
      dome.position.set(x, 35, z);
      dome.castShadow = true;
      structures.push(dome);
    }

    // Add communication arrays
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const radius = 80;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const array = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 50, 8),
        new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.2,
          metalness: 0.9
        })
      );
      array.position.set(x, 40, z);
      array.castShadow = true;
      structures.push(array);
    }

    return structures;
  }

  createMiningStructures() {
    const structures = [];

    // Create mining platform
    const basePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(300, 20, 300),
      new THREE.MeshStandardMaterial({
        color: 0x553322,
        roughness: 0.9,
        metalness: 0.3
      })
    );
    basePlatform.position.y = 10;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Mining towers
    const towerCount = 4;
    for (let i = 0; i < towerCount; i++) {
      const angle = (i / towerCount) * Math.PI * 2;
      const radius = 100;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const tower = this.createSkyscraper(x, z, 30, 150, 0xaa5522, 'mining');
      structures.push(...tower);
    }

    // Add mining drills
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      
      const drill = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 60, 16),
        new THREE.MeshStandardMaterial({
          color: 0x666666,
          roughness: 0.8,
          metalness: 0.7
        })
      );
      drill.position.set(x, 50, z);
      drill.castShadow = true;
      structures.push(drill);
    }

    return structures;
  }

  createAgriculturalStructures() {
    const structures = [];

    // Create agricultural platform
    const basePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(250, 270, 15, 32),
      new THREE.MeshStandardMaterial({
        color: 0x335544,
        roughness: 0.7,
        metalness: 0.3
      })
    );
    basePlatform.position.y = 7.5;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Greenhouse domes
    const domeCount = 12;
    for (let i = 0; i < domeCount; i++) {
      const angle = (i / domeCount) * Math.PI * 2;
      const radius = 80 + (i % 3) * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(20 + Math.random() * 10, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x88cc88,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.6
        })
      );
      dome.position.set(x, 30, z);
      dome.castShadow = true;
      structures.push(dome);
    }

    // Central processing facility
    const centralBuilding = this.createSkyscraper(0, 0, 50, 100, 0x66bb66, 'agricultural');
    structures.push(...centralBuilding);

    return structures;
  }

  createIndustrialStructures() {
    const structures = [];

    // Create industrial platform
    const basePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(400, 25, 400),
      new THREE.MeshStandardMaterial({
        color: 0x442222,
        roughness: 0.8,
        metalness: 0.5
      })
    );
    basePlatform.position.y = 12.5;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Factory buildings
    const factoryCount = 8;
    for (let i = 0; i < factoryCount; i++) {
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      
      const factory = this.createSkyscraper(x, z, 40 + Math.random() * 20, 80 + Math.random() * 60, 0xaa4444, 'industrial');
      structures.push(...factory);
    }

    // Add smokestacks
    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      
      const smokestack = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 8, 120, 16),
        new THREE.MeshStandardMaterial({
          color: 0x666666,
          roughness: 0.9,
          metalness: 0.6
        })
      );
      smokestack.position.set(x, 85, z);
      smokestack.castShadow = true;
      structures.push(smokestack);
    }

    return structures;
  }

  createOutpostStructures() {
    const structures = [];

    // Create small outpost platform
    const basePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(80, 90, 10, 16),
      new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.8,
        metalness: 0.4
      })
    );
    basePlatform.position.y = 5;
    basePlatform.castShadow = true;
    basePlatform.receiveShadow = true;
    structures.push(basePlatform);

    // Small habitat modules
    const moduleCount = 4;
    for (let i = 0; i < moduleCount; i++) {
      const angle = (i / moduleCount) * Math.PI * 2;
      const radius = 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const module = new THREE.Mesh(
        new THREE.CylinderGeometry(12, 12, 30, 16),
        new THREE.MeshStandardMaterial({
          color: 0x6666aa,
          roughness: 0.5,
          metalness: 0.7
        })
      );
      module.position.set(x, 25, z);
      module.castShadow = true;
      structures.push(module);
    }

    // Central command tower
    const commandTower = this.createSkyscraper(0, 0, 15, 50, 0x5555aa, 'outpost');
    structures.push(...commandTower);

    return structures;
  }

  createSkyscraper(x, z, width, height, color, type) {
    const parts = [];
    
    // Main building structure
    const buildingGeometry = new THREE.BoxGeometry(width, height, width * 0.8);
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.7
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height / 2 + 30, z);
    building.castShadow = true;
    building.receiveShadow = true;
    parts.push(building);

    // Add building details based on type
    if (type === 'central') {
      // Central spire
      const spireGeometry = new THREE.CylinderGeometry(width * 0.2, width * 0.4, height * 0.3, 16);
      const spire = new THREE.Mesh(spireGeometry, buildingMaterial);
      spire.position.set(x, height + height * 0.15 + 30, z);
      spire.castShadow = true;
      parts.push(spire);

      // Communication array
      const arrayGeometry = new THREE.CylinderGeometry(2, 2, 50, 8);
      const arrayMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
      const array = new THREE.Mesh(arrayGeometry, arrayMaterial);
      array.position.set(x, height + height * 0.3 + 55, z);
      parts.push(array);
    }

    // Add windows pattern
    const windowRows = Math.floor(height / 20);
    const windowCols = Math.floor(width / 8);
    
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (Math.random() > 0.3) { // 70% chance for lit windows
          const windowGeometry = new THREE.PlaneGeometry(3, 3);
          const windowMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xffffaa : 0xaaffff,
            transparent: true,
            opacity: 0.8
          });
          
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            x + (width / 2) + 0.1,
            30 + (row * 20) + 10,
            z - (width * 0.4) + (col * 8)
          );
          window.rotation.y = -Math.PI / 2;
          parts.push(window);
        }
      }
    }

    // Add landing platforms for flying vehicles
    if (height > 200) {
      const platformCount = Math.floor(height / 150);
      for (let i = 0; i < platformCount; i++) {
        const platformY = 100 + (i * 150);
        const platformGeometry = new THREE.CylinderGeometry(width * 0.8, width * 0.8, 3, 16);
        const platformMaterial = new THREE.MeshStandardMaterial({
          color: 0x666677,
          metalness: 0.8,
          roughness: 0.2
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, platformY, z);
        platform.castShadow = true;
        parts.push(platform);

        // Add platform lights
        const lightGeometry = new THREE.CylinderGeometry(1, 1, 2, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        for (let j = 0; j < 4; j++) {
          const lightAngle = (j / 4) * Math.PI * 2;
          const lightRadius = width * 0.6;
          const light = new THREE.Mesh(lightGeometry, lightMaterial);
          light.position.set(
            x + Math.cos(lightAngle) * lightRadius,
            platformY + 2,
            z + Math.sin(lightAngle) * lightRadius
          );
          parts.push(light);
        }
      }
    }

    // Add atmospheric lighting
    const buildingLight = new THREE.PointLight(color, 0.5, width * 3);
    buildingLight.position.set(x, height / 2 + 30, z);
    parts.push(buildingLight);

    return parts;
  }

  createSkyBridges(structures) {
    // Add bridges between the tallest buildings
    const tallBuildings = [];
    
    // Find buildings over 250 units tall
    structures.forEach(structure => {
      if (structure.geometry && structure.geometry.type === 'BoxGeometry' && 
          structure.position.y > 150) {
        tallBuildings.push(structure);
      }
    });

    // Create bridges between nearby tall buildings
    for (let i = 0; i < tallBuildings.length; i++) {
      for (let j = i + 1; j < tallBuildings.length; j++) {
        const building1 = tallBuildings[i];
        const building2 = tallBuildings[j];
        const distance = building1.position.distanceTo(building2.position);
        
        if (distance < 200 && distance > 50) { // Optimal bridge distance
          const bridgeHeight = Math.min(building1.position.y, building2.position.y) - 50;
          const bridgeGeometry = new THREE.BoxGeometry(distance, 8, 12);
          const bridgeMaterial = new THREE.MeshStandardMaterial({
            color: 0x555566,
            metalness: 0.8,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9
          });
          
          const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
          bridge.position.set(
            (building1.position.x + building2.position.x) / 2,
            bridgeHeight,
            (building1.position.z + building2.position.z) / 2
          );
          
          // Rotate bridge to connect buildings
          const angle = Math.atan2(
            building2.position.z - building1.position.z,
            building2.position.x - building1.position.x
          );
          bridge.rotation.y = angle;
          bridge.castShadow = true;
          bridge.receiveShadow = true;
          
          structures.push(bridge);

          // Add bridge lighting
          const bridgeLightCount = Math.floor(distance / 30);
          for (let k = 0; k < bridgeLightCount; k++) {
            const lightProgress = k / (bridgeLightCount - 1);
            const lightGeometry = new THREE.SphereGeometry(2, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
            const bridgeLight = new THREE.Mesh(lightGeometry, lightMaterial);
            
            bridgeLight.position.set(
              building1.position.x + (building2.position.x - building1.position.x) * lightProgress,
              bridgeHeight + 5,
              building1.position.z + (building2.position.z - building1.position.z) * lightProgress
            );
            structures.push(bridgeLight);
          }
        }
      }
    }
  }


  createLaunchSites() {
    const siteLocations = [
      { x: 300, z: 300 },    // Closer to starting position
      { x: -400, z: 200 },   // Closer to starting position
      { x: 200, z: -300 },   // Closer to starting position
      { x: 500, z: -100 },   // Additional closer site
      { x: -300, z: -400 }   // Additional closer site
    ];

    siteLocations.forEach(loc => {
      const site = this.createLaunchSite(loc.x, loc.z);
      this.rocketLaunchSites.push(site);
      this.scene.add(site);
    });
  }

  createStarshipDisplay() {
    // Create a spectacular SpaceX Starship display lineup
    const displayCenter = { x: -600, z: 0 }; // Position to the left of starting area
    const rocketSpacing = 80; // Distance between rockets
    const rocketCount = 6; // Number of rockets in display
    
    // Create display group
    const displayGroup = new THREE.Group();
    
    for (let i = 0; i < rocketCount; i++) {
      // Calculate position for each rocket
      const rocketX = displayCenter.x;
      const rocketZ = displayCenter.z + (i - (rocketCount - 1) / 2) * rocketSpacing;
      
      // Create different rocket types for variety
      let rocketType = 'starship';
      if (i === 2 || i === 3) {
        rocketType = 'fullstack'; // Middle rockets are full stacks
      } else if (i === 1 || i === 4) {
        rocketType = 'superheavy'; // Some are boosters
      }
      
      const displayRocket = this.createRocket(rocketType);
      displayRocket.position.set(rocketX, 0, rocketZ);
      
      // Add dramatic lighting for each rocket
      this.addDisplayLighting(displayRocket, i);
      
      // Add SpaceX display signage
      if (i === Math.floor(rocketCount / 2)) {
        this.addSpaceXSignage(displayRocket);
      }
      
      displayGroup.add(displayRocket);
    }
    
    // Add display platform
    this.addDisplayPlatform(displayGroup, displayCenter, rocketCount * rocketSpacing);
    
    // Position on terrain
    this.positionOnTerrain(displayGroup, displayCenter.x, displayCenter.z);
    
    this.scene.add(displayGroup);
    
    // Display notification removed - starships remain as static ground display
    // if (window.showNotification) {
    //   setTimeout(() => {
    //     window.showNotification('🚀 SpaceX Starship Display Area Discovered! Drive West to see the lineup!', 6000);
    //   }, 8000);
    // }
  }

  addDisplayLighting(rocket, index) {
    // Add dramatic spotlights for each rocket
    const spotLight = new THREE.SpotLight(0xffffff, 2, 200, Math.PI / 6, 0.3);
    spotLight.position.set(30, 100, 0);
    spotLight.target = rocket;
    spotLight.castShadow = true;
    this.scene.add(spotLight);
    
    // Add colored accent lighting
    const colors = [0xff3300, 0x00ff88, 0x3388ff, 0xffaa00, 0xff6b35, 0x88ff00];
    const accentLight = new THREE.PointLight(colors[index % colors.length], 1, 50);
    accentLight.position.set(0, 80, 20);
    rocket.add(accentLight);
  }

  addSpaceXSignage(rocket) {
    // Create large SpaceX logo/sign
    const signGeometry = new THREE.PlaneGeometry(40, 8);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 200, 30);
    sign.rotation.y = Math.PI;
    this.scene.add(sign);
    
    // Add "SPACEX STARSHIP DISPLAY" text effect
    const textGeometry = new THREE.PlaneGeometry(60, 6);
    const textMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      emissive: 0x333333
    });
    const textSign = new THREE.Mesh(textGeometry, textMaterial);
    textSign.position.set(0, 210, 29);
    textSign.rotation.y = Math.PI;
    this.scene.add(textSign);
  }

  addDisplayPlatform(displayGroup, center, totalWidth) {
    // Create elevated display platform
    const platformGeometry = new THREE.BoxGeometry(totalWidth + 40, 5, 120);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.3,
      roughness: 0.7
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, -2.5, 0);
    displayGroup.add(platform);
    
    // Add platform details and markings
    for (let i = 0; i < 6; i++) {
      const markingGeometry = new THREE.CylinderGeometry(15, 15, 0.5, 32);
      const markingMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b35,
        emissive: 0x331100,
        emissiveIntensity: 0.2
      });
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(0, 2.75, (i - 2.5) * 80);
      displayGroup.add(marking);
    }
  }

  positionOnTerrain(group, x, z) {
    // Use raycasting to position on terrain
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
    
    let y = 0; // default height
    if (this.scene && this.scene.children) {
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        y = intersects[0].point.y;
      }
    }
    
    group.position.set(x, y, z);
  }

  createLaunchSite(x, z) {
    const siteGroup = new THREE.Group();
    siteGroup.position.set(x, 0, z);

    // Launch pad
    const padGeometry = new THREE.CylinderGeometry(50, 50, 10, 32);
    const padMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const launchPad = new THREE.Mesh(padGeometry, padMaterial);

    // Support structures
    const supportStructures = this.createLaunchSupports();
    siteGroup.add(launchPad, ...supportStructures);

    // Position on terrain
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      siteGroup.position.y = intersects[0].point.y;
    }

    return siteGroup;
  }

  createLaunchSupports() {
    const supports = [];

    // Add tower and support structures
    const towerGeometry = new THREE.BoxGeometry(10, 100, 10);
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const radius = 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.set(x, 50, z);
      supports.push(tower);
    }

    return supports;
  }

  createRocket(type = 'starship') {
    if (type === 'starship') {
      return this.createStarshipRocket();
    } else if (type === 'superheavy') {
      return this.createSuperHeavyBooster();
    } else if (type === 'fullstack') {
      return this.createFullStackRocket();
    }
    return this.createStarshipRocket();
  }

  createStarshipRocket() {
    const rocketGroup = new THREE.Group();

    // Main body - stainless steel with metallic finish (taller for more realistic proportions)
    const bodyGeometry = new THREE.CylinderGeometry(9, 9, 160, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE8E8E8,
      metalness: 0.8,
      roughness: 0.15,
      envMapIntensity: 1.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Nose section - more tapered like real Starship
    const noseGeometry = new THREE.CylinderGeometry(3, 9, 40, 32);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.y = 100;

    // Black thermal protection tiles (more realistic pattern)
    const heatShieldGeometry = new THREE.CylinderGeometry(9.1, 9.1, 50, 32);
    const heatShieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    });
    const heatShield = new THREE.Mesh(heatShieldGeometry, heatShieldMaterial);
    heatShield.position.y = -55;

    // Forward fins (more realistic proportions)
    const forwardFlapGeometry = new THREE.BoxGeometry(12, 3, 6);
    const flapMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE8E8E8,
      metalness: 0.8,
      roughness: 0.15
    });

    // Two forward flaps
    const forwardFlapLeft = new THREE.Mesh(forwardFlapGeometry, flapMaterial);
    forwardFlapLeft.position.set(-10, 50, 0);
    forwardFlapLeft.rotation.z = -0.1;
    
    const forwardFlapRight = new THREE.Mesh(forwardFlapGeometry, flapMaterial);
    forwardFlapRight.position.set(10, 50, 0);
    forwardFlapRight.rotation.z = 0.1;

    // Aft fins (larger and more prominent)
    const aftFlapGeometry = new THREE.BoxGeometry(18, 4, 8);
    
    const aftFlapLeft = new THREE.Mesh(aftFlapGeometry, flapMaterial);
    aftFlapLeft.position.set(-12, -40, 0);
    aftFlapLeft.rotation.z = 0.15;
    
    const aftFlapRight = new THREE.Mesh(aftFlapGeometry, flapMaterial);
    aftFlapRight.position.set(12, -40, 0);
    aftFlapRight.rotation.z = -0.15;

    // Engine section with 3 Raptor engines (more detailed)
    const engineSection = new THREE.Group();
    const engineCount = 3;
    const engineRadius = 5;

    for (let i = 0; i < engineCount; i++) {
      const angle = (i / engineCount) * Math.PI * 2;
      
      // Engine bell (more detailed)
      const engineGeometry = new THREE.CylinderGeometry(1.8, 2.8, 10, 16);
      const engineMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.2
      });
      const engine = new THREE.Mesh(engineGeometry, engineMaterial);
      
      engine.position.x = Math.cos(angle) * engineRadius;
      engine.position.z = Math.sin(angle) * engineRadius;
      engine.position.y = -85;
      
      // Add engine detail (injector plate)
      const injectorGeometry = new THREE.CylinderGeometry(1.3, 1.3, 1.5, 16);
      const injectorMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.3
      });
      const injector = new THREE.Mesh(injectorGeometry, injectorMaterial);
      injector.position.y = 6;
      engine.add(injector);
      
      // Add engine gimbal mechanism
      const gimbalGeometry = new THREE.CylinderGeometry(2.2, 2.2, 3, 16);
      const gimbal = new THREE.Mesh(gimbalGeometry, engineMaterial);
      gimbal.position.y = -7;
      engine.add(gimbal);
      
      engineSection.add(engine);
    }

    // Add more detailed surface features
    this.addStarshipSurfaceDetails(body, bodyMaterial, heatShieldMaterial);

    // Add header tank (for realistic Starship appearance)
    const headerTankGeometry = new THREE.CylinderGeometry(8, 8, 20, 32);
    const headerTank = new THREE.Mesh(headerTankGeometry, bodyMaterial);
    headerTank.position.y = 20;
    rocketGroup.add(headerTank);

    // Add payload bay doors
    const payloadDoorGeometry = new THREE.BoxGeometry(16, 2, 1);
    const payloadDoorLeft = new THREE.Mesh(payloadDoorGeometry, bodyMaterial);
    payloadDoorLeft.position.set(-8.5, 60, 0);
    payloadDoorLeft.rotation.z = -0.05;
    
    const payloadDoorRight = new THREE.Mesh(payloadDoorGeometry, bodyMaterial);
    payloadDoorRight.position.set(8.5, 60, 0);
    payloadDoorRight.rotation.z = 0.05;

    // Combine all parts
    rocketGroup.add(body, nose, heatShield, forwardFlapLeft, forwardFlapRight, 
                    aftFlapLeft, aftFlapRight, engineSection, payloadDoorLeft, payloadDoorRight);

    // Add SpaceX logo
    const logoGeometry = new THREE.PlaneGeometry(8, 2);
    const logoMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.set(0, 40, 9.2);
    rocketGroup.add(logo);

    return rocketGroup;
  }

  createSuperHeavyBooster() {
    const boosterGroup = new THREE.Group();

    // Main body - larger and more robust
    const bodyGeometry = new THREE.CylinderGeometry(9, 9, 200, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE8E8E8,
      metalness: 0.8,
      roughness: 0.15,
      envMapIntensity: 1.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Engine section with 33 Raptor engines
    const engineSection = new THREE.Group();
    const innerEngineCount = 13; // Inner ring
    const outerEngineCount = 20; // Outer ring
    const innerRadius = 4;
    const outerRadius = 7;

    // Inner ring of engines
    for (let i = 0; i < innerEngineCount; i++) {
      const angle = (i / innerEngineCount) * Math.PI * 2;
      const engine = this.createRaptorEngine();
      engine.position.x = Math.cos(angle) * innerRadius;
      engine.position.z = Math.sin(angle) * innerRadius;
      engine.position.y = -105;
      engineSection.add(engine);
    }

    // Outer ring of engines
    for (let i = 0; i < outerEngineCount; i++) {
      const angle = (i / outerEngineCount) * Math.PI * 2;
      const engine = this.createRaptorEngine();
      engine.position.x = Math.cos(angle) * outerRadius;
      engine.position.z = Math.sin(angle) * outerRadius;
      engine.position.y = -105;
      engineSection.add(engine);
    }

    // Add grid fins for reentry control
    const gridFinGeometry = new THREE.BoxGeometry(8, 12, 2);
    const gridFinMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.1
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const gridFin = new THREE.Mesh(gridFinGeometry, gridFinMaterial);
      gridFin.position.x = Math.cos(angle) * 10;
      gridFin.position.z = Math.sin(angle) * 10;
      gridFin.position.y = 60;
      gridFin.rotation.y = angle;
      boosterGroup.add(gridFin);
    }

    // Add landing legs
    const legGeometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.x = Math.cos(angle) * 8;
      leg.position.z = Math.sin(angle) * 8;
      leg.position.y = -95;
      leg.rotation.x = Math.PI / 6;
      boosterGroup.add(leg);
    }

    boosterGroup.add(body, engineSection);
    return boosterGroup;
  }

  createFullStackRocket() {
    const fullStackGroup = new THREE.Group();
    
    // Create Super Heavy booster
    const booster = this.createSuperHeavyBooster();
    fullStackGroup.add(booster);
    
    // Create Starship on top
    const starship = this.createStarshipRocket();
    starship.position.y = 250; // Position on top of booster
    fullStackGroup.add(starship);
    
    return fullStackGroup;
  }

  createRaptorEngine() {
    const engineGroup = new THREE.Group();
    
    // Engine bell
    const engineGeometry = new THREE.CylinderGeometry(1.5, 2.5, 8, 16);
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.2
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engineGroup.add(engine);
    
    // Injector plate
    const injectorGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1, 16);
    const injector = new THREE.Mesh(injectorGeometry, engineMaterial);
    injector.position.y = 4.5;
    engineGroup.add(injector);
    
    return engineGroup;
  }

  addStarshipSurfaceDetails(body, bodyMaterial, heatShieldMaterial) {
    // Add hexagonal heat shield tiles
    const tileCount = 200;
    for (let i = 0; i < tileCount; i++) {
      const tileGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 6);
      const tile = new THREE.Mesh(tileGeometry, heatShieldMaterial);
      
      // Random position on lower half of rocket
      const angle = Math.random() * Math.PI * 2;
      const height = -80 + Math.random() * 100;
      const radius = 9.2;
      
      tile.position.x = Math.cos(angle) * radius;
      tile.position.z = Math.sin(angle) * radius;
      tile.position.y = height;
      body.add(tile);
    }

    // Add propellant tank lines
    const tankLineGeometry = new THREE.CylinderGeometry(0.2, 0.2, 160, 8);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tankLine = new THREE.Mesh(tankLineGeometry, bodyMaterial);
      tankLine.position.x = Math.cos(angle) * 9.3;
      tankLine.position.z = Math.sin(angle) * 9.3;
      body.add(tankLine);
    }

    // Add RCS thrusters
    const rcsGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
    const rcsMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.3
    });
    
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const height = 30 + (i % 4) * 20;
      const rcs = new THREE.Mesh(rcsGeometry, rcsMaterial);
      rcs.position.x = Math.cos(angle) * 9.5;
      rcs.position.z = Math.sin(angle) * 9.5;
      rcs.position.y = height;
      body.add(rcs);
    }
  }

  triggerRocketEvent(type, startPosition) {
    // Choose rocket type based on probability
    let rocketType = 'starship';
    const rand = Math.random();
    if (rand < 0.6) {
      rocketType = 'starship';
    } else if (rand < 0.8) {
      rocketType = 'superheavy';
    } else {
      rocketType = 'fullstack';
    }
    
    const rocket = this.createRocket(rocketType);
    const startPos = startPosition || this.getRandomLaunchSite().position;
    rocket.position.copy(startPos);
  
    // Adjust duration based on rocket type
    let duration = 10000; // Default 10 seconds
    if (rocketType === 'fullstack') {
      duration = 20000; // 20 seconds for full stack
    } else if (rocketType === 'superheavy') {
      duration = 15000; // 15 seconds for booster
    }
  
    const event = {
      type: type,
      rocket: rocket,
      rocketType: rocketType,
      startTime: Date.now(),
      duration: duration,
      startPos: startPos.clone(),
      endPos: type === 'launch' ?
        startPos.clone().add(new THREE.Vector3(0, 1500, 0)) :
        startPos.clone(),
      engineParticles: this.createRocketEngineEffect(rocket)
    };
  
    this.scene.add(rocket);
    this.activeEvents.add(event);
    
    // Launch notification removed - starships stay on ground
    // if (window.showNotification) {
    //   const rocketName = rocketType === 'fullstack' ? 'Starship + Super Heavy' : 
    //                     rocketType === 'superheavy' ? 'Super Heavy Booster' : 'Starship';
    //   window.showNotification(`${rocketName} ${type} detected!`, 5000);
    // }
  }
  
  
  
  createEngineParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
  
    // Create radial gradient for soft particles
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
  
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  
    return new THREE.CanvasTexture(canvas);
  }
  
  // Update the updateActiveEvents method to include particle updates
  updateActiveEvents() {
    for (const event of this.activeEvents) {
      const progress = (Date.now() - event.startTime) / event.duration;
  
      if (progress >= 1) {
        this.scene.remove(event.rocket);
        this.activeEvents.delete(event);
        continue;
      }
  
      if (event.type === 'launch') {
        // Add easing for smoother acceleration
        const easeProgress = this.easeInOutCubic(progress);
        event.rocket.position.lerp(event.endPos, easeProgress);
        
        // Add slight wobble
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 4) * 0.05;
        
        // Update engine effects
        if (event.engineParticles) {
          event.engineParticles.update(progress);
        }
      } else {
        // Landing animation
        const easeProgress = this.easeInOutCubic(1 - progress);
        event.rocket.position.lerp(event.endPos, easeProgress);
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 4) * 0.05;
        
        if (event.engineParticles) {
          event.engineParticles.update(1 - progress);
        }
      }
    }
  }
  
  // Add easing function for smoother motion
  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  easeInQuad(x) {
    return x * x;
  }
  
  easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }
  
  createRocketEngineEffect(rocket) {
    const perfSettings = getPerformanceSettings();
    
    // Create enhanced burner effects with multiple layers
    // Use darker, more visible colors for mobile devices
    const burnerEffects = perfSettings.isMobile ? {
      innerFlame: this.createFlameParticleSystem(800, 0xff3300, 0xff6600), // Bright red-orange core for mobile
      middleFlame: this.createFlameParticleSystem(1000, 0xaa1100, 0xff2200), // Dark red-orange flame
      outerFlame: this.createFlameParticleSystem(1200, 0x660000, 0xaa1100), // Dark red outer flame
      smokeTrail: this.createSmokeParticleSystem(600, 0x222222), // Darker smoke
      shockWave: this.createShockWaveEffect()
    } : {
      innerFlame: this.createFlameParticleSystem(1500, 0xffffff, 0xffff88), // White-yellow core for desktop
      middleFlame: this.createFlameParticleSystem(2000, 0xff4400, 0xff8800), // Orange flame
      outerFlame: this.createFlameParticleSystem(2500, 0xff1100, 0xff4400), // Red outer flame
      smokeTrail: this.createSmokeParticleSystem(1000, 0x888888),
      shockWave: this.createShockWaveEffect()
    };
    
    // Create dramatic engine lighting - adjust for mobile visibility
    const engineLights = perfSettings.isMobile ? [
      new THREE.PointLight(0xff6600, 8, 120), // Brighter orange light for mobile
      new THREE.PointLight(0xff2200, 6, 100), // Bright red glow
      new THREE.PointLight(0xaa1100, 4, 80),  // Dark red heat
      new THREE.SpotLight(0xff3300, 5, 250, Math.PI / 4, 0.3) // Brighter directional thrust
    ] : [
      new THREE.PointLight(0xffffff, 5, 100), // Main white light for desktop
      new THREE.PointLight(0xff3300, 4, 80),  // Orange glow
      new THREE.PointLight(0xff6600, 3, 60),  // Red heat
      new THREE.SpotLight(0xff4400, 3, 200, Math.PI / 4, 0.3) // Directional thrust
    ];
  
    // Position lights at engine base
    engineLights.forEach((light, index) => {
      light.position.y = -90 + index * 5; // Stagger lights
      if (light.type === 'SpotLight') {
        light.target.position.set(0, -200, 0);
        light.angle = Math.PI / 4;
      }
      rocket.add(light);
    });
    
    // Add particle systems to rocket
    Object.values(burnerEffects).forEach(effect => {
      if (effect.mesh) {
        effect.mesh.position.y = -85; // Position at engine base
        rocket.add(effect.mesh);
      }
    });
  
    return {
      effects: burnerEffects,
      lights: engineLights,
      update: (intensity) => {
        const time = Date.now() * 0.001;
        
        // Update each flame layer
        this.updateFlameEffect(burnerEffects.innerFlame, intensity, time, 0.8, 15);
        this.updateFlameEffect(burnerEffects.middleFlame, intensity, time, 1.2, 25);
        this.updateFlameEffect(burnerEffects.outerFlame, intensity, time, 1.6, 35);
        this.updateSmokeEffect(burnerEffects.smokeTrail, intensity, time);
        this.updateShockWaveEffect(burnerEffects.shockWave, intensity, time);
  
        // Animate engine lights with realistic flickering
        engineLights.forEach((light, index) => {
          const flicker = 1 + Math.sin(time * (20 + index * 5)) * 0.1 + 
                         Math.sin(time * (30 + index * 7)) * 0.05;
          const baseIntensity = [5, 4, 3, 3][index] || 2;
          light.intensity = baseIntensity * intensity * flicker;
          
          // Add color temperature variation
          if (index === 0) {
            const temp = 0.9 + Math.sin(time * 15) * 0.1;
            light.color.setRGB(1, temp, temp * 0.8);
          }
        });
      }
    };
  }

  createFlameParticleSystem(count, color1, color2) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    
    // Initialize particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Position at engine base
      positions[i3] = (Math.random() - 0.5) * 8;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = (Math.random() - 0.5) * 8;
      
      // Color gradient
      const colorFactor = Math.random();
      const color = color1.clone ? color1.clone().lerp(color2, colorFactor) : new THREE.Color(color1).lerp(new THREE.Color(color2), colorFactor);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Size variation
      sizes[i] = Math.random() * 4 + 2;
      
      // Initial velocity
      velocities[i3] = (Math.random() - 0.5) * 2;
      velocities[i3 + 1] = -(Math.random() * 30 + 10);
      velocities[i3 + 2] = (Math.random() - 0.5) * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      vertexColors: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Points(geometry, material);
    
    return {
      mesh,
      positions,
      colors,
      sizes,
      velocities,
      count
    };
  }

  createSmokeParticleSystem(count, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 15;
      positions[i3 + 1] = -Math.random() * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 15;
      
      const smokeColor = new THREE.Color(color);
      colors[i3] = smokeColor.r;
      colors[i3 + 1] = smokeColor.g;
      colors[i3 + 2] = smokeColor.b;
      
      sizes[i] = Math.random() * 6 + 4;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 12,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
      transparent: true,
      vertexColors: true,
      opacity: 0.4
    });
    
    return {
      mesh: new THREE.Points(geometry, material),
      positions,
      count
    };
  }

  createShockWaveEffect() {
    const geometry = new THREE.RingGeometry(0, 30, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Horizontal
    mesh.position.y = -90;
    
    return { mesh };
  }

  updateFlameEffect(flame, intensity, time, spread, speed) {
    const positions = flame.positions;
    
    for (let i = 0; i < flame.count; i++) {
      const i3 = i * 3;
      
      // Create expanding cone shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread * intensity;
      const velocity = speed * intensity;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = -(Math.random() * velocity + velocity * 0.5);
      positions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    flame.mesh.geometry.attributes.position.needsUpdate = true;
  }

  updateSmokeEffect(smoke, intensity, time) {
    const positions = smoke.positions;
    
    for (let i = 0; i < smoke.count; i++) {
      const i3 = i * 3;
      
      positions[i3] += (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] -= (2 + Math.random() * 3) * intensity;
      positions[i3 + 2] += (Math.random() - 0.5) * 0.5;
      
      // Reset particles that have moved too far
      if (positions[i3 + 1] < -100) {
        positions[i3] = (Math.random() - 0.5) * 15;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = (Math.random() - 0.5) * 15;
      }
    }
    
    smoke.mesh.geometry.attributes.position.needsUpdate = true;
  }

  updateShockWaveEffect(shockWave, intensity, time) {
    if (shockWave.mesh) {
      // Pulsing ring effect
      const pulse = 1 + Math.sin(time * 20) * 0.2;
      shockWave.mesh.scale.setScalar(pulse * intensity);
      shockWave.mesh.material.opacity = 0.3 * intensity * (1 - pulse * 0.3);
    }
  }
  
  createParticleSystem(count, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
  
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -2;
      positions[i * 3 + 2] = 0;
  
      // Create color gradient
      const colorObj = new THREE.Color(color);
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
  
      sizes[i] = Math.random() * 2 + 1;
    }
  
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: this.createEngineParticleTexture() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });
  
    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.position.y = -2;
    return particleSystem;
  }

  getRandomLaunchSite() {
    return this.rocketLaunchSites[
      Math.floor(Math.random() * this.rocketLaunchSites.length)
    ];
  }

  update(playerPosition) {
    // Check if player has moved far enough to trigger scene repeat
    const distanceMoved = playerPosition.distanceTo(this.lastPlayerPosition);
    if (distanceMoved > this.sceneRepeatDistance) {
      this.lastPlayerPosition.copy(playerPosition);
      this.repositionSceneElements(playerPosition);
    }

    // Update city lighting based on time of day
    this.updateCityLighting();
  }

  updateActiveEvents() {
    for (const event of this.activeEvents) {
      const elapsedTime = Date.now() - event.startTime;
      const progress = elapsedTime / event.duration;

      if (progress >= 1) {
        this.scene.remove(event.rocket);
        this.activeEvents.delete(event);
        continue;
      }

      if (event.type === 'launch') {
        // Rocket launch animation - use easing for smooth acceleration
        const easeProgress = this.easeInOutCubic(progress);
        event.rocket.position.lerp(event.endPos, easeProgress);
        
        // Add slight wobble and rotation for realistic flight
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 4) * 0.05;
        event.rocket.rotation.x = Math.cos(progress * Math.PI * 6) * 0.02;
        
        // Update enhanced engine burner effects
        if (event.engineParticles) {
          // Full throttle during launch
          const thrustIntensity = Math.min(1.0, progress * 2); // Ramp up quickly
          event.engineParticles.update(thrustIntensity);
        }
      } else {
        // Rocket landing animation - use easing for controlled descent
        const easeProgress = this.easeInOutCubic(1 - progress);
        event.rocket.position.lerp(event.endPos, easeProgress);
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 4) * 0.05;
        event.rocket.rotation.x = Math.cos(progress * Math.PI * 8) * 0.03;
        
        // Update engine effects for landing burn with throttle control
        if (event.engineParticles) {
          // Variable throttle for landing - strongest at end
          const landingBurn = Math.max(0.3, (1 - progress) * 1.2);
          event.engineParticles.update(landingBurn);
        }
      }
    }
  }

  repositionSceneElements(playerPosition) {
    // Move city if player has moved too far away
    this.marsBases.forEach(city => {
      if (city.position.distanceTo(playerPosition) > this.sceneRepeatDistance * 1.5) {
        const newPos = this.getNewElementPosition(playerPosition);
        city.position.set(newPos.x, newPos.y, newPos.z);
      }
    });
  }

  // Update city lighting based on time of day
  updateCityLighting() {
    if (typeof timeOfDay !== 'undefined') {
      const intensity = this.getCityLightIntensity(timeOfDay);
      
      this.marsBases.forEach(city => {
        // Update building lights
        city.traverse((child) => {
          if (child.material && child.material.color) {
            // Adjust building window brightness
            if (child.material.color.r > 0.8) { // Likely a window
              child.material.opacity = intensity;
            }
          }
          
          // Update point lights
          if (child.isPointLight) {
            child.intensity = intensity * 0.5;
          }
        });
      });
    }
  }

  // Calculate city light intensity based on time of day
  getCityLightIntensity(timeOfDay) {
    // Lights are brightest at night (0.0-0.2 and 0.8-1.0)
    if (timeOfDay < 0.2 || timeOfDay > 0.8) {
      return 1.0; // Full brightness at night
    } else if (timeOfDay > 0.3 && timeOfDay < 0.7) {
      return 0.3; // Dim during day
    } else {
      // Transition periods (dawn/dusk)
      if (timeOfDay < 0.3) {
        return 1.0 - ((timeOfDay - 0.2) / 0.1) * 0.7; // Fade out at dawn
      } else {
        return 0.3 + ((timeOfDay - 0.7) / 0.1) * 0.7; // Fade in at dusk
      }
    }
  }

  getNewElementPosition(playerPosition) {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.sceneRepeatDistance;
    const x = playerPosition.x + Math.cos(angle) * distance;
    const z = playerPosition.z + Math.sin(angle) * distance;

    // Find ground height at new position
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    const y = intersects.length > 0 ? intersects[0].point.y : 0;

    return new THREE.Vector3(x, y, z);
  }

  // createDistantFeatures() {
  //   // Create distant mountain ranges
  //   const mountainRanges = [
  //     { distance: 4000, height: 800, count: 20 },
  //     { distance: 6000, height: 1200, count: 15 },
  //     { distance: 8000, height: 1500, count: 10 }
  //   ];

  //   mountainRanges.forEach(range => {
  //     this.createMountainRange(range.distance, range.height, range.count);
  //   });
  // }

  // createMountainRange(distance, maxHeight, peakCount) {
  //   const rangeGroup = new THREE.Group();

  //   for (let i = 0; i < peakCount; i++) {
  //     const angle = (i / peakCount) * Math.PI * 2;
  //     const offset = (Math.random() - 0.5) * distance * 0.2;
  //     const x = Math.cos(angle) * (distance + offset);
  //     const z = Math.sin(angle) * (distance + offset);

  //     const height = maxHeight * (0.7 + Math.random() * 0.3);
  //     const width = height * (0.8 + Math.random() * 0.4);

  //     const mountainGeometry = new THREE.ConeGeometry(width, height, 8);
  //     const mountainMaterial = new THREE.MeshStandardMaterial({
  //       color: 0xaa6644,
  //       roughness: 0.9,
  //       metalness: 0.1
  //     });

  //     const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
  //     mountain.position.set(x, height/2, z);

  //     // Add snow caps
  //     const snowCapGeometry = new THREE.ConeGeometry(width * 0.3, height * 0.2, 8);
  //     const snowMaterial = new THREE.MeshStandardMaterial({
  //       color: 0xffffff,
  //       roughness: 0.6,
  //       metalness: 0.1
  //     });

  //     const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
  //     snowCap.position.y = height * 0.4;
  //     mountain.add(snowCap);

  //     rangeGroup.add(mountain);
  //   }

  //   this.scene.add(rangeGroup);
  // }

  addRocketEffects(rocket, type) {
    // Create engine exhaust
    const exhaustGeometry = new THREE.ConeGeometry(3, 20, 16);
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.7
    });

    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.position.y = -50;
    exhaust.rotation.x = Math.PI;
    rocket.add(exhaust);

    // Add engine glow
    const glowGeometry = new THREE.SphereGeometry(8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.5
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = -45;
    rocket.add(glow);

    // Add point light for engine
    const engineLight = new THREE.PointLight(0xff3300, 2, 100);
    engineLight.position.y = -45;
    rocket.add(engineLight);

    // Add particle system for smoke
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = -50 - Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x888888,
      size: 2,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    rocket.add(particleSystem);

    // Animate particles
    const animateParticles = () => {
      const positions = particles.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] -= 0.5; // Move down

        // Reset particle if too far down
        if (positions[i * 3 + 1] < -100) {
          positions[i * 3] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 1] = -50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
      }

      particles.attributes.position.needsUpdate = true;
    };

    // Store animation function for later use
    rocket.userData.animateParticles = animateParticles;
  }



  // updateSoundscape(playerPosition) {
  //   // Update wind sound based on height
  //   if (soundSystem.sounds.marsWind) {
  //     const windVolume = Math.min(playerPosition.y / 1000, 1) * 0.5;
  //     soundSystem.sounds.marsWind.volume = windVolume;
  //   }

  //   // Update base ambient sound based on proximity to nearest base
  //   if (soundSystem.sounds.baseAmbient) {
  //     let closestBaseDistance = Infinity;
  //     this.marsBases.forEach(base => {
  //       const distance = playerPosition.distanceTo(base.position);
  //       closestBaseDistance = Math.min(closestBaseDistance, distance);
  //     });

  //     const baseVolume = Math.max(0, 1 - (closestBaseDistance / 500)) * 0.3;
  //     soundSystem.sounds.baseAmbient.volume = baseVolume;
  //   }
  // }

  // update(playerPosition) {
  //   // Existing update code...

  //   // Update soundscape
  //   this.updateSoundscape(playerPosition);

  //   // Rest of existing update code...
  // }
}

// Initialize scene manager after scene setup
const sceneManager = new MarsSceneManager(scene, 5000);

// Add scene manager update to animation loop
const originalAnimate = animate;
animate = function (time) {
  originalAnimate(time);

  // Update scene manager with rover position
  if (rover) {
    sceneManager.update(rover.position);
  }
};

// Global animation control to prevent multiple loops
if (window.gameAnimationRunning) {
  console.warn('Animation already running, stopping previous loop');
  cancelAnimationFrame(window.gameAnimationId);
}
window.gameAnimationRunning = true;

// Modify the animate function
function animate(time) {
  // Check if animation should continue
  if (!window.gameAnimationRunning) {
    console.log('Animation stopped by global control');
    return;
  }
  
  window.gameAnimationId = requestAnimationFrame(animate);
  animationId = window.gameAnimationId;
  
  // Emergency performance monitoring for mobile
  const currentPerfSettings = getPerformanceSettings();
  if (currentPerfSettings.isMobile) {
    mobilePerformanceMonitor.update(time);
    
    // If performance is critically bad, enable emergency mode
    if (!emergencyPerformanceMode && mobilePerformanceMonitor.getAverageFPS() < 5) { // Lower threshold
      emergencyPerformanceMode = true;
      console.warn('CRITICAL: Emergency performance mode activated - maximum quality reduction');
      
      // Hide all objects except rover and essential lights
      scene.children.forEach(child => {
        if (child !== rover && child.type !== 'DirectionalLight' && child.type !== 'AmbientLight') {
          child.visible = false;
        }
      });
      
      // Drastically reduce rover detail
      rover.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.needsUpdate = false;
          // Remove ALL textures and use basic material
          if (child.material.map) {
            child.material.map.dispose();
            child.material.map = null;
          }
          if (child.material.normalMap) {
            child.material.normalMap.dispose();
            child.material.normalMap = null;
          }
          // Use basic material
          child.material = new THREE.MeshBasicMaterial({
            color: child.material.color || 0xffffff
          });
        }
      });
      
      // Force minimal render settings
      renderer.setPixelRatio(0.5); // Extremely low resolution
    }
  }

  // Calculate delta time for consistent movement regardless of frame rate
  const delta = time - lastTime || 16.67; // Default to 60fps if lastTime is not set
  lastTime = time;

  // Skip frames if browser tab is inactive or delta is too large (indicating lag)
  if (delta > 100) return;

  // Mobile performance monitoring with adaptive throttling  
  if (currentPerfSettings.isMobile) {
    mobilePerformanceMonitor.update(time);
    
    // Adaptive frame skipping based on performance and device tier
    const mobileTier = currentPerfSettings.mobileTier || 'low';
    const performanceThreshold = mobileTier === 'high' ? 25 : 
                                mobileTier === 'medium' ? 20 : 15;
    
    // Skip frames more intelligently based on actual performance
    if (mobilePerformanceMonitor.isPerformancePoor() && 
        mobilePerformanceMonitor.getAverageFPS() < performanceThreshold) {
      if (frameCount % (mobileTier === 'high' ? 2 : 3) === 0) {
        return;
      }
    }
  }

  frameCount++;

  // Adaptive frame throttling based on mobile device capabilities
  const frameThrottle = currentPerfSettings.isMobile ? 
                       (currentPerfSettings.mobileTier === 'high' ? 6 : 
                        currentPerfSettings.mobileTier === 'medium' ? 8 : 12) : // Much more aggressive throttling
                       currentPerfSettings.detailLevel === 'high' ? 1 : 
                       currentPerfSettings.detailLevel === 'normal' ? 2 : 3;

  // Optimize operations for mobile with tier-based updates
  if (currentPerfSettings.isMobile) {
    // Mobile scene manager updates - heavily throttled
    const sceneUpdateThrottle = currentPerfSettings.mobileTier === 'high' ? 10 : 
                               currentPerfSettings.mobileTier === 'medium' ? 20 : 40;
    
    if (window.marsSceneManager && rover && frameCount % (frameThrottle * sceneUpdateThrottle) === 0) {
      window.marsSceneManager.update(rover.position);
    }
    
    // Disable all atmospheric effects and particles on mobile in emergency mode
    if (!emergencyPerformanceMode && !currentPerfSettings.disableAtmosphericEffects && window.atmosphericEffects && 
        frameCount % (frameThrottle * 20) === 0) {
      window.atmosphericEffects.update(delta, rover.position);
    }
    
    // Disable dust particles entirely in emergency mode
    if (!emergencyPerformanceMode && currentPerfSettings.mobileTier === 'high' && 
        isMoving && frameCount % (frameThrottle * 10) === 0) {
      if (window.dustParticles) {
        window.dustParticles.update(rover.position, isMoving);
      }
    }
  } else {
    // // Make the skybox follow the camera ONLY if it exists
    // if (window.spaceSkybox) {
    //   window.spaceSkybox.position.copy(camera.position);
    // }

    // Update meteor system if it exists and we're in night mode (throttled)
    if (window.meteorSystem && (!isDaytime || isTransitioning) && frameCount % frameThrottle === 0) {
      window.meteorSystem.update(delta);
    }

    // Update Mars Scene Manager if it exists (heavily throttled for performance)
    if (window.marsSceneManager && rover && frameCount % (frameThrottle * 4) === 0) {
      window.marsSceneManager.update(rover.position);
    }
  }

  // Rover Movement
  isMoving = false;
  currentSpeed = 0; // Reset current speed

  // Store previous position before moving
  previousPosition.copy(rover.position);

  if (keys.w || keys.s) {
    isMoving = true;
    const direction = keys.w ? -1 : 1; // Forward is negative Z in three.js

    // Calculate movement vector based on rover's rotation
    const moveX = Math.sin(roverYaw) * speed * direction;
    const moveZ = Math.cos(roverYaw) * speed * direction;

    // Update rover position
    rover.position.x += moveX;
    rover.position.z += moveZ;

    // Set current speed based on direction - FIXED: positive for forward (w key)
    currentSpeed = speed * (keys.w ? 1 : -1); // Positive for forward, negative for backward
  }

  // Update Game Systems
  updateGameSystems(time, delta);

  // Update terrain system with current rover position
  terrainSystem.update(rover.position);

  // Basic collision detection - prevent going off the edge of the current terrain system
  const currentChunk = terrainSystem.getChunkCoords(rover.position.x, rover.position.z);
  const chunkDistance = Math.max(
    Math.abs(currentChunk.x - terrainSystem.currentChunk.x),
    Math.abs(currentChunk.z - terrainSystem.currentChunk.z)
  );

  // If we're too far from the current chunk center or outside the terrain bounds
  if (chunkDistance > terrainSystem.visibleRadius) {
    // Reset to previous position if going too far
    rover.position.x = previousPosition.x;
    rover.position.z = previousPosition.z;
    isMoving = false;
  }

  // Handle turning by updating the tracked yaw value
  if (keys.a || keys.d) {
    const turnDirection = keys.a ? 1 : -1;
    roverYaw += rotationSpeed * turnDirection;

    // Normalize roverYaw to keep it within 0-2π range to prevent floating point issues
    roverYaw = roverYaw % (Math.PI * 2);
    if (roverYaw < 0) roverYaw += Math.PI * 2;
    
    // Keep global variable in sync for mobile controls
    window.roverYaw = roverYaw;

    // Differential wheel rotation for turning - only update if moving
    if (isMoving) {
      // Optimize wheel rotation updates
      updateWheelRotation(wheels, currentSpeed, turnDirection);
      //createRoverTireTracks(); 
    }
  } else if (isMoving) {
    // Straight movement, all wheels rotate at the same speed
    // Only update every other frame for performance
    if (frameCount % 2 === 0) {
      wheels.forEach(wheel => {
        wheel.rotation.x += currentSpeed * 0.3;
      });
    }
  }

  // Position rover on terrain - throttle for performance
  if (frameCount % (frameThrottle * 2) === 0) {
    positionRoverOnTerrain();
  }

  // Update wheel suspension for realistic terrain following - throttled based on performance
  if (frameCount % frameThrottle === 0) {
    updateWheelSuspension(wheels, originalWheelPositions);
  }

  // Update camera position based on mode - throttle for performance
  if (frameCount % frameThrottle === 0) {
    updateCamera();
  }

  // Update dust particles - only when moving and throttled based on performance
  if (isMoving && frameCount % (frameThrottle * 2) === 0) {
    dustParticles.update(rover.position, isMoving);
  }

  // Only update controls in orbit mode and throttle updates
  if (cameraMode === 'orbit' && frameCount % 2 === 0) {
    controls.update();
  }

  // Render scene
  renderer.render(scene, camera);

  // Update distance traveled
  if (lastUpdateTime === 0) {
    lastUpdateTime = time;
  } else {
    const deltaTime = (time - lastUpdateTime) / 1000; // Convert to seconds
    lastUpdateTime = time;

      // Update atmospheric effects system (now that deltaTime is available)
  if (window.atmosphericEffects && rover) {
    window.atmosphericEffects.update(deltaTime * 1000, rover.position); // Convert back to milliseconds for consistency
  }

  // Update enhanced systems (missions, samples, etc.) - throttled for performance
  if (typeof updateEnhancedSystems === 'function' && rover && frameCount % (frameThrottle * 3) === 0) {
    // Update enhanced systems with reduced frequency on mobile
    if (!perfSettings.isMobile) {
      updateEnhancedSystems(deltaTime, rover.position);
    } else {
      // Mobile: Update with reduced functionality but keep essential systems working
      updateEnhancedSystems(deltaTime, rover.position);
    }
  }

  // Calculate distance based on current speed with scaling factor
  // Only add distance when moving forward (positive speed)
  if (currentSpeed > 0) {
    // Apply a scaling factor to make the distance more noticeable
    const scaledSpeed = currentSpeed * DISTANCE_SCALE_FACTOR;
    const speedInMilesPerSecond = scaledSpeed * 0.000621371;
    distanceTraveled += speedInMilesPerSecond * deltaTime;
  }

    // Update the HUD with the distance traveled
    if (distanceText) {
      distanceText.innerHTML = `Distance Traveled: ${distanceTraveled.toFixed(2)} miles`;
    }
  }

  // Update Mars Scene Manager and its events (throttled for performance)
  if (window.marsSceneManager && frameCount % frameThrottle === 0) {
    window.marsSceneManager.updateActiveEvents();
  }
  
  // Track frame time for performance monitoring
  window.lastFrameTime = time;
}

// Helper function to optimize wheel rotation updates
function updateWheelRotation(wheels, baseSpeed, turnDirection) {
  // Use a more efficient approach with fewer calculations
  const leftMultiplier = turnDirection === 1 ? 0.7 : 1.3;
  const rightMultiplier = turnDirection === 1 ? 1.3 : 0.7;

  // Update wheels in batches
  for (let i = 0; i < wheels.length; i++) {
    const multiplier = i % 2 === 0 ? leftMultiplier : rightMultiplier;
    wheels[i].rotation.x += baseSpeed * multiplier;
  }
}

function createRoverTireTracks() {
  // Function to add tire tracks at the wheel positions
  const addTireTrack = (x, z, width, depth, color) => {
    const trackGeometry = new THREE.PlaneGeometry(width, depth);
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat on the ground
    trackMesh.position.set(x, 0.01, z); // Slightly above the ground to avoid z-fighting
    scene.add(trackMesh);
  };

  // Get the color from the Mars terrain
  const marsTerrainColor = marsSurface.material.color;

  // Add tire tracks for each set of wheels
  // Line 747 is likely here, trying to use .forEach on something that's undefined
  // Make sure 'wheels' is defined and accessible in this scope
  if (!wheels || !Array.isArray(wheels)) {
    console.warn('Wheels array is not defined or not an array');
    return; // Exit the function if wheels is not available
  }

  // Now safely use forEach on the wheels array
  wheels.forEach(wheel => {
    // Your tire track creation logic
    const wheelPos = wheel.getWorldPosition(new THREE.Vector3());
    addTireTrack(wheelPos.x, wheelPos.z, 0.3, 1.5, marsTerrainColor.clone().multiplyScalar(0.8));
  });

  const tireTrackGeometry = new THREE.BufferGeometry();
  const tireTrackMaterial = new THREE.MeshBasicMaterial({
    color: marsTerrainColor,
    transparent: true,
    opacity: 0.5
  });

  const tireTrackMesh = new THREE.Mesh(tireTrackGeometry, tireTrackMaterial);
  scene.add(tireTrackMesh);

  return tireTrackMesh;
}

// Optimize the positionRoverOnTerrain function
function positionRoverOnTerrain() {
  // Reuse raycaster object instead of creating a new one each time
  if (!window.terrainRaycaster) {
    window.terrainRaycaster = new THREE.Raycaster();
    window.terrainRaycaster.ray.direction.set(0, -1, 0); // Cast ray downward
  }

  // Position the ray origin above the rover's current position
  window.terrainRaycaster.ray.origin.set(rover.position.x, 20, rover.position.z);

  // Get all active terrain chunks to check for intersections
  const terrainChunks = [];
  for (const chunk of terrainSystem.chunks.values()) {
    terrainChunks.push(chunk);
  }

  // If no chunks are available, use the main surface as fallback
  if (terrainChunks.length === 0) {
    terrainChunks.push(marsSurface);
  }

  // Check for intersections with all terrain chunks
  let closestIntersection = null;
  let closestDistance = Infinity;

  for (const chunk of terrainChunks) {
    const intersects = window.terrainRaycaster.intersectObject(chunk);

    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIntersection = intersects[0];
      }
    }
  }

  if (closestIntersection) {
    // Position the rover at the intersection point plus a smaller offset to be closer to ground
    rover.position.y = closestIntersection.point.y + 1.5;

    // Only calculate terrain alignment if the slope is significant
    const normal = closestIntersection.face.normal.clone();
    normal.transformDirection(closestIntersection.object.matrixWorld);

    // Create a temporary up vector
    const up = new THREE.Vector3(0, 1, 0);

    // Calculate the angle between the normal and up vector
    const angle = up.angleTo(normal);

    // Reset the rover's rotation
    rover.rotation.set(0, 0, 0);

    // First apply the yaw rotation (this is tracked separately)
    rover.rotateY(roverYaw);

    // Then apply terrain tilt if needed and angle is significant
    if (angle > 0.1 && angle < Math.PI / 6) {
      // Create rotation axis (perpendicular to both vectors)
      const axis = new THREE.Vector3().crossVectors(up, normal).normalize();

      // Create a quaternion for the terrain tilt
      const tiltQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.5);

      // Apply the tilt quaternion
      rover.quaternion.premultiply(tiltQuaternion);
    }
  } else {
    // Fallback if no intersection found
    rover.position.y = 1.5;

    // Just apply the yaw rotation
    rover.rotation.set(0, 0, 0);
    rover.rotateY(roverYaw);
  }
}

// Optimize the updateWheelSuspension function
function updateWheelSuspension(wheels, originalWheelPositions) {
  // Only update suspension every few frames to improve performance
  if (frameCount % FRAME_THROTTLE !== 0) return; // Skip frames based on throttle setting

  // Use a more efficient approach with fewer calculations
  wheels.forEach((wheel, index) => {
    // Only perform raycasting for wheels that are visible
    if (wheel.visible) {
      const currentY = wheel.position.y;
      wheel.position.y = currentY + (originalWheelPositions[index] - currentY) * 0.3;
    }
  });
}

// Optimize the updateCamera function
function updateCamera() {
  // Reuse vector objects to reduce garbage collection
  if (!window.cameraVectors) {
    window.cameraVectors = {
      offset: new THREE.Vector3(),
      target: new THREE.Vector3(),
      head: new THREE.Vector3(),
      forward: new THREE.Vector3()
    };
  }

  const vectors = window.cameraVectors;

  switch (cameraMode) {
    case 'thirdPerson':
      // Calculate the desired camera position in third-person view
      vectors.offset.copy(cameraOffset);

      // Rotate the offset based on the rover's yaw
      vectors.offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), roverYaw);

      // Add the offset to the rover's position
      vectors.target.set(
        rover.position.x + vectors.offset.x,
        rover.position.y + vectors.offset.y,
        rover.position.z + vectors.offset.z
      );

      // Smoothly move the camera to the target position
      camera.position.lerp(vectors.target, 0.05);

      // Make the camera look at the rover
      camera.lookAt(
        rover.position.x,
        rover.position.y + 1.5,
        rover.position.z
      );
      break;

    case 'firstPerson':
      // Position the camera at the rover's "head"
      vectors.head.set(
        rover.position.x,
        rover.position.y + 2.5,
        rover.position.z
      );

      // Get the forward direction based on the tracked yaw
      vectors.forward.set(0, 0, -1);
      vectors.forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), roverYaw);

      // Set camera position
      camera.position.copy(vectors.head);

      // Look in the direction the rover is facing
      camera.lookAt(
        vectors.head.x + vectors.forward.x * 10,
        vectors.head.y,
        vectors.forward.z * 10
      );
      break;

    case 'orbit':
      // In orbit mode, the OrbitControls handle the camera
      break;
  }
}

animate(0);
// Add a simple HUD to show camera mode
function createHUD() {
  const hudElement = document.createElement('div');
  hudElement.style.position = 'absolute';
  hudElement.style.bottom = '20px';
  hudElement.style.left = '20px';
  hudElement.style.color = 'white';
  hudElement.style.fontFamily = 'Arial, sans-serif';
  hudElement.style.fontSize = '16px';
  hudElement.style.padding = '10px';
  hudElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  hudElement.style.borderRadius = '5px';
  hudElement.style.pointerEvents = 'none'; // Don't interfere with mouse events
  hudElement.id = 'cameraHUD';
  // hudElement.innerHTML = '<p>Camera: Third Person Mode (Press C to change)<br /><br />Controls: W/A/S/D to move, Arrow keys to rotate camera</p>';
  document.body.appendChild(hudElement);

  // Create a text element for distance traveled
  distanceText = document.createElement('div');
  distanceText.style.position = 'absolute';
  distanceText.style.top = '20px';
  distanceText.style.left = '20px';
  distanceText.style.color = 'white';
  distanceText.style.fontSize = '16px';
  distanceText.style.fontFamily = 'Arial, sans-serif';
  distanceText.style.padding = '10px';
  distanceText.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  distanceText.style.borderRadius = '5px';
  distanceText.style.pointerEvents = 'none';
  distanceText.id = 'distanceHUD';
  //distanceText.innerHTML = 'Distance Traveled: 0.00 miles';
  document.body.appendChild(distanceText);

  // HUD update is now handled in the main keydown handler to prevent duplicate listeners
}

// Create the HUD
createHUD();

// Resize Window - using centralized event listener management
const resizeHandler = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.gameEventListeners.add(window, 'resize', resizeHandler);

function createRealisticMarsTerrain() {
  // Performance-adaptive terrain creation with mobile optimization
  const perfSettings = getPerformanceSettings();
  
  // Adaptive terrain parameters based on performance
  const terrainSize = perfSettings.isMobile ? 3000 : 
                     perfSettings.detailLevel === 'high' ? 5000 : 
                     perfSettings.detailLevel === 'normal' ? 3000 : 2000;
  
  const segments = perfSettings.isMobile ? 64 : 
                   perfSettings.detailLevel === 'high' ? 256 : 
                   perfSettings.detailLevel === 'normal' ? 128 : 64;
  
  const geometry = new THREE.PlaneGeometry(
    terrainSize,
    terrainSize,
    segments,
    segments
  );
  geometry.rotateX(-Math.PI / 2);

  // Apply performance-optimized noise to create realistic terrain elevation
  const positions = geometry.attributes.position.array;

  // Create terrain with adaptive detail based on performance settings
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];

    // Multi-layered noise for more realistic terrain (adaptive)
    let elevation = 0;
    
    if (perfSettings.isMobile) {
      // Mobile: Enhanced terrain generation based on device tier
      const mobileTier = perfSettings.mobileTier || 'low';
      
      // Base terrain features for all mobile devices
      const baseElevation = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 8 +
                           Math.sin(x * 0.02 + 5) * Math.cos(z * 0.015) * 6;
      
      // Add medium features for mid-range and high-end mobile
      const mediumFeatures = (mobileTier === 'medium' || mobileTier === 'high') ? 
        Math.sin(x * 0.03 + 2) * Math.cos(z * 0.025) * 4 +
        Math.sin(x * 0.05 + 1) * Math.cos(z * 0.04) * 2 : 0;
      
      // Add fine details for high-end mobile devices
      const fineFeatures = (mobileTier === 'high') ? 
        Math.sin(x * 0.08 + 3) * Math.cos(z * 0.06) * 1.5 +
        Math.sin(x * 0.12 + 4) * Math.cos(z * 0.09) * 1 : 0;
      
      // Add crater-like features for more interesting terrain
      const craterFeatures = Math.sin(x * 0.006) * Math.cos(z * 0.006) * 
                            Math.sin(x * 0.004 + 1) * Math.cos(z * 0.008) * 3;
      
      elevation = baseElevation + mediumFeatures + fineFeatures + craterFeatures;
    } else {
      // Desktop: Full terrain generation
      // Large features (mountains and valleys) - always included
      const largeFeatures = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 8 +
        Math.sin(x * 0.02 + 10) * Math.cos(z * 0.015) * 6;

      // Medium features (hills and craters) - included based on performance
      const mediumFeatures = perfSettings.detailLevel !== 'low' ? 
        Math.sin(x * 0.05) * Math.cos(z * 0.04) * 3 +
        Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06) * 2 : 0;

      // Small features (bumps and rocks) - only for high performance
      const smallFeatures = perfSettings.detailLevel === 'high' ? 
        Math.sin(x * 0.2 + 2) * Math.cos(z * 0.15) * 1 +
        Math.sin(x * 0.3 + 3) * Math.cos(z * 0.25) * 0.5 : 0;

      // Micro details - only for high performance
      const microDetails = perfSettings.detailLevel === 'high' ? 
        Math.sin(x * 0.8 + 4) * Math.cos(z * 0.6) * 0.3 : 0;

      // Combine all features with different weights
      elevation = largeFeatures + mediumFeatures + smallFeatures + microDetails;
    }

    // Add some random variation for more natural look
    const randomVariation = Math.random() * 0.5 - 0.25;
    elevation += randomVariation;

    // Add specific Martian features (adaptive based on performance)
    const featureMultiplier = perfSettings.detailLevel === 'high' ? 1.0 : 
                              perfSettings.detailLevel === 'normal' ? 0.6 : 0.3;

    // 1. Add impact craters
    const craterCount = Math.floor(15 * featureMultiplier);
    for (let c = 0; c < craterCount; c++) {
      const craterX = Math.sin(c * 1.1) * terrainSize * 0.4;
      const craterZ = Math.cos(c * 1.7) * terrainSize * 0.4;
      const craterSize = Math.random() * 30 + 10;

      const distanceToCenter = Math.sqrt(Math.pow(x - craterX, 2) + Math.pow(z - craterZ, 2));

      if (distanceToCenter < craterSize) {
        // Crater shape: raised rim, depressed center
        const normalizedDistance = distanceToCenter / craterSize;

        if (normalizedDistance < 0.8) {
          // Inside crater - depression
          const craterDepth = (0.8 - normalizedDistance) * 5;
          elevation -= craterDepth;
        } else if (normalizedDistance < 1.0) {
          // Crater rim - raised
          const rimHeight = (normalizedDistance - 0.8) * 10;
          elevation += rimHeight;
        }
      }
    }

    // 2. Add dried river beds
    const riverCount = Math.floor(5 * featureMultiplier);
    for (let r = 0; r < riverCount; r++) {
      const riverStartX = Math.sin(r * 2.1) * terrainSize * 0.4;
      const riverStartZ = Math.cos(r * 3.7) * terrainSize * 0.4;
      const riverEndX = Math.sin(r * 2.1 + 2) * terrainSize * 0.4;
      const riverEndZ = Math.cos(r * 3.7 + 2) * terrainSize * 0.4;

      // Calculate distance from point to line segment (river)
      const riverLength = Math.sqrt(Math.pow(riverEndX - riverStartX, 2) + Math.pow(riverEndZ - riverStartZ, 2));
      const riverDirX = (riverEndX - riverStartX) / riverLength;
      const riverDirZ = (riverEndZ - riverStartZ) / riverLength;

      const pointToStartX = x - riverStartX;
      const pointToStartZ = z - riverStartZ;

      const projection = pointToStartX * riverDirX + pointToStartZ * riverDirZ;
      const projectionX = riverStartX + riverDirX * Math.max(0, Math.min(riverLength, projection));
      const projectionZ = riverStartZ + riverDirZ * Math.max(0, Math.min(riverLength, projection));

      const distanceToRiver = Math.sqrt(Math.pow(x - projectionX, 2) + Math.pow(z - projectionZ, 2));

      if (distanceToRiver < 5 && projection > 0 && projection < riverLength) {
        // River bed - depression with smooth edges
        const riverDepth = Math.max(0, 3 - distanceToRiver) * 0.5;
        elevation -= riverDepth;

        // Add meanders
        const meander = Math.sin(projection * 0.1) * Math.min(1, distanceToRiver);
        elevation += meander * 0.3;
      }
    }

    // 3. Add sand dunes
    const duneCount = Math.floor(10 * featureMultiplier);
    for (let d = 0; d < duneCount; d++) {
      const duneX = Math.sin(d * 4.3) * terrainSize * 0.3;
      const duneZ = Math.cos(d * 5.9) * terrainSize * 0.3;
      const duneSize = Math.random() * 40 + 20;

      const distanceToDune = Math.sqrt(Math.pow(x - duneX, 2) + Math.pow(z - duneZ, 2));

      if (distanceToDune < duneSize) {
        // Dune shape: asymmetric with gentle slope on one side, steep on other
        const normalizedDistance = distanceToDune / duneSize;
        const angle = Math.atan2(z - duneZ, x - duneX);

        // Wind direction effect (asymmetric dunes)
        const windFactor = Math.cos(angle * 2 + d);

        const duneHeight = (1 - normalizedDistance) * 3 * (1 + windFactor * 0.5);
        elevation += duneHeight;
      }
    }

    // 3.1. Add ancient lake beds (more detailed than original)
    const lakeCount = Math.floor(4 * featureMultiplier);
    for (let l = 0; l < lakeCount; l++) {
      const lakeX = Math.sin(l * 3.7) * terrainSize * 0.35;
      const lakeZ = Math.cos(l * 2.9) * terrainSize * 0.35;
      const lakeRadius = 120 + Math.random() * 180;

      const distanceToLake = Math.sqrt(Math.pow(x - lakeX, 2) + Math.pow(z - lakeZ, 2));

      if (distanceToLake < lakeRadius * 1.3) {
        const normalizedDistance = distanceToLake / lakeRadius;
        
        if (normalizedDistance < 1) {
          // Lake bed - depression
          const lakeDepth = Math.pow(1 - normalizedDistance, 1.5) * 8;
          elevation -= lakeDepth;
        } else if (normalizedDistance < 1.3) {
          // Ancient shoreline with sediment deposits
          const shoreHeight = (normalizedDistance - 1) * 5;
          elevation += shoreHeight;
        }
      }
    }

    // 3.2. Add dramatic canyon systems
    const canyonCount = Math.floor(3 * featureMultiplier);
    for (let c = 0; c < canyonCount; c++) {
      const canyonStartX = Math.sin(c * 2.8) * terrainSize * 0.4;
      const canyonStartZ = Math.cos(c * 3.2) * terrainSize * 0.4;
      const canyonEndX = Math.sin(c * 2.8 + 2.5) * terrainSize * 0.4;
      const canyonEndZ = Math.cos(c * 3.2 + 2.5) * terrainSize * 0.4;

      // Canyon parameters
      const canyonLength = Math.sqrt(Math.pow(canyonEndX - canyonStartX, 2) + Math.pow(canyonEndZ - canyonStartZ, 2));
      const canyonDirX = (canyonEndX - canyonStartX) / canyonLength;
      const canyonDirZ = (canyonEndZ - canyonStartZ) / canyonLength;

      // Point projection onto canyon line
      const pointToStartX = x - canyonStartX;
      const pointToStartZ = z - canyonStartZ;
      const projection = pointToStartX * canyonDirX + pointToStartZ * canyonDirZ;
      const projectionX = canyonStartX + canyonDirX * Math.max(0, Math.min(canyonLength, projection));
      const projectionZ = canyonStartZ + canyonDirZ * Math.max(0, Math.min(canyonLength, projection));

      const distanceToCanyon = Math.sqrt(Math.pow(x - projectionX, 2) + Math.pow(z - projectionZ, 2));
      const canyonWidth = 60 + Math.sin(projection * 0.02) * 20;

      if (distanceToCanyon < canyonWidth && projection > 0 && projection < canyonLength) {
        const normalizedDistance = distanceToCanyon / canyonWidth;
        
        // Canyon depth varies along its length
        const canyonDepth = 15 + Math.sin(projection * 0.015) * 8;
        
        // Canyon profile: steep sides, flat bottom
        if (normalizedDistance < 0.3) {
          // Canyon floor
          elevation -= canyonDepth;
        } else if (normalizedDistance < 0.8) {
          // Canyon walls - steep
          const wallProfile = Math.pow((normalizedDistance - 0.3) / 0.5, 2);
          elevation -= canyonDepth * (1 - wallProfile);
        } else {
          // Canyon rim - slightly raised
          const rimHeight = (1 - normalizedDistance) * 2;
          elevation += rimHeight;
        }
      }
    }

    // 3.3. Add spectacular rock formations (mesas, buttes)
    const rockFormationCount = Math.floor(8 * featureMultiplier);
    for (let rf = 0; rf < rockFormationCount; rf++) {
      const rockX = Math.sin(rf * 4.1) * terrainSize * 0.3;
      const rockZ = Math.cos(rf * 3.6) * terrainSize * 0.3;
      const rockRadius = 40 + Math.random() * 60;
      const rockHeight = 20 + Math.random() * 30;

      const distanceToRock = Math.sqrt(Math.pow(x - rockX, 2) + Math.pow(z - rockZ, 2));

      if (distanceToRock < rockRadius * 1.2) {
        const normalizedDistance = distanceToRock / rockRadius;
        
        if (normalizedDistance < 1) {
          // Mesa/butte formation - flat top, steep sides
          const topRadius = rockRadius * 0.7;
          if (distanceToRock < topRadius) {
            // Flat top
            elevation += rockHeight;
          } else {
            // Steep sides
            const sideProfile = Math.pow((rockRadius - distanceToRock) / (rockRadius - topRadius), 3);
            elevation += rockHeight * sideProfile;
          }
        } else if (normalizedDistance < 1.2) {
          // Talus slopes around the formation
          const talusHeight = (1.2 - normalizedDistance) * 3;
          elevation += talusHeight;
        }
      }
    }

    // 4. Add mountain ranges
    const mountainRangeCount = Math.floor(5 * featureMultiplier);
    for (let m = 0; m < mountainRangeCount; m++) {
      // Define mountain range parameters
      const rangeStartX = Math.sin(m * 2.7) * terrainSize * 0.4;
      const rangeStartZ = Math.cos(m * 3.1) * terrainSize * 0.4;
      const rangeEndX = Math.sin(m * 2.7 + 1.5) * terrainSize * 0.4;
      const rangeEndZ = Math.cos(m * 3.1 + 1.5) * terrainSize * 0.4;

      // Calculate range direction and length
      const rangeLength = Math.sqrt(Math.pow(rangeEndX - rangeStartX, 2) + Math.pow(rangeEndZ - rangeStartZ, 2));
      const rangeDirX = (rangeEndX - rangeStartX) / rangeLength;
      const rangeDirZ = (rangeEndZ - rangeStartZ) / rangeLength;

      // Calculate point projection onto range line
      const pointToStartX = x - rangeStartX;
      const pointToStartZ = z - rangeStartZ;

      const projection = pointToStartX * rangeDirX + pointToStartZ * rangeDirZ;
      const projectionX = rangeStartX + rangeDirX * Math.max(0, Math.min(rangeLength, projection));
      const projectionZ = rangeStartZ + rangeDirZ * Math.max(0, Math.min(rangeLength, projection));

      // Calculate distance to mountain range spine
      const distanceToRange = Math.sqrt(Math.pow(x - projectionX, 2) + Math.pow(z - projectionZ, 2));

      // Mountain range width varies along its length - wider for smoother mountains
      const rangeWidth = 70 + Math.sin(projection * 0.03) * 20;

      if (distanceToRange < rangeWidth && projection > 0 && projection < rangeLength) {
        // Calculate mountain height based on distance from spine and position along range
        const normalizedDistance = distanceToRange / rangeWidth;

        // Height profile varies along the range - much smoother
        const baseHeight = 10 + Math.sin(projection * 0.01) * 4;

        // Create very gentle peaks and valleys along the range
        const peakVariation = Math.sin(projection * 0.03) * Math.cos(projection * 0.02 + m) * 2;

        // Much smoother slope profile
        const slopeProfile = Math.pow(1 - normalizedDistance, 1.5);

        // Calculate final mountain height - smoother
        const mountainHeight = (baseHeight + peakVariation) * slopeProfile;

        // Add very subtle rocky detail to mountains - no spikes
        const rockDetail = (
          Math.sin(x * 0.08 + z * 0.08) *
          Math.cos(x * 0.07 - z * 0.07) *
          (1 - normalizedDistance) * 0.4
        );

        elevation += mountainHeight + rockDetail;
      }
    }

    // 4.5 Add occasional very high mountains (rare and random)
    const highMountainCount = Math.floor(30 * featureMultiplier);
    for (let hm = 0; hm < highMountainCount; hm++) {
      // Random position for high mountains
      const mountainX = Math.sin(hm * 7.3 + 2.1) * terrainSize * 0.4;
      const mountainZ = Math.cos(hm * 8.7 + 1.5) * terrainSize * 0.4;

      // Make the mountain base wider than regular mountains
      const mountainRadius = 420 + Math.random() * 100;

      // Calculate distance to mountain center
      const distanceToMountain = Math.sqrt(Math.pow(x - mountainX, 2) + Math.pow(z - mountainZ, 2));

      // Only affect terrain within mountain radius
      if (distanceToMountain < mountainRadius) {
        // Normalized distance from center (0 at center, 1 at edge)
        const normalizedDistance = distanceToMountain / mountainRadius;

        // Very high peak height (2-3 times higher than regular mountains)
        const peakHeight = 30 + Math.random() * 15;

        // Steeper slope profile for dramatic mountains
        const slopeProfile = Math.pow(1 - normalizedDistance, 2);

        // Calculate mountain height with steep profile
        const highMountainHeight = peakHeight * slopeProfile;

        // Add some rocky detail to make it look more natural
        const rockDetail = (
          Math.sin(x * 0.05 + z * 0.06) *
          Math.cos(x * 0.06 - z * 0.05) *
          (1 - normalizedDistance) * 1.2
        );

        // Only add the mountain with a low probability to make them rare
        // This creates a 10% chance for each high mountain to actually appear
        if (Math.random() < 0.1) {
          elevation += highMountainHeight + rockDetail;
        }
      }
    }

    // 5. Add impact craters
    const impactCraterCount = Math.floor(25 * featureMultiplier);
    for (let c = 0; c < impactCraterCount; c++) {
      // Random crater position
      const craterX = (Math.random() * 2 - 1) * terrainSize * 0.8;
      const craterZ = (Math.random() * 2 - 1) * terrainSize * 0.8;

      // Random crater size (smaller craters are more common)
      const craterSize = Math.pow(Math.random(), 1.5) * 50 + 15;

      // Calculate distance from current point to crater center
      const distanceToCrater = Math.sqrt(Math.pow(x - craterX, 2) + Math.pow(z - craterZ, 2));

      // Only modify terrain if within crater influence
      if (distanceToCrater < craterSize * 1.5) {
        // Normalized distance (0 at center, 1 at rim)
        const normalizedDistance = distanceToCrater / craterSize;

        if (normalizedDistance < 1) {
          // Inside the crater - very smooth depression
          const craterDepth = -10.5 - craterSize * 0.18;

          // Crater shape: very smooth parabolic with subtle central peak for larger craters
          let craterProfile;
          if (craterSize > 45 && normalizedDistance < 0.3) {
            // Central peak for larger craters - very subtle
            const centralPeakHeight = craterSize * 0.04 * (1 - normalizedDistance * 3.3);
            craterProfile = craterDepth * (Math.pow(normalizedDistance, 2.2) - 1) + centralPeakHeight;
          } else {
            // Simple parabolic depression - very smooth
            craterProfile = craterDepth * (Math.pow(normalizedDistance, 2.2) - 1);
          }

          // Add extremely subtle noise to crater floor - no spikes
          const craterNoise = Math.sin(x * 0.2 + z * 0.2) * Math.cos(x * 0.18 - z * 0.18) * 0.15;

          elevation += craterProfile + craterNoise;
        } else if (normalizedDistance < 1.5) {
          // Crater rim and ejecta blanket - very smooth transition
          const rimFactor = Math.pow(1.5 - normalizedDistance, 2) * Math.pow(normalizedDistance - 0.8, 2);
          const rimHeight = craterSize * 0.06 * rimFactor * 4;

          // Add minimal variation to the rim
          const rimVariation = Math.sin(Math.atan2(z - craterZ, x - craterX) * 4) * 0.1;

          elevation += rimHeight * (1 + rimVariation);
        }
      }
    }

    // 6. Add gentle rocky terrain detail - no spikes
    const rockyDetail = (
      Math.sin(x * 0.05 + z * 0.06) *
      Math.cos(x * 0.055 - z * 0.045) *
      0.4 +
      Math.sin(x * 0.025 - z * 0.03) *
      Math.cos(x * 0.02 + z * 0.035) *
      0.3
    );

    elevation += rockyDetail;

    // 7. Apply smoothing to entire terrain
    const smoothingFactor = 0.8;
    elevation = elevation * smoothingFactor;

    positions[i + 1] = elevation;
  }

  geometry.computeVertexNormals();

  // MOBILE EMERGENCY: Use basic material without textures to prevent WebGL context issues
  const terrainPerfSettings = getPerformanceSettings();
  let material;
  
  if (terrainPerfSettings.isMobile || true) { // Force basic materials on ALL devices
    // Use basic material without textures - no additional WebGL contexts
    material = new THREE.MeshBasicMaterial({
      color: 0xaa6633,  // Martian reddish-brown color
      side: THREE.DoubleSide,
      transparent: false,
      fog: true // Allow fog to affect material for depth
    });
    console.log('Emergency: Using basic terrain material without textures');
  } else {
    // This branch should not execute in emergency mode
    material = new THREE.MeshBasicMaterial({
      color: 0xaa6633,
      side: THREE.DoubleSide
    });
  }

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;

  // 7. Add color variation to the terrain
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const positionArray = geometry.attributes.position.array;

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const elevation = positionArray[i * 3 + 1];

    // Base color components (darker Mars red)
    let r = 0.545; // Base red
    let g = 0.271; // Base green
    let b = 0.075; // Base blue

    // Adjust color based on elevation
    if (elevation > 5) {
      // Higher terrain slightly lighter
      const factor = Math.min((elevation - 5) / 15, 0.2);
      r += factor;
      g += factor;
      b += factor;
    } else if (elevation < -2) {
      // Craters and low areas slightly darker
      const factor = Math.min((-elevation - 2) / 5, 0.2);
      r -= factor;
      g -= factor;
      b -= factor;
    }

    // Add subtle random variation
    const variation = (Math.random() - 0.5) * 0.05;
    r += variation;
    g += variation;
    b += variation;

    // Set the colors
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  material.vertexColors = true;

  return terrain;
}

// Create a realistic Mars texture - EMERGENCY MOBILE MODE
function createRealisticMarsTexture() {
  const marsPerfSettings = getPerformanceSettings();
  
  // Force minimal texture size on ALL devices to prevent WebGL context issues
  const textureSize = 64; // Ultra minimal texture size
  
  const canvas = document.createElement('canvas');
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext('2d');
  
  // MOBILE EMERGENCY: Return solid color instead of complex texture
  if (marsPerfSettings.isMobile) {
    context.fillStyle = '#a83c0c'; // Simple Mars red color
    context.fillRect(0, 0, textureSize, textureSize);
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false; // Prevent additional GPU load
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // Base color - deeper reddish-orange like in the reference image
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#a83c0c');
  gradient.addColorStop(0.3, '#8a3208');
  gradient.addColorStop(0.6, '#9c3a0a');
  gradient.addColorStop(1, '#7a2e08');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Add large regional variations
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 500 + 200;

    const gradient = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    // Random variation of Mars colors - darker and more varied like in the image
    const colorType = Math.random();
    let color1, color2;

    if (colorType < 0.33) {
      // Darker regions (iron-rich)
      color1 = '#6a2208';
      color2 = '#7a2a08';
    } else if (colorType < 0.66) {
      // Medium reddish regions
      color1 = '#9c3a0a';
      color2 = '#8a3208';
    } else {
      // More brownish regions (clay minerals)
      color1 = '#704020';
      color2 = '#603010';
    }

    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    context.globalAlpha = 0.6;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1.0;
  }

  // Add more visible rock formations like in the reference image
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 30 + 10;

    // Random rock color
    const rockColor = Math.random() < 0.5 ?
      `rgba(${60 + Math.random() * 30}, ${30 + Math.random() * 20}, ${20 + Math.random() * 10}, 0.7)` :
      `rgba(${100 + Math.random() * 40}, ${50 + Math.random() * 30}, ${30 + Math.random() * 20}, 0.7)`;

    context.fillStyle = rockColor;
    context.beginPath();

    // Create irregular rock shapes
    context.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      const angle = j * Math.PI / 3;
      const distance = size * (0.7 + Math.random() * 0.6);
      context.lineTo(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance
      );
    }
    context.closePath();
    context.fill();
  }

  // Add dust deposits
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 200 + 50;

    const gradient = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    gradient.addColorStop(0, 'rgba(200, 150, 120, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 150, 120, 0)');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// Create a normal map for Mars terrain
function createMarsNormalMap() {
  const perfSettings = getPerformanceSettings();
  const textureSize = Math.min(perfSettings.textureSize || 1024, 1024); // Cap at 1024 for normal maps
  
  const canvas = document.createElement('canvas');
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext('2d');

  // Fill with neutral normal (128, 128, 255)
  context.fillStyle = 'rgb(128, 128, 255)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Add various bumps and details
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 10 + 2;

    // Create a radial gradient for each bump
    const gradient = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    // Random bump direction
    const angle = Math.random() * Math.PI * 2;
    const r = 128 + Math.cos(angle) * 50;
    const g = 128 + Math.sin(angle) * 50;

    gradient.addColorStop(0, `rgb(${r}, ${g}, 255)`);
    gradient.addColorStop(1, 'rgb(128, 128, 255)');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  // Add some larger features
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 30 + 10;

    // Create a radial gradient for each feature
    const gradient = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    // Random feature direction
    const angle = Math.random() * Math.PI * 2;
    const r = 128 + Math.cos(angle) * 50;
    const g = 128 + Math.sin(angle) * 50;

    gradient.addColorStop(0, `rgb(${r}, ${g}, 255)`);
    gradient.addColorStop(1, 'rgb(128, 128, 255)');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// Create a roughness map
function createMarsRoughnessMap() {
  const perfSettings = getPerformanceSettings();
  const textureSize = Math.min(perfSettings.textureSize || 1024, 1024); // Cap at 1024 for roughness maps
  
  const canvas = document.createElement('canvas');
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext('2d');

  // Fill with neutral roughness (0.85)
  context.fillStyle = 'rgb(136, 136, 136)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Add some random variations
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 10 + 2;

    // Random variation
    const randomVariation = Math.random() * 0.1 - 0.05;
    const roughness = 0.85 + randomVariation;

    context.fillStyle = `rgb(${Math.round(roughness * 255)}, ${Math.round(roughness * 255)}, ${Math.round(roughness * 255)})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// Create a skybox with Milky Way and planets - improved dome-like version
function createSpaceSkybox() {
  console.log("Creating skybox...");

  // Use a higher-resolution sphere for smoother appearance
  const skyboxGeometry = new THREE.SphereGeometry(6000, 256, 256);

  // Create a higher resolution texture - capped to prevent memory issues
  const texture = createSphericalSkyTexture(perfSettings.isMobile ? 1024 : 4096); // Cap at 4096 for desktop, 1024 for mobile

  // Apply advanced texture filtering for smoother appearance
  texture.minFilter = THREE.LinearMipmapLinearFilter; // Use trilinear filtering
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true; // Enable mipmaps for better distance rendering

  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: false,
    transparent: true,
    opacity: 1.0,
    depthWrite: false
  });

  // Create the skybox mesh
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

  // Ensure skybox is visible by explicitly setting these properties
  skybox.renderOrder = -1000;
  skybox.frustumCulled = false;

  console.log("Skybox created successfully");

  return skybox;
}

// Create a single spherical texture for the dome-like skybox
function createSphericalSkyTexture(size = null) {
  // Use performance-appropriate size
  const perfSettings = getPerformanceSettings();
  if (!size) {
    size = perfSettings.skyboxResolution || 2048;
  }
  
  // Create a performance-appropriate canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  // Fill with deep space black with subtle gradient
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, '#000008');
  gradient.addColorStop(0.7, '#000005');
  gradient.addColorStop(1, '#000002');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Add nebulae and cosmic dust first (background layer)
  addCosmicNebulae(context, size);
  addDistantGalaxies(context, size);
  
  // Add stars and other elements with higher quality
  addBrighterBackgroundStars(context, size);
  addBrighterMidLayerStars(context, size);
  addBrighterForegroundStars(context, size);
  addBrighterMilkyWay(context, size);

  // Add atmospheric glow for realism
  addAtmosphericGlow(context, size);

  // Add some distant planets (including Earth visible as a pale blue dot)
  addPlanetToCanvas(context, size * 0.8, size * 0.2, size * 0.03, '#A67B5B'); // Mars in distance
  addPlanetToCanvas(context, size * 0.15, size * 0.75, size * 0.02, '#C8A080', true); // Saturn-like
  addPlanetToCanvas(context, size * 0.6, size * 0.4, size * 0.008, '#6BA6CD'); // Earth as pale blue dot

  // Apply a subtle blur to reduce pixelation
  context.filter = 'blur(0px)';
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempContext = tempCanvas.getContext('2d');
  tempContext.drawImage(canvas, 0, 0);
  context.clearRect(0, 0, size, size);
  context.drawImage(tempCanvas, 0, 0);
  context.filter = 'none';

  // Create texture with proper settings
  const texture = new THREE.CanvasTexture(canvas);

  return texture;
}

// Add cosmic nebulae for background depth
function addCosmicNebulae(context, size) {
  const perfSettings = getPerformanceSettings();
  const nebulaeCount = perfSettings.detailLevel === 'high' ? 8 : 
                       perfSettings.detailLevel === 'normal' ? 5 : 3;
  
  for (let i = 0; i < nebulaeCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * size * 0.15 + size * 0.05;
    
    // Create nebula gradient
    const nebula = context.createRadialGradient(x, y, 0, x, y, radius);
    
    // Random nebula colors
    const colorType = Math.random();
    if (colorType < 0.3) {
      // Red nebulae (like Orion)
      nebula.addColorStop(0, 'rgba(255, 100, 100, 0.15)');
      nebula.addColorStop(0.5, 'rgba(200, 50, 50, 0.08)');
      nebula.addColorStop(1, 'rgba(100, 20, 20, 0)');
    } else if (colorType < 0.6) {
      // Blue nebulae
      nebula.addColorStop(0, 'rgba(100, 150, 255, 0.12)');
      nebula.addColorStop(0.5, 'rgba(50, 100, 200, 0.06)');
      nebula.addColorStop(1, 'rgba(20, 50, 100, 0)');
    } else {
      // Purple/magenta nebulae
      nebula.addColorStop(0, 'rgba(200, 100, 255, 0.10)');
      nebula.addColorStop(0.5, 'rgba(150, 50, 200, 0.05)');
      nebula.addColorStop(1, 'rgba(100, 20, 150, 0)');
    }
    
    context.fillStyle = nebula;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

// Add distant galaxies
function addDistantGalaxies(context, size) {
  const perfSettings = getPerformanceSettings();
  const galaxyCount = perfSettings.detailLevel === 'high' ? 4 : 
                      perfSettings.detailLevel === 'normal' ? 2 : 1;
  
  for (let i = 0; i < galaxyCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const width = Math.random() * size * 0.08 + size * 0.02;
    const height = width * (0.3 + Math.random() * 0.4);
    const rotation = Math.random() * Math.PI * 2;
    
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    
    // Create galaxy spiral gradient
    const galaxy = context.createRadialGradient(0, 0, 0, 0, 0, width / 2);
    galaxy.addColorStop(0, 'rgba(255, 255, 220, 0.08)');
    galaxy.addColorStop(0.3, 'rgba(255, 255, 180, 0.05)');
    galaxy.addColorStop(0.7, 'rgba(255, 255, 150, 0.02)');
    galaxy.addColorStop(1, 'rgba(255, 255, 100, 0)');
    
    context.fillStyle = galaxy;
    context.fillRect(-width / 2, -height / 2, width, height);
    
    // Add galaxy core
    const core = context.createRadialGradient(0, 0, 0, 0, 0, width * 0.1);
    core.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 0, width * 0.1, 0, Math.PI * 2);
    context.fill();
    
    context.restore();
  }
}

// Add much brighter background stars
function addBrighterBackgroundStars(context, size) {
  // Adaptive star density based on performance settings
  const perfSettings = getPerformanceSettings();
  const densityMultiplier = perfSettings.detailLevel === 'high' ? 1.0 : 
                            perfSettings.detailLevel === 'normal' ? 0.6 : 0.3;
  const starCount = Math.floor(size * size / 50 * densityMultiplier);

  for (let i = 0; i < starCount; i++) {
    // Create cluster-like distribution
    let x, y;

    // 70% of stars are in subtle clusters, 30% are more random
    if (Math.random() < 0.7) {
      // Create cluster centers scattered throughout the sky
      const clusterCount = 20;
      const clusterIndex = Math.floor(Math.random() * clusterCount);
      const clusterCenterX = (clusterIndex % 5) * (size / 5) + (size / 10);
      const clusterCenterY = Math.floor(clusterIndex / 5) * (size / 4) + (size / 8);

      // Distribute stars around cluster centers with Gaussian-like distribution
      const distance = Math.pow(Math.random(), 2) * size / 4;
      const angle = Math.random() * Math.PI * 2;
      x = clusterCenterX + Math.cos(angle) * distance;
      y = clusterCenterY + Math.sin(angle) * distance;

      // Ensure coordinates are within canvas
      x = Math.max(0, Math.min(size - 1, x));
      y = Math.max(0, Math.min(size - 1, y));
    } else {
      // Random distribution for remaining stars
      x = Math.random() * size;
      y = Math.random() * size;
    }

    // Slightly larger radius for better visibility
    const radius = Math.random() * 0.6 + 0.2;

    // Much brighter stars for visibility
    const colorVariation = Math.random();
    let starColor;

    if (colorVariation < 0.75) {
      // White to slightly blue stars (most common)
      const blueIntensity = 220 + Math.floor(Math.random() * 35);
      const brightness = Math.random() * 0.4 + 0.1;  // Much brighter
      starColor = `rgba(220, 220, ${blueIntensity}, ${brightness})`;
    } else if (colorVariation < 0.9) {
      // Slightly yellow/orange stars
      const redGreen = 220 + Math.floor(Math.random() * 35);
      const brightness = Math.random() * 0.4 + 0.1;  // Much brighter
      starColor = `rgba(${redGreen}, ${redGreen - 10}, 200, ${brightness})`;
    } else {
      // Slightly red stars (least common)
      const brightness = Math.random() * 0.4 + 0.1;  // Much brighter
      starColor = `rgba(220, 180, 180, ${brightness})`;
    }

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = starColor;
    context.fill();
  }
}

// Add brighter mid-layer stars
function addBrighterMidLayerStars(context, size) {
  // Adaptive medium density star layer
  const perfSettings = getPerformanceSettings();
  const densityMultiplier = perfSettings.detailLevel === 'high' ? 1.0 : 
                            perfSettings.detailLevel === 'normal' ? 0.6 : 0.3;
  const starCount = Math.floor(size * size / 300 * densityMultiplier);

  for (let i = 0; i < starCount; i++) {
    let x, y;

    // Similar clustering as background layer but with different distribution
    if (Math.random() < 0.6) {
      const clusterCount = 15;
      const clusterIndex = Math.floor(Math.random() * clusterCount);
      const clusterCenterX = (clusterIndex % 5) * (size / 5) + (size / 10) + (Math.random() - 0.5) * size / 10;
      const clusterCenterY = Math.floor(clusterIndex / 3) * (size / 3) + (size / 6) + (Math.random() - 0.5) * size / 10;

      const distance = Math.pow(Math.random(), 1.5) * size / 6;
      const angle = Math.random() * Math.PI * 2;
      x = clusterCenterX + Math.cos(angle) * distance;
      y = clusterCenterY + Math.sin(angle) * distance;

      x = Math.max(0, Math.min(size - 1, x));
      y = Math.max(0, Math.min(size - 1, y));
    } else {
      x = Math.random() * size;
      y = Math.random() * size;
    }

    // Larger stars for better visibility
    const radius = Math.random() * 1.0 + 0.3;

    // Much brighter stars
    const colorVariation = Math.random();
    let starColor;

    if (colorVariation < 0.75) {
      // White to slightly blue stars (most common)
      const blueIntensity = 225 + Math.floor(Math.random() * 30);
      const brightness = Math.random() * 0.5 + 0.2;  // Much brighter
      starColor = `rgba(255, 255, ${blueIntensity}, ${brightness})`;
    } else if (colorVariation < 0.9) {
      // Slightly yellow/orange stars
      const redGreen = 225 + Math.floor(Math.random() * 30);
      const blue = 180 + Math.floor(Math.random() * 20);
      const brightness = Math.random() * 0.5 + 0.2;  // Much brighter
      starColor = `rgba(${redGreen}, ${redGreen - 5}, ${blue}, ${brightness})`;
    } else {
      // Slightly red stars (least common)
      const brightness = Math.random() * 0.5 + 0.2;  // Much brighter
      starColor = `rgba(255, 200, 200, ${brightness})`;
    }

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = starColor;
    context.fill();
  }
}

// Add brighter foreground stars
function addBrighterForegroundStars(context, size) {
  // Adaptive brighter stars count
  const perfSettings = getPerformanceSettings();
  const densityMultiplier = perfSettings.detailLevel === 'high' ? 1.0 : 
                            perfSettings.detailLevel === 'normal' ? 0.6 : 0.3;
  const brightStarCount = Math.floor(size * size / 3000 * densityMultiplier);

  for (let i = 0; i < brightStarCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    // Larger stars for visibility
    const radius = Math.random() * 1.5 + 0.6;

    // Vary bright star colors for realism
    const colorVariation = Math.random();
    let coreColor, glowColor;

    if (colorVariation < 0.6) {
      // White/blue stars
      coreColor = 'rgba(255, 255, 255, 1.0)';  // Full opacity
      glowColor = 'rgba(240, 250, 255, 0.7)';  // More visible glow
    } else if (colorVariation < 0.85) {
      // Yellow/orange stars
      coreColor = 'rgba(255, 250, 230, 1.0)';  // Full opacity
      glowColor = 'rgba(255, 240, 190, 0.7)';  // More visible glow
    } else {
      // Red stars
      coreColor = 'rgba(255, 230, 230, 1.0)';  // Full opacity
      glowColor = 'rgba(255, 190, 190, 0.7)';  // More visible glow
    }

    // Create a more prominent glow
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.0);
    gradient.addColorStop(0, coreColor);
    gradient.addColorStop(0.5, glowColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.beginPath();
    context.arc(x, y, radius * 3.0, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();

    // Star core
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = coreColor;
    context.fill();

    // Add subtle diffraction spikes to only the brightest stars
    if (Math.random() > 0.5) { // More stars get spikes (50% vs 30% before)
      const spikeLength = radius * (Math.random() * 3 + 3); // Longer spikes
      context.strokeStyle = glowColor;
      context.lineWidth = Math.random() * 0.7 + 0.3; // Slightly thicker spikes

      // Horizontal spike
      context.beginPath();
      context.moveTo(x - spikeLength, y);
      context.lineTo(x + spikeLength, y);
      context.stroke();

      // Vertical spike
      context.beginPath();
      context.moveTo(x, y - spikeLength);
      context.lineTo(x, y + spikeLength);
      context.stroke();

      // More stars get diagonal spikes (30% vs 10% before)
      if (Math.random() > 0.7) {
        const diagonalLength = spikeLength * 0.7;

        // Diagonal spike 1
        context.beginPath();
        context.moveTo(x - diagonalLength * 0.7, y - diagonalLength * 0.7);
        context.lineTo(x + diagonalLength * 0.7, y + diagonalLength * 0.7);
        context.stroke();

        // Diagonal spike 2
        context.beginPath();
        context.moveTo(x - diagonalLength * 0.7, y + diagonalLength * 0.7);
        context.lineTo(x + diagonalLength * 0.7, y - diagonalLength * 0.7);
        context.stroke();
      }
    }
  }
}

// Add a brighter Milky Way
function addBrighterMilkyWay(context, size) {
  // Create a wide, sweeping Milky Way band across the sky
  const centerY = size * 0.5;
  const bandWidth = size * 0.5; // Wider band for better visibility

  // Use screen blend mode for brighter appearance
  context.globalCompositeOperation = 'screen';

  // Main Milky Way band - brighter
  const mainGradient = context.createLinearGradient(0, centerY - bandWidth / 2, 0, centerY + bandWidth / 2);
  mainGradient.addColorStop(0, 'rgba(10, 20, 40, 0)');
  mainGradient.addColorStop(0.2, 'rgba(30, 40, 70, 0.2)'); // Brighter
  mainGradient.addColorStop(0.5, 'rgba(40, 50, 90, 0.3)'); // Brighter
  mainGradient.addColorStop(0.8, 'rgba(30, 40, 70, 0.2)'); // Brighter
  mainGradient.addColorStop(1, 'rgba(10, 20, 40, 0)');

  context.fillStyle = mainGradient;
  context.fillRect(0, centerY - bandWidth / 2, size, bandWidth);

  // Secondary bands for more complexity
  const secondaryBandCount = 4;
  for (let i = 0; i < secondaryBandCount; i++) {
    const bandPosition = centerY + (Math.random() - 0.5) * bandWidth * 0.6;
    const bandThickness = size * (0.08 + Math.random() * 0.12);

    const secondaryGradient = context.createLinearGradient(0, bandPosition - bandThickness / 2, 0, bandPosition + bandThickness / 2);
    secondaryGradient.addColorStop(0, 'rgba(15, 25, 50, 0)');
    secondaryGradient.addColorStop(0.5, 'rgba(40, 60, 100, 0.25)'); // Brighter
    secondaryGradient.addColorStop(1, 'rgba(15, 25, 50, 0)');

    context.fillStyle = secondaryGradient;
    context.fillRect(0, bandPosition - bandThickness / 2, size, bandThickness);
  }

  // Reset blend mode
  context.globalCompositeOperation = 'source-over';

  // Add a few subtle dust lanes
  const dustLaneCount = 4;
  for (let i = 0; i < dustLaneCount; i++) {
    const laneY = centerY + (Math.random() - 0.5) * bandWidth * 0.7;
    const laneThickness = size * (0.01 + Math.random() * 0.03);
    const laneOpacity = Math.random() * 0.2 + 0.05;

    // Draw curved dust lane
    context.beginPath();
    context.moveTo(0, laneY);

    // Create wavy path for dust lane
    const segments = 20;
    for (let j = 1; j <= segments; j++) {
      const x = size * j / segments;
      const waveAmplitude = Math.random() * laneThickness * 4;
      const waveFrequency = 2 + Math.random() * 3;
      const y = laneY + Math.sin(j * waveFrequency) * waveAmplitude;

      if (j === 1) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.strokeStyle = `rgba(0, 0, 0, ${laneOpacity})`;
    context.lineWidth = laneThickness;
    context.stroke();
  }

  // Add brighter nebula-like clouds
  const nebulaCount = 30;
  for (let i = 0; i < nebulaCount; i++) {
    // Position nebulae along the Milky Way band with some variation
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.35;
    const cloudX = size / 2 + Math.cos(angle) * distance;
    const cloudY = size / 2 + Math.sin(angle) * distance;
    const cloudRadius = Math.random() * size * 0.1 + size * 0.03; // Larger nebulae

    const cloudGradient = context.createRadialGradient(
      cloudX, cloudY, 0,
      cloudX, cloudY, cloudRadius
    );

    // More visible nebula colors
    const colorType = Math.random();
    let hue, saturation, lightness, opacity;

    if (colorType < 0.4) {
      // Blue to purple nebulae
      hue = Math.floor(Math.random() * 60 + 200);
      saturation = 50 + Math.floor(Math.random() * 20);
      lightness = 40 + Math.floor(Math.random() * 15);
      opacity = 0.15 + Math.random() * 0.15; // Brighter
    } else if (colorType < 0.75) {
      // Red to orange nebulae
      hue = Math.floor(Math.random() * 40);
      saturation = 50 + Math.floor(Math.random() * 20);
      lightness = 40 + Math.floor(Math.random() * 15);
      opacity = 0.15 + Math.random() * 0.15; // Brighter
    } else if (colorType < 0.9) {
      // Teal to green nebulae
      hue = Math.floor(Math.random() * 40 + 160);
      saturation = 40 + Math.floor(Math.random() * 20);
      lightness = 35 + Math.floor(Math.random() * 15);
      opacity = 0.15 + Math.random() * 0.15; // Brighter
    } else {
      // Pink to magenta nebulae (rare)
      hue = Math.floor(Math.random() * 30 + 300);
      saturation = 50 + Math.floor(Math.random() * 20);
      lightness = 40 + Math.floor(Math.random() * 15);
      opacity = 0.15 + Math.random() * 0.15; // Brighter
    }

    // Use screen blend mode for brighter effect
    context.globalCompositeOperation = 'screen';

    cloudGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`);
    cloudGradient.addColorStop(0.5, `hsla(${hue}, ${saturation - 10}%, ${lightness - 5}%, ${opacity * 0.6})`);
    cloudGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

    context.fillStyle = cloudGradient;
    context.beginPath();
    context.arc(cloudX, cloudY, cloudRadius, 0, Math.PI * 2);
    context.fill();

    // Reset blend mode
    context.globalCompositeOperation = 'source-over';

    // Add stars within nebulae
    const clusterStarCount = Math.floor(Math.random() * 25 + 15);
    for (let j = 0; j < clusterStarCount; j++) {
      // Position stars within the nebula
      const starAngle = Math.random() * Math.PI * 2;
      const starDistance = Math.random() * cloudRadius * 0.8;
      const starX = cloudX + Math.cos(starAngle) * starDistance;
      const starY = cloudY + Math.sin(starAngle) * starDistance;
      const starRadius = Math.random() * 0.6 + 0.2;

      // Brighter stars in the nebula
      context.beginPath();
      context.arc(starX, starY, starRadius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.2})`; // Brighter
      context.fill();
    }
  }

  // Add a brighter galactic core
  context.globalCompositeOperation = 'screen';

  const coreGradient = context.createRadialGradient(
    size * 0.6, size * 0.5, 0,
    size * 0.6, size * 0.5, size * 0.2
  );

  coreGradient.addColorStop(0, 'rgba(80, 70, 60, 0.3)'); // Brighter
  coreGradient.addColorStop(0.2, 'rgba(70, 60, 50, 0.25)'); // Brighter
  coreGradient.addColorStop(0.5, 'rgba(60, 50, 40, 0.2)'); // Brighter
  coreGradient.addColorStop(0.8, 'rgba(50, 40, 30, 0.1)'); // Brighter
  coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(size * 0.6, size * 0.5, size * 0.2, 0, Math.PI * 2);
  context.fill();

  // Add dense star field in the galactic core
  for (let i = 0; i < 400; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.15;
    const x = size * 0.6 + Math.cos(angle) * distance;
    const y = size * 0.5 + Math.sin(angle) * distance;
    const radius = Math.random() * 0.7 + 0.2;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`; // Brighter
    context.fill();
  }

  // Add central bulge
  const bulgeGradient = context.createRadialGradient(
    size * 0.6, size * 0.5, 0,
    size * 0.6, size * 0.5, size * 0.07
  );

  bulgeGradient.addColorStop(0, 'rgba(90, 80, 70, 0.25)'); // Brighter
  bulgeGradient.addColorStop(0.5, 'rgba(80, 70, 60, 0.2)'); // Brighter
  bulgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = bulgeGradient;
  context.beginPath();
  context.arc(size * 0.6, size * 0.5, size * 0.07, 0, Math.PI * 2);
  context.fill();

  // Reset blend mode
  context.globalCompositeOperation = 'source-over';
}

// Add atmospheric glow at the horizon
function addAtmosphericGlow(context, size) {
  // Create a subtle atmospheric glow at the bottom of the sky
  context.save();

  // Bottom atmospheric glow (Mars-like reddish)
  const bottomGradient = context.createLinearGradient(0, size * 0.8, 0, size);
  bottomGradient.addColorStop(0, 'rgba(120, 50, 30, 0)');
  bottomGradient.addColorStop(0.6, 'rgba(150, 70, 40, 0.15)');
  bottomGradient.addColorStop(1, 'rgba(180, 90, 50, 0.3)');

  context.globalCompositeOperation = 'screen';
  context.fillStyle = bottomGradient;
  context.fillRect(0, size * 0.8, size, size * 0.2);

  // Add some atmospheric haze particles
  context.globalCompositeOperation = 'screen';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = size * 0.8 + Math.random() * (size * 0.2);
    const radius = Math.random() * 2 + 1;
    const opacity = Math.random() * 0.15;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(200, 150, 120, ${opacity})`;
    context.fill();
  }

  // Add subtle light rays from the horizon
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size;
    const width = Math.random() * size * 0.1 + size * 0.05;
    const height = Math.random() * size * 0.3 + size * 0.1;
    const opacity = Math.random() * 0.1 + 0.05;

    const rayGradient = context.createLinearGradient(x, size, x, size - height);
    rayGradient.addColorStop(0, `rgba(255, 200, 150, ${opacity})`);
    rayGradient.addColorStop(1, 'rgba(255, 200, 150, 0)');

    context.fillStyle = rayGradient;
    context.fillRect(x - width / 2, size - height, width, height);
  }

  // Reset blend mode
  context.globalCompositeOperation = 'source-over';
  context.restore();
}

// Add a planet to the canvas - optimized version
function addPlanetToCanvas(context, x, y, radius, color, hasRings = false) {
  // Planet base
  const planetGradient = context.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  );
  planetGradient.addColorStop(0, lightenColor(color, 50));
  planetGradient.addColorStop(0.7, color);
  planetGradient.addColorStop(1, darkenColor(color, 30));

  context.fillStyle = planetGradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  // If it's the Saturn-like planet and hasRings is true, add rings
  if (hasRings) {
    // Draw rings
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 6); // Tilt the rings
    context.scale(1, 0.2); // Flatten to create ellipse

    // Outer ring - simplified
    context.fillStyle = 'rgba(210, 180, 140, 0.7)';
    context.beginPath();
    context.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
    context.arc(0, 0, radius * 1.2, 0, Math.PI * 2, true); // Inner circle (counterclockwise)
    context.fill();

    context.restore();
  }
}

// Helper function to lighten a color - optimized
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Helper function to darken a color - optimized
function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Lazy loading system for non-essential components
class LazyLoader {
  constructor() {
    this.loadedComponents = new Set();
    this.loadingPromises = new Map();
    this.loadQueue = [];
    this.isLoading = false;
  }

  async loadComponent(componentName, loadFunction, priority = 'normal') {
    if (this.loadedComponents.has(componentName)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const promise = new Promise(async (resolve, reject) => {
      try {
        console.log(`Loading component: ${componentName}`);
        await loadFunction();
        this.loadedComponents.add(componentName);
        console.log(`Component loaded: ${componentName}`);
        resolve();
      } catch (error) {
        console.error(`Error loading component ${componentName}:`, error);
        reject(error);
      } finally {
        this.loadingPromises.delete(componentName);
      }
    });

    this.loadingPromises.set(componentName, promise);
    return promise;
  }

  async loadInBackground(componentName, loadFunction) {
    // Load component in the background without blocking - faster for immediate response
    setTimeout(() => {
      this.loadComponent(componentName, loadFunction, 'background');
    }, 10);
  }
}

// Initialize lazy loader
const lazyLoader = new LazyLoader();

// Initialize scene elements with lazy loading
function initializeScene() {
  console.log("Initializing core scene elements...");

  // Load essential components immediately
  loadCoreComponents();
  
  // Load non-essential components in background - reduced delay for faster startup
  setTimeout(() => {
    loadNonEssentialComponents();
  }, 100);
}

function loadCoreComponents() {
  // Create the HUD
  createHUD();
  console.log("HUD created");

  // Simple background only for mobile to prevent WebGL context issues
  const perfSettings = getPerformanceSettings();
  if (perfSettings.isMobile) {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
    console.log("Mobile: simple sky background created");
  }

  // Create the sun directional light
  sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(10, 100, 10);
  scene.add(sun);
  console.log("Sun light added to scene");

  // Create a simple sun sphere for immediate visibility
  const sunGeometry = new THREE.SphereGeometry(50, 16, 16); // Reduced geometry complexity
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee66,
    transparent: true,
    opacity: 0.9
  });
  sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
  sunSphere.position.set(500, 300, -1000);
  scene.add(sunSphere);
  console.log("Sun sphere added to scene");

  // Initialize basic UI elements
  initializeUI();
  console.log("UI elements initialized");
}

function loadNonEssentialComponents() {
  const perfSettings = getPerformanceSettings();
  
  // Load reduced systems on mobile for better performance
  if (perfSettings.isMobile) {
    console.log("Mobile device detected - loading essential systems only");
    
    // Load basic Mars scene manager but with reduced features - prioritize for immediate driving
    setTimeout(() => {
      lazyLoader.loadInBackground('marsSceneManager', () => {
        // Create a mobile-optimized scene manager
        window.marsSceneManager = new MarsSceneManager(scene, 2000); // Smaller terrain size
        // Only disable rockets for low-end mobile devices
        if (window.marsSceneManager.disableRocketLaunches && perfSettings.mobileTier === 'low') {
          window.marsSceneManager.disableRocketLaunches();
        }
        return Promise.resolve();
      });
    }, 50); // Reduced from 2000ms to 50ms for immediate driving capability
    
    console.log("Essential mobile components queued for loading");
    return;
  }
  
  // Load meteor system only on high performance devices
  if (perfSettings.detailLevel === 'high') {
    lazyLoader.loadInBackground('meteorSystem', () => {
      window.meteorSystem = new MeteorSystem(5000);
      return Promise.resolve();
    });
  }

  // Load Mars scene manager with longer delay for better performance
  setTimeout(() => {
    lazyLoader.loadInBackground('marsSceneManager', () => {
      window.marsSceneManager = new MarsSceneManager(scene, 5000);
      return Promise.resolve();
    });
  }, 5000);

  // Load atmospheric effects system only on higher performance
  if (perfSettings.detailLevel !== 'low') {
    lazyLoader.loadInBackground('atmosphericEffects', () => {
      window.atmosphericEffects = new MarsAtmosphericEffects(scene);
      return Promise.resolve();
    });
  }

  // Add sun glow effect only for higher performance settings
  if (perfSettings.detailLevel === 'high') {
    lazyLoader.loadInBackground('sunGlow', () => {
      const sunGlowGeometry = new THREE.SphereGeometry(60, 32, 32);
      const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
      });
      const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
      sunSphere.add(sunGlow);
      return Promise.resolve();
    });
  }

  // Load additional visual effects based on performance
  if (perfSettings.detailLevel === 'high') {
    // Load advanced particle effects
    lazyLoader.loadInBackground('advancedEffects', () => {
      // Additional visual enhancements can be added here
      return Promise.resolve();
    });
  }

  console.log("Non-essential components queued for background loading");
}

// Add a day/night toggle and cycle
let isDaytime = true; // Ensure this is true by default
console.log("Initial day/night state:", isDaytime ? "DAY" : "NIGHT");

function updateSkyAppearance(transitionProgress = null) {
  console.log("Updating sky appearance - isDaytime:", isDaytime);

  // Define sunSphere if it is not already defined
  if (typeof sunSphere === 'undefined') {
    console.log('Defining sunSphere...');
    sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sunSphere.position.set(500, 300, -1000);
    scene.add(sunSphere);
  }

  // If we're not transitioning, use the current state
  const isDay = transitionProgress === null ? (isDaytime ? 1 : 0) :
    (transitionStartState === 'day' ? 1 - transitionProgress : transitionProgress);
  console.log("isDay value:", isDay);

  // Create or update fog based on time of day
  // Use more realistic Mars fog colors when in realistic mode
  const dayFog = isRealisticMode
    ? new THREE.Fog(0xd8a282, 200, 2000) // Realistic dusty orange-tan fog based on NASA imagery
    : new THREE.Fog(0xd09060, 200, 2000); // Original stylized fog

  const nightFog = new THREE.Fog(0xb77c5a, 500, 5000);

  if (transitionProgress === null) {
    // No transition, just set the fog directly
    scene.fog = isDaytime ? dayFog : nightFog;
    console.log("Setting fog for:", isDaytime ? "DAY" : "NIGHT");
  } else {
    // Interpolate fog color and near/far values
    const fogColor = new THREE.Color();
    fogColor.r = dayFog.color.r * isDay + nightFog.color.r * (1 - isDay);
    fogColor.g = dayFog.color.g * isDay + nightFog.color.g * (1 - isDay);
    fogColor.b = dayFog.color.b * isDay + nightFog.color.b * (1 - isDay);

    const fogNear = dayFog.near * isDay + nightFog.near * (1 - isDay);
    const fogFar = dayFog.far * isDay + nightFog.far * (1 - isDay);

    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    console.log("Setting transitional fog - isDay:", isDay);
  }

  // Handle skybox and background
  if (transitionProgress !== null) {
    // During transition, create a blended sky texture
    if (isDay > 0.01 && isDay < 0.99) {
      // Create a blended sky texture during transition
      console.log("Creating blended sky texture - isDay:", isDay);
      scene.background = createBlendedSkyTexture(isDay);
    }
  } else {
    // Not transitioning, use appropriate sky
    if (isDaytime) {
      // Use realistic or stylized sky texture based on mode
      console.log("Setting DAY sky texture - isRealisticMode:", isRealisticMode);
      try {
        const skyTexture = isRealisticMode ? createRealisticMarsDaySkyTexture() : createMarsDaySkyTexture();
        scene.background = skyTexture;
        console.log("Day sky texture created and set successfully");
      } catch (error) {
        console.error("Error creating day sky texture:", error);
      }

      // Remove night skybox if it exists
      if (typeof spaceSkybox !== 'undefined' && spaceSkybox && scene.getObjectById(spaceSkybox.id)) {
        console.log("Removing night skybox");
        scene.remove(spaceSkybox);
      }
    } else {
      // Add night skybox if not already in scene
      console.log("Setting NIGHT sky");
      if (typeof spaceSkybox !== 'undefined' && spaceSkybox && !scene.getObjectById(spaceSkybox.id)) {
        console.log("Adding night skybox to scene");

        scene.add(spaceSkybox);
      }
    }
  }

  // Adjust lighting based on time of day or transition progress
  // Use more realistic lighting values when in realistic mode
  const daySunIntensity = isRealisticMode ? 0.8 : 0.9; // Slightly dimmer in realistic mode (Mars is further from sun)
  const nightSunIntensity = 0.3;
  const dayAmbientIntensity = isRealisticMode ? 0.6 : 0.7; // Slightly dimmer ambient in realistic mode
  const nightAmbientIntensity = 0.4;

  // Interpolate light intensities
  sunLight.intensity = daySunIntensity * isDay + nightSunIntensity * (1 - isDay);
  ambientLight.intensity = dayAmbientIntensity * isDay + nightAmbientIntensity * (1 - isDay);

  console.log("Sun light intensity set to:", sunLight.intensity);
  console.log("Ambient light intensity set to:", ambientLight.intensity);

  // Interpolate sun position
  const daySunPosition = new THREE.Vector3(10, 100, 10);
  const nightSunPosition = new THREE.Vector3(-10, -5, 10);
  sunLight.position.set(
    daySunPosition.x * isDay + nightSunPosition.x * (1 - isDay),
    daySunPosition.y * isDay + nightSunPosition.y * (1 - isDay),
    daySunPosition.z * isDay + nightSunPosition.z * (1 - isDay)
  );

  // Interpolate ambient light color
  // Use more realistic Mars ambient light color in realistic mode
  const dayAmbientColor = isRealisticMode
    ? new THREE.Color(0xd8a282) // Realistic dusty orange ambient light
    : new THREE.Color(0xff9966); // Original stylized ambient light
  const nightAmbientColor = new THREE.Color(0xff8866);
  ambientLight.color.set(
    dayAmbientColor.r * isDay + nightAmbientColor.r * (1 - isDay),
    dayAmbientColor.g * isDay + nightAmbientColor.g * (1 - isDay),
    dayAmbientColor.b * isDay + nightAmbientColor.b * (1 - isDay)
  );

  // Handle sun visibility with opacity for smooth transition
  if (typeof sunSphere !== 'undefined' && sunSphere) {
    sunSphere.visible = true;
    sunSphere.material.opacity = isDay * 0.9; // Fade out when transitioning to night

    // Also move the sun position during transition
    const daySunSpherePosition = new THREE.Vector3(500, 300, -1000);
    const nightSunSpherePosition = new THREE.Vector3(500, -300, -1000);
    sunSphere.position.set(
      daySunSpherePosition.x * isDay + nightSunSpherePosition.x * (1 - isDay),
      daySunSpherePosition.y * isDay + nightSunSpherePosition.y * (1 - isDay),
      daySunSpherePosition.z * isDay + nightSunSpherePosition.z * (1 - isDay)
    );

    // Adjust sun color in realistic mode
    if (isRealisticMode && isDay > 0.5) {
      // More pale, dusty sun appearance as seen through Mars atmosphere
      sunSphere.material.color.setHex(0xfff0e0);
    } else {
      // Original sun color
      sunSphere.material.color.setHex(0xffffff);
    }
  }

  // Handle night skybox opacity for smooth transition
  if (typeof spaceSkybox !== 'undefined' && spaceSkybox) {
    if (isDay < 0.5) {
      // Show night skybox when transitioning to night
      if (!scene.getObjectById(spaceSkybox.id)) {
        scene.add(spaceSkybox);
      }
      // Set opacity based on transition
      spaceSkybox.traverse(obj => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = 1 - isDay * 2; // Fade in as day transitions to night
        }
      });
    } else if (isDay >= 0.5 && scene.getObjectById(spaceSkybox.id)) {
      // Fade out night skybox when transitioning to day
      spaceSkybox.traverse(obj => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = (1 - isDay) * 2; // Fade out as night transitions to day
        }
      });
    }
  }
}

// Start the day/night cycle
startDayNightCycle();

// Day/night toggle is now handled in the main keydown handler to prevent duplicate listeners

// Run the initialization in the correct order
initializeScene();

function updateDistanceTraveled(currentTime) {
  if (lastUpdateTime === 0) {
    lastUpdateTime = currentTime;
    return;
  }
  const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
  lastUpdateTime = currentTime;

  // Assuming speed is in meters per second, convert to miles
  const speedInMilesPerSecond = roverSpeed * 0.000621371;
  distanceTraveled += speedInMilesPerSecond * deltaTime;

  // Update the HUD or console with the distance traveled
  console.log(`Distance Traveled: ${distanceTraveled.toFixed(2)} miles`);
}

// Create a visible sun sphere



// Create a realistic Mars day sky texture based on NASA imagery and scientific data
function createRealisticMarsDaySkyTexture() {
  const canvas = document.createElement('canvas');
  const canvasSize = perfSettings.isMobile ? 1024 : 2048; // Responsive to device capabilities
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');

  // Create scientifically accurate gradient from horizon to zenith
  // Based on NASA's Curiosity and Perseverance rover images
  const gradient = context.createLinearGradient(0, canvasSize, 0, 0);

  // Mars sky colors based on NASA imagery
  // Horizon: Butterscotch/light brown due to dust scattering
  gradient.addColorStop(0, '#d8a282');

  // Mid-sky: Pale orange-brown transitioning to salmon pink
  gradient.addColorStop(0.2, '#c79078');
  gradient.addColorStop(0.4, '#b67c6e');

  // Upper sky: Transitions to a dusty pale blue-gray
  gradient.addColorStop(0.7, '#a57a6c');
  gradient.addColorStop(0.85, '#9a7a74');

  // Zenith: Darker blue-gray (Rayleigh scattering is much weaker on Mars)
  gradient.addColorStop(1, '#8e7a7c');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasSize, canvasSize);

  // Add realistic atmospheric haze/dust based on Martian conditions
  // Mars has frequent dust in atmosphere that creates a hazy appearance
  context.fillStyle = 'rgba(210, 170, 130, 0.15)';
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * canvasSize;
    // More dust near horizon, gradually decreasing with height
    const heightFactor = Math.pow(Math.random(), 0.5); // More dust lower in sky
    const y = canvasSize * (1 - heightFactor * 0.6);
    const size = Math.random() * 150 + 100;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  // Add subtle dust storm effects in distance (occasional on Mars)
  if (Math.random() < 0.3) { // 30% chance of dust storm
    context.fillStyle = 'rgba(190, 150, 120, 0.2)';
    const stormX = Math.random() * canvasSize;
    const stormHeight = canvasSize * 0.3;
    const stormWidth = canvasSize * 0.4;

    // Create dust storm shape
    for (let i = 0; i < 30; i++) {
      const x = stormX + (Math.random() - 0.5) * stormWidth;
      const y = canvasSize - Math.random() * stormHeight;
      const size = Math.random() * 200 + 100;
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Add sun with realistic appearance
  // The sun appears about 2/3 the size as seen from Earth
  // and has a pale, dusty appearance due to atmospheric dust
  const sunSize = canvasSize * 0.05; // Sun size as seen from Mars
  const sunX = canvasSize * (0.3 + Math.random() * 0.4); // Random position in sky
  const sunY = canvasSize * (0.2 + Math.random() * 0.3); // Higher in sky

  // Create sun glow (larger on Mars due to dust scattering)
  const sunGlow = context.createRadialGradient(
    sunX, sunY, 0,
    sunX, sunY, sunSize * 4
  );
  sunGlow.addColorStop(0, 'rgba(255, 240, 230, 0.8)');
  sunGlow.addColorStop(0.2, 'rgba(255, 210, 180, 0.4)');
  sunGlow.addColorStop(0.5, 'rgba(255, 200, 170, 0.2)');
  sunGlow.addColorStop(1, 'rgba(255, 190, 160, 0)');

  context.fillStyle = sunGlow;
  context.beginPath();
  context.arc(sunX, sunY, sunSize * 4, 0, Math.PI * 2);
  context.fill();

  // Create sun disk (pale yellow-white due to dust filtering)
  const sunDisk = context.createRadialGradient(
    sunX, sunY, 0,
    sunX, sunY, sunSize
  );
  sunDisk.addColorStop(0, 'rgba(255, 250, 240, 1)');
  sunDisk.addColorStop(0.7, 'rgba(255, 240, 220, 1)');
  sunDisk.addColorStop(1, 'rgba(255, 230, 200, 0.8)');

  context.fillStyle = sunDisk;
  context.beginPath();
  context.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
  context.fill();

  // Add Phobos and Deimos (Mars' moons) occasionally
  if (Math.random() < 0.4) { // 40% chance to see a moon
    // Phobos (larger, closer moon)
    const phobosSize = canvasSize * 0.005; // Very small in sky
    const phobosX = canvasSize * Math.random();
    const phobosY = canvasSize * (0.1 + Math.random() * 0.3);

    context.fillStyle = 'rgba(180, 170, 160, 0.9)';
    context.beginPath();
    context.arc(phobosX, phobosY, phobosSize, 0, Math.PI * 2);
    context.fill();

    // Deimos (smaller, further moon) - even rarer
    if (Math.random() < 0.3) {
      const deimosSize = canvasSize * 0.003; // Extremely small in sky
      const deimosX = canvasSize * Math.random();
      const deimosY = canvasSize * (0.05 + Math.random() * 0.2);

      context.fillStyle = 'rgba(170, 160, 150, 0.8)';
      context.beginPath();
      context.arc(deimosX, deimosY, deimosSize, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return texture;
}

// Add UI button for toggling realistic mode
function addRealisticModeToggle() {
  const toggleButton = document.createElement('button');
  toggleButton.textContent = isRealisticMode ? 'Switch to Stylized Mode' : 'Switch to Realistic Mode';
  toggleButton.style.position = 'absolute';
  toggleButton.style.bottom = '20px';
  toggleButton.style.right = '180px'; // Position to the left of the day/night toggle
  toggleButton.style.padding = '10px';
  toggleButton.style.backgroundColor = '#444';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.zIndex = '1000';

  // Add hover effect
  toggleButton.addEventListener('mouseover', () => {
    toggleButton.style.backgroundColor = '#666';
  });
  toggleButton.addEventListener('mouseout', () => {
    toggleButton.style.backgroundColor = '#444';
  });

  // Add click handler
  toggleButton.addEventListener('click', () => {
    toggleRealisticMode();
    toggleButton.textContent = isRealisticMode ? 'Switch to Stylized Mode' : 'Switch to Realistic Mode';
  });

  document.body.appendChild(toggleButton);

  // Add a Force Day Mode button
  const forceDayButton = document.createElement('button');
  forceDayButton.textContent = 'Force Day Mode';
  forceDayButton.style.position = 'absolute';
  forceDayButton.style.bottom = '60px';
  forceDayButton.style.right = '20px';
  forceDayButton.style.padding = '10px';
  forceDayButton.style.backgroundColor = '#444';
  forceDayButton.style.color = 'white';
  forceDayButton.style.border = 'none';
  forceDayButton.style.borderRadius = '5px';
  forceDayButton.style.cursor = 'pointer';
  forceDayButton.style.zIndex = '1000';

  // Add hover effect
  forceDayButton.addEventListener('mouseover', () => {
    forceDayButton.style.backgroundColor = '#666';
  });
  forceDayButton.addEventListener('mouseout', () => {
    forceDayButton.style.backgroundColor = '#444';
  });

  // Add click handler
  forceDayButton.addEventListener('click', () => {
    forceDayMode();
  });

  document.body.appendChild(forceDayButton);
}

// Call this function after the scene is initialized
function initializeUI() {
  // ... existing UI initialization code ...

  // Add realistic mode toggle
  addRealisticModeToggle();
}

// Add a more sophisticated day/night cycle with smooth transitions
let currentTimeOfDay = 0.5; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight
let dayNightCycleSpeed = 0.00001; // Speed of day/night cycle (smaller = slower)
let isManualTransition = false;
let manualTransitionTarget = null;
let manualTransitionSpeed = 0.005;
let lastTransitionUpdate = 0;

// Create a function to get the current sky state based on time of day
function getSkyState(timeOfDay) {
  // Convert time to a 0-1 value where 0 and 1 are midnight
  const normalizedTime = timeOfDay % 1;

  // Calculate if it's day or night
  // Day is roughly between 0.25 (dawn) and 0.75 (dusk)
  const isDaytime = normalizedTime > 0.25 && normalizedTime < 0.75;

  // Calculate transition factors for dawn and dusk
  // Dawn transition: 0.15 to 0.35
  // Dusk transition: 0.65 to 0.85
  let dawnFactor = 0;
  let duskFactor = 0;

  if (normalizedTime >= 0.15 && normalizedTime <= 0.35) {
    // Dawn transition (0 to 1)
    dawnFactor = (normalizedTime - 0.15) / 0.2;
  } else if (normalizedTime >= 0.65 && normalizedTime <= 0.85) {
    // Dusk transition (1 to 0)
    duskFactor = 1 - ((normalizedTime - 0.65) / 0.2);
  }

  // Calculate day factor (how deep into day we are)
  let dayFactor = 0;
  if (normalizedTime > 0.35 && normalizedTime < 0.65) {
    // Full day
    dayFactor = 1;
  } else if (normalizedTime >= 0.25 && normalizedTime <= 0.35) {
    // Dawn to full day
    dayFactor = (normalizedTime - 0.25) / 0.1;
  } else if (normalizedTime >= 0.65 && normalizedTime <= 0.75) {
    // Full day to dusk
    dayFactor = 1 - ((normalizedTime - 0.65) / 0.1);
  }

  // Calculate night factor (how deep into night we are)
  let nightFactor = 0;
  if (normalizedTime < 0.15 || normalizedTime > 0.85) {
    // Full night
    nightFactor = 1;
  } else if (normalizedTime >= 0.75 && normalizedTime <= 0.85) {
    // Dusk to full night
    nightFactor = (normalizedTime - 0.75) / 0.1;
  } else if (normalizedTime >= 0.15 && normalizedTime <= 0.25) {
    // Full night to dawn
    nightFactor = 1 - ((normalizedTime - 0.15) / 0.1);
  }

  return {
    timeOfDay: normalizedTime,
    isDaytime,
    dawnFactor,
    duskFactor,
    dayFactor,
    nightFactor
  };
}

// Function to update the sky appearance based on time of day
function updateSkyForTimeOfDay(timeOfDay) {
  const skyState = getSkyState(timeOfDay);

  // Log the current state
  console.log("Sky state:", skyState);

  // Create the appropriate sky texture based on time of day
  let skyTexture;

  if (skyState.dawnFactor > 0) {
    // Dawn transition
    skyTexture = createDawnSkyTexture(skyState.dawnFactor);
  } else if (skyState.duskFactor > 0) {
    // Dusk transition
    skyTexture = createDuskSkyTexture(skyState.duskFactor);
  } else if (skyState.dayFactor > 0) {
    // Day (with potential partial intensity)
    skyTexture = createDaySkyTexture(skyState.dayFactor);
  } else {
    // Night (with potential partial intensity)
    // For night, we'll use the existing skybox but adjust its opacity
    skyTexture = null;
  }

  // Apply the sky texture if we created one
  if (skyTexture) {
    scene.background = skyTexture;

    // Remove night skybox if it exists
    if (typeof spaceSkybox !== 'undefined' && spaceSkybox && scene.getObjectById(spaceSkybox.id)) {
      scene.remove(spaceSkybox);
    }
  } else {
    // Add night skybox if not already in scene
    if (typeof spaceSkybox !== 'undefined' && spaceSkybox && !scene.getObjectById(spaceSkybox.id)) {
      scene.add(spaceSkybox);
    }
  }

  // Update fog based on time of day
  updateFogForTimeOfDay(skyState);

  // Update lighting based on time of day
  updateLightingForTimeOfDay(skyState);

  // Update sun position and appearance
  updateSunForTimeOfDay(skyState);
}

// Create a dawn sky texture with beautiful sunrise colors
function createDawnSkyTexture(dawnFactor) {
  const canvas = document.createElement('canvas');
  const size = perfSettings.isMobile ? 1024 : 2048; // Responsive to device capabilities
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  // Create gradient from horizon to zenith
  const gradient = context.createLinearGradient(0, size, 0, 0);

  // Dawn colors - beautiful sunrise palette
  // Horizon: Deep orange to bright gold
  gradient.addColorStop(0, lerpColor('#8a3a2d', '#ff7e45', dawnFactor)); // Horizon
  gradient.addColorStop(0.2, lerpColor('#a85a3d', '#ffb06a', dawnFactor)); // Low sky
  gradient.addColorStop(0.4, lerpColor('#b06a55', '#ffc090', dawnFactor)); // Mid-low sky
  gradient.addColorStop(0.6, lerpColor('#9a6a7a', '#ffd0b0', dawnFactor)); // Mid-high sky
  gradient.addColorStop(0.8, lerpColor('#7a6a8a', '#e0d0c0', dawnFactor)); // High sky
  gradient.addColorStop(1, lerpColor('#5a5a7a', '#c0c0d0', dawnFactor)); // Zenith

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  // Add atmospheric glow near horizon
  const glowGradient = context.createRadialGradient(
    size / 2, size, 0,
    size / 2, size, size * 0.7
  );
  glowGradient.addColorStop(0, `rgba(255, 150, 50, ${0.3 * dawnFactor})`);
  glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

  context.fillStyle = glowGradient;
  context.fillRect(0, 0, size, size);

  // Add subtle clouds if it's more than halfway through dawn
  if (dawnFactor > 0.5) {
    const cloudOpacity = (dawnFactor - 0.5) * 2 * 0.15; // Max 15% opacity
    context.fillStyle = `rgba(255, 230, 210, ${cloudOpacity})`;

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = size * 0.3 + Math.random() * size * 0.3;
      const cloudWidth = Math.random() * 300 + 200;
      const cloudHeight = Math.random() * 100 + 50;

      // Create fluffy cloud with multiple circles
      for (let j = 0; j < 8; j++) {
        const cloudX = x + (Math.random() - 0.5) * cloudWidth * 0.8;
        const cloudY = y + (Math.random() - 0.5) * cloudHeight * 0.8;
        const cloudSize = Math.random() * 100 + 50;

        context.beginPath();
        context.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return texture;
}

// Create a dusk sky texture with beautiful sunset colors
function createDuskSkyTexture(duskFactor) {
  const canvas = document.createElement('canvas');
  const size = perfSettings.isMobile ? 1024 : 2048; // Responsive to device capabilities
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  // Create gradient from horizon to zenith
  const gradient = context.createLinearGradient(0, size, 0, 0);

  // Dusk colors - beautiful sunset palette
  // Horizon: Bright gold to deep red
  gradient.addColorStop(0, lerpColor('#ff7e45', '#8a3a2d', 1 - duskFactor)); // Horizon
  gradient.addColorStop(0.2, lerpColor('#ffb06a', '#a85a3d', 1 - duskFactor)); // Low sky
  gradient.addColorStop(0.4, lerpColor('#ffc090', '#b06a55', 1 - duskFactor)); // Mid-low sky
  gradient.addColorStop(0.6, lerpColor('#ffd0b0', '#9a6a7a', 1 - duskFactor)); // Mid-high sky
  gradient.addColorStop(0.8, lerpColor('#e0d0c0', '#7a6a8a', 1 - duskFactor)); // High sky
  gradient.addColorStop(1, lerpColor('#c0c0d0', '#5a5a7a', 1 - duskFactor)); // Zenith

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  // Add atmospheric glow near horizon - stronger at dusk
  const glowGradient = context.createRadialGradient(
    size / 2, size, 0,
    size / 2, size, size * 0.7
  );
  glowGradient.addColorStop(0, `rgba(255, 100, 50, ${0.4 * duskFactor})`);
  glowGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

  context.fillStyle = glowGradient;
  context.fillRect(0, 0, size, size);

  // Add subtle clouds if it's more than halfway through dusk
  if (duskFactor > 0.5) {
    const cloudOpacity = (duskFactor - 0.5) * 2 * 0.15; // Max 15% opacity
    context.fillStyle = `rgba(255, 200, 180, ${cloudOpacity})`;

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = size * 0.3 + Math.random() * size * 0.3;
      const cloudWidth = Math.random() * 300 + 200;
      const cloudHeight = Math.random() * 100 + 50;

      // Create fluffy cloud with multiple circles
      for (let j = 0; j < 8; j++) {
        const cloudX = x + (Math.random() - 0.5) * cloudWidth * 0.8;
        const cloudY = y + (Math.random() - 0.5) * cloudHeight * 0.8;
        const cloudSize = Math.random() * 100 + 50;

        context.beginPath();
        context.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return texture;
}

// Create a day sky texture with intensity factor
function createDaySkyTexture(intensityFactor) {
  const canvas = document.createElement('canvas');
  const size = perfSettings.isMobile ? 1024 : 2048; // Responsive to device capabilities
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  // Create gradient from horizon to zenith
  const gradient = context.createLinearGradient(0, size, 0, 0);

  // Day colors - Mars daytime
  gradient.addColorStop(0, lerpColor('#c27e54', '#e8b090', intensityFactor)); // Horizon
  gradient.addColorStop(0.5, lerpColor('#d7a28b', '#f0c0a0', intensityFactor)); // Middle
  gradient.addColorStop(1, lerpColor('#e6b499', '#f8d0b0', intensityFactor)); // Zenith

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  // Add atmospheric haze/dust
  context.fillStyle = `rgba(210, 170, 130, ${0.2 * intensityFactor})`;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size * 0.6 + size * 0.4; // More dust near horizon
    const dustSize = Math.random() * 100 + 50;

    context.beginPath();
    context.arc(x, y, dustSize, 0, Math.PI * 2);
    context.fill();
  }

  // Add subtle clouds
  context.fillStyle = `rgba(230, 200, 180, ${0.15 * intensityFactor})`;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size * 0.3 + size * 0.2; // Clouds in middle of sky
    const cloudWidth = Math.random() * 300 + 200;
    const cloudHeight = Math.random() * 100 + 50;

    // Create fluffy cloud with multiple circles
    for (let j = 0; j < 8; j++) {
      const cloudX = x + (Math.random() - 0.5) * cloudWidth * 0.8;
      const cloudY = y + (Math.random() - 0.5) * cloudHeight * 0.8;
      const cloudSize = Math.random() * 100 + 50;

      context.beginPath();
      context.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return texture;
}

// Update fog based on time of day
function updateFogForTimeOfDay(skyState) {
  // Define fog colors for different times of day
  const nightFogColor = new THREE.Color(0x553322);
  const dawnFogColor = new THREE.Color(0xaa6644);
  const dayFogColor = new THREE.Color(0xd8a282);
  const duskFogColor = new THREE.Color(0xaa5533);

  // Define fog distances
  const nightFogNear = 500;
  const nightFogFar = 5000;
  const dayFogNear = 200;
  const dayFogFar = 2000;

  // Calculate fog color based on time of day
  const fogColor = new THREE.Color();

  if (skyState.dawnFactor > 0) {
    // Dawn transition
    fogColor.lerpColors(nightFogColor, dawnFogColor, skyState.dawnFactor);
    const fogNear = nightFogNear + (dayFogNear - nightFogNear) * skyState.dawnFactor;
    const fogFar = nightFogFar + (dayFogFar - nightFogFar) * skyState.dawnFactor;
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  } else if (skyState.duskFactor > 0) {
    // Dusk transition
    fogColor.lerpColors(duskFogColor, nightFogColor, 1 - skyState.duskFactor);
    const fogNear = dayFogNear + (nightFogNear - dayFogNear) * (1 - skyState.duskFactor);
    const fogFar = dayFogFar + (nightFogFar - dayFogFar) * (1 - skyState.duskFactor);
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  } else if (skyState.dayFactor > 0) {
    // Day
    fogColor.lerpColors(dawnFogColor, dayFogColor, skyState.dayFactor);
    scene.fog = new THREE.Fog(fogColor, dayFogNear, dayFogFar);
  } else {
    // Night
    scene.fog = new THREE.Fog(nightFogColor, nightFogNear, nightFogFar);
  }
}

// Update lighting based on time of day
function updateLightingForTimeOfDay(skyState) {
  // Define light intensities for different times of day
  const nightSunIntensity = 0.1;
  const dawnSunIntensity = 0.6;
  const daySunIntensity = 1.0;
  const duskSunIntensity = 0.6;

  const nightAmbientIntensity = 0.3;
  const dawnAmbientIntensity = 0.5;
  const dayAmbientIntensity = 0.7;
  const duskAmbientIntensity = 0.5;

  // Define light colors
  const nightSunColor = new THREE.Color(0xaa5522);
  const dawnSunColor = new THREE.Color(0xff8844);
  const daySunColor = new THREE.Color(0xffffff);
  const duskSunColor = new THREE.Color(0xff6622);

  const nightAmbientColor = new THREE.Color(0x334455);
  const dawnAmbientColor = new THREE.Color(0x775544);
  const dayAmbientColor = new THREE.Color(0xd8a282);
  const duskAmbientColor = new THREE.Color(0x995533);

  // Calculate light intensities and colors based on time of day
  let sunIntensity, ambientIntensity;
  const sunColor = new THREE.Color();
  const ambientColor = new THREE.Color();

  if (skyState.dawnFactor > 0) {
    // Dawn transition
    sunIntensity = nightSunIntensity + (dawnSunIntensity - nightSunIntensity) * skyState.dawnFactor;
    ambientIntensity = nightAmbientIntensity + (dawnAmbientIntensity - nightAmbientIntensity) * skyState.dawnFactor;
    sunColor.lerpColors(nightSunColor, dawnSunColor, skyState.dawnFactor);
    ambientColor.lerpColors(nightAmbientColor, dawnAmbientColor, skyState.dawnFactor);
  } else if (skyState.dayFactor > 0 && skyState.dawnFactor === 0 && skyState.duskFactor === 0) {
    // Full day
    sunIntensity = dawnSunIntensity + (daySunIntensity - dawnSunIntensity) * skyState.dayFactor;
    ambientIntensity = dawnAmbientIntensity + (dayAmbientIntensity - dawnAmbientIntensity) * skyState.dayFactor;
    sunColor.lerpColors(dawnSunColor, daySunColor, skyState.dayFactor);
    ambientColor.lerpColors(dawnAmbientColor, dayAmbientColor, skyState.dayFactor);
  } else if (skyState.duskFactor > 0) {
    // Dusk transition
    sunIntensity = duskSunIntensity - (duskSunIntensity - nightSunIntensity) * (1 - skyState.duskFactor);
    ambientIntensity = duskAmbientIntensity - (duskAmbientIntensity - nightAmbientIntensity) * (1 - skyState.duskFactor);
    sunColor.lerpColors(duskSunColor, nightSunColor, 1 - skyState.duskFactor);
    ambientColor.lerpColors(duskAmbientColor, nightAmbientColor, 1 - skyState.duskFactor);
  } else {
    // Night
    sunIntensity = nightSunIntensity;
    ambientIntensity = nightAmbientIntensity;
    sunColor.copy(nightSunColor);
    ambientColor.copy(nightAmbientColor);
  }

  // Apply light intensities and colors
  if (typeof sunLight !== 'undefined' && sunLight) {
    sunLight.intensity = sunIntensity;
    sunLight.color.copy(sunColor);
  }

  if (typeof ambientLight !== 'undefined' && ambientLight) {
    ambientLight.intensity = ambientIntensity;
    ambientLight.color.copy(ambientColor);
  }
}

// Update sun position and appearance based on time of day
function updateSunForTimeOfDay(skyState) {
  if (typeof sunSphere === 'undefined' || !sunSphere) return;

  // Calculate sun position based on time of day
  // Full circle around the scene
  const angle = (skyState.timeOfDay * Math.PI * 2) - Math.PI / 2;
  const radius = 1000;
  const height = Math.sin(angle) * 500;

  const x = Math.cos(angle) * radius;
  const y = height;
  const z = Math.sin(angle) * radius;

  sunSphere.position.set(x, y, z);

  // Make sun visible during day, dawn and dusk
  sunSphere.visible = skyState.dayFactor > 0 || skyState.dawnFactor > 0 || skyState.duskFactor > 0;

  // Adjust sun appearance based on time of day
  if (sunSphere.material) {
    // Adjust sun color
    if (skyState.dawnFactor > 0) {
      // Dawn - orange-red sun
      sunSphere.material.color.setHex(0xff7733);
      sunSphere.material.opacity = 0.9 * skyState.dawnFactor;
    } else if (skyState.duskFactor > 0) {
      // Dusk - deep orange sun
      sunSphere.material.color.setHex(0xff5522);
      sunSphere.material.opacity = 0.9 * skyState.duskFactor;
    } else if (skyState.dayFactor > 0) {
      // Day - bright white-yellow sun
      sunSphere.material.color.setHex(0xffffaa);
      sunSphere.material.opacity = 0.9 * skyState.dayFactor;
    }

    // Adjust sun size based on height (larger near horizon)
    const baseSunSize = 50;
    const horizonFactor = 1 - Math.abs(height) / 500;
    const sunScale = 1 + horizonFactor * 0.5; // Up to 50% larger at horizon

    sunSphere.scale.set(sunScale, sunScale, sunScale);
  }

  // Update sun light position to match sun position
  if (typeof sunLight !== 'undefined' && sunLight) {
    sunLight.position.copy(sunSphere.position).normalize().multiplyScalar(10);
  }
}

// Helper function to interpolate between two colors
function lerpColor(color1, color2, factor) {
  // Convert hex colors to RGB
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);

  // Interpolate
  const result = new THREE.Color();
  result.r = c1.r + (c2.r - c1.r) * factor;
  result.g = c1.g + (c2.g - c1.g) * factor;
  result.b = c1.b + (c2.b - c1.b) * factor;

  return '#' + result.getHexString();
}

// Function to update the day/night cycle
function updateDayNightCycle(currentTime) {
  // Calculate time delta
  const delta = currentTime - lastTransitionUpdate;
  lastTransitionUpdate = currentTime;

  if (isManualTransition && manualTransitionTarget !== null) {
    // Handle manual transition to a specific time
    const diff = manualTransitionTarget - currentTimeOfDay;

    // If we're close enough to the target, end the transition
    if (Math.abs(diff) < manualTransitionSpeed) {
      currentTimeOfDay = manualTransitionTarget;
      isManualTransition = false;
      manualTransitionTarget = null;
    } else {
      // Move toward the target
      const direction = diff > 0 ? 1 : -1;
      currentTimeOfDay += direction * manualTransitionSpeed;

      // Ensure we stay within 0-1 range
      currentTimeOfDay = (currentTimeOfDay + 1) % 1;
    }
  } else {
    // Normal cycle progression
    currentTimeOfDay = (currentTimeOfDay + dayNightCycleSpeed * delta) % 1;
  }

  // Update the sky based on current time
  updateSkyForTimeOfDay(currentTimeOfDay);

  // Update UI if we have a time indicator
  updateTimeIndicator(currentTimeOfDay);
}

// Function to update the time indicator UI
function updateTimeIndicator(timeOfDay) {
  const timeIndicator = document.getElementById('time-indicator');
  if (!timeIndicator) return;

  // Convert time of day to hours (0-24)
  const hours = (timeOfDay * 24) % 24;
  const minutes = (hours % 1) * 60;

  // Format as HH:MM
  const formattedTime = `${Math.floor(hours).toString().padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;

  // Update the indicator
  timeIndicator.textContent = formattedTime;

  // Update the indicator color based on time of day
  const skyState = getSkyState(timeOfDay);
  if (skyState.dayFactor > 0.5) {
    timeIndicator.style.color = '#ffffff';
    timeIndicator.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
  } else if (skyState.dawnFactor > 0.5 || skyState.duskFactor > 0.5) {
    timeIndicator.style.color = '#ffcc99';
    timeIndicator.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
  } else {
    timeIndicator.style.color = '#aaccff';
    timeIndicator.style.textShadow = '0 0 5px rgba(0,0,0,0.7)';
  }
}

// Function to transition to a specific time of day
function transitionToTimeOfDay(targetTime, speed = 0.0005) {
  isManualTransition = true;
  manualTransitionTarget = targetTime;
  manualTransitionSpeed = speed;
  console.log(`Transitioning to time: ${targetTime}`);
}

// Add time controls to the UI
function addTimeControls() {
  // Create container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.bottom = '100px';
  container.style.right = '20px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  container.style.padding = '10px';
  container.style.borderRadius = '5px';
  container.style.zIndex = '1000';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '10px';

  // Add time indicator
  const timeIndicator = document.createElement('div');
  timeIndicator.id = 'time-indicator';
  timeIndicator.style.fontFamily = 'monospace';
  timeIndicator.style.fontSize = '24px';
  timeIndicator.style.color = 'white';
  timeIndicator.style.textAlign = 'center';
  timeIndicator.textContent = '12:00';
  container.appendChild(timeIndicator);

  // Add time buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  buttonContainer.style.gap = '5px';

  // Time presets
  const timePresets = [
    { label: '🌙 Night', time: 0 },
    { label: '🌅 Dawn', time: 0.25 },
    { label: '☀️ Noon', time: 0.5 },
    { label: '🌇 Dusk', time: 0.75 }
  ];

  timePresets.forEach(preset => {
    const button = document.createElement('button');
    button.textContent = preset.label;
    button.style.flex = '1';
    button.style.padding = '8px';
    button.style.backgroundColor = '#444';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', () => {
      transitionToTimeOfDay(preset.time);
    });

    buttonContainer.appendChild(button);
  });

  container.appendChild(buttonContainer);

  document.body.appendChild(container);
}

// ===== DAY/NIGHT CYCLE =====
// Add a day/night toggle and cycle

console.log("Initial day/night state:", isDaytime ? "DAY" : "NIGHT");

function startDayNightCycle() {
  // Use a 1-minute cycle duration
  setInterval(() => {
    toggleDayNight();
  }, 60000); // 30 seconds for each cycle

  // Add a manual toggle button for testing
  const toggleButton = document.createElement('button');
  toggleButton.textContent = isDaytime ? 'Switch to Night' : 'Switch to Day';
  toggleButton.style.position = 'absolute';
  toggleButton.style.bottom = '20px';
  toggleButton.style.right = '20px';
  toggleButton.style.padding = '10px';
  toggleButton.style.backgroundColor = '#444';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.zIndex = '1000';

  toggleButton.addEventListener('click', () => {
    // Only toggle if not already transitioning
    if (!isTransitioning) {
      toggleDayNight();
      toggleButton.textContent = isDaytime ? 'Switch to Night' : 'Switch to Day';
    }
  });

  document.body.appendChild(toggleButton);
}

function toggleDayNight() {
  console.log("Before toggle - isDaytime:", isDaytime);
  isDaytime = !isDaytime;
  console.log("After toggle - isDaytime:", isDaytime);
  updateSkyAppearance();
}

// Add a function to force day mode
function forceDayMode() {
  console.log("Forcing day mode...");
  isDaytime = true;
  isRealisticMode = true;
  console.log("isDaytime set to:", isDaytime);
  console.log("isRealisticMode set to:", isRealisticMode);
  updateSkyAppearance();
  console.log("Day mode forced!");
}

// Expose the function globally for debugging
window.forceDayMode = forceDayMode;

// Optionally start in day; do not force override so night can appear normally
// setTimeout(() => {
//   console.log("Auto-forcing day mode after initialization");
//   forceDayMode();
// }, 2000);

function updateSkyAppearance(transitionProgress = null) {
  console.log("Updating sky appearance - isDaytime:", isDaytime);

  // Define sunSphere if it is not already defined
  if (typeof sunSphere === 'undefined') {
    console.log('Defining sunSphere...');
    sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sunSphere.position.set(500, 300, -1000);
    scene.add(sunSphere);
  }

  // If we're not transitioning, use the current state
  const isDay = transitionProgress === null ? isDaytime :
    (transitionStartState === 'day' ? 1 - transitionProgress : transitionProgress);

  console.log("isDay value:", isDay);

  // Create or update fog based on time of day
  // Use more realistic Mars fog colors when in realistic mode
  const dayFog = isRealisticMode
    ? new THREE.Fog(0xd8a282, 200, 2000) // Realistic dusty orange-tan fog based on NASA imagery
    : new THREE.Fog(0xd09060, 200, 2000); // Original stylized fog

  const nightFog = new THREE.Fog(0xb77c5a, 500, 5000);

  if (transitionProgress === null) {
    // No transition, just set the fog directly
    scene.fog = isDaytime ? dayFog : nightFog;
    console.log("Setting fog for:", isDaytime ? "DAY" : "NIGHT");
  } else {
    // Interpolate fog color and near/far values
    const fogColor = new THREE.Color();
    fogColor.r = dayFog.color.r * isDay + nightFog.color.r * (1 - isDay);
    fogColor.g = dayFog.color.g * isDay + nightFog.color.g * (1 - isDay);
    fogColor.b = dayFog.color.b * isDay + nightFog.color.b * (1 - isDay);

    const fogNear = dayFog.near * isDay + nightFog.near * (1 - isDay);
    const fogFar = dayFog.far * isDay + nightFog.far * (1 - isDay);

    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    console.log("Setting transitional fog - isDay:", isDay);
  }

  // Handle skybox and background
  if (transitionProgress !== null) {
    // During transition, create a blended sky texture
    if (isDay > 0.01 && isDay < 0.99) {
      // Create a blended sky texture during transition
      console.log("Creating blended sky texture - isDay:", isDay);
      scene.background = createBlendedSkyTexture(isDay);
    }
  } else {
    // Not transitioning, use appropriate sky
    if (isDaytime) {
      // Use realistic or stylized sky texture based on mode
      console.log("Setting DAY sky texture - isRealisticMode:", isRealisticMode);
      try {
        const skyTexture = isRealisticMode ? createRealisticMarsDaySkyTexture() : createMarsDaySkyTexture();
        scene.background = skyTexture;
        console.log("Day sky texture created and set successfully");
      } catch (error) {
        console.error("Error creating day sky texture:", error);
      }

      // Remove night skybox if it exists
      if (typeof spaceSkybox !== 'undefined' && spaceSkybox && scene.getObjectById(spaceSkybox.id)) {
        console.log("Removing night skybox");
        scene.remove(spaceSkybox);
      }
    } else {
      // Add night skybox if not already in scene
      console.log("Setting NIGHT sky");
      if (typeof spaceSkybox !== 'undefined' && spaceSkybox && !scene.getObjectById(spaceSkybox.id)) {
        console.log("Adding night skybox to scene");
        scene.add(spaceSkybox);
      }
    }
  }

  // Adjust lighting based on time of day or transition progress
  // Use more realistic lighting values when in realistic mode
  const daySunIntensity = isRealisticMode ? 0.8 : 0.9; // Slightly dimmer in realistic mode (Mars is further from sun)
  const nightSunIntensity = 0.3;
  const dayAmbientIntensity = isRealisticMode ? 0.6 : 0.7; // Slightly dimmer ambient in realistic mode
  const nightAmbientIntensity = 0.4;

  // Interpolate light intensities
  sunLight.intensity = daySunIntensity * isDay + nightSunIntensity * (1 - isDay);
  ambientLight.intensity = dayAmbientIntensity * isDay + nightAmbientIntensity * (1 - isDay);

  console.log("Sun light intensity set to:", sunLight.intensity);
  console.log("Ambient light intensity set to:", ambientLight.intensity);

  // Interpolate sun position
  const daySunPosition = new THREE.Vector3(10, 100, 10);
  const nightSunPosition = new THREE.Vector3(-10, -5, 10);
  sunLight.position.set(
    daySunPosition.x * isDay + nightSunPosition.x * (1 - isDay),
    daySunPosition.y * isDay + nightSunPosition.y * (1 - isDay),
    daySunPosition.z * isDay + nightSunPosition.z * (1 - isDay)
  );

  // Interpolate ambient light color
  // Use more realistic Mars ambient light color in realistic mode
  const dayAmbientColor = isRealisticMode
    ? new THREE.Color(0xd8a282) // Realistic dusty orange ambient light
    : new THREE.Color(0xff9966); // Original stylized ambient light
  const nightAmbientColor = new THREE.Color(0xff8866);
  ambientLight.color.set(
    dayAmbientColor.r * isDay + nightAmbientColor.r * (1 - isDay),
    dayAmbientColor.g * isDay + nightAmbientColor.g * (1 - isDay),
    dayAmbientColor.b * isDay + nightAmbientColor.b * (1 - isDay)
  );

  // Handle sun visibility with opacity for smooth transition
  if (typeof sunSphere !== 'undefined' && sunSphere) {
    sunSphere.visible = true;
    sunSphere.material.opacity = isDay * 0.9; // Fade out when transitioning to night

    // Also move the sun position during transition
    const daySunSpherePosition = new THREE.Vector3(500, 300, -1000);
    const nightSunSpherePosition = new THREE.Vector3(500, -300, -1000);
    sunSphere.position.set(
      daySunSpherePosition.x * isDay + nightSunSpherePosition.x * (1 - isDay),
      daySunSpherePosition.y * isDay + nightSunSpherePosition.y * (1 - isDay),
      daySunSpherePosition.z * isDay + nightSunSpherePosition.z * (1 - isDay)
    );

    // Adjust sun color in realistic mode
    if (isRealisticMode && isDay > 0.5) {
      // More pale, dusty sun appearance as seen through Mars atmosphere
      sunSphere.material.color.setHex(0xfff0e0);
    } else {
      // Original sun color
      sunSphere.material.color.setHex(0xffffff);
    }
  }

  // Handle night skybox opacity for smooth transition
  if (typeof spaceSkybox !== 'undefined' && spaceSkybox) {
    if (isDay < 0.5) {
      // Show night skybox when transitioning to night
      if (!scene.getObjectById(spaceSkybox.id)) {
        scene.add(spaceSkybox);
      }
      // Set opacity based on transition
      spaceSkybox.traverse(obj => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = 1 - isDay * 2; // Fade in as day transitions to night
        }
      });
    } else if (isDay >= 0.5 && scene.getObjectById(spaceSkybox.id)) {
      // Fade out night skybox when transitioning to day
      spaceSkybox.traverse(obj => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = (1 - isDay) * 2; // Fade out as night transitions to day
        }
      });
    }
  }
}

// Start the day/night cycle
//startDayNightCycle();

// Day/night toggle is now handled in the main keydown handler to prevent duplicate listeners

// ==============================================================================
// COMPREHENSIVE ENHANCEMENT SYSTEMS
// ==============================================================================

// Advanced Mission System
class MissionSystem {
  constructor() {
    this.missions = [];
    this.activeMissions = [];
    this.completedMissions = [];
    this.currentObjective = null;
    this.playerXP = 0;
    this.playerLevel = 1;
    this.achievements = [];
    this.missionTypes = ['tutorial', 'science', 'exploration', 'logistics', 'survival'];
    this.initialized = false;
    this.missionCounter = 0;
    
    this.initializeMissions();
  }

  initializeMissions() {
    // Create diverse mission types
    this.missions = [
      // Tutorial Missions
      {
        id: 'tutorial_001',
        name: 'First Steps on Mars',
        description: 'Drive your rover 100 meters and take your first photo',
        type: 'tutorial',
        objectives: [
          { type: 'drive', target: 100, current: 0, complete: false },
          { type: 'photo', target: 1, current: 0, complete: false }
        ],
        reward: { xp: 50, achievement: 'First Steps' },
        unlocked: true
      },
      
      // Science Missions
      {
        id: 'science_001',
        name: 'Geological Survey',
        description: 'Collect 5 different rock samples for analysis',
        type: 'science',
        objectives: [
          { type: 'collect_samples', target: 5, current: 0, complete: false }
        ],
        reward: { xp: 100, achievement: 'Rock Hound' },
        unlocked: true
      },
      
      {
        id: 'science_002',
        name: 'Meteorite Hunter',
        description: 'Find and collect 3 meteorite samples',
        type: 'science',
        objectives: [
          { type: 'collect_meteorites', target: 3, current: 0, complete: false }
        ],
        reward: { xp: 150, achievement: 'Meteorite Hunter' },
        unlocked: false
      },
      
      // Exploration Missions
      {
        id: 'exploration_001',
        name: 'Mars Marathon',
        description: 'Travel 1000 meters exploring the Martian surface',
        type: 'exploration',
        objectives: [
          { type: 'distance', target: 1000, current: 0, complete: false }
        ],
        reward: { xp: 200, achievement: 'Mars Explorer' },
        unlocked: true
      },
      
      {
        id: 'exploration_002',
        name: 'Colony Spotter',
        description: 'Photograph all 6 Mars colonies',
        type: 'exploration',
        objectives: [
          { type: 'photo_colonies', target: 6, current: 0, complete: false }
        ],
        reward: { xp: 250, achievement: 'Colony Photographer' },
        unlocked: false
      },
      
      // Logistics Missions
      {
        id: 'logistics_001',
        name: 'Sample Delivery',
        description: 'Collect 10 samples and analyze them',
        type: 'logistics',
        objectives: [
          { type: 'analyze_samples', target: 10, current: 0, complete: false }
        ],
        reward: { xp: 180, achievement: 'Lab Technician' },
        unlocked: false
      },
      
      // Survival Missions
      {
        id: 'survival_001',
        name: 'Weather the Storm',
        description: 'Survive a dust storm and continue operations',
        type: 'survival',
        objectives: [
          { type: 'survive_storm', target: 1, current: 0, complete: false }
        ],
        reward: { xp: 300, achievement: 'Storm Survivor' },
        unlocked: false
      }
    ];
    
    // Start with tutorial mission
    this.activateMission('tutorial_001');
    this.initialized = true;
  }

  activateMission(missionId) {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission && mission.unlocked && !this.activeMissions.includes(mission)) {
      this.activeMissions.push(mission);
      this.currentObjective = mission.objectives[0];
      this.showMissionNotification(`New Mission: ${mission.name}`, mission.description);
    }
  }

  updateMissionProgress(type, amount = 1) {
    this.activeMissions.forEach(mission => {
      mission.objectives.forEach(objective => {
        if (objective.type === type && !objective.complete) {
          objective.current += amount;
          if (objective.current >= objective.target) {
            objective.complete = true;
            this.checkMissionCompletion(mission);
          }
        }
      });
    });
  }

  checkMissionCompletion(mission) {
    const allComplete = mission.objectives.every(obj => obj.complete);
    if (allComplete) {
      this.completeMission(mission);
    }
  }

  completeMission(mission) {
    this.activeMissions = this.activeMissions.filter(m => m.id !== mission.id);
    this.completedMissions.push(mission);
    
    // Award rewards
    this.playerXP += mission.reward.xp;
    this.checkLevelUp();
    
    if (mission.reward.achievement) {
      this.unlockAchievement(mission.reward.achievement);
    }
    
    // Unlock next missions
    this.unlockNextMissions(mission.type);
    
    this.showMissionNotification(`Mission Complete: ${mission.name}`, `+${mission.reward.xp} XP`);
  }

  unlockAchievement(name) {
    if (!this.achievements.includes(name)) {
      this.achievements.push(name);
      this.showAchievementNotification(name);
    }
  }

  checkLevelUp() {
    const xpForNextLevel = this.playerLevel * 500;
    if (this.playerXP >= xpForNextLevel) {
      this.playerLevel++;
      this.showLevelUpNotification();
    }
  }

  unlockNextMissions(missionType) {
    // Unlock missions based on completed mission type
    const typeIndex = this.missionTypes.indexOf(missionType);
    if (typeIndex !== -1) {
      this.missions.forEach(mission => {
        if (!mission.unlocked && mission.type === missionType) {
          mission.unlocked = true;
        }
      });
    }
  }

  showMissionNotification(title, description) {
    if (window.showNotification) {
      window.showNotification(`${title}: ${description}`, 6000);
    }
  }

  showAchievementNotification(achievement) {
    if (window.showNotification) {
      window.showNotification(`🏆 Achievement Unlocked: ${achievement}!`, 5000);
    }
  }

  showLevelUpNotification() {
    if (window.showNotification) {
      window.showNotification(`🎉 Level Up! You are now level ${this.playerLevel}!`, 4000);
    }
  }

  getMissionStatus() {
    return {
      active: this.activeMissions.length,
      completed: this.completedMissions.length,
      total: this.missions.length,
      xp: this.playerXP,
      level: this.playerLevel,
      achievements: this.achievements.length
    };
  }
}

// Sample Collection System
class SampleCollectionSystem {
  constructor(scene) {
    this.scene = scene;
    this.samples = [];
    this.collectedSamples = [];
    this.sampleTypes = [
      { name: 'Rock', color: 0x8B4513, rarity: 'common', analysis: 'Sedimentary rock formed from ancient water deposits' },
      { name: 'Mineral', color: 0xFFD700, rarity: 'uncommon', analysis: 'Iron oxide minerals indicating past water activity' },
      { name: 'Meteorite', color: 0x2F4F4F, rarity: 'rare', analysis: 'Extraterrestrial material containing rare elements' },
      { name: 'Crystal', color: 0x9370DB, rarity: 'rare', analysis: 'Crystalline structure with unique mineral composition' },
      { name: 'Soil', color: 0xDEB887, rarity: 'common', analysis: 'Martian regolith rich in perchlorates' },
      { name: 'Ice', color: 0x87CEEB, rarity: 'uncommon', analysis: 'Subsurface ice deposit, potential water source' },
      { name: 'Volcanic Glass', color: 0x000000, rarity: 'very rare', analysis: 'Obsidian-like glass from ancient volcanic activity' }
    ];
    this.analysisData = new Map();
    this.lastSampleTime = 0;
    this.sampleCooldown = 2000; // 2 seconds between samples
    
    this.generateSamples();
  }

  generateSamples() {
    // Generate fewer samples for better performance
    const perfSettings = getPerformanceSettings();
    const sampleCount = perfSettings.detailLevel === 'high' ? 100 : 
                       perfSettings.detailLevel === 'normal' ? 50 : 25;
    
    for (let i = 0; i < sampleCount; i++) {
      const sample = this.createSample();
      this.samples.push(sample);
      this.scene.add(sample.mesh);
    }
  }

  createSample() {
    const sampleType = this.getRandomSampleType();
    const position = this.getRandomPosition();
    
    // Create sample mesh
    const geometry = new THREE.OctahedronGeometry(2, 1);
    const material = new THREE.MeshStandardMaterial({
      color: sampleType.color,
      emissive: sampleType.color,
      emissiveIntensity: 0.2,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: sampleType.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);
    
    // Add floating animation
    const startY = position.y;
    mesh.userData.startY = startY;
    mesh.userData.time = Math.random() * Math.PI * 2;
    
    return {
      mesh: mesh,
      type: sampleType,
      position: position,
      collected: false,
      id: `sample_${Date.now()}_${Math.random()}`
    };
  }

  getRandomSampleType() {
    const rarities = { common: 0.5, uncommon: 0.3, rare: 0.15, 'very rare': 0.05 };
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [rarity, chance] of Object.entries(rarities)) {
      cumulative += chance;
      if (rand <= cumulative) {
        const typesOfRarity = this.sampleTypes.filter(s => s.rarity === rarity);
        return typesOfRarity[Math.floor(Math.random() * typesOfRarity.length)];
      }
    }
    
    return this.sampleTypes[0]; // fallback
  }

  getRandomPosition() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 3000;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Use raycasting to place on terrain
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
    
    let y = 50; // default height
    if (this.scene && this.scene.children) {
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        y = intersects[0].point.y + 3; // slightly above ground
      }
    }
    
    return new THREE.Vector3(x, y, z);
  }

  update(roverPosition) {
    // Update sample animations
    this.samples.forEach(sample => {
      if (!sample.collected && sample.mesh) {
        sample.mesh.userData.time += 0.02;
        sample.mesh.position.y = sample.mesh.userData.startY + Math.sin(sample.mesh.userData.time) * 1;
        sample.mesh.rotation.y += 0.01;
        
        // Check if rover is close enough to collect
        const distance = roverPosition.distanceTo(sample.position);
        if (distance < 20) {
          // Highlight sample
          sample.mesh.children[0].material.opacity = 0.6;
        } else {
          sample.mesh.children[0].material.opacity = 0.3;
        }
      }
    });
  }

  collectSample(roverPosition) {
    const currentTime = Date.now();
    if (currentTime - this.lastSampleTime < this.sampleCooldown) {
      return false; // Still in cooldown
    }
    
    // Find closest sample
    let closestSample = null;
    let closestDistance = Infinity;
    
    this.samples.forEach(sample => {
      if (!sample.collected) {
        const distance = roverPosition.distanceTo(sample.position);
        if (distance < closestDistance && distance < 20) {
          closestDistance = distance;
          closestSample = sample;
        }
      }
    });
    
    if (closestSample) {
      closestSample.collected = true;
      this.collectedSamples.push(closestSample);
      
      // Remove from scene
      this.scene.remove(closestSample.mesh);
      
      // Generate analysis data
      this.generateAnalysisData(closestSample);
      
      // Update missions
      if (window.missionSystem) {
        window.missionSystem.updateMissionProgress('collect_samples');
        if (closestSample.type.name === 'Meteorite') {
          window.missionSystem.updateMissionProgress('collect_meteorites');
        }
      }
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(`Collected ${closestSample.type.name} sample (${closestSample.type.rarity})`, 3000);
      }
      
      this.lastSampleTime = currentTime;
      return true;
    }
    
    return false;
  }

  generateAnalysisData(sample) {
    const data = {
      id: sample.id,
      name: sample.type.name,
      rarity: sample.type.rarity,
      composition: this.generateComposition(sample.type),
      age: this.generateAge(sample.type),
      origin: this.generateOrigin(sample.type),
      analysis: sample.type.analysis,
      collectTime: new Date().toISOString()
    };
    
    this.analysisData.set(sample.id, data);
  }

  generateComposition(type) {
    const compositions = {
      'Rock': ['Silicon Dioxide (45%)', 'Iron Oxide (25%)', 'Magnesium Oxide (15%)', 'Calcium Oxide (10%)', 'Other (5%)'],
      'Mineral': ['Iron Oxide (60%)', 'Silicon Dioxide (20%)', 'Aluminum Oxide (10%)', 'Magnesium Oxide (5%)', 'Other (5%)'],
      'Meteorite': ['Iron (70%)', 'Nickel (25%)', 'Cobalt (3%)', 'Rare Elements (2%)'],
      'Crystal': ['Silicon Dioxide (80%)', 'Aluminum Oxide (15%)', 'Trace Elements (5%)'],
      'Soil': ['Iron Oxide (30%)', 'Silicon Dioxide (25%)', 'Magnesium Oxide (20%)', 'Perchlorates (15%)', 'Other (10%)'],
      'Ice': ['Water Ice (95%)', 'Carbon Dioxide (3%)', 'Salts (2%)'],
      'Volcanic Glass': ['Silicon Dioxide (70%)', 'Aluminum Oxide (15%)', 'Iron Oxide (10%)', 'Other (5%)']
    };
    
    return compositions[type.name] || ['Unknown composition'];
  }

  generateAge(type) {
    const ages = {
      'Rock': `${Math.floor(Math.random() * 3000) + 1000} million years`,
      'Mineral': `${Math.floor(Math.random() * 2000) + 500} million years`,
      'Meteorite': `${Math.floor(Math.random() * 4000) + 500} million years`,
      'Crystal': `${Math.floor(Math.random() * 1000) + 100} million years`,
      'Soil': `${Math.floor(Math.random() * 100) + 10} million years`,
      'Ice': `${Math.floor(Math.random() * 10) + 1} million years`,
      'Volcanic Glass': `${Math.floor(Math.random() * 500) + 50} million years`
    };
    
    return ages[type.name] || 'Unknown age';
  }

  generateOrigin(type) {
    const origins = {
      'Rock': 'Formed from sedimentary deposits in ancient Martian oceans',
      'Mineral': 'Crystallized from hydrothermal vents during Mars\' volcanic period',
      'Meteorite': 'Originated from the asteroid belt between Mars and Jupiter',
      'Crystal': 'Formed in underground caverns through slow crystallization',
      'Soil': 'Weathered from surface rocks by wind and temperature cycles',
      'Ice': 'Deposited from atmospheric condensation in polar regions',
      'Volcanic Glass': 'Formed during explosive volcanic eruptions in Tharsis region'
    };
    
    return origins[type.name] || 'Unknown origin';
  }

  analyzeSample(sampleId) {
    const data = this.analysisData.get(sampleId);
    if (data) {
      // Update missions
      if (window.missionSystem) {
        window.missionSystem.updateMissionProgress('analyze_samples');
      }
      
      return data;
    }
    return null;
  }

  getCollectedSamples() {
    return this.collectedSamples;
  }

  getSampleAnalysis(sampleId) {
    return this.analysisData.get(sampleId);
  }
}

// Global notification system
function showNotification(message, duration = 3000) {
  // Remove existing notifications
  const existingNotification = document.getElementById('notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-left: 4px solid #00ff88;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto-remove notification
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, duration);
}

// Initialize enhanced systems
function initializeEnhancedSystems() {
  const perfSettings = getPerformanceSettings();
  
  // On mobile, only initialize essential systems
  if (perfSettings.isMobile) {
    // Mobile: Essential systems for basic functionality
    window.missionSystem = new MissionSystem(); // Keep for basic functionality
    window.sampleSystem = new SampleCollectionSystem(scene); // Keep for mobile buttons
    window.showNotification = showNotification;
    window.showAnalysisDialog = showAnalysisDialog; // Keep for mobile analysis
    window.rover = rover; // Make rover globally accessible for mobile controls
    
    // Initialize essential UI
    createEnhancedHUD();
    addEnhancedControlsInfo(); // Keep for mobile instructions
    
    console.log('Mobile enhanced systems initialized (essential mode)');
  } else {
    // Desktop: Full systems
    window.missionSystem = new MissionSystem();
    window.sampleSystem = new SampleCollectionSystem(scene);
    window.showNotification = showNotification;
    window.showAnalysisDialog = showAnalysisDialog; // Make analysis dialog globally accessible for mobile
    window.rover = rover; // Make rover globally accessible for mobile controls
    
    // Initialize enhanced UI
    createEnhancedHUD();
    
    // Add enhanced controls information
    addEnhancedControlsInfo();
    
    console.log('Enhanced systems initialized successfully!');
  }
}

// Enhanced HUD with new features
function createEnhancedHUD() {
  const existingHUD = document.getElementById('hud');
  if (existingHUD) {
    existingHUD.remove();
  }
  
  // Detect mobile device
  const isMobile = isMobileDevice();
  
  const hud = document.createElement('div');
  hud.id = 'hud';
  
  // Mobile-specific styles
  if (isMobile) {
    const perfSettings = getPerformanceSettings();
    const mobileTier = perfSettings.mobileTier || 'low';
    const tierColor = mobileTier === 'high' ? '#ff6b35' : mobileTier === 'medium' ? '#ffa500' : '#00ff88';
    
    hud.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      color: white;
      font-family: monospace;
      font-size: 10px;
      z-index: 100;
      background: rgba(0, 0, 0, 0.8);
      padding: 8px;
      border-radius: 6px;
      min-width: 140px;
      max-width: 160px;
      max-height: 40vh;
      overflow-y: auto;
      border: 1px solid ${tierColor};
      transition: all 0.3s ease;
    `;
    
    // Mobile tier information
    const tierEmoji = mobileTier === 'high' ? '🔥' : mobileTier === 'medium' ? '⚡' : '📱';
    const tierName = mobileTier === 'high' ? 'High-End' : mobileTier === 'medium' ? 'Mid-Range' : 'Budget';
    
    // Samsung device detection for HUD
    const isSamsung = perfSettings.deviceInfo && perfSettings.deviceInfo.isSamsung;
    const deviceBrand = isSamsung ? 'Samsung' : '';
    const optimizationIndicator = isSamsung ? '🔧' : '';
    
    hud.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="color: #00ff88; font-weight: bold; font-size: 9px;">🚀 HUD</div>
        <div style="display: flex; gap: 4px;">
          <button id="help-btn" style="background: none; border: none; color: #ffaa44; cursor: pointer; font-size: 10px; padding: 0;" title="Help (H)">?</button>
          <button id="hud-toggle" style="background: none; border: none; color: #00ff88; cursor: pointer; font-size: 10px; padding: 0;">−</button>
        </div>
      </div>
      <div id="hud-content">
        <div style="color: ${tierColor}; font-size: 8px; margin-bottom: 6px; text-align: center; border-bottom: 1px solid ${tierColor}; padding-bottom: 3px;">
          ${tierEmoji} ${deviceBrand} ${tierName} Mobile ${optimizationIndicator}
        </div>
        <div id="hud-status">
          <div>Dist: <span id="distance-traveled">0</span>m</div>
          <div>Speed: <span id="current-speed">0</span>m/s</div>
          <div>Cam: <span id="camera-mode">3P</span></div>
          <div>Health: <span id="rover-health">100</span>%</div>
          <div>Fuel: <span id="rover-fuel">1000</span></div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div style="color: #88ff88; font-weight: bold; font-size: 9px;">🎯 MISSIONS</div>
          <div>Lvl: <span id="player-level">1</span> | XP: <span id="player-xp">0</span></div>
          <div>Act: <span id="active-missions">0</span> | Done: <span id="completed-missions">0</span></div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div style="color: #ffaa44; font-weight: bold; font-size: 9px;">🔬 SAMPLES</div>
          <div>Coll: <span id="samples-collected">0</span> | Ana: <span id="samples-analyzed">0</span></div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div style="color: #aa44ff; font-weight: bold; font-size: 9px;">🏆 ACH</div>
          <div>Unlocked: <span id="achievements-count">0</span></div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <button id="low-power-toggle" style="
            background: #333; 
            border: 1px solid #666; 
            color: #ffaa44; 
            cursor: pointer; 
            font-size: 8px; 
            padding: 4px 8px; 
            border-radius: 3px; 
            width: 100%;
            transition: all 0.3s ease;
          ">⚡ Low Power Mode</button>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div style="color: #88ff88; font-weight: bold; font-size: 8px; margin-bottom: 4px;">🎨 ROVER COLOR</div>
          <div style="display: flex; gap: 2px; justify-content: space-between;">
            <button class="color-btn" data-color="0xff4444" style="background: #ff4444; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
            <button class="color-btn" data-color="0x44ff44" style="background: #44ff44; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
            <button class="color-btn" data-color="0x4444ff" style="background: #4444ff; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
            <button class="color-btn" data-color="0xffaa44" style="background: #ffaa44; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
            <button class="color-btn" data-color="0x888888" style="background: #888888; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
            <button class="color-btn" data-color="0xffffff" style="background: #ffffff; width: 18px; height: 18px; border: 1px solid #666; cursor: pointer; border-radius: 2px;"></button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Desktop styles (unchanged)
    hud.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      z-index: 100;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 8px;
      min-width: 250px;
      max-height: 80vh;
      overflow-y: auto;
      border: 2px solid #00ff88;
    `;
    
    hud.innerHTML = `
      <div style="color: #00ff88; font-weight: bold; margin-bottom: 10px;">🚀 MARS ROVER HUD</div>
      <div id="hud-status">
        <div>Status: <span id="rover-status">Operational</span></div>
        <div>Distance: <span id="distance-traveled">0</span> m</div>
        <div>Speed: <span id="current-speed">0</span> m/s</div>
        <div>Camera: <span id="camera-mode">Third Person</span></div>
        <div>Health: <span id="rover-health">100</span>%</div>
        <div>Fuel: <span id="rover-fuel">1000</span></div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <div style="color: #88ff88; font-weight: bold;">🎯 MISSIONS</div>
        <div>Level: <span id="player-level">1</span></div>
        <div>XP: <span id="player-xp">0</span></div>
        <div>Active: <span id="active-missions">0</span></div>
        <div>Completed: <span id="completed-missions">0</span></div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <div style="color: #ffaa44; font-weight: bold;">🔬 SAMPLES</div>
        <div>Collected: <span id="samples-collected">0</span></div>
        <div>Analyzed: <span id="samples-analyzed">0</span></div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <div style="color: #aa44ff; font-weight: bold;">🏆 ACHIEVEMENTS</div>
        <div>Unlocked: <span id="achievements-count">0</span></div>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <button id="low-power-toggle" style="
          background: #333; 
          border: 1px solid #666; 
          color: #ffaa44; 
          cursor: pointer; 
          font-size: 12px; 
          padding: 8px 12px; 
          border-radius: 4px; 
          width: 100%;
          transition: all 0.3s ease;
        ">⚡ Low Power Mode</button>
      </div>
      <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
        <div style="color: #88ff88; font-weight: bold; margin-bottom: 8px;">🎨 ROVER CUSTOMIZATION</div>
        <div style="display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap;">
          <button class="color-btn" data-color="0xff4444" style="background: #ff4444; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
          <button class="color-btn" data-color="0x44ff44" style="background: #44ff44; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
          <button class="color-btn" data-color="0x4444ff" style="background: #4444ff; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
          <button class="color-btn" data-color="0xffaa44" style="background: #ffaa44; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
          <button class="color-btn" data-color="0x888888" style="background: #888888; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
          <button class="color-btn" data-color="0xffffff" style="background: #ffffff; width: 24px; height: 24px; border: 1px solid #666; cursor: pointer; border-radius: 4px;"></button>
        </div>
      </div>
    `;
  }
  
  document.body.appendChild(hud);
  
  // Add toggle functionality for mobile
  if (isMobile) {
    const toggleBtn = document.getElementById('hud-toggle');
    const hudContent = document.getElementById('hud-content');
    let isCollapsed = false;
    
    toggleBtn.addEventListener('click', () => {
      if (isCollapsed) {
        hudContent.style.display = 'block';
        toggleBtn.textContent = '−';
              isCollapsed = false;
    } else {
      hudContent.style.display = 'none';
      toggleBtn.textContent = '+';
      isCollapsed = true;
    }
  });
  
  // Add help button functionality
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', toggleHelpSystem);
  }
}
  
  // Add low-power toggle functionality for both mobile and desktop
  const lowPowerToggle = document.getElementById('low-power-toggle');
  let isLowPowerMode = false;
  
  if (lowPowerToggle) {
    lowPowerToggle.addEventListener('click', () => {
      isLowPowerMode = !isLowPowerMode;
      
      if (isLowPowerMode) {
        // Enable low power mode
        renderer.setPixelRatio(0.5); // Reduce pixel ratio for instant FPS boost
        if (renderer.shadowMap) {
          renderer.shadowMap.enabled = false; // Disable shadows
        }
        renderer.antialias = false; // Disable antialiasing
        
        // Update button appearance
        lowPowerToggle.style.background = '#ff6b35';
        lowPowerToggle.style.color = '#fff';
        lowPowerToggle.textContent = '🔋 Low Power: ON';
        
        console.log('Low power mode enabled - FPS boost activated');
      } else {
        // Disable low power mode
        const perfSettings = getPerformanceSettings();
        const pixelRatio = perfSettings.isMobile ? 
                          (perfSettings.mobileTier === 'high' ? Math.min(window.devicePixelRatio, 1.5) : 1) :
                          Math.min(window.devicePixelRatio, perfSettings.graphicsQuality === 'high' ? 2 : 1);
        renderer.setPixelRatio(pixelRatio); // Restore original pixel ratio
        
        if (renderer.shadowMap && perfSettings.shadowQuality !== 'none') {
          renderer.shadowMap.enabled = true; // Re-enable shadows if supported
        }
        renderer.antialias = perfSettings.antialiasing; // Restore antialiasing
        
        // Update button appearance
        lowPowerToggle.style.background = '#333';
        lowPowerToggle.style.color = '#ffaa44';
        lowPowerToggle.textContent = '⚡ Low Power Mode';
        
        console.log('Low power mode disabled - restored original settings');
      }
    });
  }
  
  // Add rover customization listeners
  const colorButtons = document.querySelectorAll('.color-btn');
  colorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const colorHex = button.getAttribute('data-color');
      changeRoverColor(colorHex);
    });
  });
}

// Change rover color
function changeRoverColor(colorHex) {
  const perfSettings = getPerformanceSettings();
  if (!perfSettings.enableCustomization || !rover) return;
  
  const color = parseInt(colorHex);
  let colorChanged = false;
  
  // Find rover body material and change color
  rover.traverse((child) => {
    if (child.isMesh && child.material) {
      // Look for the main body material (marked with userData.isBody)
      if (child.material.userData && child.material.userData.isBody) {
        child.material.color.setHex(color);
        // Maintain mobile emissive properties
        if (perfSettings.isMobile) {
          const emissiveColor = new THREE.Color(color).multiplyScalar(0.2);
          child.material.emissive = emissiveColor;
        }
        colorChanged = true;
      }
    }
  });
  
  // If no tagged material found, change the main body (largest non-wheel component)
  if (!colorChanged) {
    rover.traverse((child) => {
      if (child.isMesh && child.material && child.material.color && !colorChanged) {
        // Skip wheel materials (typically darker) and small components
        const color = child.material.color;
        if (color.r > 0.3 && color.g > 0.3 && color.b > 0.3) { // Likely the main body
          child.material.color.setHex(parseInt(colorHex));
          // Maintain mobile emissive properties
          if (perfSettings.isMobile) {
            const emissiveColor = new THREE.Color(parseInt(colorHex)).multiplyScalar(0.2);
            child.material.emissive = emissiveColor;
          }
          colorChanged = true;
        }
      }
    });
  }
  
  if (colorChanged) {
    showNotification("🎨 Rover color changed!", 1500);
  } else {
    showNotification("🎨 Could not change rover color", 1500);
  }
}

// Enhanced controls information
function addEnhancedControlsInfo() {
  const existingControls = document.getElementById('controls');
  if (existingControls) {
    existingControls.remove();
  }
  
  // Detect mobile device
  const isMobile = isMobileDevice();
  
  // Skip creating controls panel on mobile devices
  if (isMobile) {
    return; // Don't create controls panel on mobile
  }
  
  const controls = document.createElement('div');
  controls.id = 'controls';
  
  // Desktop: Keep original layout
  controls.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    color: white;
    font-family: monospace;
    font-size: 12px;
    z-index: 100;
    background: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 8px;
    border: 2px solid #00ff88;
    max-width: 300px;
  `;
  
  controls.innerHTML = `
    <div style="color: #00ff88; font-weight: bold; margin-bottom: 10px;">🎮 ENHANCED CONTROLS</div>
    <div><strong>Movement:</strong> WASD</div>
    <div><strong>Camera:</strong> C to cycle modes</div>
    <div><strong>Day/Night:</strong> L to toggle</div>
    <div><strong>Samples:</strong> E to collect</div>
    <div><strong>Analysis:</strong> Q to analyze</div>
                <div><strong>Rockets:</strong> SpaceX starships on display</div>
    <div style="margin-top: 10px; font-size: 10px; color: #aaa;">
      Look for glowing objects to collect samples!<br>
      Watch for meteor showers at night!<br>
              SpaceX starships on display for exploration!<br>
      Explore to find Mars colonies!
    </div>
  `;
  
  document.body.appendChild(controls);
}

// Enhanced update function for all systems
function updateEnhancedSystems(deltaTime, roverPosition) {
  // Update sample system
  if (window.sampleSystem) {
    window.sampleSystem.update(roverPosition);
  }
  
  // Update HUD
  updateEnhancedHUD();
  
  // Handle sample collection
  if (keys['e']) {
    if (window.sampleSystem) {
      window.sampleSystem.collectSample(roverPosition);
    }
  }
  
  // Handle sample analysis
  if (keys['q']) {
    if (window.sampleSystem) {
      const samples = window.sampleSystem.getCollectedSamples();
      if (samples.length > 0) {
        const lastSample = samples[samples.length - 1];
        const analysis = window.sampleSystem.analyzeSample(lastSample.id);
        if (analysis) {
          showAnalysisDialog(analysis);
        }
      }
    }
  }
  
  // Manual rocket launch disabled - starships stay on ground
  // if (keys['r']) {
  //   if (window.marsSceneManager && window.marsSceneManager.rocketLaunchActive) {
  //     // Prevent spamming - only allow one manual launch per 3 seconds
  //     if (!window.lastManualRocketLaunch || Date.now() - window.lastManualRocketLaunch > 3000) {
  //       window.lastManualRocketLaunch = Date.now();
  //       window.marsSceneManager.triggerManualLaunch();
  //     }
  //   }
  // }
}

// Update HUD with enhanced information
function updateEnhancedHUD() {
  // Update mission status
  if (window.missionSystem) {
    const status = window.missionSystem.getMissionStatus();
    const levelEl = document.getElementById('player-level');
    const xpEl = document.getElementById('player-xp');
    const activeMissionsEl = document.getElementById('active-missions');
    const completedMissionsEl = document.getElementById('completed-missions');
    const achievementsEl = document.getElementById('achievements-count');
    
    if (levelEl) levelEl.textContent = status.level;
    if (xpEl) xpEl.textContent = status.xp;
    if (activeMissionsEl) activeMissionsEl.textContent = status.active;
    if (completedMissionsEl) completedMissionsEl.textContent = status.completed;
    if (achievementsEl) achievementsEl.textContent = status.achievements;
  }
  
  // Update sample status
  if (window.sampleSystem) {
    const samples = window.sampleSystem.getCollectedSamples();
    const analyzedCount = samples.filter(s => window.sampleSystem.getSampleAnalysis(s.id)).length;
    const collectedEl = document.getElementById('samples-collected');
    const analyzedEl = document.getElementById('samples-analyzed');
    
    if (collectedEl) collectedEl.textContent = samples.length;
    if (analyzedEl) analyzedEl.textContent = analyzedCount;
  }
  
  // Update other status
  const distanceEl = document.getElementById('distance-traveled');
  const speedEl = document.getElementById('current-speed');
  
  if (distanceEl) distanceEl.textContent = Math.round(distanceTraveled);
  if (speedEl) speedEl.textContent = currentSpeed.toFixed(1);
  
  // Update camera mode with compact text for mobile
  const isMobile = isMobileDevice();
  const cameraElement = document.getElementById('camera-mode');
  if (cameraElement) {
    if (isMobile) {
      // Compact camera mode names for mobile
      const compactMode = cameraMode === 'Third Person' ? '3P' : 
                         cameraMode === 'First Person' ? '1P' : 
                         cameraMode === 'Orbit' ? 'Orbit' : 
                         cameraMode === 'Top Down' ? 'Top' : cameraMode;
      cameraElement.textContent = compactMode;
    } else {
      cameraElement.textContent = cameraMode;
    }
  }
}

// Show sample analysis dialog
function showAnalysisDialog(analysis) {
  // Remove existing dialog
  const existingDialog = document.getElementById('analysis-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const dialog = document.createElement('div');
  dialog.id = 'analysis-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 30px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 14px;
    z-index: 1500;
    max-width: 600px;
    border: 3px solid #00ff88;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
  `;
  
  dialog.innerHTML = `
    <div style="color: #00ff88; font-weight: bold; font-size: 18px; margin-bottom: 15px;">
      🔬 SAMPLE ANALYSIS COMPLETE
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Sample:</strong> ${analysis.name} (${analysis.rarity})<br>
      <strong>Age:</strong> ${analysis.age}<br>
      <strong>Collection Time:</strong> ${new Date(analysis.collectTime).toLocaleString()}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Composition:</strong><br>
      ${analysis.composition.map(comp => `• ${comp}`).join('<br>')}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Origin:</strong><br>
      ${analysis.origin}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Scientific Analysis:</strong><br>
      ${analysis.analysis}
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <button onclick="document.getElementById('analysis-dialog').remove()" 
              style="background: #00ff88; color: black; border: none; padding: 10px 20px; 
                     border-radius: 5px; font-weight: bold; cursor: pointer;">
        Close Analysis
      </button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    if (dialog.parentNode) {
      dialog.remove();
    }
  }, 10000);
}

// Initialize enhanced systems after a short delay
setTimeout(() => {
  initializeEnhancedSystems();
  
  // Show welcome message with device-specific information
  setTimeout(() => {
    if (window.showNotification) {
      const perfSettings = getPerformanceSettings();
      if (perfSettings.isMobile) {
        console.log('Mobile mode initialized with settings:', perfSettings);
        const mobileTier = perfSettings.mobileTier || 'low';
        const tierEmoji = mobileTier === 'high' ? '🔥' : mobileTier === 'medium' ? '⚡' : '📱';
        const tierMessage = mobileTier === 'high' ? 'High-End Mobile' : 
                           mobileTier === 'medium' ? 'Mid-Range Mobile' : 'Mobile Optimized';
        
        // Add emergency performance messaging for mobile
        const performanceStatus = ' Emergency performance mode active for stability!';
        const deviceMessage = perfSettings.samsungOptimized ? 
          `${tierEmoji} Samsung ${tierMessage}! Emergency optimizations applied for maximum performance!${performanceStatus}` :
          `${tierEmoji} ${tierMessage}! Emergency performance mode enabled. Graphics reduced for stability.${performanceStatus}`;
        
        window.showNotification(deviceMessage, 5000);
      } else {
        window.showNotification('🚀 Mars Rover Ready! WASD to move, C for camera, R for rockets!', 5000);
      }
    }
  }, 2000);
  
  // Set up global controls for easy access (only after mars scene manager is ready)
  setTimeout(() => {
    const perfSettings = getPerformanceSettings();
    
    if (window.marsSceneManager) {
      // Global rocket launch controls
      window.rocketLaunchControls = {
        enableLaunches: () => window.marsSceneManager.enableRocketLaunches(),
        disableLaunches: () => window.marsSceneManager.disableRocketLaunches(),
        manualLaunch: (pattern) => window.marsSceneManager.triggerManualLaunch(pattern || 'single'),
        setInterval: (ms) => window.marsSceneManager.setRocketLaunchInterval(ms)
      };
      
      // Rocket system ready notification removed - starships stay on ground
      // if (window.showNotification && !perfSettings.isMobile) {
      //   window.showNotification('🚀 Rocket System Ready! Press R for manual launch!', 4000);
      // }
    } else if (perfSettings.isMobile) {
      // Mobile-specific performance notification with feature details
      if (window.showNotification) {
        const mobileTier = perfSettings.mobileTier || 'low';
        let featureMessage = '';
        
        if (mobileTier === 'high') {
          featureMessage = '🔥 High-End Mobile: Enhanced terrain, rockets enabled, atmospheric effects active!';
        } else if (mobileTier === 'medium') {
          featureMessage = '⚡ Mid-Range Mobile: Improved terrain, rockets enabled with enhanced visibility!';
        } else {
          featureMessage = '📱 Mobile Optimized: Essential features enabled for best performance!';
        }
        
        window.showNotification(featureMessage, 4000);
      }
    }
    
    // Add performance mode toggle
    window.performanceMode = {
      enable: () => {
        if (window.marsSceneManager) window.marsSceneManager.disableRocketLaunches();
        if (window.showNotification) window.showNotification('Performance Mode ENABLED - Heavy effects disabled', 3000);
      },
      disable: () => {
        if (window.marsSceneManager) window.marsSceneManager.enableRocketLaunches();
        if (window.showNotification) window.showNotification('Performance Mode DISABLED - All effects enabled', 3000);
      }
         };
   }, 8000);
}, 1000);