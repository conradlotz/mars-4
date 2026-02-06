function initializeGameSystems(rover, wheels, scene) {
  const perfSettings = getPerformanceSettings();
  const gameSystem = {
    notifications: []
  };
  
  return gameSystem;
}


// Update game systems in the animation loop
function updateGameSystems(time, delta) {
  const perfSettings = getPerformanceSettings();
  
  if (!gameSystem || !rover) return;
 
  // Update visual effects
  updateVisualEffects(time, delta);
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

// Performance-aware initialization with mobile detection
// Cache for performance settings to avoid recreating WebGL contexts on every call
let _cachedPerformanceSettings = null;

// Day/night cycle variables - declared early to avoid temporal dead zone issues
let lastTransitionUpdate = 0;
let currentTimeOfDay = 0.5; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight
let dayNightCycleSpeed = 0.00001; // Speed of day/night cycle (smaller = slower)
let isManualTransition = false;
let manualTransitionTarget = null;
let manualTransitionSpeed = 0.005;

function getPerformanceSettings() {
  // Return cached settings if available (settings don't change during session)
  if (_cachedPerformanceSettings) return _cachedPerformanceSettings;
  
  const isMobile = false;
  
  // Desktop settings - capped to prevent GPU crashes
  _cachedPerformanceSettings = window.GAME_PERFORMANCE_SETTINGS || {
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
  return _cachedPerformanceSettings;
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
  antialias: false, // Disabled for performance
  powerPreference: perfSettings.isMobile ? 'low-power' : 'high-performance', // Use discrete GPU on desktop
  precision: perfSettings.isMobile ? 'lowp' : 'mediump', // Higher precision on desktop for quality
  alpha: false,
  stencil: false,
  depth: true,
  logarithmicDepthBuffer: false,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false, // Don't fail on performance issues
  premultipliedAlpha: false
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
  if (perfSettings.samsungOptimized) {
    // Samsung devices need different color encoding and gamma
    renderer.outputEncoding = THREE.LinearEncoding;  // Better for Samsung displays
    renderer.gammaFactor = perfSettings.gammaCorrection;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;  // Slightly brighter exposure for Samsung
    
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
    window.gameAnimationRunning = false;
    if (window.gameAnimationId) {
      cancelAnimationFrame(window.gameAnimationId);
    }
    
    // Dispose all contexts to prevent overflow
    if (window.webglContextManager) {
      window.webglContextManager.disposeAll();
    }
  }, false);

  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored - resuming animation');
    
    // Re-register the renderer
    if (window.webglContextManager) {
      window.webglContextManager.register(renderer);
    }
    
    // Restart animation with reduced settings
    window.gameAnimationRunning = true;
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

// Defer night skybox creation - game starts in day mode, so create it in background
let spaceSkybox = null;
let _spaceSkyboxCreating = false;

function ensureSpaceSkybox() {
  if (spaceSkybox || _spaceSkyboxCreating) return;
  _spaceSkyboxCreating = true;
  // Create skybox asynchronously in the next idle period
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      spaceSkybox = createSpaceSkybox();
      scene.add(spaceSkybox);
      console.log('Skybox created in background (idle callback)');
    }, { timeout: 5000 });
  } else {
    setTimeout(() => {
      spaceSkybox = createSpaceSkybox();
      console.log('Skybox created in background (setTimeout)');
    }, 2000);
  }
}

// Start creating skybox in background after a short delay (not blocking initial load)
setTimeout(ensureSpaceSkybox, 100);

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
  // chassis.castShadow = true; // Disabled for cleaner look
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
  // body.castShadow = true; // Disabled for cleaner look
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
  // rtg.castShadow = true; // Disabled for cleaner look
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
  // radiator1.castShadow = true; // Disabled for cleaner look
  roverGroup.add(radiator1);

  const radiator2 = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
  radiator2.position.set(0, 1.3, 1.2);
  // radiator2.castShadow = true; // Disabled for cleaner look
  roverGroup.add(radiator2);

  // Camera mast
  const mastGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8);
  const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.set(0, 1.9, 0.8);
  // mast.castShadow = true; // Disabled for cleaner look
  roverGroup.add(mast);

  // Mastcam (stereo cameras)
  const cameraBoxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
  const cameraBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const cameraBox = new THREE.Mesh(cameraBoxGeometry, cameraBoxMaterial);
  cameraBox.position.y = 0.6;
  // cameraBox.castShadow = true; // Disabled for cleaner look
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
  // panel.castShadow = true; // Disabled for cleaner look
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
    // wheel.castShadow = true; // Disabled for cleaner look

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
  
  // Position rover on terrain initially
  positionRoverOnTerrain();
  
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

function showWelcomeMessage() {
  if (typeof document === 'undefined') return;

  try {
    if (window.localStorage && localStorage.getItem('mars_welcome_shown') === '1') {
      return;
    }
  } catch (e) {
    // Ignore storage errors and just show the message once per load
  }

  if (document.getElementById('mars-welcome-message')) {
    return;
  }

  const notification = document.createElement('div');
  notification.id = 'mars-welcome-message';
  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 20px;
    z-index: 10001;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 320px;
    text-align: center;
    cursor: pointer;
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;

  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Welcome to Drive on Mars</div>
    <div style="opacity: 0.85;">Use WASD or the on-screen controls to drive the rover. Open the settings panel to tweak performance and visuals.</div>
  `;

  document.body.appendChild(notification);

  const hide = () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, 20px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };

  notification.addEventListener('click', hide);

  try {
    if (window.localStorage) {
      localStorage.setItem('mars_welcome_shown', '1');
    }
  } catch (e) {
    // Ignore storage errors
  }

  setTimeout(hide, 8000);
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
// sunLight.castShadow = true; // Disabled for better performance and cleaner look
// sunLight.shadow.mapSize.width = 2048;
// sunLight.shadow.mapSize.height = 2048;
// sunLight.shadow.camera.near = 0.5;
// sunLight.shadow.camera.far = 500;
// sunLight.shadow.camera.left = -100;
// sunLight.shadow.camera.right = 100;
// sunLight.shadow.camera.top = 100;
// sunLight.shadow.camera.bottom = -100;
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
  maxContexts: 1, // Only allow one context to prevent overflow
  
  register: function(renderer) {
    // If we already have a context, dispose it first
    if (this.contexts.size >= this.maxContexts) {
      console.warn('Disposing existing WebGL context to prevent overflow');
      this.disposeAll();
    }
    
    this.contexts.add(renderer);
    console.log('WebGL context registered, total contexts:', this.contexts.size);
  },
  
  dispose: function(renderer) {
    if (renderer && typeof renderer.dispose === 'function') {
      try {
        renderer.dispose();
        console.log('WebGL context disposed successfully');
      } catch (error) {
        console.warn('Error disposing WebGL context:', error);
      }
    }
    this.contexts.delete(renderer);
  },
  
  disposeAll: function() {
    console.log('Disposing all WebGL contexts');
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
  targetFPS: 20, // Lower target FPS for mobile stability
  frameDropCount: 0,
  emergencyModeTriggered: false,
  
  update: function(currentTime) {
    if (this.lastFrameTime > 0) {
      const frameDelta = currentTime - this.lastFrameTime;
      const fps = 1000 / frameDelta;
      
      this.frameRates.push(fps);
      if (this.frameRates.length > 20) { // Keep last 20 frames for faster response
        this.frameRates.shift();
      }
      
      // Check if we're dropping frames with more tolerance
      if (fps < this.targetFPS * 0.6) {
        this.frameDropCount++;
      } else {
        this.frameDropCount = Math.max(0, this.frameDropCount - 2);
      }
    }
    
    this.lastFrameTime = currentTime;
  },
  
  getAverageFPS: function() {
    if (this.frameRates.length === 0) return 30;
    return this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length;
  },
  
  isPerformancePoor: function() {
    return this.frameDropCount > 15;
  },
  
  shouldTriggerEmergencyMode: function() {
    // Only trigger emergency mode if we have enough data and performance is consistently bad
    if (this.frameRates.length < 10) return false;
    if (this.emergencyModeTriggered) return false;
    
    const avgFPS = this.getAverageFPS();
    const recentFPS = this.frameRates.slice(-5).reduce((a, b) => a + b, 0) / 5;
    
    // Trigger only if both average and recent FPS are very low
    return avgFPS < 3 && recentFPS < 3;
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
    this.rocketLaunchSites = [];
    this.activeEvents = new Set();
    this.lastPlayerPosition = new THREE.Vector3();
    this.sceneRepeatDistance = 5000;
    this.animatedObjects = []; // Track animated elements for update loop

    // Get reference to the terrain mesh for proper ground placement
    // The terrain is the largest PlaneGeometry in the scene (3000-5000 units wide)
    this.terrainMesh = null;
    this.scene.traverse(child => {
      if (child.isMesh && child.geometry && child.geometry.parameters &&
          child.geometry.parameters.width >= 2000 && child.geometry.parameters.height >= 2000) {
        this.terrainMesh = child;
      }
    });
    // Fallback: use the global marsSurface if available
    if (!this.terrainMesh && typeof marsSurface !== 'undefined') {
      this.terrainMesh = marsSurface;
    }

    // Background elements removed - keeping only terrain and sky
  }

  initializeRocketLaunchSystem() {
    // Rocket launch system removed - keeping only terrain and sky
  }

  // Control methods for rocket launch system
  setRocketLaunchInterval(milliseconds) {
    // Rocket launch system removed - keeping only terrain and sky
  }

  enableRocketLaunches() {
    // Rocket launch system removed - keeping only terrain and sky
  }

  disableRocketLaunches() {
    // Rocket launch system removed - keeping only terrain and sky
  }

  triggerManualLaunch(patternType = 'random') {
    // Rocket launch system removed - keeping only terrain and sky
  }

  startRocketLaunchCycle() {
    // Rocket launch system removed - keeping only terrain and sky
  }

  triggerRocketLaunchSequence() {
    // Rocket launch system removed - keeping only terrain and sky
  }

  // --- UPDATE animated objects ---
  updateAnimations(time) {
    // Animated objects (beacons, radar dishes)
    for (const anim of this.animatedObjects) {
      if (!anim.mesh) continue;
      if (anim.type === 'blink') {
        const on = Math.sin(time * 0.003 + anim.phase) > 0.3;
        anim.mesh.visible = on;
      } else if (anim.type === 'rotate') {
        anim.mesh.rotation.y += anim.speed;
      }
    }
  }

  createLaunchSites() {
    // Launch sites removed - keeping only terrain and sky
  }

  createStarshipDisplay() {
    // Starship display removed - keeping only terrain and sky
  }

  addDisplayLighting(rocket, index) {
    // Display lighting removed - keeping only terrain and sky
  }

  addSpaceXSignage(rocket) {
    // SpaceX signage removed - keeping only terrain and sky
  }

  addDisplayPlatform(displayGroup, center, totalWidth) {
    // Display platform removed - keeping only terrain and sky
  }

  getTerrainHeight(x, z) {
    // Raycast only against the terrain mesh for accurate ground placement
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
    
    // Try to find terrain mesh if not already set - search more thoroughly
    if (!this.terrainMesh) {
      // First try: look for large PlaneGeometry (main terrain)
      this.scene.traverse(child => {
        if (child.isMesh && child.geometry) {
          const params = child.geometry.parameters;
          if (params && (params.width >= 2000 || params.height >= 2000)) {
            this.terrainMesh = child;
            return;
          }
          // Also check if it's a large plane by checking vertices
          if (child.geometry.attributes && child.geometry.attributes.position) {
            const pos = child.geometry.attributes.position;
            const count = pos.count;
            // Large terrain will have many vertices (1000+)
            if (count > 1000) {
              // Check bounding box to confirm it's large
              child.geometry.computeBoundingBox();
              const box = child.geometry.boundingBox;
              if (box && (box.max.x - box.min.x > 2000 || box.max.z - box.min.z > 2000)) {
                this.terrainMesh = child;
                return;
              }
            }
          }
        }
      });
      
      // Fallback: use the global marsSurface if available
      if (!this.terrainMesh && typeof marsSurface !== 'undefined' && marsSurface) {
        this.terrainMesh = marsSurface;
      }
      
      // Last resort: search all meshes for the largest one
      if (!this.terrainMesh) {
        let largestMesh = null;
        let largestSize = 0;
        this.scene.traverse(child => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox;
            if (box) {
              const size = Math.max(
                box.max.x - box.min.x,
                box.max.z - box.min.z,
                box.max.y - box.min.y
              );
              if (size > largestSize) {
                largestSize = size;
                largestMesh = child;
              }
            }
          }
        });
        if (largestMesh && largestSize > 1000) {
          this.terrainMesh = largestMesh;
        }
      }
    }
    
    if (this.terrainMesh) {
      const intersects = raycaster.intersectObject(this.terrainMesh, false);
      if (intersects.length > 0) {
        return intersects[0].point.y;
      }
    }
    
    // Fallback: return 0 if terrain not found (will log warning)
    console.warn(`Could not find terrain at (${x}, ${z}), using y=0. Terrain mesh:`, this.terrainMesh ? 'found' : 'NOT FOUND');
    return 0;
  }

  positionOnTerrain(group, x, z) {
    const y = this.getTerrainHeight(x, z);
    group.position.set(x, y, z);
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

    // Update animated objects and vehicle convoys
    this.updateAnimations(performance.now());
    
    // Rocket events removed - keeping only terrain and sky
    // this.updateActiveEvents();
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
    // No bases to reposition
  }

  // Update city lighting based on time of day
  updateCityLighting() {
    // No bases to update lighting for
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

// Scene manager is created via loadNonEssentialComponents / initializeScene - no duplicate needed here
let sceneManager = null;

// Add scene manager update to animation loop
const originalAnimate = animate;
animate = function (time) {
  originalAnimate(time);

  // Update scene manager with rover position (uses the one from lazy loader)
  const mgr = sceneManager || window.marsSceneManager;
  if (mgr && rover) {
    mgr.update(rover.position);
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
  
  // Prevent multiple animation loops
  if (window.gameAnimationId && window.gameAnimationId !== animationId) {
    console.warn('Multiple animation loops detected, canceling previous');
    cancelAnimationFrame(window.gameAnimationId);
  }
  
  window.gameAnimationId = requestAnimationFrame(animate);
  animationId = window.gameAnimationId;
  
  // Emergency performance monitoring for mobile
  const currentPerfSettings = getPerformanceSettings();
  if (currentPerfSettings.isMobile) {
    mobilePerformanceMonitor.update(time);
    
    // If performance is critically bad, enable emergency mode
    if (!emergencyPerformanceMode && mobilePerformanceMonitor.shouldTriggerEmergencyMode()) {
      emergencyPerformanceMode = true;
      mobilePerformanceMonitor.emergencyModeTriggered = true;
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
    // Make the skybox follow the camera so the sky always surrounds the player
    if (spaceSkybox) {
      spaceSkybox.position.copy(camera.position);
    }

    // Update meteor system if it exists and we're in night mode (throttled)
    if (window.meteorSystem && (!isDaytime || isTransitioning) && frameCount % frameThrottle === 0) {
      window.meteorSystem.update(delta);
    }

    // Update day/night cycle (throttled to every 10 frames for performance)
    if (frameCount % 10 === 0 && typeof updateDayNightCycle === 'function') {
      updateDayNightCycle(time);
    }

    // Update enhanced night sky (twinkling stars + shooting stars)
    if (spaceSkybox && spaceSkybox.userData && spaceSkybox.userData.update && !isDaytime) {
      spaceSkybox.userData.update(time);
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

    // Position rover on terrain after movement
    positionRoverOnTerrain();

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

    // Normalize roverYaw to keep it within 0-2Ï€ range to prevent floating point issues
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
    if (window.distanceText) {
      window.distanceText.innerHTML = `Distance Traveled: ${distanceTraveled.toFixed(2)} miles`;
    }
  }

  // Mars Scene Manager events are now updated via marsSceneManager.update() call
  
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

// Create a skybox with Milky Way and planets - optimized smooth version
function createSpaceSkybox() {
  console.log("Creating smooth night sky...");

  const perfSettings = getPerformanceSettings();
  const skyboxGroup = new THREE.Group();
  skyboxGroup.renderOrder = -1000;

  // === LAYER 1: Static background sphere (smooth, high-quality) ===
  // Increased segments for smoother appearance (no triangles visible)
  const skyboxGeometry = new THREE.SphereGeometry(5900, 128, 96); // More segments for ultra-smooth appearance
  const texture = createSphericalSkyTexture(perfSettings.isMobile ? 1024 : 2048); // Reduced from 4096 to prevent hanging
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4); // Cap anisotropy
  texture.generateMipmaps = true;

  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: texture, side: THREE.BackSide, fog: false,
    transparent: true, opacity: 1.0, depthWrite: false
  });
  const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  skyboxMesh.frustumCulled = false;
  skyboxGroup.add(skyboxMesh);

  // === LAYER 2: Twinkling star particles (reduced count for performance) ===
  const starSystem = createTwinklingStars();
  skyboxGroup.add(starSystem.points);
  skyboxGroup.userData.starSystem = starSystem;

  // === LAYER 3: Shooting star system ===
  const shootingStarSystem = createShootingStarSystem();
  skyboxGroup.add(shootingStarSystem.group);
  skyboxGroup.userData.shootingStars = shootingStarSystem;

  // Store update function for animation loop
  skyboxGroup.userData.update = function(time) {
    // Twinkle stars
    if (starSystem && starSystem.update) starSystem.update(time);
    // Shooting stars
    if (shootingStarSystem && shootingStarSystem.update) shootingStarSystem.update(time);
  };

  skyboxGroup.frustumCulled = false;
  console.log("Smooth night sky created successfully");
  return skyboxGroup;
}

// ============================================================
// TWINKLING STAR PARTICLE SYSTEM
// ============================================================
function createTwinklingStars() {
  const perfSettings = getPerformanceSettings();
  // Higher star count for denser field, still performance-aware
  const starCount = perfSettings.isMobile ? 4000 : 12000;
  const skyRadius = 5500;

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount); // twinkle phase
  const speeds = new Float32Array(starCount); // twinkle speed

  for (let i = 0; i < starCount; i++) {
    // Distribute on sphere using fibonacci sphere for even distribution
    const phi = Math.acos(1 - 2 * (i + 0.5) / starCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    // Add small jitter so it doesn't look too uniform
    const jitterPhi = phi + (Math.random() - 0.5) * 0.02;
    const jitterTheta = theta + (Math.random() - 0.5) * 0.02;

    positions[i * 3]     = skyRadius * Math.sin(jitterPhi) * Math.cos(jitterTheta);
    positions[i * 3 + 1] = skyRadius * Math.cos(jitterPhi);
    positions[i * 3 + 2] = skyRadius * Math.sin(jitterPhi) * Math.sin(jitterTheta);

    // Star color variety
    const colorType = Math.random();
    if (colorType < 0.55) {
      // Cool white-blue
      colors[i * 3] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 1] = 0.88 + Math.random() * 0.12;
      colors[i * 3 + 2] = 1.0;
    } else if (colorType < 0.75) {
      // Warm white
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.95 + Math.random() * 0.05;
      colors[i * 3 + 2] = 0.85 + Math.random() * 0.1;
    } else if (colorType < 0.88) {
      // Golden/yellow
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.1;
      colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
    } else if (colorType < 0.95) {
      // Orange/red giant
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.4 + Math.random() * 0.2;
    } else {
      // Rare blue supergiant
      colors[i * 3] = 0.6 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;
    }

    // Star size: mostly very small; only a few larger highlights
    const sizeRoll = Math.random();
    if (sizeRoll < 0.7) sizes[i] = 1.2 + Math.random() * 1.6;       // Tiny
    else if (sizeRoll < 0.93) sizes[i] = 2.4 + Math.random() * 1.8; // Small
    else if (sizeRoll < 0.985) sizes[i] = 4.0 + Math.random() * 2.0; // Medium
    else sizes[i] = 6.0 + Math.random() * 3.0;                      // Rare bright

    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.3 + Math.random() * 2.5; // Various twinkle speeds
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Create soft circular star texture
  const starTexture = createStarTexture();

  const material = new THREE.PointsMaterial({
    size: 4, // Slightly smaller base size for sharper, higher-definition stars
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.01 // Prevent rendering fully transparent pixels
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  // Return system with update function
  return {
    points,
    phases,
    speeds,
    sizes,
    originalSizes: new Float32Array(sizes), // copy for reference
    update(time) {
      const t = time * 0.001;
      const sizeAttr = geometry.attributes.size;
      const arr = sizeAttr.array;
      for (let i = 0; i < starCount; i++) {
        // Smooth sinusoidal twinkling with harmonics for natural look
        const twinkle = 0.55 + 0.45 * (
          Math.sin(t * speeds[i] + phases[i]) * 0.5 +
          Math.sin(t * speeds[i] * 1.7 + phases[i] * 2.3) * 0.3 +
          Math.sin(t * speeds[i] * 0.4 + phases[i] * 0.7) * 0.2
        );
        arr[i] = this.originalSizes[i] * twinkle;
      }
      sizeAttr.needsUpdate = true;
    }
  };
}

function createStarTexture() {
  // Higher resolution texture for smoother stars (no pixelation)
  const canvas = document.createElement('canvas');
  canvas.width = 128; // Increased from 64 for smoother appearance
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Very soft radial gradient for smooth, beautiful star glow (BRIGHTER)
  const center = 64;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; // Smooth filtering
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================
// SHOOTING STAR SYSTEM
// ============================================================
function createShootingStarSystem() {
  const group = new THREE.Group();
  const skyRadius = 5000;
  // Keep only a few visible shooting stars at once
  const maxTrails = 3;
  const trails = [];

  // Create a reusable trail texture
  const trailTexture = createTrailTexture();

  function spawnShootingStar() {
    // Random start point on upper hemisphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4 + 0.1; // upper sky
    const startX = skyRadius * 0.9 * Math.sin(phi) * Math.cos(theta);
    const startY = skyRadius * 0.9 * Math.cos(phi);
    const startZ = skyRadius * 0.9 * Math.sin(phi) * Math.sin(theta);

    // Direction: mostly downward and to the side
    const dirTheta = theta + (Math.random() - 0.5) * 1.5;
    const dirPhi = phi + 0.3 + Math.random() * 0.5;
    const endX = skyRadius * 0.8 * Math.sin(dirPhi) * Math.cos(dirTheta);
    const endY = skyRadius * 0.8 * Math.cos(dirPhi);
    const endZ = skyRadius * 0.8 * Math.sin(dirPhi) * Math.sin(dirTheta);

    const start = new THREE.Vector3(startX, startY, startZ);
    const end = new THREE.Vector3(endX, endY, endZ);
    const direction = end.clone().sub(start);
    const length = direction.length();
    direction.normalize();

    // Trail length
    const trailLen = 150 + Math.random() * 250;

    // Create trail geometry (thin stretched plane)
    const trailGeo = new THREE.PlaneGeometry(trailLen, 3 + Math.random() * 4);
    const trailMat = new THREE.MeshBasicMaterial({
      map: trailTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.frustumCulled = false;

    // Bright head glow
    const headGeo = new THREE.SphereGeometry(4, 8, 8);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const head = new THREE.Mesh(headGeo, headMat);

    // Head glow light
    const glowLight = new THREE.PointLight(0xaaccff, 0, 200);

    group.add(trail);
    group.add(head);
    group.add(glowLight);

    const speed = 1500 + Math.random() * 2000;
    const lifetime = length / speed;
    // Slightly brighter so the few stars are clearly visible
    const brightness = 0.8 + Math.random() * 0.3;

    return {
      trail, head, glowLight, trailMat, headMat,
      start, end, direction, length, trailLen,
      speed, lifetime, brightness,
      progress: 0, active: true,
      fadeIn: 0.1, fadeOut: 0.7 // fade timing
    };
  }

  function updateTrail(t, dt) {
    if (!t.active) return;
    t.progress += dt / t.lifetime;

    if (t.progress >= 1) {
      t.active = false;
      t.trailMat.opacity = 0;
      t.headMat.opacity = 0;
      t.glowLight.intensity = 0;
      return;
    }

    // Position along path
    const pos = t.start.clone().lerp(t.end, t.progress);
    t.head.position.copy(pos);
    t.glowLight.position.copy(pos);

    // Trail behind the head
    const trailEnd = t.start.clone().lerp(t.end, Math.max(0, t.progress - t.trailLen / t.length));
    const mid = pos.clone().add(trailEnd).multiplyScalar(0.5);
    t.trail.position.copy(mid);
    t.trail.lookAt(pos);

    // Fade in/out
    let alpha = t.brightness;
    if (t.progress < t.fadeIn) {
      alpha *= t.progress / t.fadeIn;
    } else if (t.progress > t.fadeOut) {
      alpha *= 1 - (t.progress - t.fadeOut) / (1 - t.fadeOut);
    }

    t.trailMat.opacity = alpha * 0.8;
    t.headMat.opacity = alpha;
    t.glowLight.intensity = alpha * 2;
  }

  // Spawn timer
  let nextSpawn = 2 + Math.random() * 4;
  let elapsed = 0;

  return {
    group,
    update(time) {
      const dt = 0.016; // ~60fps timestep
      elapsed += dt;

      // Spawn new shooting stars periodically (a few, not a shower)
      if (elapsed >= nextSpawn && trails.filter(t => t.active).length < maxTrails) {
        trails.push(spawnShootingStar());
        nextSpawn = elapsed + 1.5 + Math.random() * 6; // 1.5-7.5s between stars
      }

      // Update active trails
      for (const t of trails) {
        updateTrail(t, dt);
      }

      // Cleanup inactive trails (keep array manageable)
      while (trails.length > 30) {
        const old = trails.shift();
        if (old.trail.parent) old.trail.parent.remove(old.trail);
        if (old.head.parent) old.head.parent.remove(old.head);
        if (old.glowLight.parent) old.glowLight.parent.remove(old.glowLight);
        old.trail.geometry.dispose();
        old.trailMat.dispose();
        old.head.geometry.dispose();
        old.headMat.dispose();
      }
    }
  };
}

function createTrailTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  // Gradient: bright white head fading to transparent tail
  const gradient = ctx.createLinearGradient(256, 8, 0, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.05, 'rgba(200, 220, 255, 0.9)');
  gradient.addColorStop(0.15, 'rgba(150, 180, 255, 0.6)');
  gradient.addColorStop(0.4, 'rgba(100, 140, 255, 0.25)');
  gradient.addColorStop(0.7, 'rgba(80, 120, 200, 0.08)');
  gradient.addColorStop(1, 'rgba(60, 100, 180, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 16);

  // Soft vertical fade for trail width
  const vGrad = ctx.createLinearGradient(0, 0, 0, 16);
  vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vGrad.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
  vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  vGrad.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
  vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 256, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
  // Add subtle bluish-violet color wash to bias the sky like the reference image
  context.globalCompositeOperation = 'screen';
  const colorWash = context.createLinearGradient(0, 0, size, size);
  colorWash.addColorStop(0, 'rgba(10,8,30,0.05)');
  colorWash.addColorStop(0.4, 'rgba(20,30,80,0.08)');
  colorWash.addColorStop(0.7, 'rgba(40,60,140,0.09)');
  colorWash.addColorStop(1, 'rgba(20,20,60,0.04)');
  context.fillStyle = colorWash;
  context.fillRect(0, 0, size, size);

  // Add faint, dense background star speckle (small, faint points) to give the milky texture
  context.globalCompositeOperation = 'lighter';
  const speckleCount = Math.floor(size * size / 1200);
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 0.8; // tiny
    const a = 0.02 + Math.random() * 0.06; // very faint
    context.beginPath();
    context.fillStyle = `rgba(${200 + Math.floor(Math.random()*55)}, ${200 + Math.floor(Math.random()*55)}, ${230 + Math.floor(Math.random()*25)}, ${a})`;
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  // Add faint grain/noise to avoid perfectly smooth gradients
  context.globalCompositeOperation = 'source-over';
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 256; grainCanvas.height = 256;
  const gctx = grainCanvas.getContext('2d');
  const gImg = gctx.createImageData(256,256);
  for (let i = 0; i < gImg.data.length; i += 4) {
    const v = 220 + Math.floor(Math.random() * 36);
    gImg.data[i] = v; gImg.data[i+1] = v; gImg.data[i+2] = v; gImg.data[i+3] = 6; // very low alpha
  }
  gctx.putImageData(gImg, 0, 0);
  context.globalAlpha = 0.10;
  context.drawImage(grainCanvas, 0, 0, size, size);
  context.globalAlpha = 1.0;

  // For this Milky Way style, keep the background simple and let the main band dominate.
  // (Previously added larger nebulae and distant galaxies here; these are disabled
  // to better match a clean long-exposure Milky Way photograph.)
  
  // Add dimmer background stars (the 3D twinkling particles handle the bright ones)
  addBrighterBackgroundStars(context, size);
  addBrighterMilkyWay(context, size);
  addBrighterForegroundStars(context, size);

  // Add atmospheric glow for realism
  addAtmosphericGlow(context, size);

  // Add Mars moons with higher definition (replace distant planets)
  // Phobos (larger, closer moon)
  addMoonToCanvas(context, size * 0.78, size * 0.22, size * 0.022);
  // Deimos (smaller, more distant moon)
  addMoonToCanvas(context, size * 0.83, size * 0.18, size * 0.014);

  // Add a single large, high-definition planet for visual impact
  addLargePlanetToCanvas(context, size);

  // Note: blur(0px) is a no-op, removed unnecessary canvas copy for performance

  // Create texture with proper settings
  const texture = new THREE.CanvasTexture(canvas);

  return texture;
}

// Add much brighter background stars
function addBrighterBackgroundStars(context, size) {
  // Reduced star density for faster texture generation (3D particles handle most stars)
  const perfSettings = getPerformanceSettings();
  const densityMultiplier = perfSettings.detailLevel === 'high' ? 0.3 : 
                            perfSettings.detailLevel === 'normal' ? 0.2 : 0.1;
  const starCount = Math.min(Math.floor(size * size / 800 * densityMultiplier), 5000); // Reduced from 50000

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
// Add brighter foreground stars (small, crisp, and sparse — no big spikes)
function addBrighterForegroundStars(context, size) {
  const perfSettings = getPerformanceSettings();
  const densityMultiplier = perfSettings.detailLevel === 'high' ? 1.0 :
                            perfSettings.detailLevel === 'normal' ? 0.7 : 0.4;

  // Fewer, smaller foreground stars so the Milky Way band stays the focus
  const brightStarCount = Math.floor(size * size / 8000 * densityMultiplier);

  for (let i = 0; i < brightStarCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    const radius = Math.random() * 0.9 + 0.3;

    const colorVariation = Math.random();
    let coreColor;
    if (colorVariation < 0.8) {
      coreColor = 'rgba(235, 240, 255, 1.0)';
    } else {
      coreColor = 'rgba(255, 235, 220, 1.0)';
    }

    const glowRadius = radius * 2.2;
    const gradient = context.createRadialGradient(x, y, 0, x, y, glowRadius);
    gradient.addColorStop(0, coreColor);
    gradient.addColorStop(0.4, 'rgba(235, 240, 255, 0.55)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.beginPath();
    context.arc(x, y, glowRadius, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = coreColor;
    context.fill();
  }
}

// Add a brighter Milky Way that matches a long, thin, bluish diagonal band
function addBrighterMilkyWay(context, size) {
  const prevComposite = context.globalCompositeOperation;
  context.globalCompositeOperation = 'screen';

  const centerX = size / 2;
  const centerY = size / 2;

  // Draw in a rotated coordinate system so the band runs diagonally
  const bandAngle = -0.6; // approx bottom-left to top-right
  const bandLength = size * 1.4;
  const bandThickness = size * 0.22;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(bandAngle);

  // Soft base band
  const baseGradient = context.createLinearGradient(0, -bandThickness / 2, 0, bandThickness / 2);
  baseGradient.addColorStop(0, 'rgba(5, 8, 20, 0)');
  baseGradient.addColorStop(0.25, 'rgba(40, 60, 110, 0.18)');
  baseGradient.addColorStop(0.5, 'rgba(90, 120, 190, 0.32)');
  baseGradient.addColorStop(0.75, 'rgba(40, 60, 110, 0.18)');
  baseGradient.addColorStop(1, 'rgba(5, 8, 20, 0)');

  context.fillStyle = baseGradient;
  context.beginPath();
  context.ellipse(0, 0, bandLength / 2, bandThickness / 2, 0, 0, Math.PI * 2);
  context.fill();

  // Dense fine speckle along the band for the "milky" look
  const speckleCount = Math.floor(size * 0.22);
  for (let i = 0; i < speckleCount; i++) {
    const t = (Math.random() - 0.5) * bandLength;
    const offset = (Math.random() - 0.5) * bandThickness * 0.9;

    const x = t;
    const y = offset * (0.5 + Math.random() * 0.7); // slightly flattened

    const r = Math.random() * 1.3 + 0.2;
    const a = 0.05 + Math.random() * 0.35;

    const b = 220 + Math.floor(Math.random() * 30);
    const g = 210 + Math.floor(Math.random() * 25);
    const rCol = 200 + Math.floor(Math.random() * 25);

    const dotGrad = context.createRadialGradient(x, y, 0, x, y, r * 2.2);
    dotGrad.addColorStop(0, `rgba(${rCol}, ${g}, ${b}, ${a})`);
    dotGrad.addColorStop(1, 'rgba(0,0,0,0)');

    context.beginPath();
    context.arc(x, y, r * 2.2, 0, Math.PI * 2);
    context.fillStyle = dotGrad;
    context.fill();
  }

  // Brighter knots along the band (the slightly pinkish regions)
  const knotCount = 10;
  for (let i = 0; i < knotCount; i++) {
    const t = (Math.random() - 0.1) * bandLength * 0.9; // bias nearer to one side
    const y = (Math.random() - 0.5) * bandThickness * 0.4;
    const x = t;

    const knotRadius = size * (0.02 + Math.random() * 0.02);
    const knotGrad = context.createRadialGradient(x, y, 0, x, y, knotRadius);

    // cool white-blue core with faint magenta tint
    knotGrad.addColorStop(0, 'rgba(245, 250, 255, 0.95)');
    knotGrad.addColorStop(0.4, 'rgba(210, 220, 255, 0.65)');
    knotGrad.addColorStop(0.8, 'rgba(150, 170, 235, 0.25)');
    knotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.beginPath();
    context.arc(x, y, knotRadius, 0, Math.PI * 2);
    context.fillStyle = knotGrad;
    context.fill();
  }

  // Dark dust lane through the midline of the band
  context.globalCompositeOperation = 'multiply';
  const dustThickness = bandThickness * 0.45;
  const dustGrad = context.createLinearGradient(0, -dustThickness / 2, 0, dustThickness / 2);
  dustGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  dustGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.55)');
  dustGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
  dustGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
  dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = dustGrad;
  context.beginPath();
  context.ellipse(0, 0, bandLength / 2, dustThickness / 2, 0, 0, Math.PI * 2);
  context.fill();

  // Slight irregular dust patches disabled to avoid large dark circular blobs
  // that look like shadows when projected onto the sky dome.

  context.restore();

  // Restore normal blending
  context.globalCompositeOperation = prevComposite;
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

// Add a higher-definition moon to the canvas
function addMoonToCanvas(context, x, y, radius) {
  context.save();

  // Base moon body with stronger contrast
  const bodyGradient = context.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, 0,
    x, y, radius
  );
  bodyGradient.addColorStop(0, 'rgba(230, 230, 230, 1)');
  bodyGradient.addColorStop(0.5, 'rgba(190, 190, 190, 1)');
  bodyGradient.addColorStop(1, 'rgba(90, 90, 90, 1)');

  context.fillStyle = bodyGradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  // Subtle terminator shadow to avoid "flat" round disk look,
  // kept gentle so the moon doesn't appear as a harsh dark disk.
  const terminatorGradient = context.createRadialGradient(
    x + radius * 0.3, y + radius * 0.1, 0,
    x + radius * 0.4, y + radius * 0.2, radius * 1.3
  );
  terminatorGradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  terminatorGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.15)');
  terminatorGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

  context.globalCompositeOperation = 'multiply';
  context.fillStyle = terminatorGradient;
  context.beginPath();
  context.arc(x, y, radius * 1.05, 0, Math.PI * 2);
  context.fill();

  // Restore to normal blending for craters
  context.globalCompositeOperation = 'source-over';

  // Add a few small craters for surface detail
  const craterCount = 5;
  for (let i = 0; i < craterCount; i++) {
    const angle = (Math.PI * 2 * i) / craterCount + Math.random() * 0.4;
    const dist = radius * (0.25 + Math.random() * 0.4);
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    const cr = radius * (0.15 + Math.random() * 0.12);

    const craterGradient = context.createRadialGradient(
      cx - cr * 0.3, cy - cr * 0.3, 0,
      cx, cy, cr
    );
    craterGradient.addColorStop(0, 'rgba(230, 230, 230, 0.9)');
    craterGradient.addColorStop(0.5, 'rgba(140, 140, 140, 0.9)');
    craterGradient.addColorStop(1, 'rgba(60, 60, 60, 0.0)');

    context.fillStyle = craterGradient;
    context.beginPath();
    context.arc(cx, cy, cr, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

// Add a large, high-definition planet to the sky
function addLargePlanetToCanvas(context, size) {
  // Position the planet near the central upper sky so it's easy to see
  const x = size * 0.5;
  const y = size * 0.4;
  const radius = size * 0.04;

  context.save();

  // Base planet body (Jupiter-like, warm with subtle depth)
  const baseColor = '#c58a4a';
  const planetGradient = context.createRadialGradient(
    x - radius * 0.35, y - radius * 0.4, 0,
    x, y, radius * 1.1
  );
  planetGradient.addColorStop(0, lightenColor(baseColor, 45));
  planetGradient.addColorStop(0.5, baseColor);
  planetGradient.addColorStop(1, darkenColor(baseColor, 35));

  context.fillStyle = planetGradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  // Clip to planet disk so bands and storms stay inside the silhouette
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();

  // Add a few soft storm systems / ovals for surface interest
  const stormCount = 3;
  for (let i = 0; i < stormCount; i++) {
    const angle = (Math.PI * 2 * i) / stormCount + Math.random() * 0.4;
    const dist = radius * (0.35 + Math.random() * 0.35);
    const sx = x + Math.cos(angle) * dist;
    const sy = y + Math.sin(angle) * dist * 0.6;
    const srX = radius * (0.16 + Math.random() * 0.05);
    const srY = srX * (0.65 + Math.random() * 0.2);

    const stormGradient = context.createRadialGradient(
      sx - srX * 0.4, sy - srY * 0.4, 0,
      sx, sy, srX
    );
    stormGradient.addColorStop(0, 'rgba(255, 230, 210, 0.9)');
    stormGradient.addColorStop(0.4, 'rgba(230, 180, 150, 0.85)');
    stormGradient.addColorStop(1, 'rgba(40, 20, 10, 0.0)');

    context.save();
    context.translate(sx, sy);
    context.rotate(Math.random() * Math.PI * 2);
    context.scale(1.6, 1.0);
    context.fillStyle = stormGradient;
    context.beginPath();
    context.arc(0, 0, srX, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Subtle surface mottling for texture
  const patchCount = 28;
  for (let i = 0; i < patchCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.0 + Math.random() * 0.85);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist * 0.85;
    const pr = radius * (0.05 + Math.random() * 0.055);

    const patchGrad = context.createRadialGradient(
      px - pr * 0.3, py - pr * 0.3, 0,
      px, py, pr
    );
    const tone = Math.random() < 0.5
      ? lightenColor(baseColor, 8 + Math.random() * 10)
      : darkenColor(baseColor, 6 + Math.random() * 10);
    patchGrad.addColorStop(0, `${tone}ee`); // will be overridden by rgba below if hex, but keeps tone consistent
    patchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Convert tone hex to rgba-ish by blending via globalAlpha
    context.globalAlpha = 0.16;
    context.fillStyle = patchGrad;
    context.beginPath();
    context.arc(px, py, pr, 0, Math.PI * 2);
    context.fill();
  }

  context.restore(); // end clip and restore alpha

  // Soft terminator shadow for depth
  const terminatorGradient = context.createRadialGradient(
    x + radius * 0.8, y, 0,
    x + radius * 1.1, y, radius * 1.6
  );
  terminatorGradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  terminatorGradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.26)');
  terminatorGradient.addColorStop(1, 'rgba(0, 0, 0, 0.65)');

  context.globalCompositeOperation = 'multiply';
  context.fillStyle = terminatorGradient;
  context.beginPath();
  context.arc(x, y, radius * 1.15, 0, Math.PI * 2);
  context.fill();

  // Atmospheric rim glow
  context.globalCompositeOperation = 'screen';
  const atmGradient = context.createRadialGradient(
    x, y, radius * 0.85,
    x, y, radius * 1.35
  );
  atmGradient.addColorStop(0, 'rgba(160, 200, 255, 0.0)');
  atmGradient.addColorStop(0.4, 'rgba(160, 210, 255, 0.45)');
  atmGradient.addColorStop(1, 'rgba(120, 180, 255, 0.0)');

  context.fillStyle = atmGradient;
  context.beginPath();
  context.arc(x, y, radius * 1.4, 0, Math.PI * 2);
  context.fill();

  context.restore();
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

  // Load Mars scene manager after initial render settles
  setTimeout(() => {
    lazyLoader.loadInBackground('marsSceneManager', () => {
      window.marsSceneManager = new MarsSceneManager(scene, 5000);
      return Promise.resolve();
    });
  }, 500);

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

