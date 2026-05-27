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

// Cached DOM references for HUD (avoid getElementById every frame)
let _hudElements = null;
function _getHudElements() {
  if (!_hudElements) {
    _hudElements = {
      health: document.getElementById('rover-health'),
      fuel: document.getElementById('rover-fuel'),
      compass: document.getElementById('rover-heading'),
      route: document.getElementById('tour-status')
    };
  }
  return _hudElements;
}

// Compass direction lookup (avoid recreating every frame)
const _compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Update HUD with game system information
function updateGameHUD() {
  if (!rover) return;
  const hud = _getHudElements();

  // Update health display
  if (rover.health !== undefined && hud.health) {
    const h = Math.round(rover.health);
    hud.health.textContent = h;
    hud.health.style.color = rover.health < 30 ? '#ff4444' : rover.health < 60 ? '#ffaa44' : '#44ff44';
  }

  // Update fuel display
  if (rover.fuel !== undefined && hud.fuel) {
    hud.fuel.textContent = Math.round(rover.fuel);
    hud.fuel.style.color = rover.fuel < 100 ? '#ff4444' : rover.fuel < 300 ? '#ffaa44' : '#44aaff';
  }

  // Update compass / heading display
  if (hud.compass && typeof window.roverYaw === 'number') {
    let degrees = (window.roverYaw * 180 / Math.PI) % 360;
    if (degrees < 0) degrees += 360;
    const idx = Math.round(degrees / 45) % 8;
    hud.compass.textContent = `${_compassDirs[idx]} (${degrees.toFixed(0)}Â°)`;
  }

  // Update guided route HUD status
  if (hud.route && window.guidedRouteProgress) {
    const { reached, total } = window.guidedRouteProgress;
    hud.route.textContent = reached >= total ? 'Tour: Complete' : `Tour: ${reached}/${total} beacons`;
  }
}

// Performance-aware initialization with mobile detection
// Cache for performance settings to avoid recreating WebGL contexts on every call
let _cachedPerformanceSettings = null;

// Day/night cycle variables - declared early to avoid temporal dead zone issues
let lastTransitionUpdate = 0;
let currentTimeOfDay = 0.0; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight
let dayNightCycleSpeed = 0.00001; // Speed of day/night cycle (smaller = slower)
let isManualTransition = false;
let manualTransitionTarget = null;
let manualTransitionSpeed = 0.005;
let isDaytime = false; // Start at night so the starry sky is visible

function getPerformanceSettings() {
  // Return cached settings if available (settings don't change during session)
  if (_cachedPerformanceSettings) return _cachedPerformanceSettings;
  
  const isMobile = !!(window.GAME_PERFORMANCE_SETTINGS && window.GAME_PERFORMANCE_SETTINGS.isMobile);
  
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
const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 10, 20);

// Performance-optimized renderer with adaptive settings - MOBILE EMERGENCY MODE
const perfSettings = getPerformanceSettings();
const renderer = new THREE.WebGLRenderer({
  antialias: !perfSettings.isMobile, // Antialiasing on desktop for crisp edges
  powerPreference: perfSettings.isMobile ? 'low-power' : 'high-performance',
  precision: perfSettings.isMobile ? 'lowp' : 'highp', // High precision on desktop for quality
  alpha: false,
  stencil: false,
  depth: true,
  logarithmicDepthBuffer: false,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false,
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
const pixelRatio = perfSettings.isMobile ? 1 :
                   Math.min(window.devicePixelRatio, perfSettings.graphicsQuality === 'high' ? 2 : 1.5);
renderer.setPixelRatio(pixelRatio);

// Desktop: Reinhard tone mapping works well for night scenes (ACES crushes cool blue to black)
if (!perfSettings.isMobile) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft shadows
}

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

// Pure black background behind everything â€” the skybox paints over this
renderer.setClearColor(0x000000, 1);
scene.background = new THREE.Color(0x000000);

// Night skybox â€” create immediately since the game starts at night
let spaceSkybox = null;
let _spaceSkyboxCreating = false;

function ensureSpaceSkybox() {
  if (spaceSkybox || _spaceSkyboxCreating) return;
  _spaceSkyboxCreating = true;
  spaceSkybox = createSpaceSkybox();
  scene.add(spaceSkybox);
  console.log('Skybox created (night start)');
}

// Create skybox right away â€” night mode needs it visible from frame 1
ensureSpaceSkybox();

// Fog fades distant terrain to black, matching the void behind everything
const fogColor = 0x6B1F00;
const fogDensity = perfSettings.samsungOptimized ? perfSettings.fogDensityReduction : 1.0;
scene.fog = new THREE.Fog(fogColor, perfSettings.fogDistance * 0.2 * fogDensity, perfSettings.renderDistance);

// Endless terrain system with reduced complexity
const terrainSystem = {
  chunkSize: 200, // Size of each terrain chunk
  visibleRadius: 50, // Large radius â€” allow free exploration across the terrain
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
  const chassisGeometry = new THREE.BoxGeometry(2.4, 0.2, 3.2);
  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: perfSettings.isMobile ? 0xcccccc : 0x9a8e7a, // Warm anodized aluminum
    roughness: 0.6,
    metalness: 0.55,
    emissive: perfSettings.isMobile ? 0x222222 : 0x100a00,
    emissiveIntensity: perfSettings.isMobile ? 0.2 : 0.05
  });
  const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
  chassis.position.y = 0.6;
  chassis.castShadow = !perfSettings.isMobile;
  chassis.receiveShadow = !perfSettings.isMobile;
  roverGroup.add(chassis);

  // Main body - central electronics box
  const bodyGeometry = new THREE.BoxGeometry(1.8, 0.6, 2.2);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: perfSettings.isMobile ? 0xffffff : 0xe8dfd0, // Warm off-white (NASA rover color)
    roughness: 0.4,
    metalness: 0.35,
    emissive: perfSettings.isMobile ? 0x333333 : 0x050300,
    emissiveIntensity: perfSettings.isMobile ? 0.3 : 0.04
  });
  
  // Mark this as the main body for color customization
  bodyMaterial.userData = { isBody: true };
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1.0;
  body.castShadow = !perfSettings.isMobile;
  body.receiveShadow = !perfSettings.isMobile;
  roverGroup.add(body);

  // RTG power source (radioisotope thermoelectric generator)
  const rtgGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
  const rtgMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.25,
    metalness: 0.9,
    emissive: 0x200000, // faint heat glow
    emissiveIntensity: 0.15
  });
  const rtg = new THREE.Mesh(rtgGeometry, rtgMaterial);
  rtg.position.set(-0.8, 1.0, -1.2);
  rtg.rotation.x = Math.PI / 2;
  rtg.castShadow = !perfSettings.isMobile;
  roverGroup.add(rtg);

  // Heat radiators
  const radiatorGeometry = new THREE.BoxGeometry(1.0, 0.05, 0.6);
  const radiatorMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8c8b8, // slightly warm silver
    roughness: 0.15,
    metalness: 0.95
  });

  const radiator1 = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
  radiator1.position.set(0, 1.3, -1.2);
  radiator1.castShadow = !perfSettings.isMobile;
  roverGroup.add(radiator1);

  const radiator2 = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
  radiator2.position.set(0, 1.3, 1.2);
  radiator2.castShadow = !perfSettings.isMobile;
  roverGroup.add(radiator2);

  // Camera mast
  const mastGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12);
  const mastMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a8070,
    roughness: 0.5,
    metalness: 0.6
  });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.set(0, 1.9, 0.8);
  mast.castShadow = !perfSettings.isMobile;
  roverGroup.add(mast);

  // Mastcam (stereo cameras)
  const cameraBoxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
  const cameraBoxMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.3,
    metalness: 0.7
  });
  const cameraBox = new THREE.Mesh(cameraBoxGeometry, cameraBoxMaterial);
  cameraBox.position.y = 0.6;
  cameraBox.castShadow = !perfSettings.isMobile;
  mast.add(cameraBox);

  // Camera lenses
  const lensGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16);
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.05,
    metalness: 1.0,
    emissive: 0x000510,
    emissiveIntensity: 0.3
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
    color: perfSettings.isMobile ? 0x4466ff : 0x1a3580, // Deep midnight blue
    roughness: 0.15,
    metalness: 0.85,
    emissive: perfSettings.isMobile ? 0x001133 : 0x000820,
    emissiveIntensity: perfSettings.isMobile ? 0.4 : 0.12 // Subtle phosphorescent glow
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.y = 1.5;
  panel.castShadow = !perfSettings.isMobile;
  panel.receiveShadow = !perfSettings.isMobile;
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

  // Add high-detail treads to wheels
  const wheelTextureCanvas = document.createElement('canvas');
  wheelTextureCanvas.width = 128;
  wheelTextureCanvas.height = 128;
  const wheelContext = wheelTextureCanvas.getContext('2d');

  // Dark rubber base
  wheelContext.fillStyle = '#1a1a1a';
  wheelContext.fillRect(0, 0, 128, 128);

  // Main tread bars
  wheelContext.fillStyle = '#3a3a3a';
  for (let i = 0; i < 10; i++) {
    wheelContext.fillRect(0, i * 13, 128, 7);
  }

  // Cross-hatch detail on treads
  wheelContext.fillStyle = '#2a2a2a';
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 6; j++) {
      wheelContext.fillRect(j * 22, i * 13 + 2, 10, 3);
    }
  }

  // Edge highlight for depth
  wheelContext.fillStyle = '#4a4a4a';
  for (let i = 0; i < 10; i++) {
    wheelContext.fillRect(0, i * 13, 128, 1);
  }

  const wheelTexture = new THREE.CanvasTexture(wheelTextureCanvas);
  wheelTexture.wrapS = THREE.RepeatWrapping;
  wheelTexture.wrapT = THREE.RepeatWrapping;
  wheelTexture.repeat.set(8, 1);

  const wheelMaterialWithTexture = new THREE.MeshStandardMaterial({
    color: 0x252525,
    roughness: 0.95,
    metalness: 0.05,
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
    wheel.castShadow = !perfSettings.isMobile;
    wheel.receiveShadow = !perfSettings.isMobile;

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
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  // Deep blue base â€” photovoltaic substrate
  context.fillStyle = '#112266';
  context.fillRect(0, 0, 256, 256);

  // Draw individual solar cells with grid lines
  const cellsX = 10;
  const cellsY = 8;
  const cellW = 256 / cellsX;
  const cellH = 256 / cellsY;

  for (let x = 0; x < cellsX; x++) {
    for (let y = 0; y < cellsY; y++) {
      const px = x * cellW;
      const py = y * cellH;
      // Cell body â€” alternating shade for monocrystalline look
      const shade = (x + y) % 2 === 0 ? '#152d8a' : '#1a3580';
      context.fillStyle = shade;
      context.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
      // Top-edge highlight
      context.fillStyle = 'rgba(120, 160, 255, 0.18)';
      context.fillRect(px + 2, py + 2, cellW - 4, 3);
      // Metallic bus-bar lines across each cell
      context.fillStyle = 'rgba(200, 220, 255, 0.25)';
      context.fillRect(px + cellW * 0.45, py + 2, 2, cellH - 4);
    }
  }

  // Outer grid border
  context.strokeStyle = 'rgba(80, 110, 200, 0.6)';
  context.lineWidth = 1;
  for (let x = 0; x <= cellsX; x++) {
    context.beginPath(); context.moveTo(x * cellW, 0); context.lineTo(x * cellW, 256); context.stroke();
  }
  for (let y = 0; y <= cellsY; y++) {
    context.beginPath(); context.moveTo(0, y * cellH); context.lineTo(256, y * cellH); context.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
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
  const particleCount = Math.min(perfSettings.particleCount || 400, 600);
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const opacities = new Float32Array(particleCount); // per-particle fade

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = 0;
    positions[i * 3 + 1] = -20; // start hidden below surface
    positions[i * 3 + 2] = 0;
    sizes[i] = Math.random() * 0.25 + 0.06;
    opacities[i] = 0;
  }

  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xc8895a,       // warm rust-ochre Mars dust
    size: 0.18,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    depthWrite: false      // prevents dust from obscuring geometry
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);

  return {
    system: particleSystem,
    update: (roverPosition, isMoving) => {
      const pos = particleSystem.geometry.attributes.position.array;
      const speedMag = Math.abs(velocity); // use the physics velocity for intensity
      const spread = 1.5 + speedMag * 8;  // wider plume at higher speed

      for (let i = 0; i < particleCount; i++) {
        const alive = pos[i * 3 + 1] > -5;

        if (isMoving && (!alive || pos[i * 3 + 1] > 4 + speedMag * 10)) {
          // Respawn behind the rover relative to travel direction
          const angle = roverYaw + Math.PI + (Math.random() - 0.5) * 1.2;
          const r = Math.random() * spread;
          pos[i * 3]     = roverPosition.x + Math.cos(angle) * r;
          pos[i * 3 + 1] = 0.05 + Math.random() * 0.3;
          pos[i * 3 + 2] = roverPosition.z + Math.sin(angle) * r;
        } else if (alive) {
          // Drift upward and outward, settle quickly
          pos[i * 3]     += (Math.random() - 0.5) * 0.04;
          pos[i * 3 + 1] += 0.02 + speedMag * 0.15;
          pos[i * 3 + 2] += (Math.random() - 0.5) * 0.04;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      // Vary overall opacity with speed for subtle effect
      particleMaterial.opacity = isMoving ? Math.min(0.18 + speedMag * 2.5, 0.65) : 0;
    }
  };
};

const dustParticles = createDustParticles();

// Night lighting - dim, warm, and Mars-like instead of bright blue moonlight
const ambientIntensity = perfSettings.samsungOptimized ? 0.34 * perfSettings.ambientLightBoost :
                         perfSettings.isMobile ? 0.34 : 0.24;
const ambientColor = perfSettings.samsungOptimized ? 0x5a3528 : 0x3a2018;
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
scene.add(ambientLight);

// Low, weak reflected light gives terrain shape without making night feel like day
const sunIntensity = perfSettings.samsungOptimized ? 0.16 * perfSettings.materialBrightness :
                     perfSettings.isMobile ? 0.14 : 0.12;
const sunColor = 0xb96a45;
const sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
// Low-angle Mars sun â€” long shadows, dramatic look
sunLight.position.set(-120, 55, 80);
if (!perfSettings.isMobile) {
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 1200;
  sunLight.shadow.camera.left = -400;
  sunLight.shadow.camera.right = 400;
  sunLight.shadow.camera.top = 400;
  sunLight.shadow.camera.bottom = -400;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
}
scene.add(sunLight);

// Secondary fill light - barely lifts silhouettes at night
if (!perfSettings.isMobile) {
  const fillLight = new THREE.DirectionalLight(0x34180f, 0.05);
  fillLight.position.set(80, 40, -60);
  scene.add(fillLight);
}

// Night hemisphere - near-black sky above, dark rust bounce from the ground
const hemisphereIntensity = perfSettings.samsungOptimized ? 0.24 * perfSettings.ambientLightBoost :
                             perfSettings.isMobile ? 0.22 : 0.18;
const hemisphereSkyColor = 0x070912;
const hemisphereGroundColor = 0x2a0f06;
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
const MAX_SPEED = 0.25;
const REVERSE_SPEED_FACTOR = 0.55;
const ACCELERATION = 0.012;
const DECELERATION = 0.016;
const COAST_DECEL = 0.006;
const MAX_ROTATION_SPEED = 0.018;
const ROTATION_ACCEL = 0.003;
let velocity = 0;                // Current velocity (-MAX_SPEED to +MAX_SPEED)
let rotationVelocity = 0;        // Current turn rate
let isMoving = false;
let currentSpeed = 0; // Track the current speed of the rover

// === DEV DEBUG HELPERS (toggle with V key) ===
window.showRoadDebug = false;
let _roadDebugGroup = null;

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

  // Dev road/vehicle debug visualizer (V key)
  if (event.key.toLowerCase() === 'v') {
    window.showRoadDebug = !window.showRoadDebug;
    console.log('%c[DEV] Road debug visuals:', 'color:#0ff', window.showRoadDebug ? 'ON' : 'OFF');
    if (!window.showRoadDebug && _roadDebugGroup) {
      if (_roadDebugGroup.parent) _roadDebugGroup.parent.remove(_roadDebugGroup);
      _roadDebugGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      _roadDebugGroup = null;
    }
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
// Third-person camera: closer, more grounded chase cam for the rover (tighter feel)
const cameraOffset = new THREE.Vector3(2.2, 5.2, 13.5);
const cameraSpring = { velocity: new THREE.Vector3() };

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
    // Atmospheric haze that stays within terrain bounds
    // Uses a dark Mars-dust tint that blends with the black background
    const hazeGeometry = new THREE.PlaneGeometry(5000, 5000);
    const hazeMaterial = new THREE.MeshBasicMaterial({
      color: 0x301808,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: true,           // Let fog fade it out at the edges
      depthWrite: false
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
    this.guidedRouteWaypoints = []; // Beacons for optional guided driving route
    this.currentWaypointIndex = 0;
    this.aiVehicles = []; // Ground traffic vehicles (mining trucks, cybertrucks, etc.)
    this.aiRoutes = [];   // Reusable world-space routes for AI traffic
    this.lastTrafficUpdateTime = null;
    this.bulletTrains = []; // High-speed trains on elevated tracks
    this.collidables = [];  // Objects the rover can collide with { position, radius }

    // Procedural settlement spawning system
    this.settlementGrid = 400;          // Grid spacing â€” one potential site every 400 units
    this.settlementSpawnDist = 800;     // Distance at which a settlement spawns
    this.settlementDespawnDist = 1500;  // Distance at which a settlement is removed
    this.settlements = new Map();       // key "gx,gz" â†’ { group, center, type, collidableStart }
    this.lastSettlementCheck = 0;       // Throttle timestamp
    this.roads = new Map();             // key "fromâ†’to" â†’ { group }
    this.roadVehicles = [];             // Vehicles driving along roads

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

    // Lightweight colony + rocket traffic system
    this.rockets = [];
    this.rocketTrafficEnabled = true;
    this.rocketSystemStartTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    this.rocketCycleDuration = 60000; // one full launch+arrival cycle per minute

    console.log('ðŸ—ï¸ MARS SCENE MANAGER: About to create colony infrastructure');
    this.createColonyInfrastructure();
    console.log('ðŸ—ï¸ MARS SCENE MANAGER: About to initialize rocket launch system');
    this.initializeRocketLaunchSystem();

    // Create an optional guided driving route using blinking beacons
    this.createGuidedRoute();

    // Initialize optional ground traffic system (AI vehicles)
    this.initializeTrafficSystem();

    console.log('âœ… âœ… âœ… MarsSceneManager constructed with terrainSize=', terrainSize);
    console.log('Colony and rockets should now be visible in the scene!');
  }

  // Register a collidable object with a position and bounding radius
  registerCollidable(position, radius) {
    this.collidables.push({ x: position.x, z: position.z, r: radius });
  }

  // Check if a world-space XZ position collides with any registered object
  // Returns true if blocked
  checkCollision(x, z, roverRadius) {
    const len = this.collidables.length;
    for (let i = 0; i < len; i++) {
      const c = this.collidables[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const minDist = c.r + roverRadius;
      // Squared distance check (avoids sqrt)
      if (dx * dx + dz * dz < minDist * minDist) {
        return true;
      }
    }
    return false;
  }

  initializeRocketLaunchSystem() {
    if (this.rockets && this.rockets.length > 0) return;

    // Position rocket pads near the futuristic colony
    const padPositions = [
      new THREE.Vector3(-540, 0, -480),
      new THREE.Vector3(-440, 0, -520),
      new THREE.Vector3(-340, 0, -520),
      new THREE.Vector3(-240, 0, -480),
      new THREE.Vector3(-390, 0, -570)
    ];

    this.rockets = [];

    padPositions.forEach((padPos, index) => {
      // For reliability, keep pads near nominal ground level; terrain is centered at yâ‰ˆ0
      const groundY = 0;

      // Simple hex pad
      const padGeometry = new THREE.CylinderGeometry(22, 22, 3, 6);
      const padMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.9,
        metalness: 0.2
      });
      const pad = new THREE.Mesh(padGeometry, padMaterial);
      pad.position.set(padPos.x, groundY + 1.5, padPos.z);
      pad.receiveShadow = true;
      this.scene.add(pad);

      // Register rocket pad as collidable (radius 22 + padding)
      this.registerCollidable(padPos, 25);
      const rocket = this.createSimpleRocket();
      rocket.position.set(padPos.x, groundY, padPos.z);
      this.addRocketEffects(rocket, 'launch');
      this.scene.add(rocket);

      // Phase offset so rockets are staggered in the cycle
      const phaseOffset = index / padPositions.length;

      this.rockets.push({
        mesh: rocket,
        padY: groundY,
        phaseOffset,
        maxHeight: 650 + Math.random() * 150
      });
    });

    if (typeof console !== 'undefined') {
      console.log('MarsSceneManager: created rocket pads and rockets:', this.rockets.length);
    }
  }

  // Initialize AI ground traffic (mining convoys, cybertruck-like vehicles)
  initializeTrafficSystem() {
    try {
      const perfSettings = getPerformanceSettings();

      // Skip AI traffic only on mobile for performance
      if (perfSettings.isMobile) {
        this.aiVehicles = [];
        this.aiRoutes = [];
        return;
      }

      // Define a couple of simple routes between the colony and surrounding areas
      this.createTrafficRoutes();

      if (!this.aiRoutes || this.aiRoutes.length === 0) return;

      const maxVehicles = perfSettings.detailLevel === 'high' ? 8 : 5;
      const routeCount = this.aiRoutes.length;

      for (let i = 0; i < maxVehicles; i++) {
        const routeIndex = i % routeCount;
        const route = this.aiRoutes[routeIndex];
        if (!route || route.waypoints.length < 2) continue;

        // Use a cybertruck-style vehicle for all AI traffic
        const vehicleMesh = this.createCybertruckVehicle();

        // Stagger starting positions along the route
        const startT = (i / maxVehicles) * (route.waypoints.length - 1);
        const baseIndex = Math.floor(startT);
        const nextIndex = Math.min(baseIndex + 1, route.waypoints.length - 1);
        const localT = startT - baseIndex;

        const start = route.waypoints[baseIndex];
        const end = route.waypoints[nextIndex];
        const pos = new THREE.Vector3().copy(start).lerp(end, localT);

        this.positionOnTerrain(vehicleMesh, pos.x, pos.z);
        // Make AI vehicles slightly larger so they are easier to see
        vehicleMesh.scale.set(1.4, 1.4, 1.4);
        this.scene.add(vehicleMesh);

        const speed = 18 + Math.random() * 10; // world units per second

        this.aiVehicles.push({
          mesh: vehicleMesh,
          routeIndex,
          segmentIndex: baseIndex,
          segmentT: localT,
          speed,
          directionSign: Math.random() < 0.5 ? 1 : -1
        });
      }

      console.log('AI ground traffic initialized. Vehicles:', this.aiVehicles.length);
    } catch (e) {
      console.warn('Failed to initialize AI traffic system:', e);
      this.aiVehicles = [];
      this.aiRoutes = [];
    }
  }

  // Define a few looping traffic routes around the colony
  createTrafficRoutes() {
    this.aiRoutes = [];

    if (!this.colonyCenter) {
      // Fallback: approximate colony center near the known coordinates
      this.colonyCenter = new THREE.Vector3(-360, 0, -560);
    }

    const base = this.colonyCenter.clone();

    const makeWaypoint = (dx, dz) => {
      const x = base.x + dx;
      const z = base.z + dz;
      // Sample terrain height directly for this point so vehicles follow ground
      const y = this.getTerrainHeight(x, z);
      return new THREE.Vector3(x, y, z);
    };

    // Route 1: Colony <-> mining site A (extended farther out)
    const route1 = {
      name: 'Colony-Mine-A',
      waypoints: [
        makeWaypoint(0, 0),
        makeWaypoint(80, -60),
        makeWaypoint(140, -160),
        makeWaypoint(220, -260),
        makeWaypoint(300, -380),
        makeWaypoint(380, -520)
      ]
    };

    // Route 2: Colony <-> mining site B (different direction, extended)
    const route2 = {
      name: 'Colony-Mine-B',
      waypoints: [
        makeWaypoint(0, 0),
        makeWaypoint(-40, 100),
        makeWaypoint(-120, 220),
        makeWaypoint(-220, 320),
        makeWaypoint(-320, 460),
        makeWaypoint(-420, 620)
      ]
    };

    // Route 3: Larger service loop around colony
    const route3 = {
      name: 'Colony-Loop',
      waypoints: [
        makeWaypoint(0, -70),
        makeWaypoint(80, -40),
        makeWaypoint(70, 60),
        makeWaypoint(-40, 80),
        makeWaypoint(-90, 0),
        makeWaypoint(-40, -80)
      ]
    };

    // Route 4: Long-haul route from colony toward rover spawn area (near 0,0)
    const route4 = {
      name: 'Colony-Spawn-LongHaul',
      waypoints: [
        makeWaypoint(0, 0),
        makeWaypoint(120, 200),
        makeWaypoint(240, 380),
        makeWaypoint(360, 560) // This should be near (0, 0) in world space
      ]
    };

    this.aiRoutes.push(route1, route2, route3, route4);
  }

  // Simple boxy mining truck
  createMiningTruck() {
    const group = new THREE.Group();

    const bodyGeom = new THREE.BoxGeometry(10, 4, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, metalness: 0.4, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 3;
    group.add(body);

    const bedGeom = new THREE.BoxGeometry(8, 3, 5);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xd58b3b, metalness: 0.3, roughness: 0.7 });
    const bed = new THREE.Mesh(bedGeom, bedMat);
    bed.position.set(-1, 5, 0);
    group.add(bed);

    const wheelGeom = new THREE.CylinderGeometry(1.2, 1.2, 1, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.9 });
    const wheelOffsets = [
      [3.5, 0, 2.2],
      [-3.5, 0, 2.2],
      [3.5, 0, -2.2],
      [-3.5, 0, -2.2]
    ];

    wheelOffsets.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 1.2, z);
      group.add(wheel);
    });

    const lightGeom = new THREE.SphereGeometry(0.4, 12, 12);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa });
    const headlightLeft = new THREE.Mesh(lightGeom, lightMat);
    headlightLeft.position.set(5.2, 3.2, 1.2);
    const headlightRight = headlightLeft.clone();
    headlightRight.position.z = -1.2;
    group.add(headlightLeft, headlightRight);

    // Emissive headlight meshes are sufficient â€” no PointLight needed
    return group;
  }

  // Sleek colony utility rover
  createColonyRover() {
    const group = new THREE.Group();

    const bodyGeom = new THREE.BoxGeometry(8, 3, 5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x99c2ff, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 2.5;
    group.add(body);

    const cabinGeom = new THREE.BoxGeometry(4, 2.5, 4);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xd9ecff, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.8 });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 4.3, 0);
    group.add(cabin);

    const wheelGeom = new THREE.CylinderGeometry(1.0, 1.0, 0.8, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3, roughness: 0.8 });
    const wheelOffsets = [
      [3, 0, 2.0],
      [-3, 0, 2.0],
      [3, 0, -2.0],
      [-3, 0, -2.0]
    ];
    wheelOffsets.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 1.0, z);
      group.add(wheel);
    });

    const accentGeom = new THREE.BoxGeometry(1, 0.6, 3);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e0ff, emissive: 0x0077aa, emissiveIntensity: 0.8 });
    const accent = new THREE.Mesh(accentGeom, accentMat);
    accent.position.set(-3.5, 3.0, 0);
    group.add(accent);

    // Emissive accent is sufficient â€” no PointLight needed
    return group;
  }

  // Low-poly Tesla Cybertruck-inspired vehicle
  createCybertruckVehicle() {
    const group = new THREE.Group();

    const stainlessMat = new THREE.MeshStandardMaterial({
      color: 0xbfc4c7,
      metalness: 0.95,
      roughness: 0.18
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x101820,
      metalness: 0.7,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      metalness: 0.35,
      roughness: 0.72
    });

    // Wide flat skateboard chassis
    const bodyGeom = new THREE.BoxGeometry(11.0, 2.2, 4.8);
    const body = new THREE.Mesh(bodyGeom, stainlessMat);
    body.position.y = 1.6;
    group.add(body);

    // Cybertruck's signature steep single-slope windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 4.6), glassMat);
    windshield.position.set(1.4, 3.2, 0);
    windshield.rotation.z = -0.62; // steeper rake
    group.add(windshield);

    // Flat roof panel (very short, near the rear)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 4.5), stainlessMat);
    roof.position.set(-1.6, 4.1, 0);
    roof.rotation.z = 0.04;
    group.add(roof);

    // Aggressive rear sail sloping downward to the bed
    const rearSail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 4.6), stainlessMat);
    rearSail.position.set(-3.8, 3.3, 0);
    rearSail.rotation.z = 0.52;
    group.add(rearSail);

    const sideGlassGeom = new THREE.BoxGeometry(3.1, 0.9, 0.16);
    const leftGlass = new THREE.Mesh(sideGlassGeom, glassMat);
    leftGlass.position.set(-0.15, 3.0, 2.32);
    group.add(leftGlass);
    const rightGlass = leftGlass.clone();
    rightGlass.position.z = -2.32;
    group.add(rightGlass);

    // Front light bar
    const stripGeom = new THREE.BoxGeometry(0.18, 0.16, 4.05);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2
    });
    const lightStrip = new THREE.Mesh(stripGeom, stripMat);
    lightStrip.position.set(5.4, 2.2, 0);
    group.add(lightStrip);

    const rearStrip = new THREE.Mesh(stripGeom, stripMat);
    rearStrip.position.set(-5.4, 2.05, 0);
    rearStrip.scale.z = 0.82;
    group.add(rearStrip);

    // Emissive light strip is sufficient â€” no PointLight needed for each cybertruck

    // Dark lower fascia
    const bumperGeom = new THREE.BoxGeometry(10.6, 1.0, 4.6);
    const bumper = new THREE.Mesh(bumperGeom, blackMat);
    bumper.position.y = 0.92;
    group.add(bumper);

    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(1.25, 1.25, 0.9, 24);
    const rimGeom = new THREE.CylinderGeometry(0.62, 0.62, 0.94, 18);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.8, roughness: 0.28 });
    const wheelOffsets = [
      [3.65, 0, 2.18],
      [-3.85, 0, 2.18],
      [3.65, 0, -2.18],
      [-3.85, 0, -2.18]
    ];
    wheelOffsets.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeom, blackMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.92, z);
      group.add(wheel);

      const rim = new THREE.Mesh(rimGeom, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.copy(wheel.position);
      group.add(rim);
    });

    return group;
  }

  // Control methods for rocket launch system
  setRocketLaunchInterval(milliseconds) {
    // Kept for API compatibility; rocket system uses fixed 60s cycle
    this.rocketCycleDuration = Math.max(15000, milliseconds || this.rocketCycleDuration);
  }

  enableRocketLaunches() {
    this.rocketTrafficEnabled = true;
  }

  disableRocketLaunches() {
    this.rocketTrafficEnabled = false;
    if (this.rockets) {
      this.rockets.forEach(r => {
        if (r && r.mesh) {
          r.mesh.visible = false;
        }
      });
    }
  }

  triggerManualLaunch(patternType = 'random') {
    // Optional hook for future manual launch patterns
    this.rocketSystemStartTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  startRocketLaunchCycle() {
    this.enableRocketLaunches();
    this.triggerManualLaunch('reset');
  }

  triggerRocketLaunchSequence() {
    this.startRocketLaunchCycle();
  }

  // --- UPDATE animated objects ---
  updateAnimations(time) {
    const rover = window.rover;
    const roverPos = rover ? rover.position : null;
    const BEACON_CULL_DIST_SQ = 700 * 700;

    for (const anim of this.animatedObjects) {
      if (!anim.mesh) continue;

      // Skip beacons that are too far from the rover
      if (roverPos && anim.type === 'blink') {
        const wp = new THREE.Vector3();
        anim.mesh.getWorldPosition(wp);
        const dx = wp.x - roverPos.x, dz = wp.z - roverPos.z;
        if (dx * dx + dz * dz > BEACON_CULL_DIST_SQ) {
          anim.mesh.visible = false;
          continue;
        }
        const t = time * 0.001;
        anim.mesh.visible = Math.sin(t * 1.8 + anim.phase) > 0.3;
      } else if (anim.type === 'rotate') {
        anim.mesh.rotation.y += anim.speed;
      }
    }
  }

  // Create a high-definition futuristic colony
  createColonyInfrastructure() {
    const structures = [];
    
    // Position colony further away and to the side for better view
    const colonyOffsetX = -400;
    const colonyOffsetZ = -600;
    const groundY = 0;

    // Store primary colony center for use by traffic and rail systems
    this.colonyCenter = new THREE.Vector3(colonyOffsetX, groundY, colonyOffsetZ);
    
    // Shared materials for colony infrastructure (avoid duplicates)
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.7,
      emissive: 0x2244ff,
      emissiveIntensity: 0.4
    });
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.4,
      metalness: 0.9
    });

    // === MAIN COMMAND CENTER - Ultra-modern multi-level structure ===
    const commandCenterLevels = 3;
    for (let level = 0; level < commandCenterLevels; level++) {
      const levelHeight = 35;
      const levelRadius = 70 - level * 8;
      
      // Main level structure
      const levelGeometry = new THREE.CylinderGeometry(levelRadius, levelRadius + 5, levelHeight, 32);
      const levelMaterial = new THREE.MeshStandardMaterial({
        color: level === 0 ? 0xe8f0ff : level === 1 ? 0xd5e5ff : 0xc2d9ff,
        roughness: 0.15,
        metalness: 0.85,
        envMapIntensity: 2
      });
      const levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
      levelMesh.position.set(
        colonyOffsetX,
        groundY + levelHeight / 2 + level * levelHeight,
        colonyOffsetZ
      );
      levelMesh.castShadow = true;
      levelMesh.receiveShadow = true;
      this.scene.add(levelMesh);
      structures.push(levelMesh);
      
      // Glass observation windows (ring around each level)
      const windowCount = 8;
      for (let i = 0; i < windowCount; i++) {
        const angle = (i / windowCount) * Math.PI * 2;
        const windowGeometry = new THREE.BoxGeometry(8, 4, 0.5);
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
          Math.cos(angle) * (levelRadius + 2),
          0,
          Math.sin(angle) * (levelRadius + 2)
        );
        window.rotation.y = angle;
        levelMesh.add(window);
      }
      
      // Structural support beams
      const beamCount = 4;
      for (let i = 0; i < beamCount; i++) {
        const angle = (i / beamCount) * Math.PI * 2;
        const beamGeometry = new THREE.BoxGeometry(3, levelHeight + 2, 3);
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(
          Math.cos(angle) * (levelRadius - 2),
          1,
          Math.sin(angle) * (levelRadius - 2)
        );
        levelMesh.add(beam);
      }
    }
    
    // Top dome with holographic display
    const topDomeGeometry = new THREE.SphereGeometry(55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const topDomeMaterial = new THREE.MeshStandardMaterial({
      color: 0x88bbff,
      roughness: 0.08,
      metalness: 0.6,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const topDome = new THREE.Mesh(topDomeGeometry, topDomeMaterial);
    topDome.position.set(
      colonyOffsetX,
      groundY + commandCenterLevels * 35 + 25,
      colonyOffsetZ
    );
    topDome.castShadow = true;
    this.scene.add(topDome);
    structures.push(topDome);
    
    // Holographic projection beams
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 60, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(
        Math.cos(angle) * 30,
        30,
        Math.sin(angle) * 30
      );
      topDome.add(beam);
    }
    
    // === RESIDENTIAL TOWERS - Sleek twisted skyscrapers ===
    const towerPositions = [
      { x: -140, z: -100, twist: 0.3 },
      { x: -100, z: -160, twist: -0.25 },
      { x: 100, z: -100, twist: 0.35 },
      { x: 140, z: -160, twist: -0.3 }
    ];
    
    towerPositions.forEach((pos, index) => {
      const towerHeight = 140 + Math.random() * 30;
      const segments = 6;
      
      // Create twisted tower with segments
      for (let seg = 0; seg < segments; seg++) {
        const segHeight = towerHeight / segments;
        const segY = groundY + seg * segHeight + segHeight / 2;
        const twist = (seg / segments) * Math.PI * pos.twist;
        
        const segGeometry = new THREE.CylinderGeometry(16, 17, segHeight, 16);
        const segMaterial = new THREE.MeshStandardMaterial({
          color: seg % 2 === 0 ? 0xc8d4e0 : 0xb5c5d8,
          roughness: 0.25,
          metalness: 0.85,
          envMapIntensity: 1.5
        });
        const segment = new THREE.Mesh(segGeometry, segMaterial);
        segment.position.set(
          colonyOffsetX + pos.x,
          segY,
          colonyOffsetZ + pos.z
        );
        segment.rotation.y = twist;
        segment.castShadow = true;
        segment.receiveShadow = true;
        this.scene.add(segment);
        structures.push(segment);
        
        // LED strips on each segment (reduced for performance)
        const stripGeometry = new THREE.BoxGeometry(1, segHeight, 1);
        const stripMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff
        });
        for (let i = 0; i < 2; i++) {
          const angle = (i / 2) * Math.PI;
          const strip = new THREE.Mesh(stripGeometry, stripMaterial);
          strip.position.set(
            Math.cos(angle + twist) * 18,
            0,
            Math.sin(angle + twist) * 18
          );
          segment.add(strip);
        }
      }
      
      // Crown at the top
      const crownGeometry = new THREE.ConeGeometry(20, 15, 8);
      const crownMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0x886600,
        emissiveIntensity: 0.3
      });
      const crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.set(
        colonyOffsetX + pos.x,
        groundY + towerHeight + 7,
        colonyOffsetZ + pos.z
      );
      this.scene.add(crown);
      structures.push(crown);
      
      // Pulsing beacon on top
      const beaconGeometry = new THREE.SphereGeometry(2, 16, 16);
      const beaconMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1
      });
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beacon.position.y = 8;
      crown.add(beacon);
      
      // Use emissive beacon mesh for blinking instead of expensive PointLight
      this.animatedObjects.push({
        mesh: beacon,
        type: 'blink',
        phase: index * Math.PI / 2
      });
    });
    
    // === ENERGY GENERATION - Advanced fusion reactors ===
    const reactorCount = 3;
    for (let i = 0; i < reactorCount; i++) {
      const angle = (i / reactorCount) * Math.PI * 2;
      const reactorX = colonyOffsetX + Math.cos(angle) * 180;
      const reactorZ = colonyOffsetZ + Math.sin(angle) * 180;
      
      // Reactor core sphere
      const coreGeometry = new THREE.SphereGeometry(18, 32, 32);
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x00aaff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.set(reactorX, groundY + 25, reactorZ);
      this.scene.add(core);
      structures.push(core);
      
      // Rotating energy rings
      for (let r = 0; r < 3; r++) {
        const ringGeometry = new THREE.TorusGeometry(22 + r * 6, 1.5, 16, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          roughness: 0.2,
          metalness: 0.95,
          emissive: 0x0088ff,
          emissiveIntensity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        core.add(ring);
        
        this.animatedObjects.push({
          mesh: ring,
          type: 'rotate',
          speed: 0.01 * (r + 1) * (i % 2 === 0 ? 1 : -1)
        });
      }
      
      // Support pylons
      const pylonPositions = [
        { x: -15, z: -15 },
        { x: 15, z: -15 },
        { x: -15, z: 15 },
        { x: 15, z: 15 }
      ];
      
      pylonPositions.forEach(pylon => {
        const pylonGeometry = new THREE.CylinderGeometry(2, 3, 30, 8);
        const pylonMaterial = new THREE.MeshStandardMaterial({
          color: 0x556677,
          roughness: 0.4,
          metalness: 0.8
        });
        const pylonMesh = new THREE.Mesh(pylonGeometry, pylonMaterial);
        pylonMesh.position.set(reactorX + pylon.x, groundY + 15, reactorZ + pylon.z);
        this.scene.add(pylonMesh);
      });
      
      // Reactor glow handled by emissive materials above â€” no additional PointLight needed
    }
    
    // === ADVANCED SOLAR FARM - Hexagonal mirror array ===
    const solarCenterX = colonyOffsetX + 220;
    const solarCenterZ = colonyOffsetZ - 80;
    const hexRadius = 6;
    const hexRows = 5;
    const hexCols = 8;
    
    for (let row = 0; row < hexRows; row++) {
      for (let col = 0; col < hexCols; col++) {
        const xOffset = col * hexRadius * 1.8;
        const zOffset = row * hexRadius * 1.6 + (col % 2) * hexRadius * 0.8;
        
        const hexGeometry = new THREE.CylinderGeometry(hexRadius, hexRadius, 0.5, 6);
        const hexMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a2844,
          roughness: 0.1,
          metalness: 0.95,
          emissive: 0x0a1a44,
          emissiveIntensity: 0.3
        });
        const hex = new THREE.Mesh(hexGeometry, hexMaterial);
        hex.position.set(
          solarCenterX + xOffset,
          groundY + 2,
          solarCenterZ + zOffset
        );
        hex.rotation.x = -Math.PI / 8;
        hex.castShadow = true;
        this.scene.add(hex);
        
        // Blue glow on panels
        const glowGeometry = new THREE.CircleGeometry(hexRadius * 0.8, 6);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x2266ff,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.3;
        glow.rotation.x = -Math.PI / 2;
        hex.add(glow);
      }
    }
    
    // === TRANSPORTATION HUB - Magnetic rail station ===
    const stationGeometry = new THREE.BoxGeometry(100, 20, 35);
    const stationMaterial = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      roughness: 0.2,
      metalness: 0.85
    });
    const station = new THREE.Mesh(stationGeometry, stationMaterial);
    station.position.set(colonyOffsetX + 180, groundY + 10, colonyOffsetZ + 100);
    station.castShadow = true;
    station.receiveShadow = true;
    this.scene.add(station);
    structures.push(station);
    
    // Glass canopy
    const canopyGeometry = new THREE.CylinderGeometry(50, 50, 25, 32, 1, true, 0, Math.PI);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = 12;
    canopy.rotation.z = Math.PI / 2;
    station.add(canopy);
    
    // === COMMUNICATION ARRAY - Multiple rotating dishes ===
    const dishCount = 4;
    for (let i = 0; i < dishCount; i++) {
      const angle = (i / dishCount) * Math.PI * 2;
      const dishX = colonyOffsetX + Math.cos(angle) * 150;
      const dishZ = colonyOffsetZ + Math.sin(angle) * 150;
      
      const dishBaseGeometry = new THREE.CylinderGeometry(5, 7, 18, 16);
      const dishBaseMaterial = new THREE.MeshStandardMaterial({
        color: 0x7788aa,
        roughness: 0.45,
        metalness: 0.8
      });
      const dishBase = new THREE.Mesh(dishBaseGeometry, dishBaseMaterial);
      dishBase.position.set(dishX, groundY + 9, dishZ);
      this.scene.add(dishBase);
      
      const dishGeometry = new THREE.CylinderGeometry(20, 20, 2, 32);
      const dishMaterial = new THREE.MeshStandardMaterial({
        color: 0xbbccdd,
        roughness: 0.25,
        metalness: 0.9
      });
      const dish = new THREE.Mesh(dishGeometry, dishMaterial);
      dish.position.y = 15;
      dish.rotation.x = Math.PI / 4;
      dishBase.add(dish);
      
      this.animatedObjects.push({
        mesh: dishBase,
        type: 'rotate',
        speed: 0.003 * (i % 2 === 0 ? 1 : -1)
      });
    }
    
    // === ATMOSPHERIC LIGHTING - Enhanced dramatic effects ===
    // Main colony central light
    const centralLight = new THREE.PointLight(0xffffff, 3, 500);
    centralLight.position.set(colonyOffsetX, groundY + 150, colonyOffsetZ);
    this.scene.add(centralLight);
    
    // Spotlight beams removed â€” emissive materials and central light provide sufficient effect
    
    
    // Perimeter lighting system (reduced for performance)
    const perimeterRadius = 250;
    const perimeterLights = 6;
    for (let i = 0; i < perimeterLights; i++) {
      const angle = (i / perimeterLights) * Math.PI * 2;
      const x = colonyOffsetX + Math.cos(angle) * perimeterRadius;
      const z = colonyOffsetZ + Math.sin(angle) * perimeterRadius;
      
      // Light post
      const postGeometry = new THREE.CylinderGeometry(1, 1.5, 12, 8);
      const postMaterial = new THREE.MeshStandardMaterial({
        color: 0x445566,
        roughness: 0.5,
        metalness: 0.8
      });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, groundY + 6, z);
      this.scene.add(post);
      
      // Light head
      const headGeometry = new THREE.SphereGeometry(2.5, 16, 16);
      const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa44
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 7;
      post.add(head);
      
      // Emissive mesh is visible enough; skip PointLight for performance
      this.animatedObjects.push({
        mesh: head,
        type: 'blink',
        phase: i * Math.PI / 10
      });
    }
    
    console.log('âœ… Ultra high-definition futuristic colony created:', structures.length, 'main structures');

    // Register collidable bounding volumes for the primary colony
    // Command center levels (3 stacked cylinders at colony center, radius ~70-80)
    this.registerCollidable({ x: colonyOffsetX, z: colonyOffsetZ }, 80);
    // Top dome above command center
    this.registerCollidable({ x: colonyOffsetX, z: colonyOffsetZ }, 60);
    // Register individual structures that sit away from the center
    structures.forEach(s => {
      if (!s || !s.position) return;
      const p = s.geometry && s.geometry.parameters;
      if (!p) return;
      // Determine a bounding radius from the geometry
      const r = p.radiusTop || p.radiusBottom || p.radius ||
                (p.width ? Math.max(p.width, p.depth || p.width) / 2 : 0);
      if (r > 5) { // Only register structures large enough to matter
        this.registerCollidable(s.position, r + 2); // +2 padding
      }
    });

    // Create a lightweight secondary colony (not a full deep-clone â€” saves hundreds of objects)
    try {
      const perfSettings = getPerformanceSettings();
      if (!perfSettings.isMobile) {
        const replicaOffset = new THREE.Vector3(2600, 0, 0);
        this.secondaryColonyCenter = this.colonyCenter.clone().add(replicaOffset);

        // Clone only the main large structures (command center levels + dome + station)
        // Skip small details like windows, beams, solar panels
        const mainStructures = structures.filter(s => {
          if (!s || !s.geometry || !s.geometry.parameters) return false;
          const p = s.geometry.parameters;
          // Only clone structures with significant radius/size
          return (p.radiusTop && p.radiusTop > 15) || (p.width && p.width > 50) || (p.radius && p.radius > 15);
        });
        mainStructures.forEach(original => {
          if (!original) return;
          const clone = original.clone(false); // shallow clone â€” no children (skips windows/beams)
          clone.position.x += replicaOffset.x;
          clone.position.z += replicaOffset.z;
          this.scene.add(clone);
        });

        console.log('âœ… Lightweight secondary colony created at', this.secondaryColonyCenter.x, this.secondaryColonyCenter.z);

        // Register secondary colony as collidable (mirror the primary colony center)
        this.registerCollidable(this.secondaryColonyCenter, 80);

        // Build elevated rail and bullet train between the two colonies
        this.createBulletTrainSystem();

        // Queue creation of the third futuristic city node in the background
        try {
          if (typeof lazyLoader !== 'undefined') {
            const perfSettings = getPerformanceSettings();
            if (perfSettings.detailLevel === 'high') {
              lazyLoader.loadInBackground('thirdCityNode', () => {
                this.createThirdCityNode();
                return Promise.resolve();
              });
            }
          } else {
            // Fallback: delayed creation so it doesn't block initial load
            setTimeout(() => this.createThirdCityNode(), 4000);
          }
        } catch (e) {
          console.warn('Failed to schedule third city node for lazy loading:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to create secondary colony or bullet train system:', e);
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
    // Reuse a single raycaster and direction vector (avoid allocating per call)
    if (!this._heightRaycaster) {
      this._heightRaycaster = new THREE.Raycaster();
      this._heightRayOrigin = new THREE.Vector3();
      this._heightRayDir = new THREE.Vector3(0, -1, 0);
    }
    this._heightRayOrigin.set(x, 500, z);
    this._heightRaycaster.set(this._heightRayOrigin, this._heightRayDir);

    // Try to find terrain mesh if not already set (one-time search)
    if (!this.terrainMesh) {
      // Use the global marsSurface directly â€” fastest fallback
      if (typeof marsSurface !== 'undefined' && marsSurface) {
        this.terrainMesh = marsSurface;
      } else {
        // Scan scene once for a large plane
        this.scene.traverse(child => {
          if (this.terrainMesh) return;
          if (child.isMesh && child.geometry) {
            const params = child.geometry.parameters;
            if (params && (params.width >= 2000 || params.height >= 2000)) {
              this.terrainMesh = child;
            }
          }
        });
      }
    }
    
    if (this.terrainMesh) {
      const intersects = this._heightRaycaster.intersectObject(this.terrainMesh, false);
      if (intersects.length > 0) {
        return intersects[0].point.y;
      }
    }
    
    // Fallback: return 0 if terrain not found (will log warning)
    console.warn(`Could not find terrain at (${x}, ${z}), using y=0. Terrain mesh:`, this.terrainMesh ? 'found' : 'NOT FOUND');
    return 0;
  }

  // Create a third futuristic city node as part of a loose square network
  createThirdCityNode() {
    try {
      const perfSettings = getPerformanceSettings();
      if (perfSettings.isMobile) return;
      if (!this.colonyCenter || !this.secondaryColonyCenter) return;
      if (this.futureCityCenter) return; // already built

      const c1 = this.colonyCenter.clone();
      const c2 = this.secondaryColonyCenter.clone();
      const baseVec = new THREE.Vector3().subVectors(c2, c1);
      const baseLen = baseVec.length();
      if (baseLen < 10) return;

      baseVec.normalize();
      // Perpendicular in XZ plane to form the third node of a square-like layout
      const perp = new THREE.Vector3(-baseVec.z, 0, baseVec.x).normalize();

      const mid = new THREE.Vector3().addVectors(c1, c2).multiplyScalar(0.5);
      const offsetDistance = baseLen * 0.7; // push city out far enough to feel distinct
      const roughPos = mid.clone().add(perp.multiplyScalar(offsetDistance));

      const groundY = this.getTerrainHeight(roughPos.x, roughPos.z);
      const center = new THREE.Vector3(roughPos.x, groundY, roughPos.z);
      this.futureCityCenter = center;

      console.log('ðŸ™ï¸ Creating third futuristic city node at', center.x, center.z);

      this.createFuturisticCity(center);
      this.createCityBulletTrainSystem(center);
    } catch (e) {
      console.warn('Failed to create third city node or its train system:', e);
    }
  }

  // Build a large futuristic city with ~100 varied skyscrapers and one record-setting tower
  createFuturisticCity(center) {
    const structures = [];

    const perfSettings = typeof getPerformanceSettings === 'function'
      ? getPerformanceSettings()
      : { detailLevel: 'high' };

    const baseRadius = perfSettings.detailLevel === 'low' ? 300 : 420;
    const innerRadius = 80;

    // Approximate the tallest existing colony tower height and create a new icon 5x taller
    const colonyTallTowerHeight = 170; // based on residential towers near the main colony
    const flagshipHeight = colonyTallTowerHeight * 5; // ultra-tall centerpiece

    // Compact skyline â€” reduced object count for performance
    let skyscraperCount = 25;
    if (perfSettings.detailLevel === 'normal') {
      skyscraperCount = 18;
    } else if (perfSettings.detailLevel === 'low') {
      skyscraperCount = 10;
    }
    for (let i = 0; i < skyscraperCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusLerp = Math.random();
      const radius = innerRadius + (baseRadius - innerRadius) * Math.pow(radiusLerp, 0.7);

      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      const groundY = this.getTerrainHeight(x, z);

      // Height distribution: taller near the core, smaller at the fringes
      const coreFactor = 1 - (radius - innerRadius) / (baseRadius - innerRadius + 1e-5);
      const baseHeight = 60 + coreFactor * 180 + Math.random() * 40;

      const width = 10 + Math.random() * 16;
      const depth = 10 + Math.random() * 16;

      const towerGeom = new THREE.BoxGeometry(width, baseHeight, depth);
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8ff,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x2244aa,
        emissiveIntensity: 0.55
      });
      const tower = new THREE.Mesh(towerGeom, towerMat);
      tower.position.set(x, groundY + baseHeight / 2, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);
      structures.push(tower);

      // Register skyscraper as collidable
      this.registerCollidable({ x: x, z: z }, Math.max(width, depth) / 2 + 2);
      const edgeGeom = new THREE.BoxGeometry(0.7, baseHeight * 1.02, 0.7);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: 0x66ddff,
        transparent: true,
        opacity: 0.8
      });
      // Only add 2 diagonal edges for a sleek look
      const e1 = new THREE.Mesh(edgeGeom, edgeMat);
      e1.position.set(width / 2 + 0.4, 0, depth / 2 + 0.4);
      tower.add(e1);
      const e2 = new THREE.Mesh(edgeGeom, edgeMat);
      e2.position.set(-width / 2 - 0.4, 0, -depth / 2 - 0.4);
      tower.add(e2);

      // Roof beacon lights to make the skyline sparkle
      const beaconGeom = new THREE.SphereGeometry(2.2, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff66cc });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(0, baseHeight / 2 + 3, 0);
      tower.add(beacon);

      // Emissive beacon mesh â€” no PointLight needed per building
      this.animatedObjects.push({
        mesh: beacon,
        type: 'blink',
        phase: Math.random() * Math.PI * 2
      });
    }

    // Flagship mega-tower in the exact city center
    const flagshipWidth = 40;
    const flagshipDepth = 40;
    const flagshipGeom = new THREE.BoxGeometry(flagshipWidth, flagshipHeight, flagshipDepth);
    const flagshipMat = new THREE.MeshStandardMaterial({
      color: 0xf5f7ff,
      metalness: 1.0,
      roughness: 0.08,
      emissive: 0x223366,
      emissiveIntensity: 0.55
    });
    const flagship = new THREE.Mesh(flagshipGeom, flagshipMat);
    flagship.position.set(center.x, center.y + flagshipHeight / 2, center.z);
    flagship.castShadow = true;
    flagship.receiveShadow = true;
    this.scene.add(flagship);
    structures.push(flagship);

    // Register flagship as collidable
    this.registerCollidable({ x: center.x, z: center.z }, flagshipWidth / 2 + 5);
    const crownRingGeom = new THREE.TorusGeometry(flagshipWidth * 0.9, 1.8, 16, 64);
    const crownRingMat = new THREE.MeshStandardMaterial({
      color: 0x66ffff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x33bbff,
      emissiveIntensity: 0.9
    });
    const crownRing = new THREE.Mesh(crownRingGeom, crownRingMat);
    crownRing.position.y = flagshipHeight / 2 - 40;
    crownRing.rotation.x = Math.PI / 2;
    flagship.add(crownRing);

    this.animatedObjects.push({
      mesh: crownRing,
      type: 'rotate',
      speed: 0.02
    });

    // Flagship emissive glow is sufficient â€” SpotLights removed for performance

    // Single city-wide ambient glow (reduced intensity)
    const cityLight = new THREE.PointLight(0x88aaff, 2.0, 1200);
    cityLight.position.set(center.x, center.y + 260, center.z);
    this.scene.add(cityLight);

    console.log('âœ… Futuristic third-city skyline created with', structures.length, 'skyscraper structures');
  }

  // Elevated rail and bullet train between the secondary colony and the new city
  createCityBulletTrainSystem(cityCenter) {
    try {
      const perfSettings = getPerformanceSettings();
      if (perfSettings.isMobile) return;
      if (!this.secondaryColonyCenter || !cityCenter) return;

      const start = this.secondaryColonyCenter.clone();
      const end = cityCenter.clone();

      const startY = this.getTerrainHeight(start.x, start.z) + 45;
      const endY = this.getTerrainHeight(end.x, end.z) + 45;
      start.y = startY;
      end.y = endY;

      let segmentCount = 22;
      if (perfSettings.detailLevel === 'normal') {
        segmentCount = 16;
      } else if (perfSettings.detailLevel === 'low') {
        segmentCount = 10;
      }
      const pylonGeometry = new THREE.CylinderGeometry(2.2, 3.2, 1, 10);
      const pylonMaterial = new THREE.MeshStandardMaterial({
        color: 0x555577,
        roughness: 0.35,
        metalness: 0.9
      });

      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const pos = new THREE.Vector3().lerpVectors(start, end, t);
        const groundY = this.getTerrainHeight(pos.x, pos.z);
        const height = Math.max(24, pos.y - groundY);

        const pylon = new THREE.Mesh(pylonGeometry, pylonMaterial);
        pylon.scale.y = height / 1; // base height is 1
        pylon.position.set(pos.x, groundY + height / 2, pos.z);
        this.scene.add(pylon);
      }

      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      direction.normalize();

      const deckGeometry = new THREE.BoxGeometry(9, 1.4, length);
      const deckMaterial = new THREE.MeshStandardMaterial({
        color: 0xdde3ff,
        roughness: 0.18,
        metalness: 0.92
      });
      const deck = new THREE.Mesh(deckGeometry, deckMaterial);

      const deckGroup = new THREE.Group();
      deckGroup.add(deck);

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      deckGroup.position.copy(mid);

      const yaw = Math.atan2(end.x - start.x, end.z - start.z);
      deckGroup.rotation.y = yaw;

      this.scene.add(deckGroup);

      const train = this.createBulletTrainMesh();

      const initialPos = start.clone();
      train.position.copy(initialPos);
      train.rotation.y = yaw;
      this.scene.add(train);

      if (!this.bulletTrains) {
        this.bulletTrains = [];
      }
      this.bulletTrains.push({
        mesh: train,
        start,
        end,
        yaw,
        t: 0,
        direction: 1,
        speed: perfSettings.detailLevel === 'high' ? 0.07 : 0.06,
        lastTime: null
      });

      console.log('ðŸš„ City bullet train system created between secondary colony and third city');
    } catch (e) {
      console.warn('Failed to create city bullet train system:', e);
    }
  }

  positionOnTerrain(group, x, z) {
    const y = this.getTerrainHeight(x, z);
    group.position.set(x, y, z);
  }

  // Create a simple guided route from the rover start area toward the colony
  createGuidedRoute() {
    try {
      const perfSettings = getPerformanceSettings();
      // Skip on low-detail or mobile devices to avoid extra draw calls
      if (perfSettings.isMobile || perfSettings.detailLevel === 'low') return;

      // Define a few world-space points forming a gentle path toward the colony
      const points = [
        new THREE.Vector3(0, 0, -40),
        new THREE.Vector3(-80, 0, -140),
        new THREE.Vector3(-180, 0, -260),
        new THREE.Vector3(-260, 0, -360),
        new THREE.Vector3(-320, 0, -460),
        new THREE.Vector3(-360, 0, -560)
      ];

      const beaconGeometry = new THREE.CylinderGeometry(1, 1.5, 10, 8);
      const beaconHeadGeometry = new THREE.SphereGeometry(2.3, 16, 16);

      points.forEach((p, index) => {
        const group = new THREE.Group();

        // Base post
        const postMaterial = new THREE.MeshStandardMaterial({
          color: 0x223344,
          roughness: 0.5,
          metalness: 0.7
        });
        const post = new THREE.Mesh(beaconGeometry, postMaterial);
        post.position.y = 5;
        group.add(post);

        // Glowing head
        const headMaterial = new THREE.MeshBasicMaterial({
          color: 0x66ddff
        });
        const head = new THREE.Mesh(beaconHeadGeometry, headMaterial);
        head.position.y = 10.5;
        group.add(head);

        const light = new THREE.PointLight(0x66ddff, 1.2, 120);
        light.position.copy(head.position);
        group.add(light);

        // Place on terrain so the base follows the hills
        this.positionOnTerrain(group, p.x, p.z);
        this.scene.add(group);

        this.animatedObjects.push({
          mesh: light,
          type: 'blink',
          phase: index * 0.7
        });

        this.guidedRouteWaypoints.push({
          position: new THREE.Vector3(group.position.x, group.position.y, group.position.z),
          group
        });
      });

      console.log('Guided route beacons created:', this.guidedRouteWaypoints.length);
    } catch (e) {
      console.warn('Failed to create guided route beacons:', e);
    }
  }

  getRandomLaunchSite() {
    return this.rocketLaunchSites[
      Math.floor(Math.random() * this.rocketLaunchSites.length)
    ];
  }

  // ================================================================
  // PROCEDURAL SETTLEMENT SPAWNING
  // ================================================================

  // Deterministic hash for a grid cell â€” decides if a settlement exists there and its type
  _settlementHash(gx, gz) {
    // Simple but effective integer hash
    let h = (gx * 374761393 + gz * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 15), 0x27d4eb2d);
    h = h ^ (h >>> 13);
    return h;
  }

  // Check and spawn/despawn settlements near the player
  updateSettlements(playerPosition) {
    const now = performance.now();
    if (now - this.lastSettlementCheck < 2000) return; // check every 2 seconds
    this.lastSettlementCheck = now;

    const perfSettings = getPerformanceSettings();
    if (perfSettings.isMobile) return;

    const px = playerPosition.x;
    const pz = playerPosition.z;
    const grid = this.settlementGrid;

    // Determine which grid cells are within spawn range
    const scanRadius = Math.ceil(this.settlementSpawnDist / grid) + 1;
    const playerGX = Math.floor(px / grid);
    const playerGZ = Math.floor(pz / grid);

    // Despawn settlements that are too far away
    for (const [key, settlement] of this.settlements) {
      const dx = settlement.center.x - px;
      const dz = settlement.center.z - pz;
      if (dx * dx + dz * dz > this.settlementDespawnDist * this.settlementDespawnDist) {
        // Remove from scene
        this.scene.remove(settlement.group);
        settlement.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        // Remove collidables that belong to this settlement
        if (typeof settlement.collidableStart === 'number') {
          this.collidables.splice(settlement.collidableStart,
            settlement.collidableCount || 0);
          // Adjust collidableStart for all remaining settlements
          for (const [, s] of this.settlements) {
            if (s.collidableStart > settlement.collidableStart) {
              s.collidableStart -= (settlement.collidableCount || 0);
            }
          }
        }
        this.settlements.delete(key);
      }
    }

    // Scan grid cells around the player â€” spawn new settlements
    for (let gx = playerGX - scanRadius; gx <= playerGX + scanRadius; gx++) {
      for (let gz = playerGZ - scanRadius; gz <= playerGZ + scanRadius; gz++) {
        const key = `${gx},${gz}`;
        if (this.settlements.has(key)) continue;

        // Skip the origin area (the hand-placed colony lives there)
        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;

        const hash = this._settlementHash(gx, gz);

        // ~60% of grid cells have a settlement
        if ((hash & 0xff) > 153) continue; // 154/256 â‰ˆ 60%

        const cx = gx * grid + ((hash >>> 8) & 0xff) / 256 * grid * 0.6;
        const cz = gz * grid + ((hash >>> 16) & 0xff) / 256 * grid * 0.6;

        // Distance check
        const dx = cx - px;
        const dz2 = cz - pz;
        if (dx * dx + dz2 * dz2 > this.settlementSpawnDist * this.settlementSpawnDist) continue;

        // Determine settlement type from hash bits
        const typeBits = (hash >>> 24) & 0xff;
        let type;
        if (typeBits < 100) type = 'outpost';       // ~39% â€” small
        else if (typeBits < 200) type = 'base';      // ~39% â€” medium
        else type = 'city';                           // ~22% â€” large

        const groundY = this.getTerrainHeight(cx, cz);
        const center = new THREE.Vector3(cx, groundY, cz);

        console.log(`ðŸ—ï¸ Spawning procedural ${type} at (${Math.round(cx)}, ${Math.round(cz)})`);

        const collidableStart = this.collidables.length;
        const group = this._buildSettlement(type, center, hash);
        const collidableCount = this.collidables.length - collidableStart;

        this.scene.add(group);
        this.settlements.set(key, {
          group,
          center,
          type,
          collidableStart,
          collidableCount
        });
      }
    }

    // Build roads between nearby settlements
    this._updateRoads(px, pz);

    // Spawn vehicles on roads
    this._updateRoadVehicles(px, pz);
  }

  // Create roads (flat strips) between pairs of nearby settlements
  _updateRoads(px, pz) {
    const maxRoadDist = this.settlementGrid * 2; // Connect settlements up to 2 grid cells apart
    const roadDespawnDist = this.settlementDespawnDist + 200;

    // Remove roads that are too far away
    for (const [key, road] of this.roads) {
      const mx = road.midX - px;
      const mz = road.midZ - pz;
      if (mx * mx + mz * mz > roadDespawnDist * roadDespawnDist) {
        this.scene.remove(road.group);
        road.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material && !child.material._shared) child.material.dispose();
        });
        this.roads.delete(key);
      }
    }

    // Shared road material
    if (!this._roadMaterial) {
      this._roadMaterial = new THREE.MeshBasicMaterial({
        color: 0x3a3028,
        depthWrite: true
      });
      this._roadMaterial._shared = true;
      this._roadLineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        depthWrite: true
      });
      this._roadLineMaterial._shared = true;
    }

    // Build roads between nearby spawned settlements
    const entries = [...this.settlements.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [keyA, a] = entries[i];
        const [keyB, b] = entries[j];
        const roadKey = keyA < keyB ? `${keyA}â†’${keyB}` : `${keyB}â†’${keyA}`;
        if (this.roads.has(roadKey)) continue;

        const dx = a.center.x - b.center.x;
        const dz = a.center.z - b.center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > maxRoadDist || dist < 50) continue;

        // Mid-point distance check
        const midX = (a.center.x + b.center.x) / 2;
        const midZ = (a.center.z + b.center.z) / 2;
        const dmx = midX - px;
        const dmz = midZ - pz;
        if (dmx * dmx + dmz * dmz > this.settlementSpawnDist * this.settlementSpawnDist * 1.5) continue;

        const roadGroup = new THREE.Group();

        // Road surface â€” flat plane stretched between the two settlements
        const roadWidth = 6;
        const roadGeom = new THREE.PlaneGeometry(dist, roadWidth, 1, 1);
        roadGeom.rotateX(-Math.PI / 2);
        const road = new THREE.Mesh(roadGeom, this._roadMaterial);

        // Position at midpoint, rotated to face from A to B
        const angle = Math.atan2(b.center.z - a.center.z, b.center.x - a.center.x);
        const groundY = (a.center.y + b.center.y) / 2 + 0.15;
        road.position.set(midX, groundY, midZ);
        road.rotation.y = -angle;
        roadGroup.add(road);

        // Center line (dashed effect via a thin strip)
        const lineGeom = new THREE.PlaneGeometry(dist, 0.3, 1, 1);
        lineGeom.rotateX(-Math.PI / 2);
        const line = new THREE.Mesh(lineGeom, this._roadLineMaterial);
        line.position.set(midX, groundY + 0.05, midZ);
        line.rotation.y = -angle;
        roadGroup.add(line);

        this.scene.add(roadGroup);
        this.roads.set(roadKey, {
          group: roadGroup,
          midX, midZ,
          startX: a.center.x, startZ: a.center.z,
          endX: b.center.x, endZ: b.center.z,
          dist, angle, groundY
        });
      }
    }
  }

  // Spawn and animate vehicles on roads
  _updateRoadVehicles(px, pz) {
    const maxVehicles = 20;

    // Remove vehicles that are too far from player
    for (let i = this.roadVehicles.length - 1; i >= 0; i--) {
      const v = this.roadVehicles[i];
      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;
      if (dx * dx + dz * dz > this.settlementDespawnDist * this.settlementDespawnDist) {
        this.scene.remove(v.mesh);
        v.mesh.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(mat => mat.dispose());
            else obj.material.dispose();
          }
        });
        this.roadVehicles.splice(i, 1);
      }
    }

    // Spawn new vehicles on active roads
    if (this.roadVehicles.length < maxVehicles) {
      for (const [, road] of this.roads) {
        if (this.roadVehicles.length >= maxVehicles) break;
        // ~5% chance per check to spawn a vehicle on each road
        if (Math.random() > 0.05) continue;

        const t = Math.random(); // 0..1 along road
        const x = road.startX + (road.endX - road.startX) * t;
        const z = road.startZ + (road.endZ - road.startZ) * t;

        const veh = this.createCybertruckVehicle();
        const scale = 0.9 + Math.random() * 0.35;
        veh.scale.set(scale, scale, scale);
        veh.position.set(x, road.groundY + 0.3, z);
        veh.rotation.y = road.angle + (Math.random() < 0.5 ? 0 : Math.PI); // face either direction

        this.scene.add(veh);
        this.roadVehicles.push({
          mesh: veh,
          road,
          t,
          speed: (0.0003 + Math.random() * 0.0006) * (Math.random() < 0.5 ? 1 : -1), // t per frame
          direction: Math.random() < 0.5 ? 1 : -1
        });
      }
    }

    // Animate existing vehicles along their roads
    for (const v of this.roadVehicles) {
      v.t += v.speed;
      // Bounce at endpoints
      if (v.t > 1) { v.t = 1; v.speed = -v.speed; v.mesh.rotation.y += Math.PI; }
      if (v.t < 0) { v.t = 0; v.speed = -v.speed; v.mesh.rotation.y += Math.PI; }

      v.mesh.position.x = v.road.startX + (v.road.endX - v.road.startX) * v.t;
      v.mesh.position.z = v.road.startZ + (v.road.endZ - v.road.startZ) * v.t;

      // === Phase 2 fix: Dynamically follow terrain height every frame ===
      // This stops vehicles from floating or sinking on sloped roads.
      if (typeof this.getTerrainHeight === 'function') {
        const groundY = this.getTerrainHeight(v.mesh.position.x, v.mesh.position.z);
        v.mesh.position.y = groundY + 0.3; // consistent offset above surface
      }
    }
  }

  // Build a settlement group at the given center; returns a THREE.Group
  _buildSettlement(type, center, seed) {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    // Seeded pseudo-random so the same grid cell always produces the same layout
    let s = seed;
    const rand = () => { s = Math.imul(s ^ (s >>> 15), 0x5bd1e995); s = s ^ (s >>> 13); return ((s >>> 0) % 10000) / 10000; };

    const cx = center.x;
    const cz = center.z;
    const gy = center.y;

    // Random colour palette per settlement (seeded)
    const palettes = [
      { wall: 0xd0d8e8, accent: 0x66ddff, glow: 0x44ffcc, beacon: 0xff66cc, emissive: 0x111122 },
      { wall: 0xe8c8a0, accent: 0xff8844, glow: 0xffcc33, beacon: 0xff3333, emissive: 0x221100 },
      { wall: 0xa0d8b8, accent: 0x33ff99, glow: 0x88ffaa, beacon: 0x00ffff, emissive: 0x002211 },
      { wall: 0xc0b0e0, accent: 0xbb66ff, glow: 0xff44ff, beacon: 0xffaaff, emissive: 0x110022 },
      { wall: 0xe0e0e0, accent: 0xff4466, glow: 0xff2222, beacon: 0xffff44, emissive: 0x220000 },
      { wall: 0xb0c8e8, accent: 0x4488ff, glow: 0x2266ff, beacon: 0x88ccff, emissive: 0x001133 },
      { wall: 0xf5e6c8, accent: 0xffaa00, glow: 0xff6600, beacon: 0xff8800, emissive: 0x331100 },
    ];
    const pal = palettes[Math.floor(rand() * palettes.length)];

    const wallMat = new THREE.MeshStandardMaterial({ color: pal.wall, metalness: 0.7, roughness: 0.3, emissive: pal.emissive, emissiveIntensity: 0.15 });
    const glowMat = new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.85 });
    const glow2Mat = new THREE.MeshBasicMaterial({ color: pal.glow, transparent: true, opacity: 0.7 });
    const padMat  = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.4 });

    // Helper: twisted box tower
    const makeTwistedTower = (x, z, w, h, d, twist) => {
      const segs = Math.max(3, Math.floor(h / 15));
      const segH = h / segs;
      for (let si = 0; si < segs; si++) {
        const segGeom = new THREE.BoxGeometry(w, segH + 0.5, d);
        const seg = new THREE.Mesh(segGeom, wallMat);
        const sy = gy + segH * si + segH / 2;
        seg.position.set(x, sy, z);
        seg.rotation.y = twist * si;
        group.add(seg);
      }
      this.registerCollidable({ x, z }, Math.max(w, d) * 0.8 + 2);
    };

    // Helper: add a floating ring
    const addFloatingRing = (x, y, z, radius, tubeR) => {
      const rGeom = new THREE.TorusGeometry(radius, tubeR || 1.2, 10, 24);
      const ring = new THREE.Mesh(rGeom, glowMat);
      ring.position.set(x, y, z);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    };

    // Helper: spire
    const addSpire = (x, z, height, baseR) => {
      const spGeom = new THREE.ConeGeometry(baseR, height, 8);
      const sp = new THREE.Mesh(spGeom, wallMat);
      sp.position.set(x, gy + height / 2, z);
      group.add(sp);
      this.registerCollidable({ x, z }, baseR + 2);
      // Glow tip
      const tipGeom = new THREE.SphereGeometry(baseR * 0.4, 8, 8);
      const tip = new THREE.Mesh(tipGeom, glow2Mat);
      tip.position.set(0, height / 2 + baseR * 0.3, 0);
      sp.add(tip);
    };

    // Helper: arch between two points
    const addArch = (x1, z1, x2, z2, height) => {
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      const dx = x2 - x1, dz = z2 - z1;
      const span = Math.sqrt(dx * dx + dz * dz);
      const archGeom = new THREE.TorusGeometry(span / 2, 1.5, 8, 16, Math.PI);
      const arch = new THREE.Mesh(archGeom, wallMat);
      arch.position.set(mx, gy + height, mz);
      arch.rotation.y = Math.atan2(dz, dx);
      arch.rotation.z = Math.PI; // flip upwards
      arch.rotation.order = 'YXZ';
      group.add(arch);
    };

    // Helper: mushroom habitat
    const addMushroom = (x, z, stemH, capR) => {
      const stemGeom = new THREE.CylinderGeometry(capR * 0.25, capR * 0.3, stemH, 8);
      const stem = new THREE.Mesh(stemGeom, wallMat);
      stem.position.set(x, gy + stemH / 2, z);
      group.add(stem);
      const capGeom = new THREE.SphereGeometry(capR, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeom, glassMat);
      cap.position.set(x, gy + stemH, z);
      group.add(cap);
      this.registerCollidable({ x, z }, capR + 2);
    };

    // Helper: antenna array
    const addAntennaArray = (x, z, count) => {
      for (let a = 0; a < count; a++) {
        const ax = x + (a - count / 2) * 6;
        const h = 20 + rand() * 15;
        const poleGeom = new THREE.CylinderGeometry(0.4, 0.4, h, 5);
        const pole = new THREE.Mesh(poleGeom, wallMat);
        pole.position.set(ax, gy + h / 2, z);
        group.add(pole);
        const dGeom = new THREE.SphereGeometry(2.5, 10, 8, 0, Math.PI);
        const d = new THREE.Mesh(dGeom, glowMat);
        d.rotation.x = -Math.PI / 4 + rand() * 0.5;
        d.position.set(ax, gy + h + 1, z);
        group.add(d);
      }
    };

    // Helper: solar panel field
    const addSolarField = (ox, oz, rows, cols) => {
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a44, metalness: 0.8, roughness: 0.2 });
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pGeom = new THREE.BoxGeometry(5, 0.3, 3);
          const panel = new THREE.Mesh(pGeom, panelMat);
          panel.position.set(ox + c * 7, gy + 4 + Math.sin(r) * 0.5, oz + r * 5);
          panel.rotation.x = -0.4;
          group.add(panel);
          // support pole
          const sGeom = new THREE.CylinderGeometry(0.2, 0.2, 4, 4);
          const support = new THREE.Mesh(sGeom, padMat);
          support.position.set(ox + c * 7, gy + 2, oz + r * 5);
          group.add(support);
        }
      }
    };

    // Helper: pressure tunnel between two points
    const addTunnel = (x1, z1, x2, z2) => {
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const tGeom = new THREE.CylinderGeometry(2.5, 2.5, len, 8);
      tGeom.rotateZ(Math.PI / 2);
      const tunnel = new THREE.Mesh(tGeom, wallMat);
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      tunnel.position.set(mx, gy + 3, mz);
      tunnel.rotation.y = Math.atan2(dz, dx);
      group.add(tunnel);
    };

    // Pick a sub-variant for the settlement type
    const variant = Math.floor(rand() * 4);

    if (type === 'outpost') {
      if (variant === 0) {
        // Classic domes with mushroom habitats
        const count = 2 + Math.floor(rand() * 3);
        const positions = [];
        for (let i = 0; i < count; i++) {
          const angle = rand() * Math.PI * 2;
          const dist = 20 + rand() * 40;
          const x = cx + Math.cos(angle) * dist;
          const z = cz + Math.sin(angle) * dist;
          positions.push({ x, z });
          if (rand() > 0.5) {
            addMushroom(x, z, 8 + rand() * 10, 8 + rand() * 6);
          } else {
            const r = 8 + rand() * 8;
            const domeGeom = new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const dome = new THREE.Mesh(domeGeom, wallMat);
            dome.position.set(x, gy, z);
            group.add(dome);
            this.registerCollidable({ x, z }, r + 2);
          }
        }
        // Tunnels connecting adjacent domes
        for (let i = 0; i < positions.length - 1; i++) {
          addTunnel(positions[i].x, positions[i].z, positions[i + 1].x, positions[i + 1].z);
        }
        // Landing pad
        const padGeom = new THREE.CylinderGeometry(18, 18, 2, 6);
        const pad = new THREE.Mesh(padGeom, padMat);
        pad.position.set(cx, gy + 1, cz);
        group.add(pad);
        this.registerCollidable({ x: cx, z: cz }, 20);
        addAntennaArray(cx + 35, cz, 3);

      } else if (variant === 1) {
        // Spire outpost â€” a cluster of pointed towers
        const count = 3 + Math.floor(rand() * 4);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
          const dist = 15 + rand() * 35;
          const x = cx + Math.cos(angle) * dist;
          const z = cz + Math.sin(angle) * dist;
          addSpire(x, z, 20 + rand() * 40, 5 + rand() * 5);
        }
        // Central floating ring beacon
        addFloatingRing(cx, gy + 35, cz, 12, 1);
        addSolarField(cx - 30, cz + 30, 3, 4);

      } else if (variant === 2) {
        // Geodesic cluster with arches
        const count = 3 + Math.floor(rand() * 2);
        const pts = [];
        for (let i = 0; i < count; i++) {
          const angle = rand() * Math.PI * 2;
          const dist = 15 + rand() * 30;
          const x = cx + Math.cos(angle) * dist;
          const z = cz + Math.sin(angle) * dist;
          pts.push({ x, z });
          const r = 10 + rand() * 8;
          const geoGeom = new THREE.IcosahedronGeometry(r, 1);
          const geo = new THREE.Mesh(geoGeom, glassMat);
          geo.position.set(x, gy + r, z);
          group.add(geo);
          this.registerCollidable({ x, z }, r + 2);
        }
        // Connect with arches
        for (let i = 0; i < pts.length - 1; i++) {
          addArch(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z, 20 + rand() * 10);
        }
        addAntennaArray(cx - 25, cz - 20, 2);

      } else {
        // Solar farm outpost with a single watchtower
        addSolarField(cx - 20, cz - 15, 4, 6);
        // Watchtower
        const tH = 30 + rand() * 20;
        const tGeom = new THREE.CylinderGeometry(3, 4, tH, 8);
        const tower = new THREE.Mesh(tGeom, wallMat);
        tower.position.set(cx + 30, gy + tH / 2, cz + 30);
        group.add(tower);
        this.registerCollidable({ x: cx + 30, z: cz + 30 }, 6);
        // Observation deck
        const deckGeom = new THREE.CylinderGeometry(8, 6, 4, 12);
        const deck = new THREE.Mesh(deckGeom, glassMat);
        deck.position.set(0, tH / 2 + 2, 0);
        tower.add(deck);
        addFloatingRing(cx + 30, gy + tH + 8, cz + 30, 10, 0.8);
        // Small hab dome
        addMushroom(cx - 20, cz + 25, 6, 7);
      }

    } else if (type === 'base') {
      if (variant === 0) {
        // Terraced pyramid base
        const tiers = 4 + Math.floor(rand() * 3);
        const baseW = 50 + rand() * 30;
        for (let t = 0; t < tiers; t++) {
          const w = baseW - t * (baseW / tiers) * 0.7;
          const h = 8 + rand() * 6;
          const tierGeom = new THREE.BoxGeometry(w, h, w);
          const tier = new THREE.Mesh(tierGeom, wallMat);
          const yOff = t * (h + 2) + h / 2;
          tier.position.set(cx, gy + yOff, cz);
          group.add(tier);
          // Glow trim on each tier
          const trimGeom = new THREE.BoxGeometry(w + 1, 0.8, w + 1);
          const trim = new THREE.Mesh(trimGeom, glowMat);
          trim.position.set(0, h / 2 + 0.4, 0);
          tier.add(trim);
        }
        this.registerCollidable({ x: cx, z: cz }, baseW / 2 + 5);
        // Crown spire on top
        const topY = tiers * 12;
        addSpire(cx, cz, 30 + rand() * 20, 6);
        // Surrounding mushrooms
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + rand() * 0.4;
          const dist = baseW / 2 + 20 + rand() * 15;
          addMushroom(cx + Math.cos(angle) * dist, cz + Math.sin(angle) * dist, 10 + rand() * 8, 6 + rand() * 4);
        }
        // Landing pads
        for (let i = 0; i < 2; i++) {
          const angle = rand() * Math.PI * 2;
          const dist = baseW / 2 + 45 + rand() * 20;
          const px = cx + Math.cos(angle) * dist;
          const pz = cz + Math.sin(angle) * dist;
          const padGeom = new THREE.CylinderGeometry(16, 16, 2, 6);
          const pad = new THREE.Mesh(padGeom, padMat);
          pad.position.set(px, gy + 1, pz);
          group.add(pad);
          this.registerCollidable({ x: px, z: pz }, 18);
        }

      } else if (variant === 1) {
        // Reactor core base â€” central glowing cylinder with orbiting modules
        const coreR = 15 + rand() * 10;
        const coreH = 40 + rand() * 30;
        const coreGeom = new THREE.CylinderGeometry(coreR, coreR, coreH, 24);
        const coreMat = new THREE.MeshStandardMaterial({ color: pal.accent, metalness: 0.9, roughness: 0.1, emissive: pal.accent, emissiveIntensity: 0.6 });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.set(cx, gy + coreH / 2, cz);
        group.add(core);
        this.registerCollidable({ x: cx, z: cz }, coreR + 5);
        // Orbiting rings at different heights
        for (let r = 0; r < 3; r++) {
          addFloatingRing(cx, gy + coreH * 0.25 + r * coreH * 0.25, cz, coreR + 8 + r * 4, 1 + rand());
        }
        // Containment shell (wireframe-ish)
        const shellGeom = new THREE.IcosahedronGeometry(coreR + 15, 1);
        const shellMat = new THREE.MeshBasicMaterial({ color: pal.glow, wireframe: true, transparent: true, opacity: 0.3 });
        const shell = new THREE.Mesh(shellGeom, shellMat);
        shell.position.set(cx, gy + coreH / 2, cz);
        group.add(shell);
        // Hab blocks around the perimeter
        const blockCount = 6 + Math.floor(rand() * 4);
        for (let i = 0; i < blockCount; i++) {
          const angle = (i / blockCount) * Math.PI * 2;
          const dist = coreR + 30 + rand() * 20;
          const bx = cx + Math.cos(angle) * dist;
          const bz = cz + Math.sin(angle) * dist;
          const bw = 8 + rand() * 8;
          const bh = 8 + rand() * 12;
          const bd = 8 + rand() * 8;
          const bGeom = new THREE.BoxGeometry(bw, bh, bd);
          const block = new THREE.Mesh(bGeom, wallMat);
          block.position.set(bx, gy + bh / 2, bz);
          group.add(block);
          this.registerCollidable({ x: bx, z: bz }, Math.max(bw, bd) / 2 + 2);
          // Glow window
          const wGeom = new THREE.BoxGeometry(bw * 0.8, bh * 0.3, 0.5);
          const win = new THREE.Mesh(wGeom, glowMat);
          win.position.set(0, bh * 0.1, bd / 2 + 0.3);
          block.add(win);
        }

      } else if (variant === 2) {
        // Bio-dome research base â€” large transparent domes with greenhouses
        const mainR = 30 + rand() * 15;
        const mainGeom = new THREE.SphereGeometry(mainR, 24, 16);
        const mainDome = new THREE.Mesh(mainGeom, glassMat);
        mainDome.position.set(cx, gy + mainR * 0.7, cz);
        group.add(mainDome);
        this.registerCollidable({ x: cx, z: cz }, mainR + 3);
        // Inner structure visible through glass
        const innerGeom = new THREE.CylinderGeometry(mainR * 0.6, mainR * 0.6, mainR * 0.8, 12);
        const inner = new THREE.Mesh(innerGeom, wallMat);
        inner.position.set(cx, gy + mainR * 0.4, cz);
        group.add(inner);
        // Greenhouse tubes radiating out
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + rand() * 0.3;
          const len = 30 + rand() * 20;
          const ex = cx + Math.cos(angle) * (mainR + len / 2 + 5);
          const ez = cz + Math.sin(angle) * (mainR + len / 2 + 5);
          const tGeom = new THREE.CylinderGeometry(4, 4, len, 8);
          tGeom.rotateZ(Math.PI / 2);
          const tube = new THREE.Mesh(tGeom, glassMat);
          tube.position.set(ex, gy + 5, ez);
          tube.rotation.y = angle;
          group.add(tube);
          // End cap dome
          const capR = 8 + rand() * 5;
          const capX = cx + Math.cos(angle) * (mainR + len + 8);
          const capZ = cz + Math.sin(angle) * (mainR + len + 8);
          addMushroom(capX, capZ, 4, capR);
        }
        addAntennaArray(cx + mainR + 20, cz - 15, 4);

      } else {
        // Industrial base â€” tall chimneys, storage tanks, cranes
        const centralH = 25 + rand() * 15;
        const centralR = 20 + rand() * 10;
        const centralGeom = new THREE.CylinderGeometry(centralR, centralR + 5, centralH, 16);
        const central = new THREE.Mesh(centralGeom, wallMat);
        central.position.set(cx, gy + centralH / 2, cz);
        group.add(central);
        this.registerCollidable({ x: cx, z: cz }, centralR + 7);
        // Smokestacks
        for (let i = 0; i < 3; i++) {
          const sx = cx + (i - 1) * 15;
          const sz = cz - centralR - 10;
          const sh = 40 + rand() * 30;
          const sGeom = new THREE.CylinderGeometry(2, 3, sh, 8);
          const stack = new THREE.Mesh(sGeom, padMat);
          stack.position.set(sx, gy + sh / 2, sz);
          group.add(stack);
          this.registerCollidable({ x: sx, z: sz }, 5);
          // Glow top (exhaust)
          const eGeom = new THREE.SphereGeometry(3, 8, 8);
          const exhaust = new THREE.Mesh(eGeom, glow2Mat);
          exhaust.position.set(0, sh / 2 + 1, 0);
          stack.add(exhaust);
        }
        // Storage spheres
        for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
          const angle = rand() * Math.PI * 2;
          const dist = centralR + 25 + rand() * 15;
          const tx = cx + Math.cos(angle) * dist;
          const tz = cz + Math.sin(angle) * dist;
          const tr = 8 + rand() * 6;
          const tGeom = new THREE.SphereGeometry(tr, 14, 10);
          const tank = new THREE.Mesh(tGeom, wallMat);
          tank.position.set(tx, gy + tr, tz);
          group.add(tank);
          this.registerCollidable({ x: tx, z: tz }, tr + 2);
          // Support ring
          addFloatingRing(tx, gy + tr * 0.5, tz, tr + 2, 0.6);
        }
        // Crane
        const craneH = 50 + rand() * 20;
        const craneX = cx + centralR + 30;
        const craneZ = cz;
        const cranePole = new THREE.CylinderGeometry(1.5, 2, craneH, 6);
        const pole = new THREE.Mesh(cranePole, padMat);
        pole.position.set(craneX, gy + craneH / 2, craneZ);
        group.add(pole);
        const armGeom = new THREE.BoxGeometry(40, 2, 2);
        const arm = new THREE.Mesh(armGeom, wallMat);
        arm.position.set(craneX, gy + craneH, craneZ);
        group.add(arm);
        // Landing pad
        const padGeom = new THREE.CylinderGeometry(18, 18, 2, 6);
        const pad = new THREE.Mesh(padGeom, padMat);
        pad.position.set(cx - centralR - 30, gy + 1, cz + 20);
        group.add(pad);
        this.registerCollidable({ x: cx - centralR - 30, z: cz + 20 }, 20);
      }

    } else {
      // ==== CITY â€” the wildest part ====
      const cityRadius = 150 + rand() * 120;
      const towerCount = 10 + Math.floor(rand() * 12);

      // Pick a city architectural style
      const cityStyle = Math.floor(rand() * 4);

      // Tower generation
      const towerPositions = [];
      for (let i = 0; i < towerCount; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = 30 + rand() * cityRadius;
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;
        towerPositions.push({ x, z });

        const coreFactor = 1 - dist / (cityRadius + 30);
        const h = 50 + coreFactor * 200 + rand() * 80;
        const w = 10 + rand() * 16;
        const d = 10 + rand() * 16;

        const towerShape = Math.floor(rand() * 6);

        if (towerShape === 0) {
          // Twisted tower
          makeTwistedTower(x, z, w, h, d, 0.08 + rand() * 0.15);
        } else if (towerShape === 1) {
          // Tapered tower (wider at base)
          const tGeom = new THREE.CylinderGeometry(w * 0.3, w * 0.7, h, 8 + Math.floor(rand() * 8));
          const tower = new THREE.Mesh(tGeom, wallMat);
          tower.position.set(x, gy + h / 2, z);
          group.add(tower);
          this.registerCollidable({ x, z }, w * 0.7 + 2);
          // Balcony rings
          const rings = 2 + Math.floor(rand() * 3);
          for (let r = 0; r < rings; r++) {
            const rY = h * (0.3 + r * 0.2);
            const rR = w * (0.7 - r * 0.08);
            addFloatingRing(x, gy + rY, z, rR + 3, 0.8);
          }
        } else if (towerShape === 2) {
          // Crystal shard â€” tilted octahedron
          const crystalGeom = new THREE.OctahedronGeometry(w * 0.7, 0);
          const crystalMat = new THREE.MeshStandardMaterial({ color: pal.accent, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.7 });
          const crystal = new THREE.Mesh(crystalGeom, crystalMat);
          crystal.scale.set(1, h / (w * 1.4), 1);
          crystal.position.set(x, gy + h / 2, z);
          crystal.rotation.z = (rand() - 0.5) * 0.15;
          crystal.rotation.x = (rand() - 0.5) * 0.15;
          group.add(crystal);
          this.registerCollidable({ x, z }, w * 0.7 + 2);
        } else if (towerShape === 3) {
          // Stacked cylinders of decreasing radius
          const stacks = 3 + Math.floor(rand() * 4);
          let curR = w * 0.6;
          let curY = gy;
          for (let st = 0; st < stacks; st++) {
            const sH = h / stacks + rand() * 5;
            const sGeom = new THREE.CylinderGeometry(curR * 0.85, curR, sH, 12);
            const seg = new THREE.Mesh(sGeom, wallMat);
            seg.position.set(x, curY + sH / 2, z);
            group.add(seg);
            // Glow band between stacks
            if (st > 0) {
              const bandGeom = new THREE.TorusGeometry(curR + 1, 0.5, 6, 16);
              const band = new THREE.Mesh(bandGeom, glowMat);
              band.position.set(x, curY + 0.5, z);
              band.rotation.x = Math.PI / 2;
              group.add(band);
            }
            curY += sH;
            curR *= 0.85;
          }
          this.registerCollidable({ x, z }, w * 0.6 + 2);
        } else if (towerShape === 4) {
          // Dome-topped slab
          const slabGeom = new THREE.BoxGeometry(w, h * 0.75, d);
          const slab = new THREE.Mesh(slabGeom, wallMat);
          slab.position.set(x, gy + h * 0.375, z);
          group.add(slab);
          const domeR = Math.min(w, d) * 0.6;
          const dtGeom = new THREE.SphereGeometry(domeR, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
          const dt = new THREE.Mesh(dtGeom, glassMat);
          dt.position.set(x, gy + h * 0.75, z);
          group.add(dt);
          this.registerCollidable({ x, z }, Math.max(w, d) / 2 + 2);
          // Window grid
          const winRows = 3 + Math.floor(rand() * 4);
          for (let wr = 0; wr < winRows; wr++) {
            const wGeom = new THREE.BoxGeometry(w * 0.85, h * 0.06, 0.5);
            const win = new THREE.Mesh(wGeom, glowMat);
            win.position.set(0, -h * 0.3 + wr * (h * 0.17), d / 2 + 0.3);
            slab.add(win);
          }
        } else {
          // Classic box tower with neon edges and beacon
          const towerGeom = new THREE.BoxGeometry(w, h, d);
          const tower = new THREE.Mesh(towerGeom, wallMat);
          tower.position.set(x, gy + h / 2, z);
          group.add(tower);
          this.registerCollidable({ x, z }, Math.max(w, d) / 2 + 2);
          // Neon edges â€” random accent
          for (let e = 0; e < 4; e++) {
            const eGeom = new THREE.BoxGeometry(0.6, h, 0.6);
            const edge = new THREE.Mesh(eGeom, rand() > 0.5 ? glowMat : glow2Mat);
            const sx = (e % 2 === 0 ? 1 : -1) * (w / 2 + 0.4);
            const sz = (e < 2 ? 1 : -1) * (d / 2 + 0.4);
            edge.position.set(sx, 0, sz);
            tower.add(edge);
          }
          // Roof beacon
          const beaconGeom = new THREE.SphereGeometry(2, 8, 8);
          const beacon = new THREE.Mesh(beaconGeom, new THREE.MeshBasicMaterial({ color: pal.beacon }));
          beacon.position.set(0, h / 2 + 2, 0);
          tower.add(beacon);
        }
      }

      // Skybridges between nearby towers
      for (let i = 0; i < towerPositions.length; i++) {
        for (let j = i + 1; j < towerPositions.length; j++) {
          const a = towerPositions[i], b = towerPositions[j];
          const dx = a.x - b.x, dz = a.z - b.z;
          const bridgeDist = Math.sqrt(dx * dx + dz * dz);
          if (bridgeDist < 80 && rand() > 0.4) {
            const bridgeH = 25 + rand() * 60;
            const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
            const bGeom = new THREE.BoxGeometry(bridgeDist, 2, 3);
            const bridge = new THREE.Mesh(bGeom, wallMat);
            bridge.position.set(mx, gy + bridgeH, mz);
            bridge.rotation.y = Math.atan2(b.z - a.z, b.x - a.x);
            group.add(bridge);
          }
        }
      }

      // Flagship tower
      const flagH = 400 + rand() * 300;
      const flagW = 25 + rand() * 20;
      const flagStyle = Math.floor(rand() * 3);
      const flagMat = new THREE.MeshStandardMaterial({
        color: 0xf0f4ff, metalness: 1.0, roughness: 0.1,
        emissive: pal.emissive, emissiveIntensity: 0.5
      });

      if (flagStyle === 0) {
        // Twisted flagship
        makeTwistedTower(cx, cz, flagW, flagH, flagW, 0.06 + rand() * 0.08);
        // Override material on flagship segments â€” re-add glow
        addFloatingRing(cx, gy + flagH * 0.5, cz, flagW + 10, 2);
        addFloatingRing(cx, gy + flagH * 0.75, cz, flagW + 6, 1.5);
        addFloatingRing(cx, gy + flagH * 0.95, cz, flagW + 3, 1.2);
      } else if (flagStyle === 1) {
        // Obelisk â€” tapered with a pointed crown
        const obGeom = new THREE.CylinderGeometry(flagW * 0.15, flagW * 0.55, flagH, 6);
        const ob = new THREE.Mesh(obGeom, flagMat);
        ob.position.set(cx, gy + flagH / 2, cz);
        group.add(ob);
        this.registerCollidable({ x: cx, z: cz }, flagW * 0.55 + 5);
        // Crown spire
        const spH = flagH * 0.15;
        const spGeom = new THREE.ConeGeometry(flagW * 0.2, spH, 6);
        const spire = new THREE.Mesh(spGeom, new THREE.MeshBasicMaterial({ color: pal.glow }));
        spire.position.set(0, flagH / 2 + spH / 2, 0);
        ob.add(spire);
        // Orbiting rings
        for (let r = 0; r < 4; r++) {
          addFloatingRing(cx, gy + flagH * (0.2 + r * 0.2), cz, flagW * 0.6 + r * 3, 1.2);
        }
      } else {
        // Classic flagship with crown
        const flagGeom = new THREE.BoxGeometry(flagW, flagH, flagW);
        const flagship = new THREE.Mesh(flagGeom, flagMat);
        flagship.position.set(cx, gy + flagH / 2, cz);
        group.add(flagship);
        this.registerCollidable({ x: cx, z: cz }, flagW / 2 + 5);
        // Crown ring
        const crownGeom = new THREE.TorusGeometry(flagW * 0.8, 1.5, 12, 32);
        const crown = new THREE.Mesh(crownGeom, glowMat);
        crown.position.set(0, flagH / 2 - 30, 0);
        crown.rotation.x = Math.PI / 2;
        flagship.add(crown);
        // Neon stripes up the side
        for (let ns = 0; ns < 6; ns++) {
          const nsGeom = new THREE.BoxGeometry(0.8, flagH * 0.15, 0.8);
          const stripe = new THREE.Mesh(nsGeom, ns % 2 === 0 ? glowMat : glow2Mat);
          stripe.position.set(flagW / 2 + 0.5, -flagH / 2 + ns * flagH * 0.17 + flagH * 0.1, 0);
          flagship.add(stripe);
        }
      }

      // Decorative mega-arches at city entrances
      const archCount = 2 + Math.floor(rand() * 2);
      for (let a = 0; a < archCount; a++) {
        const angle = (a / archCount) * Math.PI * 2 + rand() * 0.5;
        const dist = cityRadius * 0.8;
        const ax1 = cx + Math.cos(angle) * dist - Math.sin(angle) * 20;
        const az1 = cz + Math.sin(angle) * dist + Math.cos(angle) * 20;
        const ax2 = cx + Math.cos(angle) * dist + Math.sin(angle) * 20;
        const az2 = cz + Math.sin(angle) * dist - Math.cos(angle) * 20;
        addArch(ax1, az1, ax2, az2, 40 + rand() * 30);
      }

      // Scattered ground-level decorations: crates, tanks, debris
      const decoCount = 8 + Math.floor(rand() * 10);
      for (let dec = 0; dec < decoCount; dec++) {
        const angle = rand() * Math.PI * 2;
        const dist = 40 + rand() * cityRadius;
        const dx = cx + Math.cos(angle) * dist;
        const dz = cz + Math.sin(angle) * dist;
        const decoType = Math.floor(rand() * 3);
        if (decoType === 0) {
          // Crate
          const cw = 2 + rand() * 4;
          const cGeom = new THREE.BoxGeometry(cw, cw, cw);
          const crate = new THREE.Mesh(cGeom, padMat);
          crate.position.set(dx, gy + cw / 2, dz);
          crate.rotation.y = rand() * Math.PI;
          group.add(crate);
        } else if (decoType === 1) {
          // Barrel/tank
          const bGeom = new THREE.CylinderGeometry(1.5, 1.5, 3 + rand() * 2, 8);
          const barrel = new THREE.Mesh(bGeom, wallMat);
          barrel.position.set(dx, gy + 2, dz);
          group.add(barrel);
        } else {
          // Glowing ground marker
          const mGeom = new THREE.RingGeometry(1, 3, 16);
          const marker = new THREE.Mesh(mGeom, glow2Mat);
          marker.position.set(dx, gy + 0.2, dz);
          marker.rotation.x = -Math.PI / 2;
          group.add(marker);
        }
      }

      // Single ambient light for the city
      const cityLight = new THREE.PointLight(pal.accent, 1.5, 900);
      cityLight.position.set(cx, gy + flagH * 0.4, cz);
      group.add(cityLight);
    }

    return group;
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

    // Shared timestamp for all time-based systems in this manager
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    // Update animated beacons, reactor rings, etc.
    this.updateAnimations(now);

    // Continuous rocket traffic around the colony
    this.updateRocketTraffic(now);

    // Ground traffic (AI mining convoys / colony vehicles)
    this.updateTraffic(now);

    // High-speed bullet train between the two colonies
    this.updateBulletTrain(now);

    // Procedural settlements â€” spawn/despawn based on proximity
    this.updateSettlements(playerPosition);
  }

  // Check if the player has reached the next guided-route waypoint
  updateGuidedRoute(playerPosition) {
    if (!this.guidedRouteWaypoints || this.guidedRouteWaypoints.length === 0) return;

    const idx = this.currentWaypointIndex;
    if (idx >= this.guidedRouteWaypoints.length) return;

    const wp = this.guidedRouteWaypoints[idx];
    if (!wp) return;

    const dist = playerPosition.distanceTo(wp.position);
    if (dist < 30) {
      // Mark this waypoint as reached
      this.currentWaypointIndex++;

      // Optionally dim the beacon once reached
      if (wp.group) {
        wp.group.traverse(obj => {
          if (obj.isPointLight) obj.intensity = 0.4;
        });
      }

      // Expose simple progress for HUD or notifications
      window.guidedRouteProgress = {
        reached: this.currentWaypointIndex,
        total: this.guidedRouteWaypoints.length
      };
    }
  }

  // Animate AI ground traffic along predefined routes
  updateTraffic(currentTime) {
    if (!this.aiVehicles || this.aiVehicles.length === 0) return;
    if (!this.aiRoutes || this.aiRoutes.length === 0) return;

    // Throttle updates to avoid excessive work
    if (this.lastTrafficUpdateTime == null) {
      this.lastTrafficUpdateTime = currentTime;
      return;
    }

    const deltaMs = currentTime - this.lastTrafficUpdateTime;
    if (deltaMs <= 5) return; // too soon

    this.lastTrafficUpdateTime = currentTime;
    const dt = Math.min(deltaMs, 100) / 1000; // clamp to avoid huge jumps

    for (const vehicle of this.aiVehicles) {
      const route = this.aiRoutes[vehicle.routeIndex];
      if (!route || !route.waypoints || route.waypoints.length < 2) continue;

      const points = route.waypoints;
      let i = vehicle.segmentIndex;
      i = Math.max(0, Math.min(points.length - 2, i));

      // Advance along the current segment based on speed
      let a = points[i];
      let b = points[i + 1];
      const segVec = new THREE.Vector3().subVectors(b, a);
      const segLen = segVec.length() || 1;

      const distanceThisFrame = vehicle.speed * dt * vehicle.directionSign;
      const deltaT = distanceThisFrame / segLen;
      let t = (vehicle.segmentT || 0) + deltaT;

      // Handle reaching segment ends with simple ping-pong behaviour
      while (t > 1 || t < 0) {
        if (t > 1) {
          if (vehicle.directionSign > 0 && i < points.length - 2) {
            t -= 1;
            i++;
          } else {
            vehicle.directionSign = -1;
            t = 1 - (t - 1);
          }
        } else if (t < 0) {
          if (vehicle.directionSign < 0 && i > 0) {
            t += 1;
            i--;
          } else {
            vehicle.directionSign = 1;
            t = -t;
          }
        }

        i = Math.max(0, Math.min(points.length - 2, i));
      }

      vehicle.segmentIndex = i;
      vehicle.segmentT = t;

      a = points[i];
      b = points[i + 1];

      // Interpolate position between waypoints (includes terrain height from route creation)
      const pos = new THREE.Vector3().copy(a).lerp(b, t);
      if (vehicle.mesh) {
        vehicle.mesh.position.copy(pos);

        // Orient vehicle to face along its path
        const dir = new THREE.Vector3().subVectors(b, a).multiplyScalar(vehicle.directionSign);
        if (dir.lengthSq() > 0.0001) {
          const yaw = Math.atan2(dir.x, dir.z);
          vehicle.mesh.rotation.y = yaw;
        }
      }
    }
  }

  // Create elevated rail and a bullet train between the primary and secondary colonies
  createBulletTrainSystem() {
    try {
      const perfSettings = getPerformanceSettings();
      if (perfSettings.isMobile) return;
      if (!this.colonyCenter || !this.secondaryColonyCenter) return;

      const start = this.colonyCenter.clone();
      const end = this.secondaryColonyCenter.clone();

      // Elevate the track above the terrain
      const startY = this.getTerrainHeight(start.x, start.z) + 45;
      const endY = this.getTerrainHeight(end.x, end.z) + 45;
      start.y = startY;
      end.y = endY;

      // Build elevated pylons along the route (reduced for performance)
      const segmentCount = 12;
      const pylonGeometry = new THREE.CylinderGeometry(2, 3, 1, 10);
      const pylonMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.4,
        metalness: 0.8
      });

      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const pos = new THREE.Vector3().lerpVectors(start, end, t);
        const groundY = this.getTerrainHeight(pos.x, pos.z);
        const height = Math.max(20, pos.y - groundY);

        const pylon = new THREE.Mesh(pylonGeometry, pylonMaterial);
        pylon.scale.y = height / 1; // base height is 1
        pylon.position.set(pos.x, groundY + height / 2, pos.z);
        this.scene.add(pylon);
      }

      // Create the elevated rail deck as a long, sleek beam
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      direction.normalize();

      const deckGeometry = new THREE.BoxGeometry(8, 1.2, length);
      const deckMaterial = new THREE.MeshStandardMaterial({
        color: 0xccccdd,
        roughness: 0.2,
        metalness: 0.9
      });
      const deck = new THREE.Mesh(deckGeometry, deckMaterial);

      const deckGroup = new THREE.Group();
      deckGroup.add(deck);

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      deckGroup.position.copy(mid);

      const yaw = Math.atan2(end.x - start.x, end.z - start.z);
      deckGroup.rotation.y = yaw;

      this.scene.add(deckGroup);

      const train = this.createBulletTrainMesh();

      // Initial placement at the primary colony side of the track
      const initialPos = start.clone();
      train.position.copy(initialPos);
      train.rotation.y = yaw;
      this.scene.add(train);

      if (!this.bulletTrains) {
        this.bulletTrains = [];
      }
      this.bulletTrains.push({
        mesh: train,
        start,
        end,
        yaw,
        t: 0,
        direction: 1,
        speed: 0.06, // fraction of the route per second
        lastTime: null
      });

      console.log('ðŸš„ Bullet train system created between colonies');
    } catch (e) {
      console.warn('Failed to create bullet train system:', e);
    }
  }

  createOptimusRobot(scale = 1) {
    const robot = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.65, roughness: 0.25 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x11151a, metalness: 0.6, roughness: 0.35 });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x66bbff,
      emissive: 0x1166cc,
      emissiveIntensity: 0.7,
      metalness: 0.35,
      roughness: 0.25
    });

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), blackMat);
    pelvis.position.y = 0.74;
    robot.add(pelvis);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.30), whiteMat);
    torso.position.y = 1.20;
    robot.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.035), blueMat);
    chest.position.set(0, 1.34, 0.17);
    robot.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 0.28), whiteMat);
    head.position.y = 1.72;
    robot.add(head);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.035), blackMat);
    face.position.set(0, 1.72, 0.16);
    robot.add(face);

    const antennaGeom = new THREE.BoxGeometry(0.035, 0.18, 0.035);
    const leftAntenna = new THREE.Mesh(antennaGeom, whiteMat);
    leftAntenna.position.set(-0.14, 1.96, 0);
    robot.add(leftAntenna);
    const rightAntenna = leftAntenna.clone();
    rightAntenna.position.x = 0.14;
    robot.add(rightAntenna);

    const limbMat = whiteMat;
    const armGeom = new THREE.BoxGeometry(0.16, 0.58, 0.18);
    const leftArm = new THREE.Mesh(armGeom, limbMat);
    leftArm.position.set(-0.46, 1.13, 0);
    leftArm.rotation.z = -0.16;
    robot.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.46;
    rightArm.rotation.z = 0.16;
    robot.add(rightArm);

    const legGeom = new THREE.BoxGeometry(0.18, 0.70, 0.20);
    const leftLeg = new THREE.Mesh(legGeom, limbMat);
    leftLeg.position.set(-0.17, 0.36, 0);
    robot.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.17;
    robot.add(rightLeg);

    const footGeom = new THREE.BoxGeometry(0.24, 0.12, 0.36);
    const leftFoot = new THREE.Mesh(footGeom, blackMat);
    leftFoot.position.set(-0.17, -0.03, 0.06);
    robot.add(leftFoot);
    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.17;
    robot.add(rightFoot);

    robot.scale.set(scale, scale, scale);
    return robot;
  }

  // Build a 4-car high-speed train that carries Optimus-style robots
  createBulletTrainMesh() {
    const train = new THREE.Group();

    const carCount = 4;
    const carLength = 12;
    const carWidth = 3.4;
    const carHeight = 3;
    const carGap = 0.9;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      metalness: 0.7,
      roughness: 0.25
    });
    const noseGeom = new THREE.ConeGeometry(2.2, 5, 16);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xddddff,
      metalness: 0.8,
      roughness: 0.2
    });
    const windowGeom = new THREE.BoxGeometry(0.25, 1.1, carLength * 0.78);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      emissive: 0x3388ff,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.9
    });
    const lightStripGeom = new THREE.BoxGeometry(0.3, 0.3, 3.5);
    const lightStripMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.35
    });
    const totalTrainLength = carCount * carLength + (carCount - 1) * carGap;
    const trainOriginOffset = -totalTrainLength / 2 + carLength / 2;

    for (let i = 0; i < carCount; i++) {
      const isEngine = i === 0;
      const car = new THREE.Group();

      const bodyGeom = new THREE.BoxGeometry(carWidth, carHeight, carLength);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 2;
      car.add(body);

      // Side windows on both sides so you glimpse interior robots
      const windowsFrontSide = new THREE.Mesh(windowGeom, windowMat);
      windowsFrontSide.position.set((carWidth / 2) - 0.45, 2.6, 0);
      car.add(windowsFrontSide);

      const windowsBackSide = windowsFrontSide.clone();
      windowsBackSide.position.x = -windowsFrontSide.position.x;
      car.add(windowsBackSide);

      // Interior Optimus robots as small humanoid silhouettes.
      const robotsPerCar = 3;
      for (let j = 0; j < robotsPerCar; j++) {
        const optimus = this.createOptimusRobot(0.72);
        const zSpan = carLength * 0.6;
        const localZ = -zSpan / 2 + (zSpan / (robotsPerCar - 1 || 1)) * j;
        optimus.position.set(0, 1.36, localZ);
        optimus.rotation.y = j % 2 === 0 ? 0.15 : -0.15;
        car.add(optimus);
      }

      if (isEngine) {
        // Streamlined nose and headlights on the leading car
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 2.0, -carLength / 2 - 2.3);
        car.add(nose);

        const frontStrip = new THREE.Mesh(lightStripGeom, lightStripMat);
        frontStrip.position.set(0, 2.4, -carLength / 2 - 1.6);
        car.add(frontStrip);

        const headLight = new THREE.PointLight(0xffffff, 1.7, 140);
        headLight.position.set(0, 2.4, -carLength / 2 - 1.9);
        car.add(headLight);
      }

      const offsetZ = trainOriginOffset + i * (carLength + carGap);
      car.position.z = offsetZ;
      train.add(car);
    }

    return train;
  }

  // Animate bullet train along its elevated track
  updateBulletTrain(currentTime) {
    if (!this.bulletTrains || this.bulletTrains.length === 0) return;

    this.bulletTrains.forEach(train => {
      if (!train.mesh) return;

      if (train.lastTime == null) {
        train.lastTime = currentTime;
        return;
      }

      const deltaMs = currentTime - train.lastTime;
      if (deltaMs <= 5) return;

      train.lastTime = currentTime;
      const dt = Math.min(deltaMs, 120) / 1000; // clamp

      let t = train.t + train.speed * dt * train.direction;

      // Ping-pong between endpoints
      if (t > 1) {
        t = 1 - (t - 1);
        train.direction = -1;
      } else if (t < 0) {
        t = -t;
        train.direction = 1;
      }

      train.t = t;

      const pos = new THREE.Vector3().lerpVectors(train.start, train.end, t);
      train.mesh.position.copy(pos);

      // Flip heading when changing direction so the nose always points forward
      const baseYaw = train.yaw;
      train.mesh.rotation.y = baseYaw + (train.direction < 0 ? Math.PI : 0);
    });
  }

  // Simple time-based rocket launch/arrival cycles using the pre-created rockets
  updateRocketTraffic(currentTime) {
    if (!this.rocketTrafficEnabled || !this.rockets || this.rockets.length === 0) return;

    const cycle = this.rocketCycleDuration || 60000;
    const baseTime = (currentTime - this.rocketSystemStartTime) % cycle;
    const tGlobal = baseTime / cycle; // 0..1 over one minute

    this.rockets.forEach(rocketInfo => {
      const { mesh, padY, phaseOffset, maxHeight } = rocketInfo;
      if (!mesh) return;

      // Each rocket runs through a full launch + cruise + landing every cycle,
      // staggered by phaseOffset so there's always traffic.
      let t = (tGlobal + phaseOffset) % 1;

      // Timeline with 10-second pauses:
      // 0.0 - 0.17: Grounded before launch (10s pause at 60s cycle)
      // 0.17 - 0.35: Launch (ascending)
      // 0.35 - 0.65: Cruise (coasting high)
      // 0.65 - 0.83: Landing (descending)
      // 0.83 - 1.0: Grounded after landing (10s pause)
      
      let height;
      let isLaunching = false;
      let isLanding = false;
      
      if (t < 0.17) {
        // Grounded before launch - 10 second pause
        height = 0;
      } else if (t < 0.35) {
        // Launch phase
        isLaunching = true;
        const local = (t - 0.17) / 0.18;
        // Ease out for powerful start, then gradual acceleration
        const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
        height = maxHeight * eased;
      } else if (t < 0.65) {
        // Cruise phase
        height = maxHeight;
      } else if (t < 0.83) {
        // Landing phase
        isLanding = true;
        const local = (t - 0.65) / 0.18;
        // Ease in for controlled descent
        const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
        height = maxHeight * (1 - eased);
      } else {
        // Grounded after landing - 10 second pause
        height = 0;
      }

      mesh.visible = true;
      mesh.position.y = padY + height;

      // Gentle roll during flight
      if (height > 20) {
        mesh.rotation.z = Math.sin(t * Math.PI * 4) * 0.06;
      } else {
        mesh.rotation.z = 0;
      }

      // Animate exhaust particles with BIGGER effect during launch/landing
      if (mesh.userData && typeof mesh.userData.animateParticles === 'function') {
        if (isLaunching || isLanding || height < 50) {
          mesh.userData.animateParticles();
          // Intensify effects during initial blast-off
          if (isLaunching && height < maxHeight * 0.3) {
            mesh.userData.animateParticles(); // Call twice for double intensity
          }
        }
      }
      
      // Control exhaust visibility and intensity
      if (mesh.userData.exhaustCone) {
        if (isLaunching && height < maxHeight * 0.4) {
          // BIG blast-off effect
          mesh.userData.exhaustCone.visible = true;
          mesh.userData.exhaustCone.scale.set(2.5, 2.5, 2.5);
          if (mesh.userData.exhaustGlow) {
            mesh.userData.exhaustGlow.visible = true;
            mesh.userData.exhaustGlow.scale.set(2.5, 2.5, 2.5);
          }
          if (mesh.userData.engineLight) {
            mesh.userData.engineLight.intensity = 4;
          }
        } else if (isLanding && height < maxHeight * 0.3) {
          // Landing burn
          mesh.userData.exhaustCone.visible = true;
          mesh.userData.exhaustCone.scale.set(1.5, 1.5, 1.5);
          if (mesh.userData.exhaustGlow) {
            mesh.userData.exhaustGlow.visible = true;
            mesh.userData.exhaustGlow.scale.set(1.5, 1.5, 1.5);
          }
          if (mesh.userData.engineLight) {
            mesh.userData.engineLight.intensity = 2;
          }
        } else if (height > 50) {
          // In flight - minimal exhaust
          mesh.userData.exhaustCone.visible = false;
          if (mesh.userData.exhaustGlow) {
            mesh.userData.exhaustGlow.visible = false;
          }
          if (mesh.userData.engineLight) {
            mesh.userData.engineLight.intensity = 0.5;
          }
        } else {
          // Grounded - no exhaust
          mesh.userData.exhaustCone.visible = false;
          if (mesh.userData.exhaustGlow) {
            mesh.userData.exhaustGlow.visible = false;
          }
          if (mesh.userData.engineLight) {
            mesh.userData.engineLight.intensity = 0;
          }
        }
      }
    });
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
    // Create BIG engine exhaust cone
    const exhaustGeometry = new THREE.ConeGeometry(8, 35, 16);
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.position.y = -50;
    exhaust.rotation.x = Math.PI;
    rocket.add(exhaust);
    rocket.userData.exhaustCone = exhaust; // Store reference for dynamic control

    // Add BIGGER engine glow sphere
    const glowGeometry = new THREE.SphereGeometry(15, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = -45;
    rocket.add(glow);
    rocket.userData.exhaustGlow = glow; // Store reference

    // Add BRIGHTER point light for engine
    const engineLight = new THREE.PointLight(0xff4400, 4, 150);
    engineLight.position.y = -45;
    rocket.add(engineLight);
    rocket.userData.engineLight = engineLight; // Store reference

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

  // Create a lightweight Starship-like rocket for colony traffic
  createSimpleRocket() {
    const rocketGroup = new THREE.Group();

    // Main body - BIGGER
    const bodyGeometry = new THREE.CylinderGeometry(9, 9, 90, 24);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6e6e6,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 45; // base at y=0
    body.castShadow = true;
    body.receiveShadow = true;

    // Nose - BIGGER
    const noseGeometry = new THREE.ConeGeometry(9, 22, 24);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.y = 101;
    nose.castShadow = true;

    // Simple fins - BIGGER
    const finGeometry = new THREE.BoxGeometry(4, 14, 14);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      metalness: 0.7,
      roughness: 0.25
    });
    const finOffsets = [
      new THREE.Vector3(0, 18, 12),
      new THREE.Vector3(0, 18, -12),
      new THREE.Vector3(12, 18, 0),
      new THREE.Vector3(-12, 18, 0)
    ];
    finOffsets.forEach(offset => {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      fin.position.copy(offset);
      fin.castShadow = true;
      rocketGroup.add(fin);
    });

    rocketGroup.add(body, nose);
    rocketGroup.castShadow = true;

    return rocketGroup;
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

// Add a day/night toggle and cycle (isDaytime declared at top of file)
console.log("Initial day/night state:", isDaytime ? "DAY" : "NIGHT");

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
  const frameScale = Math.min(delta / 16.67, 2.5);

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

    // Dev road/vehicle debug visuals (cheap when off, throttled when on)
    if (window.showRoadDebug && window.marsSceneManager && frameCount % 6 === 0) {
      if (typeof updateRoadDebugVisuals === 'function') {
        updateRoadDebugVisuals();
      }
    }
  }

  // Rover Movement
  isMoving = false;
  currentSpeed = 0; // Reset current speed

  // Store previous position before moving
  previousPosition.copy(rover.position);

  // Smooth acceleration/deceleration physics
  if (keys.w) {
    const accel = velocity < 0 ? DECELERATION : ACCELERATION;
    velocity = Math.min(velocity + accel * frameScale, MAX_SPEED);
  } else if (keys.s) {
    const accel = velocity > 0 ? DECELERATION : ACCELERATION;
    velocity = Math.max(velocity - accel * frameScale, -MAX_SPEED * REVERSE_SPEED_FACTOR);
  } else {
    // Coast to a stop when no key held
    if (velocity > 0) {
      velocity = Math.max(velocity - COAST_DECEL * frameScale, 0);
    } else if (velocity < 0) {
      velocity = Math.min(velocity + COAST_DECEL * frameScale, 0);
    }
  }

  if (Math.abs(velocity) > 0.0005) {
    isMoving = true;
    // Forward is negative Z in Three.js â€” negate velocity to match original convention
    const frameVelocity = velocity * frameScale;
    const moveX = Math.sin(roverYaw) * (-frameVelocity);
    const moveZ = Math.cos(roverYaw) * (-frameVelocity);

    rover.position.x += moveX;
    rover.position.z += moveZ;

    // Collision detection â€” revert if the rover hits a structure
    if (window.marsSceneManager &&
        window.marsSceneManager.checkCollision(rover.position.x, rover.position.z, 2.5)) {
      rover.position.x = previousPosition.x;
      rover.position.z = previousPosition.z;
      velocity *= -0.3; // slight bounce-back on collision
      isMoving = false;
    }

    // Position rover on terrain after movement
    positionRoverOnTerrain();

    // Set current speed based on velocity (positive = forward)
    currentSpeed = velocity;
  } else {
    velocity = 0;
  }

  // Update Game Systems
  updateGameSystems(time, delta);

  // Update guided driving route progress if available
  if (window.marsSceneManager) {
    window.marsSceneManager.updateGuidedRoute(rover.position);
  }

  // Update terrain system with current rover position
  terrainSystem.update(rover.position);

  // Basic collision detection - prevent going off the edge of the current terrain system
  const currentChunk = terrainSystem.getChunkCoords(rover.position.x, rover.position.z);
  const chunkDistance = Math.max(
    Math.abs(currentChunk.x - terrainSystem.currentChunk.x),
    Math.abs(currentChunk.z - terrainSystem.currentChunk.z)
  );

  // If we're too far from the current chunk center, update the chunk tracking
  // (no longer blocks movement â€” the rover can explore freely)
  if (chunkDistance > 2) {
    terrainSystem.currentChunk = { ...currentChunk };
  }

  // Handle turning with smooth acceleration - turning radius scales with speed
  const speedFactor = 1.0 - 0.4 * (Math.abs(velocity) / MAX_SPEED); // tighter steering at low speed, reduced at high speed
  if (keys.a || keys.d) {
    const turnDir = keys.a ? 1 : -1;
    rotationVelocity = Math.min(
      Math.abs(rotationVelocity) + ROTATION_ACCEL * frameScale,
      MAX_ROTATION_SPEED
    ) * turnDir;
  } else {
    // Dampen rotation when key released
    rotationVelocity *= Math.pow(0.6, frameScale);
    if (Math.abs(rotationVelocity) < 0.0001) rotationVelocity = 0;
  }

  if (rotationVelocity !== 0) {
    const effectiveRotation = rotationVelocity * speedFactor * frameScale;
    roverYaw += effectiveRotation;

    // Normalize roverYaw to keep it within 0-2Ï€ range
    roverYaw = roverYaw % (Math.PI * 2);
    if (roverYaw < 0) roverYaw += Math.PI * 2;

    // Keep global variable in sync for mobile controls
    window.roverYaw = roverYaw;

    // Differential wheel rotation for turning - only update if moving
    if (isMoving) {
      const turnDirection = rotationVelocity > 0 ? 1 : -1;
      updateWheelRotation(wheels, currentSpeed * frameScale, turnDirection);
    }
  } else if (isMoving) {
    // Straight movement, all wheels rotate at the same speed
    if (frameCount % 2 === 0) {
      wheels.forEach(wheel => {
        wheel.rotation.x += currentSpeed * frameScale * 0.3;
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
    updateCamera(delta);
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
  }

  // Reset every frame — camera-collision code mutates direction
  window.terrainRaycaster.ray.direction.set(0, -1, 0);
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
    rover.position.y = closestIntersection.point.y + 0.3;

    // Only calculate terrain alignment if the slope is significant
    const normal = closestIntersection.face.normal.clone();
    normal.transformDirection(closestIntersection.object.matrixWorld);

    // Reuse cached up vector
    if (!window._terrainUp) {
      window._terrainUp = new THREE.Vector3(0, 1, 0);
      window._terrainAxis = new THREE.Vector3();
      window._terrainTiltQuat = new THREE.Quaternion();
    }
    const up = window._terrainUp;

    // Calculate the angle between the normal and up vector
    const angle = up.angleTo(normal);

    // Reset the rover's rotation
    rover.rotation.set(0, 0, 0);

    // First apply the yaw rotation (this is tracked separately)
    rover.rotateY(roverYaw);

    // Then apply terrain tilt if needed and angle is significant
    if (angle > 0.1 && angle < Math.PI / 6) {
      // Create rotation axis (perpendicular to both vectors)
      const axis = window._terrainAxis.crossVectors(up, normal).normalize();

      // Create a quaternion for the terrain tilt
      const tiltQuaternion = window._terrainTiltQuat.setFromAxisAngle(axis, angle * 0.5);

      // Apply the tilt quaternion
      rover.quaternion.premultiply(tiltQuaternion);
    }
  } else {
    // Fallback if no intersection found
    rover.position.y = 0.3;

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

// === DEV DEBUG: Road centerlines + vehicle height error visualizer ===
// Toggle with 'V' key. Shows exactly where vehicles are sitting vs the actual ground.
function updateRoadDebugVisuals() {
  const mgr = window.marsSceneManager;
  if (!mgr || !mgr.scene) return;

  // Create or reuse a dedicated debug group
  if (!_roadDebugGroup) {
    _roadDebugGroup = new THREE.Group();
    _roadDebugGroup.name = 'RoadDebugGroup';
    mgr.scene.add(_roadDebugGroup);
  }

  // Throttle heavy rebuilds
  const now = Date.now();
  if (_roadDebugGroup.userData.lastRebuild && (now - _roadDebugGroup.userData.lastRebuild) < 120) {
    return; // skip rebuild this frame
  }
  _roadDebugGroup.userData.lastRebuild = now;

  // Clear previous debug objects (cheap for dev tool)
  while (_roadDebugGroup.children.length > 0) {
    const child = _roadDebugGroup.children[0];
    _roadDebugGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  }

  const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });
  const errorMatGood = new THREE.LineBasicMaterial({ color: 0x00ff88, depthTest: false });
  const errorMatBad  = new THREE.LineBasicMaterial({ color: 0xff4444, depthTest: false });
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  // 1) Road centerlines
  if (mgr.roads && mgr.roads.size > 0) {
    mgr.roads.forEach((road) => {
      const points = [
        new THREE.Vector3(road.startX, road.groundY + 0.2, road.startZ),
        new THREE.Vector3(road.endX,   road.groundY + 0.2, road.endZ)
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, lineMat);
      line.renderOrder = 9999;
      _roadDebugGroup.add(line);
    });
  }

  // 2) Vehicle height error lines (roadVehicles + aiVehicles)
  const addVehicleErrorLine = (mesh) => {
    if (!mesh || !mesh.position) return;
    const x = mesh.position.x;
    const z = mesh.position.z;
    const vehY = mesh.position.y;

    let groundY = vehY;
    try {
      if (typeof mgr.getTerrainHeight === 'function') {
        groundY = mgr.getTerrainHeight(x, z);
      }
    } catch (_) {}

    const delta = vehY - groundY;
    const colorMat = Math.abs(delta) < 0.8 ? errorMatGood : errorMatBad;

    const pts = [
      new THREE.Vector3(x, vehY + 0.5, z),
      new THREE.Vector3(x, groundY + 0.1, z)
    ];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(g, colorMat);
    line.renderOrder = 10000;
    _roadDebugGroup.add(line);

    // Small marker at sampled ground height
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), markerMat);
    marker.position.set(x, groundY + 0.1, z);
    _roadDebugGroup.add(marker);
  };

  if (mgr.roadVehicles && mgr.roadVehicles.length) {
    mgr.roadVehicles.forEach(v => addVehicleErrorLine(v.mesh));
  }
  if (mgr.aiVehicles && mgr.aiVehicles.length) {
    mgr.aiVehicles.forEach(v => addVehicleErrorLine(v.mesh));
  }
}

function updateCamera(deltaMs) {
  const dt = Math.min((deltaMs || 16.67) / 1000, 0.05);

  if (!window.cameraVectors) {
    window.cameraVectors = {
      offset: new THREE.Vector3(),
      target: new THREE.Vector3(),
      head: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      upAxis: new THREE.Vector3(0, 1, 0)
    };
  }
  const vectors = window.cameraVectors;

  switch (cameraMode) {
    case 'thirdPerson': {
      // Speed-adaptive zoom — much gentler now for a consistently close chase feel
      const speedRatio = Math.abs(velocity) / MAX_SPEED;
      vectors.offset.set(
        cameraOffset.x,
        cameraOffset.y + speedRatio * 2.2,
        cameraOffset.z + speedRatio * 5.5
      );
      vectors.offset.applyAxisAngle(vectors.upAxis, roverYaw);

      vectors.target.set(
        rover.position.x + vectors.offset.x,
        rover.position.y + vectors.offset.y,
        rover.position.z + vectors.offset.z
      );

      // Terrain-collision avoidance: pull camera in front of any hill it would clip through
      if (!window.cameraRaycaster) window.cameraRaycaster = new THREE.Raycaster();
      {
        const toCamera = vectors.target.clone().sub(rover.position);
        const dist = toCamera.length();
        const dir = toCamera.clone().normalize();
        window.cameraRaycaster.ray.origin.set(rover.position.x, rover.position.y + 2, rover.position.z);
        window.cameraRaycaster.ray.direction.copy(dir);
        const terrainMeshes = [];
        for (const chunk of terrainSystem.chunks.values()) terrainMeshes.push(chunk);
        const hits = window.cameraRaycaster.intersectObjects(terrainMeshes);
        if (hits.length > 0 && hits[0].distance < dist) {
          const safeDist = Math.max(hits[0].distance - 1.5, 3);
          vectors.target.copy(rover.position).addScaledVector(dir, safeDist);
          vectors.target.y = rover.position.y + 2;
        }
      }

      // Spring-damper follow: stiffness pulls toward target, damping kills oscillation
      const stiffness = 10.0;
      const damping = 7.0;
      const displacement = vectors.target.clone().sub(camera.position);
      cameraSpring.velocity.addScaledVector(displacement, stiffness * dt);
      cameraSpring.velocity.multiplyScalar(Math.max(0, 1 - damping * dt));
      camera.position.addScaledVector(cameraSpring.velocity, dt);

      vectors.forward.set(0, 0, -1).applyAxisAngle(vectors.upAxis, roverYaw);
      camera.lookAt(
        rover.position.x + vectors.forward.x * 5,
        rover.position.y + 2.0,
        rover.position.z + vectors.forward.z * 5
      );
      break;
    }

    case 'firstPerson': {
      vectors.head.set(rover.position.x, rover.position.y + 2.5, rover.position.z);
      vectors.forward.set(0, 0, -1).applyAxisAngle(vectors.upAxis, roverYaw);
      camera.position.copy(vectors.head);
      camera.lookAt(
        vectors.head.x + vectors.forward.x * 10,
        vectors.head.y,
        vectors.head.z + vectors.forward.z * 10
      );
      break;
    }

    case 'orbit':
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
  
  // Reduce segments to dramatically speed up terrain generation
  const segments = perfSettings.isMobile ? 48 : 
                   perfSettings.detailLevel === 'high' ? 128 : 
                   perfSettings.detailLevel === 'normal' ? 96 : 64;
  
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

    // Add deterministic variation based on position (not Math.random) for consistent terrain
    const randomVariation = (Math.sin(x * 1.37 + z * 2.41) * Math.cos(x * 0.93 - z * 1.67)) * 0.25;
    elevation += randomVariation;

    // Add specific Martian features only on highest detail to avoid
    // very long load times on typical devices.
    if (perfSettings.detailLevel === 'high') {
      const featureMultiplier = 1.0;

      // 1. Add impact craters
      const craterCount = Math.floor(15 * featureMultiplier);
      for (let c = 0; c < craterCount; c++) {
        const craterX = Math.sin(c * 1.1) * terrainSize * 0.4;
        const craterZ = Math.cos(c * 1.7) * terrainSize * 0.4;
        const craterSize = (Math.abs(Math.sin(c * 3.7)) * 30) + 10; // deterministic size

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
        const duneSize = Math.abs(Math.sin(d * 2.3)) * 40 + 20; // deterministic

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
        const lakeRadius = 120 + Math.abs(Math.sin(l * 5.1)) * 180; // deterministic

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
        const rockRadius = 40 + Math.abs(Math.sin(rf * 7.3)) * 60; // deterministic
        const rockHeight = 20 + Math.abs(Math.cos(rf * 5.1)) * 30; // deterministic

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

    // 4.5 Add occasional very high mountains (deterministic selection)
    // Instead of looping 30 mountains and rolling Math.random() per vertex,
    // pre-select only ~3 mountains using a deterministic filter.
    const highMountainCount = 3; // only 3 actual mountains (was 30 Ã— 10% = ~3 anyway)
    const highMountainSeeds = [2, 7, 19]; // fixed indices from the old 0-29 range
    for (let hi = 0; hi < highMountainCount; hi++) {
      const hm = highMountainSeeds[hi];
      const mountainX = Math.sin(hm * 7.3 + 2.1) * terrainSize * 0.4;
      const mountainZ = Math.cos(hm * 8.7 + 1.5) * terrainSize * 0.4;

      const mountainRadius = 420 + Math.abs(Math.sin(hm * 3.1)) * 100; // deterministic

      const distanceToMountain = Math.sqrt(Math.pow(x - mountainX, 2) + Math.pow(z - mountainZ, 2));

      if (distanceToMountain < mountainRadius) {
        const normalizedDistance = distanceToMountain / mountainRadius;
        const peakHeight = 30 + Math.abs(Math.cos(hm * 4.7)) * 15; // deterministic
        const slopeProfile = Math.pow(1 - normalizedDistance, 2);
        const highMountainHeight = peakHeight * slopeProfile;

        const rockDetail = (
          Math.sin(x * 0.05 + z * 0.06) *
          Math.cos(x * 0.06 - z * 0.05) *
          (1 - normalizedDistance) * 1.2
        );

        elevation += highMountainHeight + rockDetail;
      }
    }

    // 5. Add impact craters (deterministic positions based on index, not Math.random)
    const impactCraterCount = Math.floor(25 * featureMultiplier);
    for (let c = 0; c < impactCraterCount; c++) {
      // Deterministic crater position using trig hashes
      const craterX = Math.sin(c * 5.3 + 0.7) * terrainSize * 0.8;
      const craterZ = Math.cos(c * 4.1 + 1.3) * terrainSize * 0.8;

      // Deterministic crater size
      const craterSize = Math.pow(Math.abs(Math.sin(c * 3.7 + 2.1)), 1.5) * 50 + 15;

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
  
  if (terrainPerfSettings.isMobile) {
    // Mobile: basic material - deep Mars red, with vertex colors for variation
    material = new THREE.MeshBasicMaterial({
      color: 0xb33112,
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: true
    });
  } else {
    // Desktop: Lambert â€” simple, predictable lighting, vertex colors show correctly
    // (avoids PBR colour darkening under ACES tone mapping)
    material = new THREE.MeshLambertMaterial({
      color: 0xffffff, // white base so vertex colours are the sole tint
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: true
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
    const px = positionArray[i * 3];
    const pz = positionArray[i * 3 + 2];

    // Base: dark iron-oxide red, closer to Mars regolith under night lighting
    let r = 0.66;
    let g = 0.20;
    let b = 0.08;

    // High terrain -> dusty red-orange highlands, not pale sand
    if (elevation > 8) {
      const t = Math.min((elevation - 8) / 20, 1.0);
      r = r + (0.78 - r) * t;
      g = g + (0.31 - g) * t;
      b = b + (0.15 - b) * t;
    }

    // Very high -> muted rusty bedrock, avoiding cream-colored sand
    if (elevation > 20) {
      const t = Math.min((elevation - 20) / 15, 1.0);
      r = r + (0.58 - r) * t;
      g = g + (0.27 - g) * t;
      b = b + (0.16 - b) * t;
    }

    // Low/crater floors -> dark basaltic red-brown
    if (elevation < -3) {
      const t = Math.min((-elevation - 3) / 8, 0.6);
      r = r * (1 - t) + 0.28 * t;
      g = g * (1 - t) + 0.10 * t;
      b = b * (1 - t) + 0.06 * t;
    }

    // Subtle geological variation (streaks, veins)
    const vein = (Math.sin(px * 0.73 + pz * 1.17) * Math.cos(px * 1.53 - pz * 0.89)) * 0.04;
    const ochre = (Math.sin(px * 0.19 - pz * 0.27) * Math.cos(px * 0.34 + pz * 0.11)) * 0.03;
    r = Math.max(0, Math.min(1, r + vein + ochre * 0.35));
    g = Math.max(0, Math.min(1, g + vein * 0.35 + ochre * 0.12));
    b = Math.max(0, Math.min(1, b + vein * 0.16));

    colors[i * 3]     = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

  // Add more visible rock formations (reduced for faster texture generation)
  for (let i = 0; i < 150; i++) {
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

  // Add dust deposits (reduced count)
  for (let i = 0; i < 50; i++) {
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

  // Add various bumps and details (reduced count for faster generation)
  for (let i = 0; i < 500; i++) {
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

  // Add some larger features (reduced count)
  for (let i = 0; i < 30; i++) {
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

  // Add some random variations (reduced count for faster generation)
  for (let i = 0; i < 2000; i++) {
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

// Create a skybox with procedural shader sky, Milky Way, and planets
function createSpaceSkybox() {
  console.log("Creating shader-based night sky...");

  const skyboxGroup = new THREE.Group();
  skyboxGroup.renderOrder = -1000;

  // === LAYER 1: Procedural shader sky sphere ===
  const skyboxGeometry = new THREE.SphereGeometry(5900, 64, 48);

  const skyboxMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorldPos;

      // --- Hash / noise helpers (GPU-friendly) ---
      float hash(vec2 p) {
        p = fract(p * vec2(443.897, 441.423));
        p += dot(p, p.yx + 19.19);
        return fract((p.x + p.y) * p.x);
      }
      float hash3(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y + p.z) * p.x);
      }

      // Smooth 3D value noise for the Milky Way
      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = mix(
          mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
        return n;
      }

      // fBm (fractal Brownian motion) for richer Milky Way detail
      float fbm(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise3(p);
          p *= 2.1;
          a *= 0.48;
        }
        return v;
      }

      // --- Stars ---
      // Returns brightness of the nearest star in a grid cell
      float starField(vec3 dir, float scale, float threshold) {
        vec3 p = dir * scale;
        vec3 cell = floor(p);
        float bright = 0.0;
        // Check this cell and neighbors for closest star
        for (int dx = -1; dx <= 1; dx++)
        for (int dy = -1; dy <= 1; dy++)
        for (int dz = -1; dz <= 1; dz++) {
          vec3 c = cell + vec3(float(dx), float(dy), float(dz));
          float h = hash3(c);
          if (h > threshold) {
            vec3 starPos = c + vec3(hash3(c + 0.1), hash3(c + 0.2), hash3(c + 0.3));
            float d = length(p - starPos);
            float size = 0.02 + 0.04 * hash3(c + 0.5);
            float b = smoothstep(size, 0.0, d);
            // Twinkle
            float twinkle = 0.7 + 0.3 * sin(uTime * 0.0008 * (hash3(c + 0.7) * 4.0 + 1.0) + hash3(c + 0.9) * 6.28);
            bright = max(bright, b * twinkle);
          }
        }
        return bright;
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float elevation = dir.y; // -1 bottom, +1 top

        // --- Sky gradient: deep space colors for Mars night ---
        vec3 zenith  = vec3(0.014, 0.020, 0.050); // blue-tinted deep space overhead
        vec3 horizon = vec3(0.044, 0.022, 0.020); // rusty horizon with a cool blue lift
        vec3 nadir   = vec3(0.0, 0.0, 0.0);      // black below

        float t = elevation * 0.5 + 0.5; // remap to 0..1
        vec3 sky = mix(nadir, horizon, smoothstep(0.0, 0.45, t));
        sky = mix(sky, zenith, smoothstep(0.45, 1.0, t));
        sky += vec3(0.015, 0.026, 0.060) * smoothstep(0.08, 0.95, t);

        // Subtle warm Mars dust glow near the horizon
        float horizonGlow = exp(-abs(elevation) * 8.0);
        sky += vec3(0.10, 0.032, 0.020) * horizonGlow * 0.22;

        // --- Milky Way band ---
        // Rotate direction so the band runs diagonally across the sky
        float angle = -0.55;
        float ca = cos(angle), sa = sin(angle);
        vec3 rd = vec3(
          dir.x * ca - dir.z * sa,
          dir.y,
          dir.x * sa + dir.z * ca
        );
        float bandDist = abs(rd.y);
        float bandMask = smoothstep(0.28, 0.0, bandDist);

        if (bandMask > 0.01) {
          // Multi-octave noise cloud along the band
          vec3 nCoord = rd * 6.0 + vec3(0.0, 0.0, uTime * 0.000002);
          float n = fbm(nCoord);
          float detail = fbm(nCoord * 3.0 + 1.5);

          float milky = bandMask * smoothstep(0.32, 0.65, n);
          milky += bandMask * 0.4 * smoothstep(0.35, 0.7, detail);

          // Core brightness
          float core = smoothstep(0.12, 0.0, bandDist) * smoothstep(0.38, 0.65, n) * 0.6;
          milky += core;

          // Color: blue-white with slight warmth in the core
          vec3 milkyColor = mix(
            vec3(0.35, 0.45, 0.7),   // blue-white outer
            vec3(0.7, 0.65, 0.85),   // pale lavender core
            core
          );
          // Add faint pink/magenta knots
          float knots = smoothstep(0.62, 0.75, detail) * bandMask * 0.3;
          milkyColor += vec3(0.25, 0.05, 0.15) * knots;

          sky += milkyColor * milky * 0.70;
        }

        // --- Static star layers (painted by shader, no canvas) ---
        float s1 = starField(dir, 80.0, 0.925);  // sparse bright stars
        float s2 = starField(dir, 200.0, 0.885);  // medium density
        float s3 = starField(dir, 500.0, 0.835);  // dense dim stars

        // Star colors: mostly white-blue, some warm
        vec3 starCol1 = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.7), hash(dir.xz * 80.0));
        vec3 starCol2 = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.65), hash(dir.xz * 200.0));

        sky += starCol1 * s1 * 0.95;
        sky += starCol2 * s2 * 0.48;
        sky += vec3(0.7, 0.75, 0.9) * s3 * 0.18;

        // Fade stars near horizon (atmospheric extinction)
        float extinction = smoothstep(0.0, 0.15, abs(elevation));
        sky = mix(sky * vec3(1.0, 0.7, 0.5) * 0.3, sky, extinction);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });

  const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  skyboxMesh.frustumCulled = false;
  skyboxGroup.add(skyboxMesh);

  // === LAYER 2: Twinkling star particles for extra sparkle ===
  const starSystem = createTwinklingStars();
  skyboxGroup.add(starSystem.points);
  skyboxGroup.userData.starSystem = starSystem;

  // === LAYER 3: Shooting star system ===
  const shootingStarSystem = createShootingStarSystem();
  skyboxGroup.add(shootingStarSystem.group);
  skyboxGroup.userData.shootingStars = shootingStarSystem;

  // === LAYER 4: Distant asteroid silhouettes ===
  const asteroidSystem = createAsteroidSkyLayer();
  skyboxGroup.add(asteroidSystem.group);
  skyboxGroup.userData.asteroids = asteroidSystem;

  // === LAYER 5: Small distant planets ===
  const planetSystem = createDistantPlanetLayer();
  skyboxGroup.add(planetSystem.group);
  skyboxGroup.userData.planets = planetSystem;

  // Store update function for animation loop
  skyboxGroup.userData.update = function(time) {
    // Update shader time uniform
    skyboxMaterial.uniforms.uTime.value = time;
    // Twinkle stars
    if (starSystem && starSystem.update) starSystem.update(time);
    // Shooting stars
    if (shootingStarSystem && shootingStarSystem.update) shootingStarSystem.update(time);
    // Distant asteroids
    if (asteroidSystem && asteroidSystem.update) asteroidSystem.update(time);
    // Small planets
    if (planetSystem && planetSystem.update) planetSystem.update(time);
  };

  skyboxGroup.frustumCulled = false;
  console.log("Shader night sky created successfully");
  return skyboxGroup;
}

// ============================================================
// TWINKLING STAR PARTICLE SYSTEM
// ============================================================
function createTwinklingStars() {
  const perfSettings = getPerformanceSettings();
  // Dense star field for a brighter, deeper Mars night sky
  const starCount = perfSettings.isMobile ? 7200 : 26000;
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

    // Small stars with occasional brighter points for a richer sky
    const sizeRoll = Math.random();
    if (sizeRoll < 0.58) sizes[i] = 1.5 + Math.random() * 1.4;
    else if (sizeRoll < 0.86) sizes[i] = 2.5 + Math.random() * 1.8;
    else if (sizeRoll < 0.975) sizes[i] = 4.2 + Math.random() * 2.6;
    else sizes[i] = 7.0 + Math.random() * 3.0;

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
    size: 8,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.005
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
    _updateOffset: 0, // rolling offset for partial updates
    update(time) {
      const t = time * 0.001;
      const sizeAttr = geometry.attributes.size;
      const arr = sizeAttr.array;
      // Update only a batch of stars each frame to spread CPU cost
      const batchSize = Math.min(4000, starCount);
      const start = this._updateOffset;
      const end = Math.min(start + batchSize, starCount);
      for (let i = start; i < end; i++) {
        // Smooth sinusoidal twinkling with harmonics for natural look
        const twinkle = 0.60 + 0.28 * (
          Math.sin(t * speeds[i] + phases[i]) * 0.5 +
          Math.sin(t * speeds[i] * 1.7 + phases[i] * 2.3) * 0.3 +
          Math.sin(t * speeds[i] * 0.4 + phases[i] * 0.7) * 0.2
        );
        arr[i] = this.originalSizes[i] * twinkle;
      }
      this._updateOffset = end >= starCount ? 0 : end;
      sizeAttr.needsUpdate = true;
    }
  };
}

function createStarTexture() {
  // 64px is enough â€” stars are tiny points; higher res adds no benefit
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const c = 32; // center

  // Sharp bright core (inner 8%) fading to a very soft halo
  // This gives crisp point-of-light look, not a blurry blob
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0,    'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.08, 'rgba(255,255,255,0.82)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.58)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(0.80, 'rgba(255,255,255,0.018)');
  gradient.addColorStop(1.0,  'rgba(255,255,255,0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// ============================================================
// SHOOTING STAR SYSTEM
// ============================================================
function createShootingStarSystem() {
  const group = new THREE.Group();
  const skyRadius = 5000;
  // Keep several shooting stars visible without becoming a full meteor shower
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
    const trailLen = 230 + Math.random() * 340;

    // Create trail geometry (thin stretched plane)
    const trailGeo = new THREE.PlaneGeometry(trailLen, 4 + Math.random() * 5);
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

    // Bright head glow (no PointLight â€” too expensive for transient effects)
    const headGeo = new THREE.SphereGeometry(4, 6, 6);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const head = new THREE.Mesh(headGeo, headMat);

    group.add(trail);
    group.add(head);

    const speed = 1900 + Math.random() * 2600;
    const lifetime = length / speed;
    const brightness = 0.55 + Math.random() * 0.35;

    return {
      trail, head, trailMat, headMat,
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
      return;
    }

    // Position along path
    const pos = t.start.clone().lerp(t.end, t.progress);
    t.head.position.copy(pos);

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

    t.trailMat.opacity = alpha * 0.75;
    t.headMat.opacity = alpha * 0.90;
  }

  // Spawn timer
  let nextSpawn = 1.5 + Math.random() * 3;
  let elapsed = 0;

  return {
    group,
    update(time) {
      const dt = 0.016; // ~60fps timestep
      elapsed += dt;

      // Spawn new shooting stars periodically (a few, not a shower)
      if (elapsed >= nextSpawn && trails.filter(t => t.active).length < maxTrails) {
        trails.push(spawnShootingStar());
        nextSpawn = elapsed + 3 + Math.random() * 6;
      }

      // Update active trails
      for (const t of trails) {
        updateTrail(t, dt);
      }

      // Cleanup inactive trails (keep array manageable)
      while (trails.length > 10) {
        const old = trails.shift();
        if (old.trail.parent) old.trail.parent.remove(old.trail);
        if (old.head.parent) old.head.parent.remove(old.head);
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

function createAsteroidSkyLayer() {
  const perfSettings = getPerformanceSettings();
  const group = new THREE.Group();
  const count = perfSettings.isMobile ? 8 : 22;
  const radius = 4300;
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0x8b6a58,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    fog: false
  });
  const asteroids = [];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    const theta = Math.random() * Math.PI * 2;
    const phi = 0.18 + Math.random() * 0.72; // upper sky only
    const distance = radius + Math.random() * 700;
    const size = 8 + Math.random() * 22;

    mesh.position.set(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
    mesh.scale.set(
      size * (0.75 + Math.random() * 0.8),
      size * (0.5 + Math.random() * 0.7),
      size * (0.8 + Math.random() * 1.1)
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mesh.material.color.setHSL(0.05 + Math.random() * 0.05, 0.25, 0.34 + Math.random() * 0.16);
    mesh.material.opacity = 0.38 + Math.random() * 0.25;
    mesh.frustumCulled = false;
    group.add(mesh);
    asteroids.push({
      mesh,
      spinX: 0.00003 + Math.random() * 0.00008,
      spinY: 0.00004 + Math.random() * 0.00010
    });
  }

  group.frustumCulled = false;

  return {
    group,
    update(time) {
      const t = time || 0;
      group.rotation.y = t * 0.000006;
      group.rotation.x = Math.sin(t * 0.00004) * 0.015;
      for (const asteroid of asteroids) {
        asteroid.mesh.rotation.x += asteroid.spinX;
        asteroid.mesh.rotation.y += asteroid.spinY;
      }
    }
  };
}

function createDistantPlanetLayer() {
  const group = new THREE.Group();
  const planetGeometry = new THREE.SphereGeometry(1, 32, 16);

  const planets = [
    {
      position: new THREE.Vector3(-2850, 2100, -3400),
      scale: new THREE.Vector3(68, 68, 68),
      color: 0x8aa7d9,
      opacity: 0.72,
      drift: 0.000003
    },
    {
      position: new THREE.Vector3(2500, 1750, -3900),
      scale: new THREE.Vector3(42, 42, 42),
      color: 0xd0a070,
      opacity: 0.58,
      drift: -0.000004
    }
  ];

  const meshes = planets.map(config => {
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      fog: false
    });
    const mesh = new THREE.Mesh(planetGeometry, material);
    mesh.position.copy(config.position);
    mesh.scale.copy(config.scale);
    mesh.frustumCulled = false;
    mesh.userData.drift = config.drift;
    group.add(mesh);
    return mesh;
  });

  // A very thin ring makes the smaller planet legible without adding a big bright disk.
  const ringGeometry = new THREE.RingGeometry(54, 72, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xc6a98a,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(meshes[1].position);
  ring.rotation.set(Math.PI * 0.58, 0.18, -0.35);
  ring.frustumCulled = false;
  group.add(ring);

  group.frustumCulled = false;

  return {
    group,
    update(time) {
      const t = time || 0;
      for (const mesh of meshes) {
        mesh.rotation.y = t * mesh.userData.drift;
      }
      ring.rotation.z = -0.35 + Math.sin(t * 0.00008) * 0.015;
    }
  };
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
  console.log("ðŸš€ MARS SCENE: initializeScene() called");
  console.log("Scene exists:", typeof scene !== 'undefined');
  console.log("Renderer exists:", typeof renderer !== 'undefined');

  // Load essential components immediately
  loadCoreComponents();
  
  // Load non-essential components in background - reduced delay for faster startup
  setTimeout(() => {
    loadNonEssentialComponents();
  }, 100);
}

function loadCoreComponents() {
  console.log("ðŸ”§ MARS SCENE: loadCoreComponents() called");
  
  // Create the HUD (may not exist as a function, skip if undefined)
  if (typeof createHUD === 'function') {
    createHUD();
    console.log("HUD created");
  } else {
    console.log("createHUD not defined, skipping");
  }

  // Simple background only for mobile to prevent WebGL context issues
  const perfSettings = getPerformanceSettings();
  if (perfSettings.isMobile) {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
    console.log("Mobile: simple sky background created");
  }

  // Create the sun directional light; start dim because the scene begins at night
  sun = new THREE.DirectionalLight(0xb96a45, isDaytime ? 1 : 0.04);
  sun.position.set(10, 100, 10);
  scene.add(sun);
  console.log("Sun light added to scene");

  // Create a simple sun sphere for daytime only; hidden at night to avoid extra "planets"
  const sunGeometry = new THREE.SphereGeometry(36, 16, 16); // Reduced geometry complexity
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xc66a32,
    transparent: true,
    opacity: isDaytime ? 0.75 : 0.0
  });
  sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
  sunSphere.position.set(500, 300, -1000);
  sunSphere.visible = isDaytime;
  scene.add(sunSphere);
  console.log("Sun sphere added to scene");

  // Eagerly create MarsSceneManager on desktop so colony and rockets
  // are always available even if lazy loading is delayed.
  console.log("ðŸ—ï¸ MARS SCENE: About to create MarsSceneManager, isMobile=", perfSettings.isMobile);
  if (!perfSettings.isMobile) {
    try {
      console.log("ðŸ—ï¸ MARS SCENE: Creating MarsSceneManager now...");
      sceneManager = new MarsSceneManager(scene, 5000);
      window.marsSceneManager = sceneManager;
      console.log('âœ… MarsSceneManager eagerly created for desktop');
    } catch (e) {
      console.error('âŒ Failed to create MarsSceneManager eagerly:', e);
      console.error('Error stack:', e.stack);
    }
  }

  // Initialize basic UI elements (may not exist as a function, skip if undefined)
  if (typeof initializeUI === 'function') {
    initializeUI();
    console.log("UI elements initialized");
  } else {
    console.log("initializeUI not defined, skipping");
  }
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
      // Avoid creating a second scene manager if one was already
      // created eagerly in loadCoreComponents (desktop path).
      if (!window.marsSceneManager) {
        window.marsSceneManager = new MarsSceneManager(scene, 5000);
      }
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
      if (!sunSphere || !isDaytime) return Promise.resolve();
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

// Day/night toggle and cycle (isDaytime declared at top of file)
console.log("Initial day/night state:", isDaytime ? "DAY" : "NIGHT");
// Automatically initialize core scene elements once the game script
// has finished loading. This ensures MarsSceneManager (and the
// colony/rocket traffic it controls) is constructed on desktop,
// and HUD/UI are set up, even though initializeScene wasn't being
// called from index.html.
console.log('ðŸŽ® MARS SCRIPT: End of mars.js reached, about to call initializeScene()');
console.log('ðŸŽ® initializeScene exists:', typeof initializeScene);
console.log('ðŸŽ® scene exists:', typeof scene);
console.log('ðŸŽ® renderer exists:', typeof renderer);
try {
  if (typeof initializeScene === 'function') {
    console.log('ðŸŽ® CALLING initializeScene() NOW...');
    initializeScene();
    console.log('ðŸŽ® initializeScene() completed');
  } else {
    console.warn('âŒ initializeScene is not defined; core components not initialized');
  }
} catch (e) {
  console.error('âŒ Error during initializeScene:', e);
  console.error('Error stack:', e.stack);
}
