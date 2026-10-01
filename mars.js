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
      route: document.getElementById('tour-status'),
      mission: document.getElementById('mission-objective'),
      toast: document.getElementById('mission-toast'),
      speedPanel: document.getElementById('speed-hud'),
      speed: document.getElementById('speed-value'),
      heading: document.getElementById('speed-heading')
    };
  }
  return _hudElements;
}

// HUD panels are styled by index.html (.hud-panel etc.); this only builds them
function ensureMissionHUD() {
  if (typeof document === 'undefined' || document.getElementById('mission-hud')) return;

  const hud = document.createElement('div');
  hud.id = 'mission-hud';
  hud.className = 'hud-panel';
  hud.innerHTML = `
    <div class="hud-eyebrow">Mission</div>
    <div id="mission-objective">Follow the blue beacon route</div>
    <div id="tour-status">Tour: 0/6 beacons</div>
  `;
  document.body.appendChild(hud);

  const speed = document.createElement('div');
  speed.id = 'speed-hud';
  speed.className = 'hud-panel';
  speed.innerHTML = '<span id="speed-value">0</span><span id="speed-unit">KM/H</span><span id="speed-heading"></span>';
  document.body.appendChild(speed);

  const toast = document.createElement('div');
  toast.id = 'mission-toast';
  document.body.appendChild(toast);
  _hudElements = null;
}

function showMissionToast(message) {
  ensureMissionHUD();
  const hud = _getHudElements();
  if (!hud.toast) return;
  hud.toast.textContent = message;
  hud.toast.classList.add('show');
  clearTimeout(window._missionToastTimer);
  window._missionToastTimer = setTimeout(() => hud.toast.classList.remove('show'), 2200);
}
window.showGameToast = showMissionToast;

function updateMissionObjective() {
  ensureMissionHUD();
  const hud = _getHudElements();
  if (!hud.mission) return;
  const route = window.guidedRouteProgress || { reached: 0, total: 6 };
  const scan = window.scanSiteProgress || { reached: 0, total: 4 };

  if (route.reached < route.total) {
    hud.mission.textContent = `Reach beacon ${route.reached + 1}`;
  } else if (scan.reached < scan.total) {
    hud.mission.textContent = `${isDaytime ? 'Daylight survey' : 'Night scan'}: anomaly ${scan.reached + 1}`;
  } else {
    hud.mission.textContent = 'Return to the command colony';
  }
}

// Compass direction lookup (avoid recreating every frame)
const _compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Update HUD with game system information
function updateGameHUD() {
  if (!rover) return;
  ensureMissionHUD();
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

  // Speedometer (1 world unit = 1 m; velocity is metres per 60 Hz frame)
  if (hud.speed && typeof velocity === 'number') {
    const kmh = String(Math.round(Math.abs(velocity) * 60 * 3.6));
    if (hud.speed.textContent !== kmh) hud.speed.textContent = kmh;
    const boosting = Math.abs(velocity) > MAX_SPEED * 1.05;
    if (hud.speedPanel.classList.contains('boost') !== boosting) hud.speedPanel.classList.toggle('boost', boosting);
    if (typeof window.roverYaw === 'number' && hud.heading) {
      let deg = (window.roverYaw * 180 / Math.PI) % 360;
      if (deg < 0) deg += 360;
      const label = _compassDirs[Math.round(deg / 45) % 8];
      if (hud.heading.textContent !== label) hud.heading.textContent = label;
    }
  }

  // Update compass / heading display
  if (hud.compass && typeof window.roverYaw === 'number') {
    let degrees = (window.roverYaw * 180 / Math.PI) % 360;
    if (degrees < 0) degrees += 360;
    const idx = Math.round(degrees / 45) % 8;
    hud.compass.textContent = `${_compassDirs[idx]} (${degrees.toFixed(0)}°)`;
  }

  // Update guided route HUD status
  if (hud.route && window.guidedRouteProgress) {
    const { reached, total } = window.guidedRouteProgress;
    const scan = window.scanSiteProgress;
    const scanText = scan ? ` | Scans: ${scan.reached}/${scan.total}` : '';
    hud.route.textContent = reached >= total ? `Tour: Complete${scanText}` : `Tour: ${reached}/${total} beacons${scanText}`;
  }
  updateMissionObjective();
}

// Performance-aware initialization with mobile detection
// Cache for performance settings to avoid recreating WebGL contexts on every call
let _cachedPerformanceSettings = null;

// Day/night cycle variables - declared early to avoid temporal dead zone issues
let lastTransitionUpdate = 0;
let currentTimeOfDay = 0.0; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight
let dayNightCycleSpeed = 1 / 120000; // Full night-day-night cycle every 2 minutes
let isManualTransition = false;
let manualTransitionTarget = null;
let manualTransitionSpeed = 0.005;
let isDaytime = false; // Start at night so the starry sky is visible
let sun = null;
let sunSphere = null;
let dayNightCycleOffset = 0.28; // start just after sunrise: low sun, long shadows

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
// Performance-optimized renderer with adaptive settings - MOBILE EMERGENCY MODE
const perfSettings = getPerformanceSettings();
const cameraFov = 62;
const camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 10, 20);
const renderer = new THREE.WebGLRenderer({
  // Desktop renders into a multisampled post-processing target, so only
  // phones (which draw straight to the canvas) need MSAA here; tile-based
  // mobile GPUs resolve it almost for free
  antialias: perfSettings.isMobile && perfSettings.mobileTier !== 'low',
  powerPreference: perfSettings.isMobile ? 'low-power' : 'high-performance',
  // highp everywhere: WebGL 2 guarantees it in fragment shaders, and the
  // world-space terrain texturing turned into a blocky checkerboard on
  // phones at mediump (half floats can't hold coordinates in the thousands)
  precision: 'highp',
  alpha: false,
  stencil: false,
  depth: true,
  logarithmicDepthBuffer: false,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false
});

// Store renderer globally to prevent duplicates
window.gameRenderer = renderer;
renderer.setSize(window.innerWidth, window.innerHeight);

// Register renderer with context manager for mobile safety (guard against TDZ)
if (window.webglContextManager && typeof window.webglContextManager.register === 'function') {
  window.webglContextManager.register(renderer);
}

// Adaptive pixel ratio for better visual quality - capped at 1 for mobile emergency performance
// (desktop draws through a multisampled HDR post chain, so it is capped lower)
// Phones used to render at 1x on 2.5-3x screens, which looked pixelated
const pixelRatio = perfSettings.isMobile
  ? Math.min(window.devicePixelRatio, perfSettings.mobileTier === 'high' ? 2 : perfSettings.mobileTier === 'medium' ? 1.5 : 1)
  : Math.min(window.devicePixelRatio, perfSettings.graphicsQuality === 'high' ? 1.5 : 1.25);
renderer.setPixelRatio(pixelRatio);

// Colour pipeline: materials work in linear light, the output is sRGB and
// ACES filmic tone mapping rolls highlights off like film (it keeps the warm,
// saturated look of real Mars imagery better than AgX, which greys it out). On desktop the tone
// mapping and encoding happen in the post-processing OutputPass instead (the
// renderer skips both when drawing into a render target).
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !perfSettings.isMobile;
renderer.shadowMap.type = THREE.PCFShadowMap; // Vogel-disk filtered; softness comes from shadow.radius

// Lights are physically based since three r155: intensities are in candela /
// lux, and point and spot lights fall off with the inverse square of distance.
// lampIntensity() converts the game's original hand-tuned values (legacy mode:
// intensity x PI, linear falloff out to `range`) so a lamp is exactly as bright
// as it used to be at `matchAt` metres, hotter closer in and dimmer beyond,
// like a real lamp. Big area fills (colony floods, city glow) use decay 0 and
// keep their even wash.
const LEGACY_LIGHT_SCALE = Math.PI;
function lampIntensity(legacyIntensity, range, matchAt = range / 3) {
  return legacyIntensity * LEGACY_LIGHT_SCALE * (1 - matchAt / range) * matchAt * matchAt;
}

// Every material colour in this file was tuned as a *linear* value (three used
// to treat hex colours that way). Keep that interpretation instead of letting
// r152+ colour management re-read them as sRGB, which would darken and
// over-saturate every albedo. Textures are still tagged sRGB where they are.
THREE.ColorManagement.enabled = false;

// Custom shaders here write display-referred colours. Decode them to linear
// light so they join the HDR pipeline (tone mapping, bloom) with everything
// else; `hdrBoost` lifts emitters like engine plumes above the bloom threshold.
function glslDisplayOut(hdrBoost = 1.0) {
  return `
    gl_FragColor.rgb = pow(clamp(gl_FragColor.rgb, 0.0, 8.0), vec3(2.2)) * ${hdrBoost.toFixed(2)};
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  `;
}

// One sky model, shared by the sky dome, the image-based lighting and the
// aerial-perspective pass, so distant terrain always fades into exactly the
// colour of the sky behind it. Returns linear HDR radiance toward `dir`.
//  - Daytime: fine iron-oxide dust scatters red and absorbs blue, so the sky
//    is butterscotch, brightest at the horizon.
//  - Dust also scatters strongly forward. Around a low sun that aureole turns
//    blue (the grains scatter blue light forward): the Martian blue sunset.
const MARS_SKY_GLSL = `
  vec3 marsSkyRadiance(vec3 dir, vec3 sunDir) {
    float e = max(dir.y, 0.0);
    float sunE = sunDir.y;
    float c = max(dot(dir, sunDir), 0.0);
    float light = smoothstep(-0.20, 0.32, sunE);
    float dusk = smoothstep(0.42, 0.04, sunE) * smoothstep(-0.20, 0.0, sunE);

    vec3 zenith = vec3(0.26, 0.15, 0.085);
    vec3 horizon = vec3(0.96, 0.60, 0.36);
    vec3 sky = mix(horizon, zenith, pow(e, 0.5));

    // Low sun: the half of the sky facing away from it sinks into dusky rose
    sky *= mix(1.0, 0.30 + 0.70 * pow(0.5 + 0.5 * dot(dir, sunDir), 2.0), dusk);

    vec3 aureole = mix(vec3(1.0, 0.80, 0.58), vec3(0.40, 0.62, 1.0), dusk);
    sky += aureole * (pow(c, 7.0) * 0.8 + pow(c, 60.0) * 2.6) * (1.0 + 0.8 * dusk);
    sky *= light;

    vec3 night = mix(vec3(0.030, 0.020, 0.018), vec3(0.006, 0.008, 0.017), sqrt(e));
    return sky + night * (1.0 - light);
  }
`;

// Live atmosphere state, written by updateDayNightCycle
const marsAtmosphere = {
  sunDir: new THREE.Vector3(0, 1, 0), // true sun direction (can be below the horizon)
  dayAmount: 0
};


if (perfSettings.isMobile) {
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
    scheduleAnimationFrame();
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

// Only release GPU resources when the page is really going away. 'pagehide'
// also fires when the page enters the back/forward cache, and disposing the
// renderer there left a dead canvas when the user navigated back.
window.addEventListener('beforeunload', cleanup);

// Cleanup on visibility change (when tab becomes hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden - pausing animation to save resources');
    window.gameAnimationRunning = false;
  } else {
    console.log('Page visible - resuming animation');
    if (!window.gameAnimationRunning) {
      window.gameAnimationRunning = true;
      scheduleAnimationFrame();
    }
  }
});
document.body.appendChild(renderer.domElement);

// Pure black background behind everything — the skybox paints over this
renderer.setClearColor(0x000000, 1);
scene.background = new THREE.Color(0x000000);

// Night skybox — create immediately since the game starts at night
let spaceSkybox = null;
let _spaceSkyboxCreating = false;

function ensureSpaceSkybox() {
  if (spaceSkybox || _spaceSkyboxCreating) return;
  _spaceSkyboxCreating = true;
  spaceSkybox = createSpaceSkybox();
  scene.add(spaceSkybox);
  console.log('Skybox created (night start)');
}

// Create skybox right away — night mode needs it visible from frame 1
ensureSpaceSkybox();

// Fog fades distant terrain to black, matching the void behind everything
const fogColor = 0x6B1F00;
const fogDensity = perfSettings.samsungOptimized ? perfSettings.fogDensityReduction : 1.0;
scene.fog = new THREE.Fog(fogColor, perfSettings.fogDistance * 0.2 * fogDensity, perfSettings.renderDistance);

// Endless terrain system with reduced complexity
const terrainSystem = {
  chunkSize: 200, // Size of each terrain chunk
  visibleRadius: 50, // Large radius — allow free exploration across the terrain
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

// Command colony site. The terrain generator keeps its set-piece features
// (mesas, craters, canyons) away from here so the colony, its ring road and
// the haul roads sit on open, gently rolling ground.
const COLONY_SITE_X = -400;
const COLONY_SITE_Z = -600;

// Spaceport ~1.1 km west-north-west of the colony: far enough that engine
// blast and flying regolith never reach the habitats
const SPACEPORT_X = -1350;
const SPACEPORT_Z = -1000;

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
  wheelTexture.colorSpace = THREE.SRGBColorSpace;
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

  // === Night driving headlights (the rover's front faces local -Z) ===
  // Emissive lamps mounted on the front of the chassis (they used to float
  // 1.4 m ahead of the rover, past the front edge at z = -1.6).
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
  const roverLights = [];
  const headlightGeom = new THREE.SphereGeometry(0.12, 10, 10);
  const lampPositions = [[-0.75, 0.95, -1.62], [0.75, 0.95, -1.62]];
  lampPositions.forEach(([lx, ly, lz]) => {
    const lamp = new THREE.Mesh(headlightGeom, headlightMat);
    lamp.position.set(lx, ly, lz);
    roverGroup.add(lamp);
  });

  if (perfSettings.isMobile) {
    // Mobile: one cheap point light at the front, no spotlights
    // Kept ~2.5 m ahead of the nose so it lights the ground, not the rover
    const roverLight = new THREE.PointLight(0xfff2d8, lampIntensity(1.6, 28, 6) * 0.5, 28);
    roverLight.position.set(0, 1.8, -4.2);
    roverGroup.add(roverLight);
    roverLights.push(roverLight);
    console.log('Minimal mobile rover lighting added for performance');
  } else {
    // Desktop: two forward spotlight cones for real headlight beams. (A warm
    // fill light used to sit 1-2 m above the deck; with physical inverse-square
    // falloff it blew the white body out to a glare blob, so it's gone.)
    lampPositions.forEach(([lx, ly, lz]) => {
      // 1/d falloff rather than inverse-square: the beam keeps its brightness
      // 16 m out but the ground right under the lamps (dead centre in the mast
      // camera) no longer flares ~40x brighter than the road ahead
      const spot = new THREE.SpotLight(0xfff2d8, 3.0 * LEGACY_LIGHT_SCALE * (1 - 16 / 85) * 16, 85, Math.PI * 0.22, 0.5, 1);
      spot.position.set(lx, ly, lz - 0.15); // just clear of the chassis lip
      spot.target.position.set(lx * 1.5, -3, lz - 34); // aim forward and slightly down
      spot.castShadow = false;
      roverGroup.add(spot);
      roverGroup.add(spot.target);
      roverLights.push(spot);
    });
  }
  // Lamps switch on as daylight fails (see updateDayNightCycle)
  roverLights.forEach(light => { light.userData.nightIntensity = light.intensity; });
  roverGroup.userData.lamps = { material: headlightMat, lights: roverLights };

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
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  // Deep blue base — photovoltaic substrate
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
      // Cell body — alternating shade for monocrystalline look
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
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const { rover, wheels, originalWheelPositions } = createRealisticRover();
// Scratch state for positionRoverOnTerrain(). Declared here, before anything
// can call it: the mobile start-up path positions the rover straight away and
// hit these in their temporal dead zone, crashing the game on phones.
const _roverUp = new THREE.Vector3(0, 1, 0);
const _roverGroundNormal = new THREE.Vector3(0, 1, 0);
const _roverTargetNormal = new THREE.Vector3();
const _roverTiltQuat = new THREE.Quaternion();
// Collision helpers in MarsSceneManager look the rover up here
window.rover = rover;
// Set initial rotation to face away from the screen
rover.rotation.y = 0;
scene.add(rover);

// Add enhanced ambient lighting for mobile devices
const perfSettingsForRover = getPerformanceSettings();
if (perfSettingsForRover.isMobile) {
  // Reduce ambient light intensity to prevent GPU overload
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4 * LEGACY_LIGHT_SCALE); // Reduced intensity
  scene.add(ambientLight);
  
  // Remove hemisphere light on mobile to reduce GPU load
  console.log('Mobile lighting optimized for performance');
  
  console.log('Mobile enhanced lighting added for rover visibility');
  console.log('Rover position:', rover.position);
  console.log('Rover visible:', rover.visible);
  console.log('Rover in scene:', scene.children.includes(rover));
  console.log('Camera position:', camera.position);
  console.log('Camera looking at rover area');
  
  // Ensure rover is at a visible position (it is set on the terrain just
  // before the first frame; positionRoverOnTerrain can't run this early)
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
const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity * LEGACY_LIGHT_SCALE);
scene.add(ambientLight);

// Low, weak reflected light gives terrain shape without making night feel like day
const sunIntensity = perfSettings.samsungOptimized ? 0.16 * perfSettings.materialBrightness :
                     perfSettings.isMobile ? 0.14 : 0.12;
const sunColor = 0xb96a45;
const sunLight = new THREE.DirectionalLight(sunColor, sunIntensity * LEGACY_LIGHT_SCALE);
// Low-angle Mars sun — long shadows, dramatic look
sunLight.position.set(-120, 55, 80);
if (!perfSettings.isMobile) {
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  // Tight frustum that follows the rover (see updateDayNightCycle):
  // 240 m across at 2048 px is ~12 cm per texel, crisp enough for the
  // rover and trucks, instead of 800 m of blurry coverage fixed at spawn
  sunLight.shadow.camera.far = 1200;
  sunLight.shadow.camera.left = -120;
  sunLight.shadow.camera.right = 120;
  sunLight.shadow.camera.top = 120;
  sunLight.shadow.camera.bottom = -120;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
}
scene.add(sunLight);
scene.add(sunLight.target);

// Secondary fill light - barely lifts silhouettes at night
if (!perfSettings.isMobile) {
  const fillLight = new THREE.DirectionalLight(0x34180f, 0.05 * LEGACY_LIGHT_SCALE);
  fillLight.position.set(80, 40, -60);
  scene.add(fillLight);
}

// Night hemisphere - near-black sky above, dark rust bounce from the ground
const hemisphereIntensity = perfSettings.samsungOptimized ? 0.24 * perfSettings.ambientLightBoost :
                             perfSettings.isMobile ? 0.22 : 0.18;
const hemisphereSkyColor = 0x070912;
const hemisphereGroundColor = 0x2a0f06;
const hemisphereLight = new THREE.HemisphereLight(hemisphereSkyColor, hemisphereGroundColor, hemisphereIntensity * LEGACY_LIGHT_SCALE);
scene.add(hemisphereLight);

// ============================================================
// MARS ATMOSPHERE + POST-PROCESSING
// ============================================================

const _fullscreenVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Desktop render path: scene -> GTAO -> atmosphere -> bloom -> grade.
// Mobile renders straight to the canvas with the renderer's own tone mapping.
function createPostProcessing() {
  if (perfSettings.isMobile || !THREE.UnrealBloomPass) return null;
  const quality = perfSettings.graphicsQuality || 'medium';

  // Glows (unlit MeshBasicMaterial colours) and emissive surfaces become real
  // HDR light sources so they bloom. Patched before any material compiles.
  const glowBoost = 2.4, emissiveBoost = 2.0;
  THREE.ShaderLib.basic.fragmentShader = THREE.ShaderLib.basic.fragmentShader.replace(
    'vec3 outgoingLight = reflectedLight.indirectDiffuse;',
    `vec3 outgoingLight = reflectedLight.indirectDiffuse;
    #ifndef USE_MAP
      outgoingLight *= ${glowBoost.toFixed(2)};
    #endif`
  );
  THREE.ShaderChunk.emissivemap_fragment += `\ntotalEmissiveRadiance *= ${emissiveBoost.toFixed(2)};\n`;

  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);

  // HDR scene target with 4x MSAA; its depth is resolved into a float texture
  // that GTAO and the atmosphere pass read back
  const depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.FloatType);
  const sceneTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: quality === 'low' ? 0 : 4,
    depthTexture
  });
  const hdrTarget = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });

  // Ground-truth AO from the scene's own depth (no second scene render).
  // It runs at reduced resolution; the Poisson denoise hides the upscale.
  let gtao = null;
  if (quality !== 'low' && THREE.GTAOPass) {
    const aoScale = 0.5;
    gtao = new THREE.GTAOPass(scene, camera, Math.round(size.x * aoScale), Math.round(size.y * aoScale));
    gtao.setGBuffer(depthTexture);
    gtao.output = THREE.GTAOPass.OUTPUT.Off; // we composite the denoised AO ourselves
    gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.6, thickness: 2.5, scale: 1.0, samples: quality === 'high' ? 12 : 8, distanceFallOff: 1.0 });
    // A wide, many-sample denoise: blotchy AO read as grain
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 10, rings: 3, samples: 16 });
    gtao.aoScale = aoScale;
  }

  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: sceneTarget.texture },
      tDepth: { value: depthTexture },
      tAO: { value: gtao ? gtao.pdRenderTarget.texture : null },
      uUseAO: { value: gtao ? 1 : 0 },
      uProjInv: { value: new THREE.Matrix4() },
      uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: marsAtmosphere.sunDir },
      uFogDensity: { value: 0.00085 },
      uFogFalloff: { value: 1 / 320 },
      uFogBase: { value: 0 }
    },
    vertexShader: _fullscreenVert,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform sampler2D tAO;
      uniform float uUseAO;
      uniform mat4 uProjInv;
      uniform mat4 uCamWorld;
      uniform vec3 uCamPos;
      uniform vec3 uSunDir;
      uniform float uFogDensity;
      uniform float uFogFalloff;
      uniform float uFogBase;
      varying vec2 vUv;
      ${MARS_SKY_GLSL}
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        // Stacked additive plumes can overflow half floats; one Inf or NaN
        // pixel would smear across the whole frame through the bloom blur
        // (max() returns the non-NaN operand on GPUs, min() caps Inf)
        col.rgb = min(max(col.rgb, vec3(0.0)), vec3(256.0));
        float depth = texture2D(tDepth, vUv).x;
        if (depth >= 1.0) { gl_FragColor = vec4(col.rgb, 1.0); return; } // sky: already the sky model

        if (uUseAO > 0.5) col.rgb *= mix(1.0, texture2D(tAO, vUv).r, 0.7);

        vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        vec3 wpos = (uCamWorld * vec4(v.xyz / v.w, 1.0)).xyz;
        vec3 ray = wpos - uCamPos;
        float dist = length(ray);
        vec3 rd = ray / dist;

        // Exponential height fog integrated analytically along the view ray:
        // dust hangs low, so valleys haze over while ridgelines stay crisp
        float a = uFogDensity * exp(-uFogFalloff * (uCamPos.y - uFogBase));
        float b = uFogFalloff * rd.y;
        float k = abs(b) < 1e-5 ? dist : (1.0 - exp(-b * dist)) / b;
        // Dust extinguishes blue more than red, so distance also reddens
        vec3 transmittance = exp(-a * k * vec3(0.80, 1.0, 1.28));

        // In-scattered light is the horizon sky in the same compass direction,
        // which is what makes haze glow toward the sun and match the dome
        vec3 hazeDir = normalize(vec3(rd.x, 0.035, rd.z));
        vec3 inscatter = marsSkyRadiance(hazeDir, uSunDir);
        col.rgb = col.rgb * transmittance + inscatter * (1.0 - transmittance);
        gl_FragColor = vec4(col.rgb, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false
  });
  const atmosphereQuad = new THREE.FullScreenQuad(atmosphereMaterial);

  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.4, 1.5);

  const gradeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: hdrTarget.texture },
      uAspect: { value: size.x / size.y },
      uSaturation: { value: 1.04 },
      uVignette: { value: 0.28 }
    },
    vertexShader: _fullscreenVert,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uAspect;
      uniform float uSaturation;
      uniform float uVignette;
      varying vec2 vUv;
      void main() {
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        // Gentle saturation lift before the filmic curve
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = max(mix(vec3(luma), col, uSaturation), 0.0);
        // Natural lens falloff toward the corners
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        col *= 1.0 - uVignette * smoothstep(0.25, 1.1, dot(q, q) * 1.6);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    depthTest: false,
    depthWrite: false
  });
  const gradeQuad = new THREE.FullScreenQuad(gradeMaterial);

  const uniforms = atmosphereMaterial.uniforms;

  return {
    bloom,
    gtao,
    atmosphere: uniforms,
    grade: gradeMaterial.uniforms,
    render(timeMs) {
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, camera);

      if (gtao) gtao.render(renderer, null, sceneTarget);

      uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
      uniforms.uCamWorld.value.copy(camera.matrixWorld);
      uniforms.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      renderer.setRenderTarget(hdrTarget);
      atmosphereQuad.render(renderer);

      bloom.render(renderer, null, hdrTarget);

      renderer.setRenderTarget(null);
      gradeQuad.render(renderer);
    },
    setSize() {
      renderer.getDrawingBufferSize(size);
      sceneTarget.setSize(size.x, size.y);
      hdrTarget.setSize(size.x, size.y);
      if (gtao) gtao.setSize(Math.round(size.x * gtao.aoScale), Math.round(size.y * gtao.aoScale));
      bloom.setSize(size.x, size.y);
      gradeMaterial.uniforms.uAspect.value = size.x / size.y;
    }
  };
}
const postProcessing = createPostProcessing();

// Phones: hold the frame rate by adapting the render resolution. Launch
// plumes and dust clouds are large transparent layers, heavy on fill rate at
// 2x; step down when frames get slow, climb back once they are calm.
// "Slow" and "calm" are measured against the display's own refresh interval:
// a 60 Hz screen never delivers frames faster than 16.7 ms, so a fixed
// "under 15 ms" test could never pass and the resolution never came back.
const adaptiveResolution = {
  max: renderer.getPixelRatio(),
  // Below ~1.25 a 2.5-3x phone screen looks visibly pixelated
  min: perfSettings.isMobile && perfSettings.mobileTier === 'high' ? 1.25 : 1,
  avgMs: 16.7,
  refreshMs: 16.7,
  lastChange: 0,
  calmSince: 0,
  update(deltaMs, now) {
    if (!perfSettings.isMobile || this.max <= this.min) return;
    // Refresh interval: snaps down to any faster frame, creeps up slowly
    this.refreshMs = Math.max(6, Math.min(this.refreshMs + 0.004, deltaMs));
    // Single long frames (a settlement spawning) must not count as slowness
    this.avgMs += (Math.min(deltaMs, this.refreshMs * 3) - this.avgMs) * 0.05;
    const ratio = renderer.getPixelRatio();
    const slow = this.avgMs > this.refreshMs * 1.5;
    const calm = this.avgMs < this.refreshMs * 1.15;
    if (!calm) this.calmSince = now;
    if (slow && ratio > this.min && now - this.lastChange > 1500) {
      renderer.setPixelRatio(Math.max(this.min, ratio - 0.25));
      this.lastChange = now;
    } else if (calm && ratio < this.max && now - this.calmSince > 3000 && now - this.lastChange > 3000) {
      renderer.setPixelRatio(Math.min(this.max, ratio + 0.25));
      this.lastChange = now;
    }
  }
};

// Phones: the scene manager (rockets, settlements, beacons) used to run once
// every 60 frames with its time step capped at 0.1 s, so rockets advanced at a
// tenth of real speed in once-a-second jumps. It is cheap and self-throttled
// for its heavy parts, so it now runs every frame (every third on low tier)
let _mobileSceneDelta = 0;

function renderFrame(timeMs) {
  if (postProcessing) postProcessing.render(timeMs);
  else renderer.render(scene, camera);
}
// Lets tooling grab a finished frame (the canvas is not preserveDrawingBuffer)
window.renderFrameForCapture = () => renderFrame(performance.now());

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
const MAX_SPEED = 0.30;          // Calmer top speed - easier to control on rough terrain
const REVERSE_SPEED_FACTOR = 0.55;
const ACCELERATION = 0.014;      // Gentler launch from rest
const DECELERATION = 0.022;      // Braking stays responsive
const COAST_DECEL = 0.008;       // Passive deceleration when no key held
const MAX_ROTATION_SPEED = 0.020; // Slightly quicker turn rate
const ROTATION_ACCEL = 0.003;    // Turn rate ramps up gradually
const BOOST_SPEED = MAX_SPEED * 4;  // Hold Space while driving forward to cover ground fast
const BOOST_ACCELERATION = 0.03;
const BOOST_RELEASE_DECEL = 0.012; // Bleeds back down to cruising speed when Space is released
let velocity = 0;                // Current velocity (-MAX_SPEED to +MAX_SPEED)
let rotationVelocity = 0;        // Current turn rate
let isMoving = false;
let currentSpeed = 0; // Track the current speed of the rover

function resetRoverMotion(clearInput = false) {
  velocity = 0;
  rotationVelocity = 0;
  if (clearInput) {
    keys.w = false;
    keys.a = false;
    keys.s = false;
    keys.d = false;
    keys[' '] = false;
    keys.boost = false;
  }
  if (typeof cameraSpring !== 'undefined' && cameraSpring.velocity) {
    cameraSpring.velocity.set(0, 0, 0);
  }
}

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

// Combined keydown handler to prevent duplicate listeners
const keydownHandler = (event) => {
  if (event.code === 'Space') event.preventDefault(); // boost, not "click the focused button"
  keys[event.key.toLowerCase()] = true;
  
  // Camera toggle functionality
  if (event.key.toLowerCase() === 'c') {
    toggleCameraMode();
  }
  
  // Day/night cycle toggle functionality
  if (event.key.toLowerCase() === 'l') {
    if (typeof toggleDayNight === 'function') {
      toggleDayNight();
    }
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
};

const keyupHandler = (event) => {
  keys[event.key.toLowerCase()] = false;
};

// Add event listeners using the centralized system
window.gameEventListeners.add(window, 'keydown', keydownHandler);
window.gameEventListeners.add(window, 'keyup', keyupHandler);
window.gameEventListeners.add(window, 'blur', () => resetRoverMotion(true));
window.gameEventListeners.add(document, 'visibilitychange', () => {
  if (document.hidden) resetRoverMotion(true);
});

const cameraSpring = { velocity: new THREE.Vector3() };

// Camera modes: a close chase cam, a first-person mast cam and a free orbit.
// The chase cam sits low and close behind the rover and looks out past it to
// the horizon, so the landscape stays the subject. Drag to look around,
// scroll to zoom; it eases back behind the rover once you drive off.
const cameraRig = {
  yaw: 0,                 // orbit offset from straight behind the rover (rad)
  pitch: 0.2,             // camera elevation above the rover (rad)
  defaultPitch: 0.2,
  // Phones are usually portrait (a narrow horizontal view), so sit further back
  distance: perfSettings.isMobile ? 12 : 8.5,
  minDistance: 4.5,
  maxDistance: 28,
  lookYaw: 0,             // first-person head turn relative to the rover
  lookPitch: -0.08,
  dragging: false,
  lastInput: -Infinity,
  fov: perfSettings.isMobile ? 70 : 62,
  firstPersonFov: 74,
  currentFov: camera.fov
};
// Above the front of the deck, ahead of the high-gain dish so nothing but the
// rover's nose sits in the view
const FIRST_PERSON_MOUNT = new THREE.Vector3(0, 2.3, -0.95);
const CAMERA_MODE_LABELS = { thirdPerson: 'Chase camera', firstPerson: 'Mast camera', orbit: 'Free orbit' };

// Change default camera mode to thirdPerson - Make globally accessible for mobile controls
window.cameraMode = 'thirdPerson'; // 'orbit', 'thirdPerson', 'firstPerson'
let cameraMode = window.cameraMode;

// Function to toggle between camera modes - Make globally accessible for mobile controls
window.toggleCameraMode = function toggleCameraMode() {
  const next = { thirdPerson: 'firstPerson', firstPerson: 'orbit', orbit: 'thirdPerson' };
  cameraMode = next[cameraMode] || 'thirdPerson';
  window.cameraMode = cameraMode;
  controls.enabled = cameraMode === 'orbit';
  if (cameraMode === 'orbit' && typeof rover !== 'undefined' && rover) {
    controls.target.copy(rover.position);
  }
  cameraRig.lookYaw = 0;
  cameraRig.lookPitch = -0.08;
  cameraRig.yaw = 0;
  if (typeof window.showGameToast === 'function') {
    window.showGameToast(CAMERA_MODE_LABELS[cameraMode] + '  ·  C to switch');
  }
};

// Drag-to-look and scroll-to-zoom for the chase and mast cameras (orbit mode
// uses OrbitControls). Mouse drags on the canvas, one-finger drags on the
// mobile touch area.
(function setupCameraLook() {
  let lastX = 0, lastY = 0;
  const begin = (x, y) => {
    if (cameraMode === 'orbit') return false;
    cameraRig.dragging = true;
    lastX = x; lastY = y;
    return true;
  };
  const move = (x, y, sensitivity) => {
    if (!cameraRig.dragging) return;
    const dx = (x - lastX) * sensitivity, dy = (y - lastY) * sensitivity;
    lastX = x; lastY = y;
    if (cameraMode === 'firstPerson') {
      cameraRig.lookYaw = THREE.MathUtils.clamp(cameraRig.lookYaw - dx * 0.0042, -2.6, 2.6);
      cameraRig.lookPitch = THREE.MathUtils.clamp(cameraRig.lookPitch - dy * 0.0036, -1.1, 0.9);
    } else {
      cameraRig.yaw -= dx * 0.0055;
      cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch + dy * 0.0042, -0.02, 1.25);
    }
    cameraRig.lastInput = performance.now();
  };
  const end = () => {
    cameraRig.dragging = false;
    cameraRig.lastInput = performance.now();
  };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // touch goes through the touch area
    if (begin(e.clientX, e.clientY)) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') move(e.clientX, e.clientY, 1); });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    if (cameraMode !== 'thirdPerson') return;
    e.preventDefault();
    cameraRig.distance = THREE.MathUtils.clamp(
      cameraRig.distance * Math.exp(e.deltaY * 0.0011), cameraRig.minDistance, cameraRig.maxDistance);
    cameraRig.lastInput = performance.now();
  }, { passive: false });

  const touchArea = document.getElementById('touch-camera-area');
  if (touchArea) {
    touchArea.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) begin(t.clientX, t.clientY);
    }, { passive: true });
    touchArea.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY, 1.4);
    }, { passive: true });
    touchArea.addEventListener('touchend', end, { passive: true });
    touchArea.addEventListener('touchcancel', end, { passive: true });
  }
})();

// Camera toggle is now handled in the main keydown handler to prevent duplicate listeners

// Add a variable to track the rover's yaw rotation separately - Make globally accessible for mobile controls
window.roverYaw = 0;
let roverYaw = window.roverYaw;

// Add a frame counter for performance optimization
let frameCount = 0;
let lastTime = 0;
let animationId = null; // Track animation frame ID for context loss handling
// Exactly one frame is ever queued. Resuming after a hidden tab or a context
// loss used to call animate() directly while the paused frame was still
// queued, leaving two loops that each moved the rover: double speed.
let animationFramePending = false;
function scheduleAnimationFrame() {
  if (animationFramePending || !window.gameAnimationRunning) return;
  animationFramePending = true;
  animationId = window.gameAnimationId = requestAnimationFrame((t) => {
    animationFramePending = false;
    animate(t);
  });
}

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
    // Disabled: this was a large horizontal additive plane at y=200. Viewed at
    // eye level it always rendered as a bright warm band across the horizon
    // (a visible seam where it met the dark sky) and washed the upper sky warm.
    // The update methods all guard on `this.atmosphericHaze`, so leaving it null
    // is safe. Ground dust + dust devils still provide atmosphere.
    this.atmosphericHaze = null;
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
      depthWrite: false // normal blending: additive made dust glow against the night sky
    });
    
    const dustParticles = new THREE.Points(geometry, material);
    dustDevilGroup.add(dustParticles);
    
    return dustDevilGroup;
  }

  spawnDustDevil(roverPosition) {
    // Find inactive dust devil
    for (let i = 0; i < this.dustDevilPool.length; i++) {
      const dustDevil = this.dustDevilPool[i];
      if (!dustDevil.userData.active) {
        // Spawn in view range of the rover (not around the world origin),
        // standing on the terrain
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 900;
        const cx = roverPosition ? roverPosition.x : 0;
        const cz = roverPosition ? roverPosition.z : 0;

        dustDevil.position.x = cx + Math.cos(angle) * distance;
        dustDevil.position.z = cz + Math.sin(angle) * distance;
        dustDevil.position.y = sampleTerrainHeight(dustDevil.position.x, dustDevil.position.z, 0);

        // Pooled devils keep the faded-out opacity from their last life
        const particles = dustDevil.children[0];
        if (particles && particles.material) particles.material.opacity = 0.6;

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
    
    // Spawn dust devils occasionally (rate is per 60 Hz frame)
    if (Math.random() < this.dustDevilSpawnRate * deltaSeconds * 60) {
      this.spawnDustDevil(roverPosition);
    }
    
    // Update active dust devils
    for (let i = this.dustDevils.length - 1; i >= 0; i--) {
      const dustDevil = this.dustDevils[i];
      
      if (dustDevil.userData.active) {
        dustDevil.userData.life += deltaSeconds;
        
        // Move dust devil
        dustDevil.position.x += Math.cos(dustDevil.userData.direction) * dustDevil.userData.speed * deltaSeconds;
        dustDevil.position.z += Math.sin(dustDevil.userData.direction) * dustDevil.userData.speed * deltaSeconds;
        dustDevil.position.y = sampleTerrainHeight(dustDevil.position.x, dustDevil.position.z, dustDevil.position.y);

        // Rotate dust devil
        dustDevil.rotation.y += dustDevil.userData.rotationSpeed * deltaSeconds;
        
        // Update particle positions for spiral effect
        const particles = dustDevil.children[0];
        if (particles && particles.material) {
          // Dust is lit by the sun: it should darken at night, not glow
          const day = typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0;
          particles.material.color.setScalar(0.12 + 0.88 * day);
        }
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


// ============================================================
// TESLA CYBERTRUCK TRAFFIC
// ============================================================
// World units are metres (the rover is ~3 m long, like Perseverance), so the
// trucks are modelled at their real dimensions: 5.68 m long, 2.03 m wide,
// 1.79 m tall, 3.67 m wheelbase on 35" tyres.
const CYBERTRUCK = {
  wheelbase: 3.665,
  track: 1.73,
  wheelRadius: 0.44,
  tireWidth: 0.29,
  noseZ: -2.83,  // model faces -Z, like the rover
  tailZ: 2.86,
  apexZ: 0.15,   // roof peak, just behind the B-pillar
  roofY: 1.791,
  windshieldZ: -1.2,
  cabinEndZ: 1.0
};
const MARS_GRAVITY = 3.71;

// Side-profile roof line: one straight rake from the nose to the apex, one
// straight line down to the tailgate - the Cybertruck's triangle silhouette.
function _ctTopY(z) {
  const c = CYBERTRUCK;
  if (z <= c.apexZ) return 0.98 + ((z - c.noseZ) / (c.apexZ - c.noseZ)) * (c.roofY - 0.98);
  return c.roofY + ((z - c.apexZ) / (c.tailZ - c.apexZ)) * (1.12 - c.roofY);
}

// Rocker line with the truck's angular, trapezoidal wheel arches
function _ctBottomY(z) {
  const half = CYBERTRUCK.wheelbase / 2;
  let y = 0.40;
  for (const axle of [-half, half]) {
    const d = Math.abs(z - axle);
    if (d < 0.66) y = Math.max(y, d <= 0.47 ? 0.97 : 0.97 - ((d - 0.47) / 0.19) * 0.57);
  }
  return y;
}

// Half-width of the top edge: full-width hood, greenhouse tapering to the
// roof, then the "vault" sails flaring back out toward the tailgate.
function _ctTopHalfWidth(z) {
  const c = CYBERTRUCK;
  if (z <= c.windshieldZ) return 0.95;
  if (z <= c.apexZ) return 0.95 - ((z - c.windshieldZ) / (c.apexZ - c.windshieldZ)) * 0.21;
  if (z <= 1.3) return 0.74 + ((z - c.apexZ) / (1.3 - c.apexZ)) * 0.23;
  return 0.97;
}

function _ctTopInset(z) {
  const c = CYBERTRUCK;
  if (z <= c.apexZ) return 0.07;
  if (z <= 1.3) return 0.07 + ((z - c.apexZ) / (1.3 - c.apexZ)) * 0.15;
  return 0.22;
}

// Accumulates triangles for one material, then emits a flat-shaded
// BufferGeometry with box-projected UVs and an optional dust gradient.
class _PartBuilder {
  constructor(dusty) {
    this.positions = [];
    this.dusty = dusty;
  }

  tri(a, b, c, outwardFrom) {
    // Wind the triangle so its normal faces away from `outwardFrom`
    if (outwardFrom) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * nx + ny * ny + nz * nz < 1e-12) return; // degenerate
      const cx = (a[0] + b[0] + c[0]) / 3 - outwardFrom[0];
      const cy = (a[1] + b[1] + c[1]) / 3 - outwardFrom[1];
      const cz = (a[2] + b[2] + c[2]) / 3 - outwardFrom[2];
      if (nx * cx + ny * cy + nz * cz < 0) { const t = b; b = c; c = t; }
    }
    this.positions.push(...a, ...b, ...c);
  }

  quad(a, b, c, d, outwardFrom) {
    this.tri(a, b, c, outwardFrom);
    this.tri(a, c, d, outwardFrom);
  }

  addGeometry(geometry, matrix) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i++) this.positions.push(p[i]);
    g.dispose();
  }

  addBox(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1)
    );
    const box = new THREE.BoxGeometry(w, h, d);
    this.addGeometry(box, m);
    box.dispose();
  }

  build() {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(this.positions);
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.computeVertexNormals(); // non-indexed => crisp faceted normals

    const normals = geometry.attributes.normal.array;
    const uvs = new Float32Array((pos.length / 3) * 2);
    const colors = new Float32Array(pos.length);
    for (let v = 0; v < pos.length / 3; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      const ax = Math.abs(normals[v * 3]), ay = Math.abs(normals[v * 3 + 1]), az = Math.abs(normals[v * 3 + 2]);
      // Box projection with U along the truck's length, so the brushed
      // grain runs front-to-back like the real stainless panels.
      if (ax >= ay && ax >= az) { uvs[v * 2] = z; uvs[v * 2 + 1] = y; }
      else if (ay >= az) { uvs[v * 2] = z; uvs[v * 2 + 1] = x; }
      else { uvs[v * 2] = x; uvs[v * 2 + 1] = y; }

      // Regolith dust caked on the lower body, fading out by the beltline
      let r = 1, g = 1, b = 1;
      if (this.dusty) {
        const t = Math.pow(Math.min(1, Math.max(0, (y - 0.38) / 0.75)), 0.8);
        r = 0.80 + 0.20 * t;
        g = 0.55 + 0.45 * t;
        b = 0.42 + 0.58 * t;
      }
      colors[v * 3] = r; colors[v * 3 + 1] = g; colors[v * 3 + 2] = b;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

// Build the Cybertruck as one geometry per material. Returns
// { stainless, glass, trim, frontLight, tailLight, tire, cover }.
function buildCybertruckGeometries() {
  const c = CYBERTRUCK;
  const stainless = new _PartBuilder(true);
  const glass = new _PartBuilder(false);
  const trim = new _PartBuilder(true);
  const frontLight = new _PartBuilder(false);
  const tailLight = new _PartBuilder(false);

  // --- Body: lofted through cross-sections at every profile breakpoint ---
  const half = c.wheelbase / 2;
  const zs = new Set([c.noseZ, c.windshieldZ, c.apexZ - 0.12, c.apexZ, c.cabinEndZ, 1.3, c.tailZ]);
  for (const axle of [-half, half]) {
    [-0.66, -0.47, 0.47, 0.66].forEach(o => zs.add(axle + o));
  }
  const stations = [...zs].filter(z => z >= c.noseZ && z <= c.tailZ).sort((a, b) => a - b);

  // Cross-section loop (right half, mirrored): bottom, crease, beltline,
  // top edge, top inset.
  const section = (z) => {
    const y0 = _ctBottomY(z);
    const yT = _ctTopY(z);
    const yBelt = Math.min(1.14, yT);
    const yC = Math.min(Math.max(0.78, y0 + 0.07), yBelt);
    const wT = _ctTopHalfWidth(z);
    const wI = wT - _ctTopInset(z);
    const right = [
      [0.955, y0, z], [1.013, yC, z], [1.0, yBelt, z], [wT, yT, z], [wI, yT, z]
    ];
    const left = right.map(p => [-p[0], p[1], p[2]]).reverse();
    return right.concat(left); // 10 points, loop order
  };

  const zoneOf = (z) => {
    if (z < c.windshieldZ) return 'hood';
    if (z < c.apexZ - 0.12) return 'windshield';
    if (z < c.apexZ) return 'roof';
    if (z < c.cabinEndZ) return 'rearGlass';
    return 'vault';
  };

  for (let s = 0; s < stations.length - 1; s++) {
    const za = stations[s], zb = stations[s + 1];
    const zm = (za + zb) / 2;
    const A = section(za), B = section(zb);
    const zone = zoneOf(zm);
    // Reference point inside the shell (between rocker and roof), used to
    // wind every face outward - including the wheel-arch ceilings
    const center = [0, (_ctBottomY(zm) + _ctTopY(zm)) / 2, zm];
    const greenhouse = zm > c.windshieldZ + 0.05 && zm < c.cabinEndZ && _ctTopY(zm) > 1.2;

    for (let e = 0; e < 10; e++) {
      const e2 = (e + 1) % 10;
      // Edge index: 0 lower side, 1 upper side, 2 greenhouse side, 3 top outer,
      // 4 top centre, 5..8 mirrored, 9 underbody
      const kind = e <= 4 ? e : (e === 9 ? 9 : 8 - e);
      let target = stainless;
      if (kind === 9) target = trim;
      else if (kind === 2 && greenhouse) target = glass;
      else if (kind === 4) {
        if (zone === 'windshield' || zone === 'rearGlass') target = glass;
        else if (zone === 'vault') target = trim; // tonneau cover
      }
      target.quad(A[e], A[e2], B[e2], B[e], center);
    }
  }

  // End caps (nose fascia and tailgate)
  [[c.noseZ, -1], [c.tailZ, 1]].forEach(([z, dir]) => {
    const pts = section(z);
    const mid = [0, 0.8, z];
    const inside = [0, 0.8, z - dir];
    for (let i = 0; i < pts.length; i++) {
      stainless.tri(mid, pts[i], pts[(i + 1) % pts.length], inside);
    }
  });

  // --- Lighting signatures: full-width front bar and tail bar ---
  frontLight.addBox(1.86, 0.035, 0.035, 0, _ctTopY(c.noseZ) - 0.02, c.noseZ - 0.012);
  tailLight.addBox(1.94, 0.04, 0.03, 0, 1.08, c.tailZ + 0.012);

  // Black lower valances front and rear
  trim.addBox(1.92, 0.2, 0.08, 0, 0.5, c.noseZ + 0.02);
  trim.addBox(1.96, 0.18, 0.08, 0, 0.5, c.tailZ - 0.02);

  // Angular black arch flares following each trapezoid arch
  for (const axle of [-half, half]) {
    const outline = [[axle - 0.66, 0.40], [axle - 0.47, 0.97], [axle + 0.47, 0.97], [axle + 0.66, 0.40]];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const [z1, y1] = outline[i];
        const [z2, y2] = outline[i + 1];
        const len = Math.hypot(z2 - z1, y2 - y1);
        const angle = Math.atan2(y2 - y1, z2 - z1);
        // Offset outward from the arch opening (up/away from the wheel)
        const ny = Math.cos(angle), nz = -Math.sin(angle);
        trim.addBox(0.08, 0.1, len + 0.08,
          side * 1.0, (y1 + y2) / 2 + ny * 0.05, (z1 + z2) / 2 + nz * 0.05,
          -angle, 0, 0);
      }
    }
  }

  // Door seams (panel gaps) and mirrors
  for (const side of [-1, 1]) {
    [-1.12, 0.05, 1.1].forEach(z => {
      const yBottom = _ctBottomY(z) + 0.04;
      const h = 1.12 - yBottom;
      trim.addBox(0.012, h, 0.014, side * 1.016, yBottom + h / 2, z);
    });
    trim.addBox(0.1, 0.1, 0.22, side * 1.09, 1.2, -1.05);
    trim.addBox(0.14, 0.04, 0.05, side * 1.02, 1.18, -1.1);
  }

  // --- Wheels (built at the origin; instanced per wheel) ---
  const tire = new _PartBuilder(false);
  const cover = new _PartBuilder(false);
  const tireGeom = new THREE.CylinderGeometry(c.wheelRadius, c.wheelRadius, c.tireWidth, 28, 1);
  tireGeom.rotateZ(Math.PI / 2);
  tire.addGeometry(tireGeom);
  tireGeom.dispose();
  // Chunky all-terrain tread blocks so rotation reads at a glance
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    tire.addBox(c.tireWidth * 0.92, 0.035, 0.08,
      0, Math.cos(a) * (c.wheelRadius + 0.012), Math.sin(a) * (c.wheelRadius + 0.012), a, 0, 0);
  }
  // Flat aero cover with six angular vanes
  const coverGeom = new THREE.CylinderGeometry(0.3, 0.3, c.tireWidth + 0.012, 6, 1);
  coverGeom.rotateZ(Math.PI / 2);
  cover.addGeometry(coverGeom);
  coverGeom.dispose();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    for (const side of [-1, 1]) {
      tire.addBox(0.012, 0.2, 0.035, side * (c.tireWidth / 2 + 0.008),
        Math.cos(a) * 0.15, Math.sin(a) * 0.15, a, 0, 0);
    }
  }

  return {
    stainless: stainless.build(),
    glass: glass.build(),
    trim: trim.build(),
    frontLight: frontLight.build(),
    tailLight: tailLight.build(),
    tire: tire.build(),
    cover: cover.build()
  };
}

// Brushed-steel roughness map: fine streaks along U (the truck's length)
function createBrushedSteelTexture() {
  const w = 512, h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    // Each row gets its own streak value; lengthwise variation is slow
    const rowBase = 150 + (Math.sin(y * 12.9898) * 43758.5453 % 1) * 40;
    for (let x = 0; x < w; x++) {
      const streak = Math.sin(x * 0.02 + y * 1.7) * 6 + Math.sin(x * 0.11 + y * 0.3) * 3;
      const v = Math.max(0, Math.min(255, rowBase + streak));
      const i = (y * w + x) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.6, 6);
  return tex;
}

// Arc-length parameterised polyline in the XZ plane
class TrafficPath {
  constructor(points, closed = false) {
    this.points = points;
    this.closed = closed;
    const n = points.length;
    this.segCount = closed ? n : n - 1;
    this.cum = [0];
    for (let i = 0; i < this.segCount; i++) {
      const a = points[i], b = points[(i + 1) % n];
      this.cum.push(this.cum[i] + Math.hypot(b.x - a.x, b.z - a.z));
    }
    this.length = this.cum[this.segCount];
  }

  // Writes position and unit tangent at arc length s into out {x, z, tx, tz}
  sample(s, out) {
    const L = this.length;
    s = this.closed ? ((s % L) + L) % L : Math.max(0, Math.min(L, s));
    let lo = 0, hi = this.segCount - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= s) lo = mid; else hi = mid - 1;
    }
    const a = this.points[lo], b = this.points[(lo + 1) % this.points.length];
    const segLen = (this.cum[lo + 1] - this.cum[lo]) || 1;
    const t = (s - this.cum[lo]) / segLen;
    out.x = a.x + (b.x - a.x) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.tx = (b.x - a.x) / segLen;
    out.tz = (b.z - a.z) / segLen;
    return out;
  }
}

// Suspended regolith kicked up by the trucks. Mars' thin air carries little
// dust, so plumes are faint and settle under 0.38 g rather than billowing.
class TruckDust {
  // options: size/grow (m), opacity, gravity (fraction of g), drag (1/s)
  constructor(scene, capacity, options = {}) {
    this.capacity = capacity;
    this.sizeBase = options.size ?? 0.8;
    this.sizeGrow = options.grow ?? 3.2;
    this.opacity = options.opacity ?? 0.32;
    this.gravity = options.gravity ?? 0.25;
    this.dragRate = options.drag ?? 1.2;
    this.next = 0;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity).fill(1);
    this.maxLife = new Float32Array(capacity).fill(1);
    this.alpha = new Float32Array(capacity);
    this.size = new Float32Array(capacity);

    const geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.posAttr);
    geometry.setAttribute('aAlpha', this.alphaAttr);
    geometry.setAttribute('aSize', this.sizeAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xc8895a) },
        uScale: { value: 400 }
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        uniform float uScale;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
          ${glslDisplayOut()}
        }
      `,
      transparent: true,
      depthWrite: false
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, life) {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = 0;
    this.maxLife[i] = life;
  }

  update(dt, lightLevel) {
    const drag = Math.max(0, 1 - this.dragRate * dt);
    for (let i = 0; i < this.capacity; i++) {
      const t = this.life[i] / this.maxLife[i];
      if (t >= 1) { this.alpha[i] = 0; continue; }
      this.life[i] += dt;
      this.vel[i * 3 + 1] -= MARS_GRAVITY * this.gravity * dt; // fines stay aloft longer than grit
      this.vel[i * 3] *= drag; this.vel[i * 3 + 1] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fadeIn = Math.min(1, t * 8);
      this.alpha[i] = fadeIn * Math.pow(1 - t, 1.6) * this.opacity;
      this.size[i] = this.sizeBase + t * this.sizeGrow;
    }
    this.posAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.material.uniforms.uColor.value.setRGB(0.78, 0.53, 0.35).multiplyScalar(0.12 + 0.88 * lightLevel);
    const pr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    this.material.uniforms.uScale.value = window.innerHeight * pr * 0.5;
  }
}

// All Cybertrucks share one set of instanced meshes (7 draw calls in total,
// instead of ~30 meshes per truck), and are simulated as vehicles: lane
// keeping, braking for traffic and the rover, U-turns at road ends,
// suspension that follows the terrain, spinning and steering wheels.
class CybertruckFleet {
  constructor(scene, capacity) {
    this.scene = scene;
    this.capacity = capacity;
    this.vehicles = [];

    const perf = getPerformanceSettings();
    const geoms = buildCybertruckGeometries();

    // Colours below are linear (three r140 legacy colour mode). Stainless
    // steel reflects ~55-65%; rubber and satin plastic only a few percent.
    const stainlessMat = new THREE.MeshStandardMaterial({
      color: 0xa4a7aa,
      metalness: 1.0,
      roughness: 0.34,
      roughnessMap: createBrushedSteelTexture(),
      vertexColors: true,
      envMapIntensity: 1.1
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b0e12,
      metalness: 0.0,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.4
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0b,
      metalness: 0.2,
      roughness: 0.75,
      vertexColors: true
    });
    this.frontLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf4f8ff,
      emissiveIntensity: 1.0
    });
    this.tailLightMat = new THREE.MeshStandardMaterial({
      color: 0x550008,
      emissive: 0xff1522,
      emissiveIntensity: 1.0
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x08080a, metalness: 0.0, roughness: 0.92 });
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.6, roughness: 0.45 });

    const makeInstanced = (geometry, material, count, castShadow) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      // InstancedMesh culls against the base geometry's bounds only, which
      // would hide trucks far from the origin
      mesh.frustumCulled = false;
      mesh.castShadow = castShadow && !perf.isMobile;
      mesh.receiveShadow = !perf.isMobile;
      scene.add(mesh);
      return mesh;
    };

    this.bodyMeshes = [
      makeInstanced(geoms.stainless, stainlessMat, capacity, true),
      makeInstanced(geoms.glass, glassMat, capacity, true),
      makeInstanced(geoms.trim, trimMat, capacity, true),
      makeInstanced(geoms.frontLight, this.frontLightMat, capacity, false),
      makeInstanced(geoms.tailLight, this.tailLightMat, capacity, false)
    ];
    this.stainlessMesh = this.bodyMeshes[0];
    this.wheelMeshes = [
      makeInstanced(geoms.tire, tireMat, capacity * 4, true),
      makeInstanced(geoms.cover, coverMat, capacity * 4, false)
    ];

    // Wrap/finish variety: mostly raw stainless, some heavily dusted,
    // a few satin-black wraps.
    this.stainlessMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.finishes = [
      new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1), new THREE.Color(0.97, 0.98, 1),
      new THREE.Color(0.9, 0.78, 0.68), new THREE.Color(0.18, 0.18, 0.19)
    ];

    // One shared headlight beam, parked on the truck nearest the camera at
    // night. A fixed light count avoids shader recompiles as trucks come
    // and go.
    this.headlight = null;
    if (!perf.isMobile) {
      this.headlight = new THREE.SpotLight(0xf2f6ff, 0, 70, Math.PI * 0.2, 0.55, 2);
      this.headlight.castShadow = false;
      scene.add(this.headlight);
      scene.add(this.headlight.target);
    }

    this.dust = perf.isMobile ? null : new TruckDust(scene, 700);

    // Scratch objects reused every frame
    this._sample = { x: 0, z: 0, tx: 0, tz: 1 };
    this._m = new THREE.Matrix4();
    this._wm = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._wheelOffsets = [
      [-CYBERTRUCK.track / 2, -CYBERTRUCK.wheelbase / 2, true],
      [CYBERTRUCK.track / 2, -CYBERTRUCK.wheelbase / 2, true],
      [-CYBERTRUCK.track / 2, CYBERTRUCK.wheelbase / 2, false],
      [CYBERTRUCK.track / 2, CYBERTRUCK.wheelbase / 2, false]
    ];
  }

  // options: { lane, cruise, s, dir, uturnReach, tag, dwell }
  // dwell: [min, max] seconds parked at each end of an open road (loading at
  // the mine, unloading at the plant) before turning round
  addVehicle(path, options = {}) {
    if (this.vehicles.length >= this.capacity) return null;
    const v = {
      path,
      tag: options.tag || null,
      lane: options.lane ?? 1.6,
      cruise: options.cruise ?? 14,
      uturnReach: options.uturnReach ?? 7,
      s: options.s ?? 0,
      dir: options.dir ?? 1,
      speed: options.speed ?? (options.cruise ?? 14) * 0.6,
      mode: 'drive',
      theta: 0,
      turn: null,
      position: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      yawRate: 0,
      accel: 0,
      steer: 0,
      spin: Math.random() * Math.PI * 2,
      finish: this.finishes[Math.floor(Math.random() * this.finishes.length)],
      dustCarry: 0,
      dwell: options.dwell || null,
      wait: 0,
      initialised: false
    };
    this.vehicles.push(v);
    return v;
  }

  removeWhere(predicate) {
    this.vehicles = this.vehicles.filter(v => !predicate(v));
  }

  count(tag) {
    let n = 0;
    for (const v of this.vehicles) if (v.tag === tag) n++;
    return n;
  }

  // True if moving the rover from (px,pz) to (x,z) drives it into a truck.
  // Movement that increases the gap is always allowed, so a truck that
  // stops alongside can never trap the rover.
  blocksRover(x, z, radius, px, pz) {
    for (const v of this.vehicles) {
      const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
      for (const along of [-1.45, 1.45]) {
        const cx = v.position.x + fx * along;
        const cz = v.position.z + fz * along;
        const min = radius + 1.2;
        const dNew = (x - cx) * (x - cx) + (z - cz) * (z - cz);
        if (dNew < min * min) {
          const dOld = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
          if (dNew < dOld) return true;
        }
      }
    }
    return false;
  }

  _placeOnPath(v, out) {
    const smp = v.path.sample(v.s, this._sample);
    const fx = smp.tx * v.dir, fz = smp.tz * v.dir;
    // Drive on the right: offset toward the right-hand side of travel
    out.x = smp.x - fz * v.lane;
    out.z = smp.z + fx * v.lane;
    out.fx = fx;
    out.fz = fz;
    return out;
  }

  update(dt, dayAmount, roverPos) {
    const ACCEL = 2.6;     // m/s^2 - relaxed Cybertruck launch
    const BRAKE = 4.2;     // m/s^2 - comfortable braking
    const UTURN_SPEED = 4.0;
    const place = { x: 0, z: 0, fx: 0, fz: -1 };

    for (const v of this.vehicles) {
      const prevYaw = v.yaw;
      const prevSpeed = v.speed;
      let targetSpeed = v.cruise;

      if (v.mode === 'drive') {
        const path = v.path;
        if (!path.closed) {
          const remain = v.dir > 0 ? path.length - v.s : v.s;
          // Stopping at the bay, or rolling into the U-turn
          const endSpeed = v.dwell ? 0 : UTURN_SPEED;
          targetSpeed = Math.min(targetSpeed,
            Math.sqrt(endSpeed * endSpeed + 2 * BRAKE * Math.max(0, remain - 1)));
          if (v.dwell && remain < 1.5 && v.speed < 0.6) {
            v.mode = 'dwell';
            v.wait = v.dwell[0] + Math.random() * (v.dwell[1] - v.dwell[0]);
            targetSpeed = 0;
          }
        }

        // Car following: keep a two-second gap to the truck ahead in lane
        for (const u of this.vehicles) {
          if (u === v || u.path !== path || u.dir !== v.dir || (u.mode !== 'drive' && u.mode !== 'dwell')) continue;
          let gap = (u.s - v.s) * v.dir;
          if (path.closed && gap < 0) gap += path.length;
          if (gap > 0 && gap < 45) {
            const safe = 8 + v.speed * 1.2;
            targetSpeed = Math.min(targetSpeed, Math.max(0, u.speed + (gap - safe) * 0.6));
          }
        }
      } else if (v.mode === 'dwell') {
        targetSpeed = 0;
        v.wait -= dt;
        if (v.wait <= 0) {
          // Loaded (or emptied): swing round and head back
          const smp = v.path.sample(v.s, this._sample);
          const tfx = smp.tx * v.dir, tfz = smp.tz * v.dir;
          v.turn = { cx: smp.x, cz: smp.z, fx: tfx, fz: tfz, rx: -tfz, rz: tfx };
          v.mode = 'uturn';
          v.theta = 0;
        }
      } else {
        targetSpeed = UTURN_SPEED;
      }

      // Stop for the rover if it is in the lane ahead
      if (roverPos && v.initialised) {
        const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
        const dx = roverPos.x - v.position.x, dz = roverPos.z - v.position.z;
        const along = dx * fx + dz * fz;
        const lateral = Math.abs(dx * -fz + dz * fx);
        if (along > 0 && along < 26 && lateral < 2.6) {
          targetSpeed = Math.min(targetSpeed, Math.max(0, (along - 7.5) * 0.9));
        }
      }

      const dv = targetSpeed - v.speed;
      v.speed = Math.max(0, v.speed + Math.max(-BRAKE * 1.6 * dt, Math.min(ACCEL * dt, dv)));
      v.accel = dt > 0 ? (v.speed - prevSpeed) / dt : 0;

      let fx, fz;
      if (v.mode === 'drive') {
        v.s += v.dir * v.speed * dt;
        const path = v.path;
        if (path.closed) {
          v.s = ((v.s % path.length) + path.length) % path.length;
        } else if (v.s > path.length || v.s < 0) {
          // Reached the end of the road: swing round in a U-turn
          v.s = Math.max(0, Math.min(path.length, v.s));
          const smp = path.sample(v.s, this._sample);
          const tfx = smp.tx * v.dir, tfz = smp.tz * v.dir;
          v.turn = { cx: smp.x, cz: smp.z, fx: tfx, fz: tfz, rx: -tfz, rz: tfx };
          v.mode = 'uturn';
          v.theta = 0;
        }
      }

      if (v.mode === 'uturn') {
        const t = v.turn;
        const effR = Math.sqrt((v.lane * v.lane + v.uturnReach * v.uturnReach) / 2);
        v.theta += (v.speed * dt) / effR;
        if (v.theta >= Math.PI) {
          v.mode = 'drive';
          v.dir = -v.dir;
          v.turn = null;
        } else {
          const cs = Math.cos(v.theta), sn = Math.sin(v.theta);
          v.position.x = t.cx + t.rx * v.lane * cs + t.fx * v.uturnReach * sn;
          v.position.z = t.cz + t.rz * v.lane * cs + t.fz * v.uturnReach * sn;
          fx = -t.rx * v.lane * sn + t.fx * v.uturnReach * cs;
          fz = -t.rz * v.lane * sn + t.fz * v.uturnReach * cs;
          const len = Math.hypot(fx, fz) || 1;
          fx /= len; fz /= len;
        }
      }
      if (v.mode === 'drive' || v.mode === 'dwell') {
        this._placeOnPath(v, place);
        v.position.x = place.x;
        v.position.z = place.z;
        fx = place.fx;
        fz = place.fz;
      }

      // Heading, eased so path vertices never snap the body round
      const targetYaw = Math.atan2(-fx, -fz);
      if (!v.initialised) {
        v.yaw = targetYaw;
      } else {
        let dyaw = targetYaw - v.yaw;
        dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        v.yaw += dyaw * Math.min(1, dt * 9);
      }
      let yawStep = v.yaw - prevYaw;
      yawStep = Math.atan2(Math.sin(yawStep), Math.cos(yawStep));
      v.yawRate = v.initialised && dt > 0 ? yawStep / dt : 0;

      // Suspension: fit the body to the ground under all four tyres
      const sy = Math.sin(v.yaw), cy = Math.cos(v.yaw);
      const ffx = -sy, ffz = -cy;   // forward
      const rrx = cy, rrz = -sy;    // right
      const hb = CYBERTRUCK.wheelbase / 2, ht = CYBERTRUCK.track / 2;
      const px = v.position.x, pz = v.position.z;
      const hFL = sampleTerrainHeight(px + ffx * hb - rrx * ht, pz + ffz * hb - rrz * ht);
      const hFR = sampleTerrainHeight(px + ffx * hb + rrx * ht, pz + ffz * hb + rrz * ht);
      const hRL = sampleTerrainHeight(px - ffx * hb - rrx * ht, pz - ffz * hb - rrz * ht);
      const hRR = sampleTerrainHeight(px - ffx * hb + rrx * ht, pz - ffz * hb + rrz * ht);
      const roadLift = 0.13; // tyres ride on the graded road surface
      const targetY = (hFL + hFR + hRL + hRR) / 4 + roadLift;
      let targetPitch = Math.atan2((hFL + hFR) - (hRL + hRR), 2 * CYBERTRUCK.wheelbase);
      let targetRoll = Math.atan2((hFR + hRR) - (hFL + hRL), 2 * CYBERTRUCK.track);
      // Weight transfer: nose dives under braking, body leans out of turns
      targetPitch += Math.max(-0.035, Math.min(0.035, v.accel * 0.006));
      targetRoll += Math.max(-0.045, Math.min(0.045, -v.yawRate * v.speed * 0.006));

      if (!v.initialised) {
        v.position.y = targetY;
        v.pitch = targetPitch;
        v.roll = targetRoll;
        v.initialised = true;
      } else {
        const k = Math.min(1, dt * 10);
        v.position.y += (targetY - v.position.y) * Math.min(1, dt * 16);
        v.position.y = Math.max(v.position.y, targetY - 0.06);
        v.pitch += (targetPitch - v.pitch) * k;
        v.roll += (targetRoll - v.roll) * k;
      }

      // Wheels: roll with distance travelled, steer with the turn rate
      v.spin -= (v.speed * dt) / CYBERTRUCK.wheelRadius;
      const targetSteer = v.speed > 0.5
        ? Math.atan((CYBERTRUCK.wheelbase * v.yawRate) / v.speed)
        : v.steer;
      v.steer += (Math.max(-0.6, Math.min(0.6, targetSteer)) - v.steer) * Math.min(1, dt * 8);
    }

    this._writeInstances();
    this._updateLights(dayAmount);
    this._updateDust(dt, dayAmount);
  }

  _writeInstances() {
    const n = this.vehicles.length;
    for (let i = 0; i < n; i++) {
      const v = this.vehicles[i];
      this._e.set(v.pitch, v.yaw, v.roll, 'YXZ');
      this._q.setFromEuler(this._e);
      this._m.compose(v.position, this._q, this._s);
      for (const mesh of this.bodyMeshes) mesh.setMatrixAt(i, this._m);
      this.stainlessMesh.setColorAt(i, v.finish);

      for (let w = 0; w < 4; w++) {
        const [wx, wz, front] = this._wheelOffsets[w];
        this._e.set(v.spin, front ? v.steer : 0, 0, 'YXZ');
        this._q.setFromEuler(this._e);
        this._p.set(wx, CYBERTRUCK.wheelRadius, wz);
        this._wm.compose(this._p, this._q, this._s).premultiply(this._m);
        for (const mesh of this.wheelMeshes) mesh.setMatrixAt(i * 4 + w, this._wm);
      }
    }
    for (const mesh of this.bodyMeshes) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const mesh of this.wheelMeshes) {
      mesh.count = n * 4;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.stainlessMesh.instanceColor) this.stainlessMesh.instanceColor.needsUpdate = true;
  }

  _updateLights(dayAmount) {
    const night = 1 - dayAmount;
    // Daytime running lights stay visible; at night the bars bloom
    this.frontLightMat.emissiveIntensity = 0.9 + night * 1.8;
    this.tailLightMat.emissiveIntensity = 0.7 + night * 1.6;

    if (!this.headlight) return;
    let best = null, bestD = 160 * 160;
    for (const v of this.vehicles) {
      const dx = v.position.x - camera.position.x, dz = v.position.z - camera.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = v; }
    }
    if (!best || night < 0.05) {
      this.headlight.intensity = 0;
      return;
    }
    const fx = -Math.sin(best.yaw), fz = -Math.cos(best.yaw);
    this.headlight.position.set(
      best.position.x + fx * 2.9,
      best.position.y + 0.95,
      best.position.z + fz * 2.9
    );
    this.headlight.target.position.set(
      best.position.x + fx * 28,
      best.position.y - 1.5,
      best.position.z + fz * 28
    );
    this.headlight.target.updateMatrixWorld();
    this.headlight.intensity = lampIntensity(2.6, 70, 14) * night;
  }

  _updateDust(dt, dayAmount) {
    if (!this.dust) return;
    const cam = camera.position;
    for (const v of this.vehicles) {
      const dx = v.position.x - cam.x, dz = v.position.z - cam.z;
      if (dx * dx + dz * dz > 260 * 260 || v.speed < 2) continue;
      // Emission scales with speed; carry fractional particles between frames
      v.dustCarry += v.speed * dt * 0.9;
      const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
      const rx = -fz, rz = fx;
      while (v.dustCarry >= 1) {
        v.dustCarry -= 1;
        const side = Math.random() < 0.5 ? -1 : 1;
        const ex = v.position.x - fx * 1.95 + rx * side * 0.87;
        const ez = v.position.z - fz * 1.95 + rz * side * 0.87;
        const kick = v.speed * 0.25;
        this.dust.emit(
          ex, v.position.y + 0.15, ez,
          -fx * kick + (Math.random() - 0.5) * 1.5,
          0.6 + Math.random() * 1.2,
          -fz * kick + (Math.random() - 0.5) * 1.5,
          1.8 + Math.random() * 1.6
        );
      }
    }
    this.dust.update(dt, 0.1 + 0.9 * dayAmount);
  }
}

// Continuous road ribbon draped over the terrain along a polyline, with
// mitred joins so bends have no gaps or overlapping z-fighting slabs.
function buildDrapedRibbon(points, halfWidth, lift, closed = false) {
  const n = points.length;
  const verts = [];
  const lefts = [], rights = [];
  for (let i = 0; i < n; i++) {
    const prev = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x, dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const lx = points[i].x - dz * halfWidth, lz = points[i].z + dx * halfWidth;
    const rx = points[i].x + dz * halfWidth, rz = points[i].z - dx * halfWidth;
    lefts.push([lx, sampleTerrainHeight(lx, lz) + lift, lz]);
    rights.push([rx, sampleTerrainHeight(rx, rz) + lift, rz]);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    // Wound so the face normal points up (roads are single-sided)
    verts.push(...lefts[i], ...lefts[j], ...rights[i]);
    verts.push(...lefts[j], ...rights[j], ...rights[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

// Evenly spaced points along a straight line or a smoothed curve
function resamplePath(controlPoints, spacing, closed = false) {
  if (controlPoints.length === 2 && !closed) {
    const [a, b] = controlPoints;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(len / spacing));
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(new THREE.Vector3().lerpVectors(a, b, i / steps));
    return pts;
  }
  const curve = new THREE.CatmullRomCurve3(controlPoints, closed, 'centripetal');
  const count = Math.max(8, Math.ceil(curve.getLength() / spacing));
  const pts = curve.getSpacedPoints(count);
  if (closed) pts.pop(); // last point duplicates the first
  return pts;
}

// Round turnaround pad draped over the terrain
function buildDrapedDisc(cx, cz, radius, lift) {
  const rings = 4, sectors = 24;
  const verts = [];
  const at = (r, a) => {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    return [x, sampleTerrainHeight(x, z) + lift, z];
  };
  for (let ri = 0; ri < rings; ri++) {
    const r0 = (ri / rings) * radius, r1 = ((ri + 1) / rings) * radius;
    for (let s = 0; s < sectors; s++) {
      const a0 = (s / sectors) * Math.PI * 2, a1 = ((s + 1) / sectors) * Math.PI * 2;
      const p00 = at(r0, a0), p01 = at(r0, a1), p10 = at(r1, a0), p11 = at(r1, a1);
      verts.push(...p00, ...p01, ...p10);
      verts.push(...p10, ...p01, ...p11);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}


// ---------------------------------------------------------------------------
// Shared helpers for merged, low-draw-call architecture
// ---------------------------------------------------------------------------

// Transform matrix from position, Euler rotation and scale
function _xf(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, order)),
    new THREE.Vector3(sx, sy, sz)
  );
}

// Merge [{ geometry, matrix }] into one non-indexed geometry, keeping each
// part's own (smooth) normals and UVs. Source geometries are disposed.
function mergeGeometryList(parts) {
  const prepared = [];
  let count = 0;
  for (const { geometry, matrix } of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (matrix) g.applyMatrix4(matrix);
    prepared.push(g);
    count += g.attributes.position.count;
  }
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of prepared) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

// Merge [{ geometry, matrix }] into one indexed geometry in a single pass,
// writing straight into preallocated buffers (mergeGeometryList's per-part
// toNonIndexed() + clone was the bulk of a settlement's build time). Source
// geometries are disposed.
const _mergeNormalMatrix = new THREE.Matrix3();
function mergeGeometryListIndexed(parts) {
  let vertexCount = 0, indexCount = 0;
  for (const { geometry } of parts) {
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const n = geometry.attributes.position.count;
    vertexCount += n;
    indexCount += geometry.index ? geometry.index.count : n;
  }
  const pos = new Float32Array(vertexCount * 3);
  const nor = new Float32Array(vertexCount * 3);
  const uv = new Float32Array(vertexCount * 2);
  const index = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

  let vo = 0, io = 0;
  for (const { geometry, matrix } of parts) {
    const p = geometry.attributes.position;
    const nAttr = geometry.attributes.normal;
    const tAttr = geometry.attributes.uv;
    const e = matrix.elements;
    const q = _mergeNormalMatrix.getNormalMatrix(matrix).elements;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const o = (vo + i) * 3;
      pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
      pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx = nAttr.getX(i), ny = nAttr.getY(i), nz = nAttr.getZ(i);
      const tx = q[0] * nx + q[3] * ny + q[6] * nz;
      const ty = q[1] * nx + q[4] * ny + q[7] * nz;
      const tz = q[2] * nx + q[5] * ny + q[8] * nz;
      const len = Math.hypot(tx, ty, tz) || 1;
      nor[o] = tx / len; nor[o + 1] = ty / len; nor[o + 2] = tz / len;
      if (tAttr) {
        uv[(vo + i) * 2] = tAttr.getX(i);
        uv[(vo + i) * 2 + 1] = tAttr.getY(i);
      }
    }
    if (geometry.index) {
      const src = geometry.index.array;
      for (let k = 0; k < src.length; k++) index[io + k] = src[k] + vo;
      io += src.length;
    } else {
      for (let k = 0; k < p.count; k++) index[io + k] = vo + k;
      io += p.count;
    }
    vo += p.count;
    geometry.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}

// Merge [[parts, hexColour], ...] into one geometry carrying a per-vertex
// colour, so a multi-coloured object (e.g. a white booster with black
// interstage and grey engines) costs a single draw call.
function mergeColoredGeometryLists(groups) {
  const merged = groups
    .filter(([parts]) => parts.length)
    .map(([parts, hex]) => [mergeGeometryList(parts), new THREE.Color(hex)]);
  let count = 0;
  merged.forEach(([g]) => { count += g.attributes.position.count; });
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = new Float32Array(count * 3);
  let o = 0;
  for (const [g, c] of merged) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    for (let i = 0; i < n; i++) {
      col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b;
    }
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Collapse a group of static meshes into one mesh per material and shadow
// setting, flattening the hierarchy. Procedural settlements are assembled
// from hundreds of small meshes; drawn as-is, the ~20 in range cost ~1,600
// draw calls a frame. Anything that isn't a plain mesh is kept as it is.
function mergeStaticGroup(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const kept = [];
  group.traverse(obj => {
    if (obj === group) return;
    const mergeable = obj.isMesh && obj.visible && !obj.isInstancedMesh && !obj.isSkinnedMesh &&
      !Array.isArray(obj.material) && !obj.geometry.morphAttributes.position;
    if (mergeable) {
      const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}${obj.receiveShadow ? 1 : 0}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material: obj.material, castShadow: obj.castShadow, receiveShadow: obj.receiveShadow, parts: [] };
        buckets.set(key, bucket);
      }
      bucket.parts.push({ geometry: obj.geometry, matrix: obj.matrixWorld.clone() });
    } else if (!obj.isMesh && (obj.isLine || obj.isPoints || obj.isSprite || obj.isLight)) {
      kept.push(obj);
    } else if (obj.isMesh) {
      kept.push(obj);
    }
  });
  // The group sits at the origin, so world matrices are group-local
  kept.forEach(obj => group.attach(obj));
  group.clear();
  kept.forEach(obj => group.add(obj));
  for (const bucket of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometryListIndexed(bucket.parts), bucket.material);
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    group.add(mesh);
  }
  return group;
}

// Roughen a geometry so regolith berms and shielding mounds read as heaped
// soil rather than machined shapes. Displacement is a function of position,
// so coincident vertices move together and no cracks open.
function lumpify(geometry, amount, scale = 0.35) {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * scale * 1.3 + z * scale * 0.7) * Math.cos(z * scale * 1.1 - y * scale * 0.9) +
              0.5 * Math.sin(x * scale * 3.1 - y * scale * 2.3 + z * scale * 2.7);
    const len = Math.hypot(x, y, z) || 1;
    const k = 1 + (n * amount) / len;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Starship spaceport
// ---------------------------------------------------------------------------

// Ship proportions (m). gear = height of the thrust puck above the landing
// feet; the ship stands 52.8 m tall on its legs, 9 m in diameter.
const STARSHIP = { radius: 4.5, gear: 2.8, barrel: 39, nose: 11 };

// Geometries for one ship: stainless (leeward), black heat-shield tiles
// (windward, local +Z) and engines.
function buildStarshipGeometries() {
  const R = STARSHIP.radius, G = STARSHIP.gear, B = STARSHIP.barrel, N = STARSHIP.nose;
  const steel = [], tiles = [], engines = [];
  const add = (list, geometry, matrix = null) => list.push({ geometry, matrix });

  // Barrel, split down the middle: tiles on the belly, bare steel on the back
  add(tiles, new THREE.CylinderGeometry(R, R, B, 48, 1, true, -Math.PI / 2, Math.PI), _xf(0, G + B / 2, 0));
  add(steel, new THREE.CylinderGeometry(R, R, B, 48, 1, true, Math.PI / 2, Math.PI), _xf(0, G + B / 2, 0));

  // Ogive nose
  const profile = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    profile.push(new THREE.Vector2(Math.max(0.2, R * Math.pow(1 - t * t, 0.55)), G + B + t * N));
  }
  add(tiles, new THREE.LatheGeometry(profile, 48, -Math.PI / 2, Math.PI));
  add(steel, new THREE.LatheGeometry(profile, 48, Math.PI / 2, Math.PI));

  // Flaps: plates on either side, tiled on their windward face
  for (const side of [-1, 1]) {
    // forward flaps, near the nose
    add(tiles, new THREE.BoxGeometry(2.6, 7, 0.2), _xf(side * (R + 1.0), G + B + 1.5, R * 0.35 + 0.1, 0, 0, side * -0.18));
    add(steel, new THREE.BoxGeometry(2.6, 7, 0.2), _xf(side * (R + 1.0), G + B + 1.5, R * 0.35 - 0.1, 0, 0, side * -0.18));
    // aft flaps
    add(tiles, new THREE.BoxGeometry(3.8, 11, 0.25), _xf(side * (R + 1.6), G + 8, R * 0.35 + 0.12));
    add(steel, new THREE.BoxGeometry(3.8, 11, 0.25), _xf(side * (R + 1.6), G + 8, R * 0.35 - 0.12));
  }

  // Six landing legs (Mars ships land on unprepared ground)
  const legTop = G + 3, legOut = 1.3;
  const legLen = Math.hypot(legOut, legTop);
  const tilt = Math.atan2(legOut, legTop);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const midR = R - 0.4 + legOut / 2;
    add(steel, new THREE.BoxGeometry(0.5, legLen, 0.7),
      _xf(Math.cos(a) * midR, legTop / 2, -Math.sin(a) * midR, 0, a, tilt, 1, 1, 1, 'YXZ'));
    const footR = R - 0.4 + legOut;
    add(steel, new THREE.CylinderGeometry(0.8, 0.9, 0.3, 12), _xf(Math.cos(a) * footR, 0.15, -Math.sin(a) * footR));
  }

  // Thrust puck and six Raptors: three sea-level, three vacuum bells
  add(engines, new THREE.CircleGeometry(R, 40), _xf(0, G, 0, Math.PI / 2));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    add(engines, new THREE.CylinderGeometry(0.34, 0.66, 1.5, 18, 1, true), _xf(Math.cos(a) * 1.25, G - 0.75, Math.sin(a) * 1.25));
    const b = a + Math.PI / 3;
    add(engines, new THREE.CylinderGeometry(0.5, 1.2, 2.4, 20, 1, true), _xf(Math.cos(b) * 2.9, G - 1.2, Math.sin(b) * 2.9));
  }

  return {
    steel: mergeGeometryList(steel),
    tiles: mergeGeometryList(tiles),
    engines: mergeGeometryList(engines)
  };
}

// Engine plume: an open cone widened in the vertex shader, glowing from a
// blue-white core to a faint orange tail. Mars' thin air lets it fan out.
function createPlumeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLen: { value: 40 },
      uR0: { value: 3.2 },
      uR1: { value: 9 },
      uThrottle: { value: 0 },
      uCore: { value: new THREE.Color(2.2, 2.1, 2.4) },
      uOuter: { value: new THREE.Color(1.5, 0.62, 0.22) }
    },
    vertexShader: `
      uniform float uLen, uR0, uR1;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float t = clamp(-position.y, 0.0, 1.0);
        vT = t;
        vec3 p = position;
        p.xz *= mix(uR0, uR1, pow(t, 0.7));
        p.y *= uLen;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = -mv.xyz;
        vN = normalMatrix * normal;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uThrottle;
      uniform vec3 uCore, uOuter;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float a = pow(facing, 1.5) * pow(1.0 - vT, 1.7) * uThrottle;
        vec3 col = mix(uCore, uOuter, smoothstep(0.03, 0.5, vT));
        gl_FragColor = vec4(col, a);
        ${glslDisplayOut(4.0)}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false
  });
}

// Entry plasma sheath hugging the heat shield
function createPlasmaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uHeat: { value: 0 } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        vN = normalMatrix * normal;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uHeat;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float a = uHeat * (0.25 + 0.75 * pow(1.0 - facing, 1.4));
        gl_FragColor = vec4(1.0, 0.45 + 0.2 * facing, 0.22, a);
        ${glslDisplayOut(3.0)}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
}

// ---------------------------------------------------------------------------
// Falcon Heavy: a core plus two side boosters (3.7 m wide, ~42 m tall) and an
// upper stage under a payload fairing. Each part is a few merged meshes.
// Local frame: engine plane at y = 0, nose up +Y.
// ---------------------------------------------------------------------------
const FALCON = {
  R: 1.83,
  boosterLen: 42,
  sideNose: 5.5,
  interstage: 4.5,
  upperLen: 12.5,
  fairingR: 2.6,
  fairingLen: 13,
  sideOffset: 4.05, // side booster centre from the core centre
  legReach: 5.2,
  legDrop: 1.9      // deployed feet sit this far below the engine plane
};

function buildFalconBoosterGeometries(isCore) {
  const { R, boosterLen: L } = FALCON;
  const white = [], black = [], engines = [], legs = [];
  const add = (list, geometry, matrix) => list.push({ geometry, matrix });

  add(white, new THREE.CylinderGeometry(R, R, L, 28, 1, true), _xf(0, L / 2, 0));
  // Octaweb skirt and the thin black bands where the tanks join
  add(black, new THREE.CylinderGeometry(R * 1.02, R * 1.05, 1.6, 28), _xf(0, 0.8, 0));
  add(black, new THREE.CylinderGeometry(R * 1.005, R * 1.005, 0.35, 28, 1, true), _xf(0, L * 0.62, 0));
  if (isCore) {
    // Black carbon interstage (the upper stage sits on top of it)
    add(black, new THREE.CylinderGeometry(R, R, FALCON.interstage, 28), _xf(0, L + FALCON.interstage / 2, 0));
  } else {
    // Side boosters carry an aerodynamic nose cone
    const profile = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      profile.push(new THREE.Vector2(Math.max(0.08, R * Math.pow(1 - t, 0.6)), L + t * FALCON.sideNose));
    }
    add(white, new THREE.LatheGeometry(profile, 28), null);
  }
  // Four titanium grid fins near the top, and the folded landing legs
  const finY = L - 1.6;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(a), s = Math.sin(a);
    add(black, new THREE.BoxGeometry(1.5, 1.2, 0.18), _xf(c * (R + 0.55), finY, s * (R + 0.55), 0, -a + Math.PI / 2, 0));
    add(black, new THREE.BoxGeometry(0.5, 9.5, 0.16), _xf(c * (R + 0.06), 5.5, s * (R + 0.06), 0, -a + Math.PI / 2, 0));
    // Deployed legs: struts angled out to a foot below the engines
    const reach = FALCON.legReach, drop = FALCON.legDrop, topY = 7.5;
    const dx = reach - R, dy = topY + drop;
    const len = Math.hypot(dx, dy);
    const tilt = Math.atan2(dx, dy);
    add(legs, new THREE.BoxGeometry(0.45, len, 0.3),
      _xf(c * (R + dx / 2), topY - dy / 2, s * (R + dx / 2), 0, -a, tilt, 1, 1, 1, 'YXZ'));
    add(legs, new THREE.CylinderGeometry(0.45, 0.55, 0.25, 10), _xf(c * reach, -drop + 0.12, s * reach));
  }
  // Nine Merlins: eight in a ring and one in the middle
  add(engines, new THREE.CylinderGeometry(0.2, 0.42, 1.1, 14, 1, true), _xf(0, -0.55, 0));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    add(engines, new THREE.CylinderGeometry(0.2, 0.42, 1.1, 14, 1, true), _xf(Math.cos(a) * 1.15, -0.55, Math.sin(a) * 1.15));
  }
  return {
    body: mergeColoredGeometryLists([[white, 0xd6d5d0], [black, 0x151517], [engines, 0x3a3632]]),
    legs: mergeColoredGeometryLists([[legs, 0x151517]])
  };
}

function buildFalconUpperGeometries() {
  const { R, upperLen: U, fairingR: FR, fairingLen: FL } = FALCON;
  const white = [], black = [];
  white.push({ geometry: new THREE.CylinderGeometry(R, R, U, 28, 1, true), matrix: _xf(0, U / 2, 0) });
  black.push({ geometry: new THREE.CylinderGeometry(R * 0.6, FR, 1.4, 28, 1, true), matrix: _xf(0, U + 0.7, 0) });
  // Payload fairing: a short barrel and an ogive
  white.push({ geometry: new THREE.CylinderGeometry(FR, FR, FL * 0.45, 28, 1, true), matrix: _xf(0, U + 1.4 + FL * 0.225, 0) });
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    profile.push(new THREE.Vector2(Math.max(0.1, FR * Math.pow(1 - t * t, 0.6)), U + 1.4 + FL * 0.45 + t * FL * 0.55));
  }
  white.push({ geometry: new THREE.LatheGeometry(profile, 28), matrix: null });
  return mergeColoredGeometryLists([[white, 0xd6d5d0], [black, 0x151517]]);
}

// Falcon Heavy flights from their own launch complex beside the Starship
// spaceport: all 27 engines light, the stack climbs and pitches downrange,
// the side boosters peel away, flip, burn back and land side by side, then
// the centre core does the same while the upper stage carries on to orbit.
class FalconHeavyFleet {
  // options: count, plumeGeom, flareTex, and optionally a site of its own
  // ({ x, z, ux, uz }: centre and unit vector toward the colony; launches
  // head the other way) with padCount / padSpacing / padU / zoneU in metres
  constructor(spaceport, options) {
    this.port = spaceport;
    this.scene = spaceport.scene;
    const count = options.count;
    this.plumeGeom = options.plumeGeom;
    this.flareTex = options.flareTex;
    const site = options.site || spaceport.site;
    this.U = { x: site.ux, z: site.uz };
    this.V = { x: -site.uz, z: site.ux };
    this.downrange = { x: -site.ux, z: -site.uz };
    this.local = (u, v) => ({ x: site.x + this.U.x * u + this.V.x * v, z: site.z + this.U.z * u + this.V.z * v });
    const padCount = options.padCount || 3;
    const padSpacing = options.padSpacing || 170;
    const padU = options.padU ?? -215;
    const zoneU = options.zoneU ?? -335;
    const timerOffset = options.timerOffset || 0;

    // Scratch objects (no per-frame allocation)
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this._qYaw = new THREE.Quaternion();
    this._qTilt = new THREE.Quaternion();
    this._qTarget = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._axis = new THREE.Vector3();

    // Launch pads further from the colony than the Starship line; each
    // rocket has three landing zones out beyond them (downrange side)
    this.pads = [];
    this.zones = [];
    for (let i = 0; i < padCount; i++) {
      const v = (i - (padCount - 1) / 2) * padSpacing;
      const p = this.local(padU, v);
      this.pads.push({ x: p.x, z: p.z, y: sampleTerrainHeight(p.x, p.z) + 1.0 });
      const set = [];
      for (let k = 0; k < 3; k++) {
        const q = this.local(zoneU, v + (k - 1) * 42);
        set.push({ x: q.x, z: q.z, y: sampleTerrainHeight(q.x, q.z) + 0.4 });
      }
      this.zones.push(set);
    }
    this._buildGround();

    const boosterGeoms = { side: buildFalconBoosterGeometries(false), core: buildFalconBoosterGeometries(true) };
    const upperGeoms = buildFalconUpperGeometries();
    // One vertex-coloured material: each booster and upper stage is one draw
    this.bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.25, side: THREE.DoubleSide, fog: false });

    this.rockets = [];
    for (let i = 0; i < count; i++) {
      const pad = this.pads[i % this.pads.length];
      const zones = this.zones[i % this.zones.length];
      const boosters = [
        this._makeBooster(boosterGeoms.side, -1, zones[0]),
        this._makeBooster(boosterGeoms.core, 0, zones[1]),
        this._makeBooster(boosterGeoms.side, 1, zones[2])
      ];
      const upper = new THREE.Mesh(upperGeoms, this.bodyMat);
      upper.castShadow = true;
      this.scene.add(upper);
      const rocket = {
        pad, boosters, upper,
        state: 'pad',
        t: 0,
        timer: timerOffset + 12 + i * 35 + Math.random() * 15,
        pos: new THREE.Vector3(pad.x, pad.y, pad.z),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        upperAttached: true
      };
      this._resetOnPad(rocket);
      this.rockets.push(rocket);
    }
  }

  _makeBooster(geoms, side, zone) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(geoms.body, this.bodyMat);
    const legs = new THREE.Mesh(geoms.legs, this.bodyMat);
    body.castShadow = legs.castShadow = true;
    legs.visible = false;
    group.add(body, legs);

    const plumeMat = createPlumeMaterial();
    const plume = new THREE.Mesh(this.plumeGeom, plumeMat);
    plume.position.y = -1.0;
    plume.frustumCulled = false;
    plume.visible = false;
    group.add(plume);

    const flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.flareTex, color: 0xffe2c0, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, sizeAttenuation: false, fog: false
    }));
    flare.position.y = -3;
    flare.visible = false;
    group.add(flare);
    this.scene.add(group);

    return {
      group, legs, plume, plumeMat, flare, plasma: null, side, zone,
      plumeScale: 0.55,
      phase: 'attached', t: 0,
      pad: zone, // ground reference for dust and the engine light
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      p0: new THREE.Vector3(), v0: new THREE.Vector3(),
      throttle: 0, heat: 0, dustCarry: 0
    };
  }

  _buildGround() {
    const pads = [], marks = [], tower = [];
    const U = this.U;
    const toColony = Math.atan2(U.x, U.z);
    for (const pad of this.pads) {
      pads.push({ geometry: new THREE.CylinderGeometry(16, 18, 2, 40), matrix: _xf(pad.x, pad.y - 1, pad.z) });
      marks.push({ geometry: new THREE.RingGeometry(9, 9.8, 48), matrix: _xf(pad.x, pad.y + 0.02, pad.z, -Math.PI / 2) });
      // Integration tower beside the pad, on the colony side
      const tx = pad.x + U.x * 14, tz = pad.z + U.z * 14;
      tower.push({ geometry: new THREE.BoxGeometry(4.5, 78, 4.5), matrix: _xf(tx, pad.y + 39, tz, 0, toColony, 0) });
      for (let k = 0; k < 7; k++) {
        tower.push({ geometry: new THREE.BoxGeometry(5.2, 0.6, 5.2), matrix: _xf(tx, pad.y + 8 + k * 10, tz, 0, toColony, 0) });
      }
      // Crew-access and umbilical arms reaching toward the rocket
      tower.push({ geometry: new THREE.BoxGeometry(0.8, 0.8, 9), matrix: _xf(tx - U.x * 5.5, pad.y + 52, tz - U.z * 5.5, 0, toColony, 0) });
      tower.push({ geometry: new THREE.BoxGeometry(0.6, 0.6, 9), matrix: _xf(tx - U.x * 5.5, pad.y + 30, tz - U.z * 5.5, 0, toColony, 0) });
    }
    for (const set of this.zones) {
      for (const z of set) {
        pads.push({ geometry: new THREE.CylinderGeometry(13, 14, 0.8, 36), matrix: _xf(z.x, z.y - 0.4, z.z) });
        marks.push({ geometry: new THREE.RingGeometry(10.2, 11, 40), matrix: _xf(z.x, z.y + 0.02, z.z, -Math.PI / 2) });
        // The "X" landing target
        marks.push({ geometry: new THREE.PlaneGeometry(14, 1.2), matrix: _xf(z.x, z.y + 0.03, z.z, -Math.PI / 2, 0, Math.PI / 4) });
        marks.push({ geometry: new THREE.PlaneGeometry(14, 1.2), matrix: _xf(z.x, z.y + 0.03, z.z, -Math.PI / 2, 0, -Math.PI / 4) });
      }
    }
    const padMesh = new THREE.Mesh(mergeGeometryList(pads), new THREE.MeshStandardMaterial({ color: 0x3a302b, roughness: 0.92, metalness: 0.05 }));
    padMesh.receiveShadow = true;
    const markMesh = new THREE.Mesh(mergeGeometryList(marks), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.7, metalness: 0.0 }));
    const towerMesh = new THREE.Mesh(mergeGeometryList(tower), new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.6, metalness: 0.7 }));
    towerMesh.castShadow = towerMesh.receiveShadow = true;
    this.scene.add(padMesh, markMesh, towerMesh);
  }

  collidables() {
    const out = this.pads.map(p => ({ x: p.x, z: p.z, r: 18 }));
    for (const set of this.zones) for (const z of set) out.push({ x: z.x, z: z.z, r: 6 });
    return out;
  }

  // Stack attitude: nose tilted by `tilt` from vertical toward the
  // horizontal direction d, with the side boosters along the pitch axis
  _stackQuat(target, d, tilt) {
    const ax = d.z, az = -d.x; // up x d
    const len = Math.hypot(ax, az) || 1;
    this._axis.set(ax / len, 0, az / len);
    this._qYaw.setFromAxisAngle(this._yAxis, Math.atan2(-this._axis.z, this._axis.x));
    this._qTilt.setFromAxisAngle(this._axis, tilt);
    return target.copy(this._qTilt).multiply(this._qYaw);
  }

  _placeAttached(rocket) {
    for (const b of rocket.boosters) {
      if (b.phase !== 'attached') continue;
      this._v.set(b.side * FALCON.sideOffset, 0, 0).applyQuaternion(rocket.quat);
      b.pos.copy(rocket.pos).add(this._v);
      b.group.position.copy(b.pos);
      b.group.quaternion.copy(rocket.quat);
      b.vel.copy(rocket.vel);
    }
    if (rocket.upperAttached) {
      this._v.set(0, FALCON.boosterLen + FALCON.interstage, 0).applyQuaternion(rocket.quat);
      rocket.upper.position.copy(rocket.pos).add(this._v);
      rocket.upper.quaternion.copy(rocket.quat);
    }
  }

  _resetOnPad(rocket) {
    rocket.state = 'pad';
    rocket.t = 0;
    rocket.pos.set(rocket.pad.x, rocket.pad.y, rocket.pad.z);
    rocket.vel.set(0, 0, 0);
    this._stackQuat(rocket.quat, this.downrange, 0);
    rocket.upperAttached = true;
    rocket.upper.visible = true;
    for (const b of rocket.boosters) {
      b.phase = 'attached';
      b.t = 0;
      b.throttle = 0;
      b.legs.visible = false;
      b.group.visible = true;
      b.pad = rocket.pad;
    }
    this._placeAttached(rocket);
  }

  _separate(rocket, b) {
    b.phase = 'coast';
    b.t = 0;
    b.p0.copy(b.pos);
    // Side boosters are pushed gently outward as the struts release
    if (b.side !== 0) {
      this._v.set(b.side, 0, 0).applyQuaternion(rocket.quat);
      b.vel.addScaledVector(this._v, 4);
    }
    b.pad = b.zone;
  }

  update(dt, cameraPos) {
    const g = MARS_GRAVITY;
    let best = null, bestScore = 0;

    for (const rocket of this.rockets) {
      rocket.t += dt;
      const firing = rocket.state === 'ignition' || rocket.state === 'ascent';

      if (rocket.state === 'pad') {
        if (rocket.t >= rocket.timer) { rocket.state = 'ignition'; rocket.t = 0; }
      } else if (rocket.state === 'ignition') {
        if (rocket.t >= 3) { rocket.state = 'ascent'; rocket.t = 0; }
      } else if (rocket.state === 'ascent') {
        const t = rocket.t;
        // Vertical rise, then a gravity turn downrange; thrust-to-weight
        // climbs as propellant burns off (and again once the sides drop)
        const pitch = t < 7 ? 0 : Math.min(1.3, 0.02 * (t - 7) + 0.0006 * (t - 7) * (t - 7));
        const accel = 9 + 0.25 * t;
        const d = this.downrange;
        rocket.vel.x += Math.sin(pitch) * d.x * accel * dt;
        rocket.vel.y += (Math.cos(pitch) * accel - g) * dt;
        rocket.vel.z += Math.sin(pitch) * d.z * accel * dt;
        rocket.pos.addScaledVector(rocket.vel, dt);
        this._stackQuat(rocket.quat, d, pitch);

        if (t >= 22 && rocket.boosters[0].phase === 'attached') {
          this._separate(rocket, rocket.boosters[0]);
          this._separate(rocket, rocket.boosters[2]);
        }
        if (t >= 30 && rocket.boosters[1].phase === 'attached') this._separate(rocket, rocket.boosters[1]);
        const far = Math.hypot(rocket.pos.x - rocket.pad.x, rocket.pos.z - rocket.pad.z) + rocket.pos.y;
        if (t > 75 || far > 9000) {
          // Anything still attached comes home too, or the rocket never resets
          for (const b of rocket.boosters) if (b.phase === 'attached') this._separate(rocket, b);
          rocket.state = 'recovering';
          rocket.t = 0;
          rocket.upper.visible = false;
        }
      } else if (rocket.state === 'recovering') {
        if (rocket.boosters.every(b => b.phase === 'landed' && b.t > 25)) {
          rocket.timer = 25 + Math.random() * 55;
          this._resetOnPad(rocket);
        }
      }
      this._placeAttached(rocket);

      // Attached boosters burn with the stack
      const stackThrottle = rocket.state === 'ignition' ? Math.min(1, rocket.t / 3) * 0.9 : firing ? 1 : 0;
      for (const b of rocket.boosters) {
        let throttle = b.phase === 'attached' ? stackThrottle : this._flyBooster(b, dt);
        b.throttle += (throttle - b.throttle) * Math.min(1, dt * 6);
        this.port._updateEffects(b, dt);
        if (b.throttle > 0.05 && b.group.visible) {
          const dx = b.pos.x - cameraPos.x, dz = b.pos.z - cameraPos.z;
          const score = b.throttle / (1 + Math.hypot(dx, dz, b.pos.y - cameraPos.y) / 500);
          if (score > bestScore) { bestScore = score; best = b; }
        }
      }
    }
    return best ? { obj: best, score: bestScore } : null;
  }

  // Independent flight after separation; returns the throttle
  _flyBooster(b, dt) {
    b.t += dt;
    const zone = b.zone;
    const hoverY = zone.y + 700;
    let throttle = 0;
    let upX = 0, upY = 1, upZ = 0, turnRate = 1.3;

    switch (b.phase) {
      case 'coast': {
        b.vel.y -= MARS_GRAVITY * dt;
        b.pos.addScaledVector(b.vel, dt);
        this._v.set(0, 1, 0).applyQuaternion(b.group.quaternion);
        upX = this._v.x; upY = this._v.y; upZ = this._v.z;
        if (b.t >= 2.5) { b.phase = 'return'; b.t = 0; b.p0.copy(b.pos); b.v0.copy(b.vel); }
        break;
      }
      case 'return': {
        // Hermite arc from separation back to a point above the landing
        // zone, arriving falling straight down at landing-burn speed
        const D = b.side === 0 ? 32 : 26;
        const s = Math.min(1, b.t / D);
        const s2 = s * s, s3 = s2 * s;
        const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
        const d00 = 6 * s2 - 6 * s, d10 = 3 * s2 - 4 * s + 1, d01 = -6 * s2 + 6 * s, d11 = 3 * s2 - 2 * s;
        const endVy = -125;
        b.pos.set(
          h00 * b.p0.x + h10 * D * b.v0.x + h01 * zone.x,
          h00 * b.p0.y + h10 * D * b.v0.y + h01 * hoverY + h11 * D * endVy,
          h00 * b.p0.z + h10 * D * b.v0.z + h01 * zone.z
        );
        b.vel.set(
          (d00 * b.p0.x + d10 * D * b.v0.x + d01 * zone.x) / D,
          (d00 * b.p0.y + d10 * D * b.v0.y + d01 * hoverY + d11 * D * endVy) / D,
          (d00 * b.p0.z + d10 * D * b.v0.z + d01 * zone.z) / D
        );
        // Engines lead the way: point the tail along the direction of travel
        const sp = b.vel.length() || 1;
        upX = -b.vel.x / sp; upY = -b.vel.y / sp; upZ = -b.vel.z / sp;
        // Boostback burn, then a short entry burn
        if (s < 0.22) throttle = 0.85;
        else if (s > 0.62 && s < 0.7) throttle = 0.7;
        if (s >= 1) { b.phase = 'landing'; b.t = 0; }
        break;
      }
      case 'landing': {
        const T = 11, u = Math.min(1, b.t / T);
        const k = (1 - u) * (1 - u);
        b.pos.set(zone.x, zone.y + FALCON.legDrop + 700 * k, zone.z);
        throttle = 0.55 + 0.3 * (1 - u);
        turnRate = 2.5;
        b.legs.visible = u > 0.45;
        if (u >= 1) { b.phase = 'landed'; b.t = 0; }
        break;
      }
      case 'landed': {
        b.pos.set(zone.x, zone.y + FALCON.legDrop, zone.z);
        b.legs.visible = true;
        turnRate = 3;
        break;
      }
    }

    // Swing toward the wanted attitude at a limited rate (a real flip)
    this._v.set(upX, upY, upZ);
    this._qTarget.setFromUnitVectors(this._yAxis, this._v);
    const angle = b.group.quaternion.angleTo(this._qTarget);
    if (angle > 1e-4) b.group.quaternion.rotateTowards(this._qTarget, turnRate * dt);
    b.group.position.copy(b.pos);
    return throttle;
  }
}

// A fleet of Starships flying real mission profiles from a spaceport a safe
// distance from the colony: refuel on the pad, ignite, climb vertically and
// pitch over downrange; returning ships fall belly-first through entry,
// flip upright and land on a landing burn. Every ship keeps its own
// schedule, so launches and landings interleave.
class StarshipSpaceport {
  // site: { x, z, y, ux, uz } - centre, ground height and unit vector
  // pointing from the spaceport toward the colony
  constructor(scene, site, options = {}) {
    this.scene = scene;
    this.site = site;
    // Scratch objects (no per-frame allocation)
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this._axis = new THREE.Vector3();
    this._qYaw = new THREE.Quaternion();
    this._qTilt = new THREE.Quaternion();
    this._down = new THREE.Vector3();
    const perf = getPerformanceSettings();
    this.isMobile = !!perf.isMobile;
    const shipCount = options.shipCount || (this.isMobile ? 3 : 6);

    const U = { x: site.ux, z: site.uz };
    const V = { x: -site.uz, z: site.ux };
    this.U = U;
    this.V = V;
    this.local = (u, v) => ({ x: site.x + U.x * u + V.x * v, z: site.z + U.z * u + V.z * v });

    // Launches head away from the colony, never over it
    this.downrange = { x: -U.x, z: -U.z };

    // Six pads in a line, a service spine behind them, the hub toward the colony
    this.padSpacing = 120;
    this.pads = [];
    for (let i = 0; i < 6; i++) {
      const p = this.local(-60, (i - 2.5) * this.padSpacing);
      this.pads.push({ x: p.x, z: p.z, y: sampleTerrainHeight(p.x, p.z) + 0.7 });
    }

    this._buildGround(options.roadMaterials);
    this._buildFacilities();

    // Ships
    const geoms = buildStarshipGeometries();
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xa4a7aa,
      metalness: 1.0,
      roughness: 0.3,
      roughnessMap: createBrushedSteelTexture(),
      envMapIntensity: 1.1,
      fog: false
    });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.0, roughness: 0.82, fog: false });
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x3a3632, metalness: 0.85, roughness: 0.45, side: THREE.DoubleSide, fog: false
    });

    // Engine glow: a constant-screen-size flare, so a launch or landing
    // burn reads from the colony kilometres away, like the real thing
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = flareCanvas.height = 64;
    const fctx = flareCanvas.getContext('2d');
    const grad = fctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,228,190,0.85)');
    grad.addColorStop(0.5, 'rgba(255,150,70,0.25)');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, 64, 64);
    const flareTex = new THREE.CanvasTexture(flareCanvas);
    flareTex.colorSpace = THREE.SRGBColorSpace;

    const plumeGeom = new THREE.CylinderGeometry(1, 1, 1, 28, 12, true);
    plumeGeom.translate(0, -0.5, 0);
    const plasmaGeom = new THREE.SphereGeometry(1, 28, 18);

    this.ships = [];
    for (let i = 0; i < shipCount; i++) {
      const group = new THREE.Group();
      const steel = new THREE.Mesh(geoms.steel, steelMat);
      const tiles = new THREE.Mesh(geoms.tiles, tileMat);
      const engines = new THREE.Mesh(geoms.engines, engineMat);
      steel.castShadow = tiles.castShadow = true;
      steel.receiveShadow = tiles.receiveShadow = true;
      group.add(steel, tiles, engines);

      const plumeMat = createPlumeMaterial();
      const plume = new THREE.Mesh(plumeGeom, plumeMat);
      plume.position.y = STARSHIP.gear - 1.6;
      plume.frustumCulled = false;
      plume.visible = false;
      group.add(plume);

      const plasmaMat = createPlasmaMaterial();
      const plasma = new THREE.Mesh(plasmaGeom, plasmaMat);
      plasma.position.set(0, STARSHIP.gear + (STARSHIP.barrel + STARSHIP.nose) / 2, STARSHIP.radius * 0.45);
      plasma.scale.set(STARSHIP.radius * 1.55, (STARSHIP.barrel + STARSHIP.nose) * 0.62, STARSHIP.radius * 1.55);
      plasma.visible = false;
      group.add(plasma);

      const flare = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flareTex, color: 0xffe2c0, blending: THREE.AdditiveBlending,
        depthWrite: false, transparent: true, sizeAttenuation: false, fog: false
      }));
      flare.position.y = STARSHIP.gear - 4;
      flare.visible = false;
      group.add(flare);

      scene.add(group);

      const pad = this.pads[i % this.pads.length];
      // Stagger: most ships start on the pad refuelling, a few are inbound
      const inbound = i % 3 === 1;
      const ship = {
        group, plume, plumeMat, plasma, plasmaMat, flare, pad,
        state: inbound ? 'away' : 'pad',
        t: 0,
        timer: inbound ? 4 + i * 9 : 10 + i * 17 + Math.random() * 10,
        throttle: 0,
        heat: 0,
        pos: new THREE.Vector3(pad.x, pad.y, pad.z),
        vel: new THREE.Vector3(),
        approach: this._approachDir(),
        // On the pad the bare steel faces the colony
        belly: { x: this.downrange.x, z: this.downrange.z },
        dustCarry: 0
      };
      this._pose(ship, this.downrange, 0, ship.belly);
      group.visible = !inbound;
      this.ships.push(ship);
    }

    // One shared engine light (a fixed light count avoids shader recompiles)
    this.engineLight = new THREE.PointLight(0xffc48a, 0, 900, 0);
    scene.add(this.engineLight);

    // Phones get fewer, smaller dust puffs: each one is a big transparent quad
    this.dust = new TruckDust(scene, this.isMobile ? 180 : 1600,
      { size: 4, grow: this.isMobile ? 22 : 38, opacity: 0.42, gravity: 0.02, drag: 0.45 });

    // Falcon Heavy launch complex beside the Starship pads, plus any
    // stand-alone complexes elsewhere (they share the plume geometry, flare
    // texture, dust and the single engine light)
    this.falcon = new FalconHeavyFleet(this, {
      count: options.falconCount || (this.isMobile ? 2 : 3),
      plumeGeom,
      flareTex
    });
    this.falcons = [this.falcon];
    (options.falconSites || []).forEach((site, k) => {
      this.falcons.push(new FalconHeavyFleet(this, {
        site, count: 5, padCount: 5, padSpacing: 130, padU: 70, zoneU: -70,
        timerOffset: 20 + k * 45, plumeGeom, flareTex
      }));
    });

  }

  // Returning ships come in from the far side, spread over a 50 degree arc
  _approachDir() {
    const a = (Math.random() - 0.5) * 0.9;
    const c = Math.cos(a), s = Math.sin(a);
    return { x: this.downrange.x * c - this.downrange.z * s, z: this.downrange.x * s + this.downrange.z * c };
  }

  // Orient a ship: nose tilted by `tilt` radians from vertical toward the
  // horizontal direction d. The tiled belly (+Z) faces `belly`; by default
  // opposite d, which puts it on the underside when the ship lies flat.
  _pose(ship, d, tilt, belly = null) {
    const yaw = belly ? Math.atan2(belly.x, belly.z) : Math.atan2(-d.x, -d.z);
    this._qYaw.setFromAxisAngle(this._yAxis, yaw);
    const axis = this._axis.set(d.z, 0, -d.x); // up x d
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
    axis.normalize();
    this._qTilt.setFromAxisAngle(axis, tilt);
    ship.group.quaternion.copy(this._qTilt).multiply(this._qYaw);
    ship.group.position.copy(ship.pos);
  }

  _buildGround(roadMaterials) {
    const site = this.site;
    const padSurface = [], berms = [], markings = [];
    const padMat = new THREE.MeshStandardMaterial({ color: 0x3a302b, roughness: 0.92, metalness: 0.05 });
    const bermMat = new THREE.MeshStandardMaterial({ color: 0x8f3416, roughness: 1.0, metalness: 0.0 });
    const markMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.7, metalness: 0.0 });
    const toColony = Math.atan2(this.U.z, this.U.x);

    for (const pad of this.pads) {
      // Sintered-regolith landing pad
      padSurface.push({ geometry: new THREE.CylinderGeometry(24, 27, 1.4, 48), matrix: _xf(pad.x, pad.y - 0.7, pad.z) });
      markings.push({ geometry: new THREE.RingGeometry(15, 16.2, 64), matrix: _xf(pad.x, pad.y + 0.02, pad.z, -Math.PI / 2) });
      markings.push({ geometry: new THREE.RingGeometry(21.5, 22.2, 64), matrix: _xf(pad.x, pad.y + 0.02, pad.z, -Math.PI / 2) });

      // Horseshoe blast berm, open toward the service road
      const arc = Math.PI * 1.45;
      const gap = arc + (Math.PI * 2 - arc) / 2;
      const yaw = -gap - toColony;
      const berm = lumpify(new THREE.TorusGeometry(46, 6, 10, 72, arc), 1.2, 0.25);
      berms.push({ geometry: berm, matrix: _xf(pad.x, pad.y - 2.2, pad.z, -Math.PI / 2, yaw, 0, 1, 1, 0.75, 'YXZ') });
    }

    const padMesh = new THREE.Mesh(mergeGeometryList(padSurface), padMat);
    padMesh.receiveShadow = true;
    const bermMesh = new THREE.Mesh(mergeGeometryList(berms), bermMat);
    bermMesh.receiveShadow = bermMesh.castShadow = true;
    const markMesh = new THREE.Mesh(mergeGeometryList(markings), markMat);
    this.scene.add(padMesh, bermMesh, markMesh);

    // Service roads: a spine behind the pads, a spur to each pad and a link
    // to the hub where the haul road from the colony arrives
    if (roadMaterials) {
      const roads = [];
      const n = this.pads.length;
      const spine = [];
      for (let i = 0; i <= 20; i++) {
        const v = ((i / 20) - 0.5) * (n - 1) * this.padSpacing;
        const p = this.local(15, v);
        spine.push(new THREE.Vector3(p.x, 0, p.z));
      }
      roads.push(spine);
      this.pads.forEach((pad, i) => {
        const v = (i - 2.5) * this.padSpacing;
        const a = this.local(15, v), b = this.local(-28, v);
        roads.push(resamplePath([new THREE.Vector3(a.x, 0, a.z), new THREE.Vector3(b.x, 0, b.z)], 4, false));
      });
      const h0 = this.local(15, 0), h1 = this.local(this.hubU, 0);
      roads.push(resamplePath([new THREE.Vector3(h0.x, 0, h0.z), new THREE.Vector3(h1.x, 0, h1.z)], 4, false));
      roads.forEach(points => {
        const mesh = new THREE.Mesh(buildDrapedRibbon(points, 4, 0.1, false), roadMaterials.surface);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      });
    }
  }

  get hubU() { return 150; }

  _buildFacilities() {
    const white = [], bands = [], regolith = [], metal = [], lamps = [];
    const ground = (u, v) => { const p = this.local(u, v); return { x: p.x, z: p.z, y: sampleTerrainHeight(p.x, p.z) }; };
    const yawU = Math.atan2(this.U.x, this.U.z);

    // Propellant farm: methane and oxygen made by the colony's ISRU plant
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < 4; k++) {
        const g = ground(this.hubU + 30 + k * 14, -55 - row * 15);
        white.push({ geometry: new THREE.CylinderGeometry(5, 5, 24, 24), matrix: _xf(g.x, g.y + 12, g.z) });
        white.push({ geometry: new THREE.SphereGeometry(5, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), matrix: _xf(g.x, g.y + 24, g.z) });
        bands.push({ geometry: new THREE.CylinderGeometry(5.06, 5.06, 1.4, 24, 1, true), matrix: _xf(g.x, g.y + 17, g.z) });
        metal.push({ geometry: new THREE.CylinderGeometry(5.4, 5.6, 1.2, 24), matrix: _xf(g.x, g.y + 0.6, g.z) });
      }
    }
    // Launch control: a regolith-shielded bunker with a lit window slot
    {
      const g = ground(this.hubU + 20, 55);
      const dome = lumpify(new THREE.SphereGeometry(14, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.9);
      regolith.push({ geometry: dome, matrix: _xf(g.x, g.y - 1, g.z, 0, 0, 0, 1, 0.55, 1) });
      lamps.push({ geometry: new THREE.BoxGeometry(9, 1.1, 0.5), matrix: _xf(g.x + this.V.x * -13.2, g.y + 3.2, g.z + this.V.z * -13.2, 0, yawU + Math.PI / 2, 0) });
    }
    // Floodlight masts beside each pad
    this.pads.forEach((pad, i) => {
      const v = (i - 2.5) * this.padSpacing;
      const g = ground(-10, v + 34);
      metal.push({ geometry: new THREE.BoxGeometry(0.9, 32, 0.9), matrix: _xf(g.x, g.y + 16, g.z) });
      lamps.push({ geometry: new THREE.BoxGeometry(3.2, 1.2, 1.4), matrix: _xf(g.x, g.y + 32.4, g.z, 0, yawU, 0) });
    });

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xb8b6b0, roughness: 0.45, metalness: 0.2 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x0b1e55, roughness: 0.5, metalness: 0.2 });
    const regolithMat = new THREE.MeshStandardMaterial({ color: 0x8f3416, roughness: 1.0, metalness: 0.0 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.5, metalness: 0.8 });
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 0.3 });
    [[white, whiteMat, true], [bands, bandMat, false], [regolith, regolithMat, true], [metal, metalMat, true], [lamps, this.lampMat, false]]
      .forEach(([list, mat, shadow]) => {
        const mesh = new THREE.Mesh(mergeGeometryList(list), mat);
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      });
  }

  // Collision circles for the rover
  collidables() {
    const out = this.pads.map(p => ({ x: p.x, z: p.z, r: 27 }));
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < 4; k++) {
        const p = this.local(this.hubU + 30 + k * 14, -55 - row * 15);
        out.push({ x: p.x, z: p.z, r: 6 });
      }
    }
    const b = this.local(this.hubU + 20, 55);
    out.push({ x: b.x, z: b.z, r: 14 });
    for (const fleet of this.falcons || []) out.push(...fleet.collidables());
    return out;
  }

  update(dt, dayAmount) {
    if (dt <= 0) return;
    let lightShip = null, lightScore = 0;

    for (const ship of this.ships) {
      ship.t += dt;
      const pad = ship.pad;
      let throttle = 0, heat = 0;

      switch (ship.state) {
        case 'pad': {
          ship.pos.set(pad.x, pad.y, pad.z);
          this._pose(ship, this.downrange, 0, ship.belly);
          if (ship.t >= ship.timer) { ship.state = 'ignition'; ship.t = 0; }
          break;
        }
        case 'ignition': {
          // Engine start: throttle up on the pad before release
          throttle = Math.min(1, ship.t / 3) * 0.9;
          if (ship.t >= 3) { ship.state = 'ascent'; ship.t = 0; ship.vel.set(0, 0, 0); }
          break;
        }
        case 'ascent': {
          throttle = 1;
          const t = ship.t;
          // Vertical rise, then a gravity turn downrange
          const pitch = t < 8 ? 0 : Math.min(1.2, 0.025 * (t - 8) + 0.0005 * (t - 8) * (t - 8));
          const accel = 8.5 + 0.2 * t; // T/W climbs as propellant burns off
          const d = this.downrange;
          const ax = Math.sin(pitch) * d.x, ay = Math.cos(pitch), az = Math.sin(pitch) * d.z;
          ship.vel.x += ax * accel * dt;
          ship.vel.y += (ay * accel - MARS_GRAVITY) * dt;
          ship.vel.z += az * accel * dt;
          ship.pos.addScaledVector(ship.vel, dt);
          this._pose(ship, d, pitch, ship.belly);
          const far = Math.hypot(ship.pos.x - pad.x, ship.pos.z - pad.z) + ship.pos.y;
          if (t > 80 || far > 9000) {
            ship.state = 'away';
            ship.t = 0;
            ship.timer = 45 + Math.random() * 70;
            ship.group.visible = false;
          }
          break;
        }
        case 'away': {
          if (ship.t >= ship.timer) {
            ship.state = 'entry';
            ship.t = 0;
            ship.approach = this._approachDir();
            ship.group.visible = true;
          }
          break;
        }
        case 'entry': {
          // Belly-first fall: most of the speed is shed by the heat shield
          const T = 28, u = Math.min(1, ship.t / T);
          const s = 1 - (1 - u) * (1 - u);
          const alt = 5200 + (850 - 5200) * s;
          const dist = 6500 + (320 - 6500) * s;
          ship.pos.set(pad.x + ship.approach.x * dist, pad.y + alt, pad.z + ship.approach.z * dist);
          this._pose(ship, { x: -ship.approach.x, z: -ship.approach.z }, Math.PI / 2 - 0.12);
          heat = Math.max(0, 1 - u / 0.7);
          if (u >= 1) { ship.state = 'flip'; ship.t = 0; }
          break;
        }
        case 'flip': {
          // Engines relight and swing the ship upright, slightly past vertical
          const T = 4.5, u = Math.min(1, ship.t / T);
          const alt = 850 + (600 - 850) * u;
          const dist = 320 + (140 - 320) * u;
          ship.pos.set(pad.x + ship.approach.x * dist, pad.y + alt, pad.z + ship.approach.z * dist);
          const c1 = 1.70158, c3 = c1 + 1;
          const back = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); // easeOutBack
          this._pose(ship, { x: -ship.approach.x, z: -ship.approach.z }, (Math.PI / 2 - 0.12) * (1 - back));
          throttle = Math.min(1, ship.t / 1.0) * 0.85;
          if (u >= 1) { ship.state = 'landing'; ship.t = 0; }
          break;
        }
        case 'landing': {
          // Landing burn: height and drift both decay to zero at touchdown
          const T = 15, u = Math.min(1, ship.t / T);
          const k = (1 - u) * (1 - u);
          const dist = 140 * k;
          ship.pos.set(pad.x + ship.approach.x * dist, pad.y + 600 * k, pad.z + ship.approach.z * dist);
          this._pose(ship, { x: -ship.approach.x, z: -ship.approach.z }, 0.22 * k);
          throttle = 0.55 + 0.3 * (1 - u);
          if (u >= 1) {
            ship.state = 'pad';
            ship.belly = { x: ship.approach.x, z: ship.approach.z }; // as it touched down
            ship.t = 0;
            ship.timer = 40 + Math.random() * 80; // turnaround: detank, refuel
          }
          break;
        }
      }

      ship.throttle += (throttle - ship.throttle) * Math.min(1, dt * 6);
      ship.heat = heat;
      this._updateEffects(ship, dt);

      if (ship.throttle > 0.05 && ship.group.visible) {
        const dx = ship.pos.x - camera.position.x, dz = ship.pos.z - camera.position.z;
        const score = ship.throttle / (1 + Math.hypot(dx, dz, ship.pos.y - camera.position.y) / 500);
        if (score > lightScore) { lightScore = score; lightShip = ship; }
      }
    }

    for (const fleet of this.falcons || []) {
      const best = fleet.update(dt, camera.position);
      if (best && best.score > lightScore) { lightScore = best.score; lightShip = best.obj; }
    }

    // Engine light on the ship that matters most to the viewer; it only
    // shows near the ground, where there is something for it to light
    if (lightShip && lightShip.pos.y - lightShip.pad.y < 400) {
      const s = lightShip;
      this._down.set(0, -1, 0).applyQuaternion(s.group.quaternion);
      this.engineLight.position.copy(s.pos).addScaledVector(this._down, 12);
      this.engineLight.intensity = 5 * LEGACY_LIGHT_SCALE * s.throttle * (1 - 0.6 * dayAmount);
    } else {
      this.engineLight.intensity = 0;
    }

    // Floodlights
    this.lampMat.emissiveIntensity = 0.3 + 2.2 * (1 - dayAmount);
    this.dust.update(dt, 0.12 + 0.88 * dayAmount);
  }

  _updateEffects(ship, dt) {
    const firing = ship.throttle > 0.02;
    ship.plume.visible = firing && ship.group.visible;
    if (ship.plume.visible) {
      const alt = Math.max(0, ship.pos.y - ship.pad.y);
      // Near the ground the plume splashes; higher up it lengthens and, in
      // the near-vacuum, balloons outward
      const spread = Math.min(1, alt / 2500);
      const u = ship.plumeMat.uniforms;
      // Slimmer plumes on phones (they fill a lot of screen when close)
      const k = (ship.plumeScale || 1) * (this.isMobile ? 0.7 : 1);
      u.uThrottle.value = ship.throttle * (0.9 + Math.random() * 0.15);
      u.uLen.value = (30 + 220 * spread) * (0.6 + 0.4 * ship.throttle) * k;
      u.uR0.value = 3.0 * k;
      u.uR1.value = (7 + 60 * spread) * k;
    }
    // The flare marks engine burns, and during entry the glowing plasma
    // (the only part of an inbound ship visible from the ground)
    const entryGlow = ship.heat > 0.01 && ship.group.visible;
    ship.flare.visible = ship.plume.visible || entryGlow;
    if (ship.flare.visible) {
      let f;
      if (entryGlow && !ship.plume.visible) {
        ship.flare.material.color.setRGB(1.0, 0.5, 0.32);
        f = 0.1 * Math.min(1, 0.3 + ship.heat) * (0.85 + Math.random() * 0.3);
      } else {
        ship.flare.material.color.setRGB(1.0, 0.89, 0.75);
        f = 0.075 * ship.throttle * (0.9 + Math.random() * 0.2);
      }
      ship.flare.scale.set(f, f, 1);
    }
    if (ship.plasma) {
      ship.plasma.visible = ship.heat > 0.01;
      if (ship.plasma.visible) ship.plasmaMat.uniforms.uHeat.value = ship.heat * (0.85 + Math.random() * 0.15);
    }

    // Regolith blasted off the pad when the engines fire close to the ground
    const alt = ship.pos.y - ship.pad.y;
    if (firing && alt < 150) {
      const strength = ship.throttle * (1 - alt / 150);
      ship.dustCarry += strength * (this.isMobile ? 12 : 110) * dt;
      while (ship.dustCarry >= 1) {
        ship.dustCarry -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * 10;
        const speed = (22 + Math.random() * 34) * (0.4 + 0.6 * strength);
        this.dust.emit(
          ship.pos.x + Math.cos(a) * r, ship.pad.y + 1, ship.pos.z + Math.sin(a) * r,
          Math.cos(a) * speed, 2 + Math.random() * 9, Math.sin(a) * speed,
          4 + Math.random() * 5
        );
      }
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
    this.nightLights = []; // Artificial lights that fade out in daylight
    this.nightEmissives = []; // Window, lamp and grow-light glow that rises at night
    this.guidedRouteWaypoints = []; // Beacons for optional guided driving route
    this.currentWaypointIndex = 0;
    this.fleet = null;      // CybertruckFleet (desktop only)
    this.aiRoutes = [];   // Reusable world-space routes for AI traffic
    this.bulletTrains = []; // High-speed trains on elevated tracks
    this.collidables = [];  // Objects the rover can collide with { position, radius }

    // Procedural settlement spawning system
    this.settlementGrid = 400;          // Grid spacing — one potential site every 400 units
    this.settlementSpawnDist = 1300;    // Built well ahead, out in the haze, so none pop in close
    this.settlementDespawnDist = 1900;  // Distance at which a settlement is removed
    this.settlements = new Map();       // key "gx,gz" → { group, center, type, collidableStart }
    this.lastSettlementCheck = 0;       // Throttle timestamp
    this.roads = new Map();             // key "from→to" → { group }
    this.fadingSettlements = [];

    // Starship spaceport (built in initializeRocketLaunchSystem)
    this.spaceport = null;
    this.rocketTrafficEnabled = true;
    this.rocketCycleDuration = 60000; // legacy setting, see setRocketLaunchInterval

    console.log('🏗️ MARS SCENE MANAGER: About to create colony infrastructure');
    this.createColonyInfrastructure();
    console.log('🏗️ MARS SCENE MANAGER: About to initialize rocket launch system');
    this.initializeRocketLaunchSystem();

    // Create an optional guided driving route using blinking beacons
    this.createGuidedRoute();

    // Initialize optional ground traffic system (AI vehicles)
    this.initializeTrafficSystem();

    console.log('✅ ✅ ✅ MarsSceneManager constructed with terrainSize=', terrainSize);
    console.log('Colony and rockets should now be visible in the scene!');
  }

  // Procedural settlements keep clear of the hand-built colonies and the
  // Cybertruck haul roads (one used to spawn inside the colony ring road)
  _isSettlementSiteClear(x, z) {
    const near = (c, r) => c && (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z) < r * r;
    if (near(this.colonyCenter, 480) || near(this.secondaryColonyCenter, 420)) return false;
    if (this.spaceportSite && near(this.spaceportSite, 650)) return false;
    for (const c of this.expansionCities || []) if (near(c.center, 560)) return false;
    for (const f of this.falconSites || []) if (near(f, 620)) return false;
    for (const d of this.biodomes || []) if (near(d, d.r + 260)) return false;
    for (const line of this.railLines || []) {
      const lx = line.end.x - line.start.x, lz = line.end.z - line.start.z;
      const l2 = lx * lx + lz * lz || 1;
      const t = Math.max(0, Math.min(1, ((x - line.start.x) * lx + (z - line.start.z) * lz) / l2));
      if (near({ x: line.start.x + lx * t, z: line.start.z + lz * t }, 140)) return false;
    }
    for (const route of this.aiRoutes || []) {
      for (let i = 0; i < route.points.length; i += 4) {
        if (near(route.points[i], 120)) return false;
      }
    }
    return true;
  }

  // Register a collidable object with a position and bounding radius
  registerCollidable(position, radius, options = {}) {
    const rover = window.rover;
    if (!options.force && rover && rover.position) {
      const dx = position.x - rover.position.x;
      const dz = position.z - rover.position.z;
      const protectedRadius = (radius || 0) + 42;
      if (dx * dx + dz * dz < protectedRadius * protectedRadius) {
        return false;
      }
    }
    this.collidables.push({ x: position.x, z: position.z, r: radius, dynamic: !!options.dynamic });
    return true;
  }

  // Check if a world-space XZ position collides with any registered object
  // Returns true if blocked
  checkCollision(x, z, roverRadius, prevX = x, prevZ = z) {
    if (this.fleet && this.fleet.blocksRover(x, z, roverRadius, prevX, prevZ)) return true;
    const len = this.collidables.length;
    for (let i = 0; i < len; i++) {
      const c = this.collidables[i];
      if (c.dynamic && window.rover && window.rover.position) {
        const rdx = window.rover.position.x - c.x;
        const rdz = window.rover.position.z - c.z;
        const releaseDist = c.r + 18;
        if (rdx * rdx + rdz * rdz < releaseDist * releaseDist) continue;
      }
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

  // Level the spaceport site. Runs before the haul roads are graded so the
  // spaceport road meets the finished plateau.
  prepareSpaceportSite() {
    const x = SPACEPORT_X, z = SPACEPORT_Z;
    let sum = 0, n = 0;
    for (let dx = -200; dx <= 200; dx += 50) {
      for (let dz = -200; dz <= 200; dz += 50) { sum += sampleTerrainHeight(x + dx, z + dz); n++; }
    }
    const y = sum / n;
    flattenMarsTerrain(x, z, 470, y);
    const ux = COLONY_SITE_X - x, uz = COLONY_SITE_Z - z;
    const len = Math.hypot(ux, uz) || 1;
    this.spaceportSite = { x, z, y, ux: ux / len, uz: uz / len };
  }

  // Desktop: four permanent cities around the map, joined to the colonies by
  // maglev, and two more Falcon Heavy launch complexes. Their ground is
  // flattened here, before the haul roads are graded and anything is placed.
  prepareExpansionSites() {
    this.expansionCities = [];
    this.falconSites = [];
    if (getPerformanceSettings().isMobile) {
      this.planBiodomes();
      return;
    }
    const level = (x, z, r) => {
      let sum = 0, n = 0;
      for (let dx = -r; dx <= r; dx += r / 3) {
        for (let dz = -r; dz <= r; dz += r / 3) { sum += sampleTerrainHeight(x + dx, z + dz); n++; }
      }
      return sum / n;
    };
    const cities = [
      { name: 'Olympus', x: -1900, z: 700, seed: 0x51a7 },
      { name: 'Tharsis', x: -700, z: 1650, seed: 0x7a31 },
      { name: 'Elysium', x: 2050, z: 1350, seed: 0x2c9d },
      { name: 'Hellas', x: 700, z: -1850, seed: 0x6e05 }
    ];
    for (const c of cities) {
      const y = level(c.x, c.z, 220);
      flattenMarsTerrain(c.x, c.z, 460, y);
      this.expansionCities.push({ name: c.name, seed: c.seed, center: new THREE.Vector3(c.x, y, c.z) });
    }
    for (const [x, z] of [[-1950, -1900], [1750, -1950]]) {
      const y = level(x, z, 260);
      flattenMarsTerrain(x, z, 560, y);
      const ux = COLONY_SITE_X - x, uz = COLONY_SITE_Z - z;
      const len = Math.hypot(ux, uz) || 1;
      this.falconSites.push({ x, z, y, ux: ux / len, uz: uz / len });
    }
    this.planBiodomes();
  }

  // Large greenhouse biodomes scattered over open ground, clear of every
  // colony, city, launch site, haul road and rail line (12 on desktop, 5 on
  // phones). Deterministic, so the map is the same every visit.
  planBiodomes() {
    const mobile = getPerformanceSettings().isMobile;
    const half = marsSurface.geometry.userData.heightGrid.half;
    const colony = { x: COLONY_SITE_X, z: COLONY_SITE_Z };
    const round = [
      { x: colony.x, z: colony.z, r: 700 },
      { x: colony.x + 2600, z: colony.z, r: 520 },
      { x: 900, z: 1220, r: 520 },
      { x: SPACEPORT_X, z: SPACEPORT_Z, r: 720 },
      { x: 0, z: 0, r: 300 }
    ];
    (this.expansionCities || []).forEach(c => round.push({ x: c.center.x, z: c.center.z, r: 560 }));
    (this.falconSites || []).forEach(f => round.push({ x: f.x, z: f.z, r: 640 }));
    // Rail lines (hub -> city) and the colony-to-colony line
    const segs = [[colony, { x: colony.x + 2600, z: colony.z }], [{ x: colony.x + 2600, z: colony.z }, { x: 900, z: 1220 }]];
    const cityAt = name => (this.expansionCities || []).find(c => c.name === name);
    [['Olympus', colony], ['Tharsis', colony], ['Hellas', colony], ['Elysium', { x: colony.x + 2600, z: colony.z }]].forEach(([n, hub]) => {
      const c = cityAt(n);
      if (c) segs.push([hub, { x: c.center.x, z: c.center.z }]);
    });
    const segDist = (x, z, a, b) => {
      const lx = b.x - a.x, lz = b.z - a.z, l2 = lx * lx + lz * lz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * lx + (z - a.z) * lz) / l2));
      return Math.hypot(x - (a.x + lx * t), z - (a.z + lz * t));
    };
    const hash = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };

    const candidates = [];
    const step = mobile ? 520 : 650;
    for (let gx = -half; gx <= half; gx += step) {
      for (let gz = -half; gz <= half; gz += step) {
        const x = gx + (hash(gx, gz) - 0.5) * step * 0.5;
        const z = gz + (hash(gz, gx) - 0.5) * step * 0.5;
        const r = mobile ? 55 + hash(x, z) * 30 : 60 + hash(x, z) * 55;
        if (Math.abs(x) > half - r * 2 - 120 || Math.abs(z) > half - r * 2 - 120) continue;
        if (round.some(o => Math.hypot(x - o.x, z - o.z) < o.r + r)) continue;
        if (segs.some(([a, b]) => segDist(x, z, a, b) < 160 + r)) continue;
        // The haul roads all lie in this box around the colony
        if (x > -1350 && x < 150 && z > -1250 && z < 170) continue;
        candidates.push({ x, z, r, order: hash(z, x) });
      }
    }
    candidates.sort((a, b) => a.order - b.order);
    this.biodomes = [];
    for (const c of candidates) {
      if (this.biodomes.length >= (mobile ? 5 : 12)) break;
      if (this.biodomes.some(d => Math.hypot(d.x - c.x, d.z - c.z) < d.r + c.r + 250)) continue;
      let sum = 0, n = 0;
      for (let dx = -c.r; dx <= c.r; dx += c.r / 2) {
        for (let dz = -c.r; dz <= c.r; dz += c.r / 2) { sum += sampleTerrainHeight(c.x + dx, c.z + dz); n++; }
      }
      const y = sum / n;
      flattenMarsTerrain(c.x, c.z, c.r * 1.9, y);
      this.biodomes.push({ x: c.x, z: c.z, y, r: c.r });
    }
  }

  // All biodomes share five merged meshes: glass, frame, base, garden, water
  buildBiodomes() {
    if (!this.biodomes || !this.biodomes.length) return;
    const glass = [], frame = [], base = [];
    const soil = [], grass = [], trunks = [], leafA = [], leafB = [], leafC = [], water = [];
    let seed = 1;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    for (const d of this.biodomes) {
      const { x, z, y, r } = d;
      seed = Math.floor(Math.abs(x * 31 + z * 17)) % 2147483646 + 1;
      glass.push({ geometry: new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), matrix: _xf(x, y + 0.5, z) });
      // Geodesic-style frame: meridian arches and three latitude rings
      for (let k = 0; k < 10; k++) {
        frame.push({ geometry: new THREE.TorusGeometry(r + 0.2, 0.32, 4, 40, Math.PI), matrix: _xf(x, y + 0.5, z, 0, (k / 10) * Math.PI, 0) });
      }
      for (const phi of [0.28, 0.7, 1.12]) {
        frame.push({ geometry: new THREE.TorusGeometry((r + 0.2) * Math.cos(phi), 0.3, 4, 64), matrix: _xf(x, y + 0.5 + r * Math.sin(phi), z, Math.PI / 2, 0, 0) });
      }
      // Base wall, a ring of concrete, and an airlock toward the colony
      base.push({ geometry: new THREE.CylinderGeometry(r + 1.6, r + 2.6, 3.4, 64, 1, true), matrix: _xf(x, y + 1.1, z) });
      base.push({ geometry: new THREE.RingGeometry(r - 0.2, r + 1.8, 64), matrix: _xf(x, y + 2.8, z, -Math.PI / 2) });
      const toColony = Math.atan2(COLONY_SITE_X - x, COLONY_SITE_Z - z);
      base.push({ geometry: new THREE.BoxGeometry(9, 7, 14), matrix: _xf(x + Math.sin(toColony) * (r + 5), y + 3.5, z + Math.cos(toColony) * (r + 5), 0, toColony, 0) });

      // Garden floor, a pond, and trees that stay clear of the glass
      soil.push({ geometry: new THREE.CircleGeometry(r, 56), matrix: _xf(x, y + 0.25, z, -Math.PI / 2) });
      const pondA = rand() * Math.PI * 2, pondD = r * 0.35, pondR = r * 0.16;
      const px = x + Math.cos(pondA) * pondD, pz = z + Math.sin(pondA) * pondD;
      water.push({ geometry: new THREE.CircleGeometry(pondR, 32), matrix: _xf(px, y + 0.32, pz, -Math.PI / 2) });
      for (let k = 0; k < 6; k++) {
        const a = rand() * Math.PI * 2, rr = rand() * r * 0.8;
        grass.push({ geometry: new THREE.CircleGeometry(r * (0.15 + rand() * 0.15), 20), matrix: _xf(x + Math.cos(a) * rr, y + 0.28, z + Math.sin(a) * rr, -Math.PI / 2) });
      }
      const trees = Math.round(r * 0.5);
      for (let k = 0; k < trees; k++) {
        const a = rand() * Math.PI * 2, dist = Math.sqrt(rand()) * r * 0.86;
        const tx = x + Math.cos(a) * dist, tz = z + Math.sin(a) * dist;
        if (Math.hypot(tx - px, tz - pz) < pondR + 3) continue;
        const room = Math.sqrt(r * r - dist * dist) - 4; // height under the glass here
        const h = Math.min(room, 6 + rand() * 16);
        if (h < 4) continue;
        const canopy = 2 + rand() * 3.5;
        trunks.push({ geometry: new THREE.CylinderGeometry(0.35, 0.55, h * 0.55, 6), matrix: _xf(tx, y + h * 0.275, tz) });
        const leaves = rand();
        const list = leaves < 0.4 ? leafA : leaves < 0.75 ? leafB : leafC;
        if (rand() < 0.35) {
          list.push({ geometry: new THREE.ConeGeometry(canopy, h * 0.75, 8), matrix: _xf(tx, y + h * 0.6, tz) });
        } else {
          list.push({ geometry: new THREE.IcosahedronGeometry(canopy, 0), matrix: _xf(tx, y + h * 0.55 + canopy * 0.5, tz, 0, rand() * 3, 0, 1, 0.85, 1) });
        }
      }
      this.registerCollidable({ x, z }, r + 2);
    }

    const night = (params, dayValue, nightValue) => {
      const m = new THREE.MeshStandardMaterial(params);
      this.nightEmissives.push({ material: m, day: dayValue, night: nightValue });
      return m;
    };
    // Faint, reflective glass; warm grow lights make the domes glow at night
    const glassMat = night({
      color: 0xc6e4ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.14,
      depthWrite: false, envMapIntensity: 1.6, emissive: 0xb06cff, emissiveIntensity: 0
    }, 0.0, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe6e6ea, metalness: 0.65, roughness: 0.35 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x6b6258, metalness: 0.05, roughness: 0.9 });
    const gardenMat = night({ vertexColors: true, roughness: 0.85, metalness: 0.0, emissive: 0x6a2a7a, emissiveIntensity: 0 }, 0.0, 0.35);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4a5c, metalness: 0.2, roughness: 0.08, envMapIntensity: 1.4 });

    const add = (geometry, material, cast, receive) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      this.scene.add(mesh);
      return mesh;
    };
    add(mergeGeometryList(base), baseMat, true, true);
    add(mergeGeometryList(frame), frameMat, true, true);
    add(mergeColoredGeometryLists([
      [soil, 0x2c1c10], [grass, 0x1e4212], [trunks, 0x3a2616],
      [leafA, 0x1b5016], [leafB, 0x2f6a1c], [leafC, 0x113a14]
    ]), gardenMat, true, true);
    add(mergeGeometryList(water), waterMat, false, true);
    const glassMesh = add(mergeGeometryList(glass), glassMat, false, false);
    glassMesh.renderOrder = 2; // after the opaque garden inside
  }

  buildExpansionCities() {
    for (const city of this.expansionCities || []) {
      const group = mergeStaticGroup(this._buildSettlement('city', city.center, city.seed));
      this.scene.add(group);
      city.group = group;
    }
  }

  // Maglev lines from the colonies out to the new cities
  buildRailNetwork() {
    const byName = name => (this.expansionCities || []).find(c => c.name === name);
    const links = [
      [this.colonyCenter, byName('Olympus')],
      [this.colonyCenter, byName('Tharsis')],
      [this.colonyCenter, byName('Hellas')],
      [this.secondaryColonyCenter, byName('Elysium')]
    ];
    this.railLines = this.railLines || [];
    const parts = { white: [], metal: [], lamp: [], deck: [], pylon: [] };
    for (const [hub, city] of links) {
      if (hub && city) this._planMaglevLine(hub, city.center, parts);
    }
    // Everything static in the network is a handful of merged meshes
    const mats = this.getColonyMaterials();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xc9c9d4, roughness: 0.25, metalness: 0.85 });
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x5c5d63, roughness: 0.45, metalness: 0.8 });
    [[parts.white, mats.white, true], [parts.metal, mats.metal, true], [parts.lamp, mats.lamp, false],
     [parts.deck, deckMat, true], [parts.pylon, pylonMat, true]].forEach(([list, mat, shadow]) => {
      if (!list.length) return;
      const mesh = new THREE.Mesh(mergeGeometryList(list), mat);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  // One elevated line between a hub (colony) and a city: a terminal at the
  // edge of each, pylons and a deck high enough to clear every rise, and a
  // train shuttling between them with a short dwell at each platform
  _planMaglevLine(hub, cityCenter, parts) {
    const dx = cityCenter.x - hub.x, dz = cityCenter.z - hub.z;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    // Hub terminals sit outside the colony ring road; city ones at its edge
    const a = { x: hub.x + ux * 400, z: hub.z + uz * 400 };
    const b = { x: cityCenter.x - ux * 250, z: cityCenter.z - uz * 250 };
    const ga = this.getTerrainHeight(a.x, a.z), gb = this.getTerrainHeight(b.x, b.z);
    let H = 24;
    for (let i = 1; i < 80; i++) {
      const t = i / 80;
      const ground = this.getTerrainHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      H = Math.max(H, ground - (ga + (gb - ga) * t) + 14);
    }
    const start = this._planRailTerminal(a, ux, uz, H, parts);
    const end = this._planRailTerminal(b, -ux, -uz, H, parts);

    const horiz = Math.hypot(end.x - start.x, end.z - start.z);
    const yaw = Math.atan2(end.x - start.x, end.z - start.z);
    const slope = Math.atan2(end.y - start.y, horiz);
    const trackLen = start.distanceTo(end);
    parts.deck.push({
      geometry: new THREE.BoxGeometry(8, 1.2, trackLen),
      matrix: _xf((start.x + end.x) / 2, (start.y + end.y) / 2 - 2, (start.z + end.z) / 2, -slope, yaw, 0, 1, 1, 1, 'YXZ')
    });
    // Pylons every ~140 m, kept off the haul roads
    const nearRoad = (x, z) => (this.aiRoutes || []).some(r => r.points.some(p => (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < 16 * 16));
    const count = Math.max(2, Math.round(horiz / 140));
    for (let i = 1; i < count; i++) {
      const t = i / count;
      const x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
      if (nearRoad(x, z)) continue;
      const top = start.y + (end.y - start.y) * t - 2.6;
      const g = this.getTerrainHeight(x, z);
      const h = top - g + 1;
      parts.pylon.push({ geometry: new THREE.CylinderGeometry(1.8, 2.8, h, 10), matrix: _xf(x, g + h / 2 - 0.5, z) });
    }

    // Trains carry no lights of their own (every extra light costs every lit
    // pixel on screen); their glowing strips read at night
    const train = this.createBulletTrainMesh({ headlight: false });
    train.position.copy(start);
    train.rotation.y = yaw;
    this.scene.add(train);
    this.bulletTrains = this.bulletTrains || [];
    this.bulletTrains.push({
      mesh: train, start, end, yaw,
      t: Math.random(), direction: Math.random() < 0.5 ? 1 : -1,
      speed: 120 / trackLen, // ~430 km/h
      dwellTime: 8, dwell: 0,
      lastTime: null
    });
    this.railLines.push({ start, end });
  }

  // Elevated terminal whose platform runs along (dx, dz); returns the point
  // where the track leaves it
  _planRailTerminal(p, dx, dz, H, parts) {
    const sx = -dz, sz = dx;
    const yaw = Math.atan2(dx, dz);
    const y = this.getTerrainHeight(p.x, p.z);
    const at = (along, side) => ({ x: p.x + dx * along + sx * side, z: p.z + dz * along + sz * side });
    for (const a of [5, 20, 35, 50]) {
      for (const sd of [-4, 4]) {
        const q = at(a, sd);
        parts.metal.push({ geometry: new THREE.BoxGeometry(1.6, H, 1.6), matrix: _xf(q.x, y + H / 2, q.z, 0, yaw, 0) });
      }
      const q = at(a, 0);
      this.registerCollidable({ x: q.x, z: q.z }, 5);
    }
    let q = at(28, 0);
    parts.metal.push({ geometry: new THREE.BoxGeometry(13, 1.4, 56), matrix: _xf(q.x, y + H, q.z, 0, yaw, 0) });
    q = at(30, 3);
    parts.white.push({ geometry: new THREE.CylinderGeometry(3.4, 3.4, 40, 20), matrix: _xf(q.x, y + H + 4.2, q.z, Math.PI / 2, yaw, 0, 1, 1, 1, 'YXZ') });
    q = at(30, -0.45);
    parts.lamp.push({ geometry: new THREE.BoxGeometry(0.3, 0.8, 36), matrix: _xf(q.x, y + H + 4.6, q.z, 0, yaw, 0) });
    parts.white.push({ geometry: new THREE.CylinderGeometry(3, 3, H + 5, 20), matrix: _xf(p.x, y + (H + 5) / 2, p.z) });
    this.registerCollidable({ x: p.x, z: p.z }, 3.5);
    q = at(55, 0);
    return new THREE.Vector3(q.x, y + H + 2, q.z);
  }

  initializeRocketLaunchSystem() {
    if (this.spaceport) return;
    try {
      if (!this.spaceportSite) this.prepareSpaceportSite();
      this.spaceport = new StarshipSpaceport(this.scene, this.spaceportSite, {
        roadMaterials: this.getRoadMaterials(),
        falconSites: this.falconSites || []
      });
      this.spaceport.collidables().forEach(c => this.registerCollidable({ x: c.x, z: c.z }, c.r));
      console.log('MarsSceneManager: spaceport ready with', this.spaceport.ships.length, 'Starships');
    } catch (e) {
      console.warn('Failed to build spaceport:', e);
      this.spaceport = null;
    }
  }

  // Cybertruck traffic: haul routes around the command colony plus trucks on
  // the roads between procedural settlements. Skipped on mobile.
  initializeTrafficSystem() {
    this.aiRoutes = this.aiRoutes || [];
    this.fleet = null;
    try {
      const perf = getPerformanceSettings();
      if (perf.isMobile) return;

      this.fleet = new CybertruckFleet(this.scene, 32);
      this.createTrafficRoutes();

      const routeTrucks = perf.detailLevel === 'high' ? 12 : 8;
      for (let i = 0; i < routeTrucks; i++) {
        const route = this.aiRoutes[i % this.aiRoutes.length];
        const slot = Math.floor(i / this.aiRoutes.length);
        this.fleet.addVehicle(route.path, {
          tag: 'route',
          lane: route.lane,
          uturnReach: route.uturnReach,
          dwell: route.dwell,
          cruise: 11 + Math.random() * 7, // 40-65 km/h on graded regolith
          s: ((slot * 0.37 + Math.random() * 0.2) % 1) * route.path.length,
          dir: (i + slot) % 2 === 0 ? 1 : -1
        });
      }
      console.log('Cybertruck traffic initialized. Trucks:', this.fleet.vehicles.length);
    } catch (e) {
      console.warn('Failed to initialize Cybertruck traffic:', e);
      this.fleet = null;
      this.aiRoutes = [];
    }
  }

  // Haul roads: a ring road around the colony, two mine roads and a long
  // road out toward the rover's landing site. Routes leave from the ring so
  // no truck ever drives through a colony building.
  createTrafficRoutes() {
    if (!this.aiRoutes || this.aiRoutes.length === 0) this.defineHaulRoutes();
    this.createTrafficRouteRoads();
  }

  defineHaulRoutes() {
    if (!this.colonyCenter) {
      this.colonyCenter = new THREE.Vector3(COLONY_SITE_X, 0, COLONY_SITE_Z);
    }
    const c = this.colonyCenter;
    const rel = (dx, dz) => new THREE.Vector3(c.x + dx, 0, c.z + dz);

    const ring = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ring.push(rel(Math.cos(a) * 285, Math.sin(a) * 285));
    }

    // Mine-A hauls ice to the ISRU plant's hopper; Mine-B hauls regolith to
    // the construction yard; propellant and cargo go out to the spaceport.
    // Trucks park at each end to load or unload (dwell, seconds).
    const defs = [
      { name: 'Colony-Ring', closed: true, points: ring },
      { name: 'Ice-Mine', dwell: [7, 13], points: [rel(163, -193), rel(200, -205), rel(255, -300), rel(300, -380), rel(345, -450), rel(380, -520)] },
      { name: 'Regolith-Quarry', dwell: [7, 13], points: [rel(-172, 180), rel(-200, 205), rel(-235, 290), rel(-280, 380), rel(-330, 470), rel(-420, 620)] },
      { name: 'Colony-Landing-Site', points: [rel(185, 217), rel(270, 320), rel(340, 420), rel(400, 520)] }
    ];
    const site = this.spaceportSite;
    if (site) {
      // Toward the spaceport hub, with a gentle bend
      const hub = new THREE.Vector3(site.x + site.ux * 150, 0, site.z + site.uz * 150);
      const dir = new THREE.Vector3(hub.x - c.x, 0, hub.z - c.z).normalize();
      const start = rel(dir.x * 287, dir.z * 287);
      const mid = start.clone().lerp(hub, 0.5).add(new THREE.Vector3(-dir.z * 45, 0, dir.x * 45));
      defs.push({ name: 'Spaceport', dwell: [9, 16], points: [start, mid, hub] });
    }

    this.aiRoutes = defs.map(def => {
      const closed = !!def.closed;
      const points = resamplePath(def.points, 5, closed);
      return {
        name: def.name,
        closed,
        points,
        path: new TrafficPath(points, closed),
        lane: 2.0,
        uturnReach: 7,
        dwell: def.dwell || null
      };
    });
  }

  // Shared, lit road materials. Polygon offset keeps the draped ribbons from
  // z-fighting with the terrain they follow.
  getRoadMaterials() {
    if (!this._roadMaterials) {
      // Graded, compacted regolith: a little darker and browner than the
      // loose ground (terrain vertex colour ~ 0.62, 0.19, 0.08). three r140
      // runs in legacy colour mode, so hex values here are linear, not sRGB.
      // Env reflection is cut back so the road doesn't mirror the bright
      // horizon at grazing angles.
      const surface = new THREE.MeshStandardMaterial({
        color: 0x552514,
        roughness: 1.0,
        metalness: 0.0,
        envMapIntensity: 0.25,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      const marking = new THREE.MeshStandardMaterial({
        color: 0xc0803a,
        roughness: 0.7,
        metalness: 0.0,
        envMapIntensity: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      });
      surface._shared = true;
      marking._shared = true;
      this._roadMaterials = { surface, marking };
    }
    return this._roadMaterials;
  }

  // Dashed centre line for a path, merged into one geometry
  buildRoadDashes(path, lift) {
    const dash = 3, gap = 6, halfWidth = 0.12;
    const verts = [];
    const smp = { x: 0, z: 0, tx: 0, tz: 1 };
    const corner = (s, side) => {
      path.sample(s, smp);
      const x = smp.x - smp.tz * halfWidth * side;
      const z = smp.z + smp.tx * halfWidth * side;
      return [x, sampleTerrainHeight(x, z) + lift, z];
    };
    for (let s = 0; s + dash <= path.length; s += dash + gap) {
      for (let k = 0; k < 2; k++) {
        const s0 = s + (k * dash) / 2, s1 = s + ((k + 1) * dash) / 2;
        const l0 = corner(s0, 1), r0 = corner(s0, -1), l1 = corner(s1, 1), r1 = corner(s1, -1);
        verts.push(...l0, ...l1, ...r0, ...l1, ...r1, ...r0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }

  createTrafficRouteRoads() {
    if (!this.aiRoutes || this.aiRoutes.length === 0) return;
    if (this.aiRoadGroup) {
      this.scene.remove(this.aiRoadGroup);
      this.aiRoadGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }

    const group = new THREE.Group();
    group.name = 'CybertruckRouteRoads';
    const mats = this.getRoadMaterials();

    this.aiRoutes.forEach(route => {
      const road = new THREE.Mesh(buildDrapedRibbon(route.points, 4.5, 0.1, route.closed), mats.surface);
      road.receiveShadow = true;
      group.add(road);

      const dashes = new THREE.Mesh(this.buildRoadDashes(route.path, 0.13), mats.marking);
      dashes.receiveShadow = true;
      group.add(dashes);

      // Turnaround pads where trucks swing round at the road ends
      if (!route.closed) {
        [route.points[0], route.points[route.points.length - 1]].forEach(end => {
          const pad = new THREE.Mesh(buildDrapedDisc(end.x, end.z, route.uturnReach + 3.5, 0.09), mats.surface);
          pad.receiveShadow = true;
          group.add(pad);
        });
      }
    });

    this.aiRoadGroup = group;
    this.scene.add(group);
  }

  // Straight traffic lane along a settlement road, stopping short of the
  // settlement hubs at either end
  makeRoadTrafficPath(road) {
    const dx = road.endX - road.startX, dz = road.endZ - road.startZ;
    const len = Math.hypot(dx, dz);
    const trim = Math.min(60, len * 0.25);
    if (len - 2 * trim < 40) return null;
    const ux = dx / len, uz = dz / len;
    return new TrafficPath([
      new THREE.Vector3(road.startX + ux * trim, 0, road.startZ + uz * trim),
      new THREE.Vector3(road.endX - ux * trim, 0, road.endZ - uz * trim)
    ], false);
  }

  // Keep a handful of trucks on the settlement roads near the player
  _updateRoadVehicles(px, pz) {
    if (!this.fleet) return;
    const despawnSq = this.settlementDespawnDist * this.settlementDespawnDist;
    this.fleet.removeWhere(v => {
      if (v.tag !== 'road') return false;
      if (!this.roads.has(v.roadKey)) return true;
      const dx = v.position.x - px, dz = v.position.z - pz;
      return dx * dx + dz * dz > despawnSq;
    });

    const maxRoadTrucks = 18;
    let count = this.fleet.count('road');
    const smp = { x: 0, z: 0, tx: 0, tz: 1 };
    for (const [key, road] of this.roads) {
      if (count >= maxRoadTrucks) break;
      if (Math.random() > 0.15) continue;
      if (road.trafficPath === undefined) road.trafficPath = this.makeRoadTrafficPath(road);
      const path = road.trafficPath;
      if (!path) continue;

      // Never pop a truck into existence right next to the player
      const s = Math.random() * path.length;
      path.sample(s, smp);
      const dx = smp.x - px, dz = smp.z - pz;
      if (dx * dx + dz * dz < 150 * 150) continue;

      const v = this.fleet.addVehicle(path, {
        tag: 'road',
        lane: 1.5,
        uturnReach: 6,
        cruise: 9 + Math.random() * 6,
        s,
        dir: Math.random() < 0.5 ? 1 : -1
      });
      if (v) {
        v.roadKey = key;
        count++;
      }
    }
  }

  // Control methods for rocket launch system
  setRocketLaunchInterval(milliseconds) {
    // Kept for API compatibility; each Starship keeps its own schedule
    this.rocketCycleDuration = Math.max(15000, milliseconds || this.rocketCycleDuration);
  }

  enableRocketLaunches() {
    this.rocketTrafficEnabled = true;
  }

  disableRocketLaunches() {
    this.rocketTrafficEnabled = false;
  }

  // Launch the grounded Starship that is closest to its scheduled launch
  triggerManualLaunch() {
    if (!this.spaceport) return;
    let best = null;
    for (const ship of this.spaceport.ships) {
      if (ship.state === 'pad' && (!best || ship.timer - ship.t < best.timer - best.t)) best = ship;
    }
    if (best) best.timer = best.t;
  }

  startRocketLaunchCycle() {
    this.enableRocketLaunches();
    this.triggerManualLaunch('reset');
  }

  triggerRocketLaunchSequence() {
    this.startRocketLaunchCycle();
  }

  // --- UPDATE animated objects ---
  updateAnimations(time, dt = 1 / 60) {
    const roverPos = typeof rover !== 'undefined' && rover ? rover.position : null;
    const BEACON_CULL_DIST_SQ = 700 * 700;
    const frames = dt * 60; // rotation speeds are authored per 60 Hz frame
    const t = time * 0.001;

    // Floodlights barely register against Martian daylight; letting them run
    // at full strength washed the colony out at noon
    const nightLevel = 1 - 0.85 * (typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0);
    for (const light of this.nightLights) {
      if (light.userData.baseIntensity === undefined) light.userData.baseIntensity = light.intensity;
      light.intensity = light.userData.baseIntensity * nightLevel;
    }
    const night = 1 - (typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0);
    for (const e of this.nightEmissives) {
      e.material.emissiveIntensity = e.day + (e.night - e.day) * night;
    }

    // Gantry printer laying the top course of a regolith habitat shell
    if (this.printers) {
      for (const p of this.printers) {
        p.angle += dt * 0.3;
        const nx = Math.cos(p.angle) * p.radius, nz = Math.sin(p.angle) * p.radius;
        p.bridge.position.z = nz;
        p.pillars.forEach(pillar => { pillar.position.z = nz; });
        p.carriage.position.set(nx, p.top - 10.7, 0);
      }
    }

    for (const anim of this.animatedObjects) {
      if (!anim.mesh) continue;

      if (anim.type === 'blink') {
        // Beacons never move, so resolve the world position once
        if (!anim.worldPos) {
          anim.worldPos = new THREE.Vector3();
          anim.mesh.getWorldPosition(anim.worldPos);
        }
        let on = Math.sin(t * 1.8 + anim.phase) > 0.3;
        if (roverPos) {
          const dx = anim.worldPos.x - roverPos.x, dz = anim.worldPos.z - roverPos.z;
          if (dx * dx + dz * dz > BEACON_CULL_DIST_SQ) on = false;
        }
        if (anim.mesh.isLight) {
          // Toggling a light's visibility changes the scene's light count and
          // forces every lit material to switch shader programs; dim it instead.
          const ud = anim.mesh.userData;
          if (ud.baseIntensity === undefined) ud.baseIntensity = anim.mesh.intensity;
          anim.mesh.intensity = on ? ud.baseIntensity * nightLevel : 0;
        } else {
          anim.mesh.visible = on;
        }
      } else if (anim.type === 'rotate') {
        anim.mesh.rotation.y += anim.speed * frames;
      }
    }
  }

  prepareSettlementFadeIn(group, startTime) {
    if (!group) return;
    const materials = [];
    group.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat, index) => {
        if (!mat) return;
        const cloned = mat.clone();
        cloned.transparent = true;
        cloned.opacity = 0.0;
        cloned.needsUpdate = true;
        if (Array.isArray(obj.material)) obj.material[index] = cloned;
        else obj.material = cloned;
        materials.push({ material: cloned, targetOpacity: typeof mat.opacity === 'number' ? mat.opacity : 1 });
      });
    });
    group.scale.setScalar(0.985);
    this.fadingSettlements.push({ group, materials, startTime, duration: 2600 });
  }

  updateSettlementFades(time) {
    if (!this.fadingSettlements || this.fadingSettlements.length === 0) return;

    for (let i = this.fadingSettlements.length - 1; i >= 0; i--) {
      const fade = this.fadingSettlements[i];
      const t = Math.max(0, Math.min(1, (time - fade.startTime) / fade.duration));
      const eased = t * t * (3 - 2 * t);
      if (fade.group) fade.group.scale.setScalar(0.985 + eased * 0.015);
      fade.materials.forEach(entry => {
        entry.material.opacity = entry.targetOpacity * eased;
        if (t >= 1 && entry.targetOpacity >= 1) {
          entry.material.transparent = false;
          entry.material.needsUpdate = true;
        }
      });
      if (t >= 1) this.fadingSettlements.splice(i, 1);
    }
  }

  // Create a high-definition futuristic colony
  createColonyInfrastructure() {
    const structures = [];
    
    // Position colony further away and to the side for better view
    const colonyOffsetX = COLONY_SITE_X;
    const colonyOffsetZ = COLONY_SITE_Z;
    const groundY = 0;

    // Store primary colony center for use by traffic and rail systems
    this.colonyCenter = new THREE.Vector3(colonyOffsetX, groundY, colonyOffsetZ);

    // The colony buildings are placed at a fixed ground height (groundY=0), so
    // flatten the terrain beneath them to remove the little hills that would
    // otherwise poke up in front of the structures and the rocket area.
    // The pad reaches out to the ring road, which then blends into the
    // surrounding ground.
    flattenMarsTerrain(colonyOffsetX, colonyOffsetZ, 330, groundY);
    this.prepareSpaceportSite();
    this.prepareExpansionSites();
    this.buildBiodomes();

    // Grade the haul roads into the ground before anything else is placed on
    // it, so lamps, crates and pads all stand on the final surface
    if (!getPerformanceSettings().isMobile) {
      this.defineHaulRoutes();
      this.aiRoutes.forEach(route => gradeTerrainAlongPath(route.points, route.closed));
      marsSurface.geometry.computeVertexNormals();
    }

    // Realistic near-future base: shielded habitats, greenhouses, an ISRU
    // propellant plant, power and comms (see buildColonyArchitecture)
    this.buildColonyArchitecture(this.colonyCenter)
      .forEach(c => this.registerCollidable({ x: c.x, z: c.z }, c.r));

    // Floodlights over the core (fades out in daylight)
    const floodLight = new THREE.PointLight(0xffd2a0, 1.6 * LEGACY_LIGHT_SCALE, 420, 0);
    floodLight.position.set(colonyOffsetX, groundY + 40, colonyOffsetZ);
    this.scene.add(floodLight);
    this.nightLights.push(floodLight);

    // Secondary colony 2.6 km east (habitat core only), joined by maglev
    try {
      const perfSettings = getPerformanceSettings();
      if (!perfSettings.isMobile) {
        const sc = this.colonyCenter.clone().add(new THREE.Vector3(2600, 0, 0));
        sc.y = this.getTerrainHeight(sc.x, sc.z);
        flattenMarsTerrain(sc.x, sc.z, 240, sc.y);
        this.secondaryColonyCenter = sc;
        this.buildColonyArchitecture(sc, { core: true })
          .forEach(c => this.registerCollidable({ x: c.x, z: c.z }, c.r));
        console.log('✅ Secondary colony created at', sc.x, sc.z);

        this.createBulletTrainSystem();
        this.buildExpansionCities();
        this.buildRailNetwork();

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

    this.createColonyGroundingDetails(this.colonyCenter, groundY);
  }

  // Shared materials for the colony architecture. Colours are linear (three
  // r140 legacy colour mode). Night-lit materials register themselves so
  // updateAnimations can bring their glow up after dark.
  getColonyMaterials() {
    if (this._colonyMats) return this._colonyMats;
    const std = (params, night) => {
      const m = new THREE.MeshStandardMaterial(params);
      if (night) this.nightEmissives.push({ material: m, day: night[0], night: night[1] });
      return m;
    };
    this._colonyMats = {
      // Habitats are buried under ~2 m of regolith for radiation shielding
      regolith: std({ color: 0x8f3416, roughness: 1.0, metalness: 0.0 }),
      printed: std({ color: 0x5c220e, roughness: 0.95, metalness: 0.0 }),
      white: std({ color: 0xb8b6b0, roughness: 0.5, metalness: 0.15 }),
      metal: std({ color: 0x4a4c50, roughness: 0.5, metalness: 0.8 }),
      dark: std({ color: 0x0c0d0f, roughness: 0.7, metalness: 0.2 }),
      band: std({ color: 0x0b1e55, roughness: 0.5, metalness: 0.2 }),
      lamp: std({ color: 0x151412, emissive: 0xffc68a, emissiveIntensity: 0.25 }, [0.25, 2.4]),
      // Greenhouse film glows magenta from the LED grow lights at night
      glass: std({
        color: 0x8fb0a8, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.3,
        depthWrite: false, side: THREE.DoubleSide, emissive: 0xb040ff, emissiveIntensity: 0.0
      }, [0.0, 0.55]),
      plants: std({ color: 0x0f3a0a, roughness: 0.85, metalness: 0.0, emissive: 0x6a1a70, emissiveIntensity: 0.0 }, [0.0, 0.8]),
      pv: std({ color: 0x02081a, roughness: 0.22, metalness: 0.4, envMapIntensity: 1.2 })
    };
    return this._colonyMats;
  }

  // Build a realistic near-future Mars base around `center`. Everything is
  // merged per material, so the whole colony costs about ten draw calls.
  // Returns collision circles. options.core: habitats, greenhouses, hangar
  // and comms only (the secondary colony).
  buildColonyArchitecture(center, options = {}) {
    const mats = this.getColonyMaterials();
    const parts = {};
    for (const key of Object.keys(mats)) parts[key] = [];
    const add = (mat, geometry, matrix) => parts[mat].push({ geometry, matrix });
    const cx = center.x, cz = center.z;
    const gy = (x, z) => this.getTerrainHeight(cx + x, cz + z);
    const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order) =>
      _xf(cx + x, y, cz + z, rx, ry, rz, sx, sy, sz, order);
    const collide = [];
    const circle = (x, z, r) => collide.push({ x: cx + x, z: cz + z, r });
    const core = !!options.core;

    // --- Habitat core: a shielded hub and four vaults joined by pressurised
    // tunnels. Only the white end walls, airlocks and a cupola show.
    {
      const y0 = gy(0, 0);
      add('regolith', lumpify(new THREE.SphereGeometry(20, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0.8),
        at(0, y0 - 0.8, 0, 0, 0, 0, 1, 0.62, 1));
      add('white', new THREE.CylinderGeometry(3.6, 4, 2.2, 20), at(0, y0 + 11.2, 0));
      add('lamp', new THREE.SphereGeometry(3.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), at(0, y0 + 12.3, 0));
      circle(0, 0, 22);

      const vaults = [
        { x: -55, z: 0, alongX: true }, { x: 55, z: 0, alongX: true },
        { x: 0, z: -55, alongX: false }, { x: 0, z: 55, alongX: false }
      ];
      // Each vault is a long module under a broad, low regolith mound (sides
      // near the angle of repose) that runs into the hub; only the entry
      // vestibule at the outer end is exposed.
      const W = 1.5, Hs = 0.7; // mound width / height relative to a 9 m module
      vaults.forEach(vault => {
        const y = gy(vault.x, vault.z);
        const ox = vault.alongX ? Math.sign(vault.x) : 0;
        const oz = vault.alongX ? 0 : Math.sign(vault.z);
        const tube = lumpify(new THREE.CylinderGeometry(9, 9, 50, 28, 6, true), 0.7);
        const capOut = lumpify(new THREE.SphereGeometry(9, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.6);
        const capIn = lumpify(new THREE.SphereGeometry(9, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.6);
        const ex = vault.x + ox * 25, ez = vault.z + oz * 25; // outer end of the tube
        const ix = vault.x - ox * 25, iz = vault.z - oz * 25; // inner end
        if (vault.alongX) {
          add('regolith', tube, at(vault.x, y - 1, vault.z, 0, 0, Math.PI / 2, Hs, 1, W));
          add('regolith', capOut, at(ex, y - 1, ez, 0, 0, -ox * Math.PI / 2, Hs, 1, W));
          add('regolith', capIn, at(ix, y - 1, iz, 0, 0, ox * Math.PI / 2, Hs, 1, W));
        } else {
          add('regolith', tube, at(vault.x, y - 1, vault.z, Math.PI / 2, 0, 0, W, 1, Hs));
          add('regolith', capOut, at(ex, y - 1, ez, oz * Math.PI / 2, 0, 0, W, 1, Hs));
          add('regolith', capIn, at(ix, y - 1, iz, -oz * Math.PI / 2, 0, 0, W, 1, Hs));
        }

        // Entry vestibule: airlock door and window band facing outward
        const vx = vault.x + ox * 33.5, vz = vault.z + oz * 33.5;
        const ry = Math.atan2(ox, oz);
        const vy = gy(vx, vz);
        add('white', new THREE.BoxGeometry(6, 4.4, 6), at(vx, vy + 2.2, vz, 0, ry, 0));
        const fx = vault.x + ox * 36.6, fz = vault.z + oz * 36.6;
        add('dark', new THREE.BoxGeometry(2.4, 3, 0.3), at(fx, vy + 1.5, fz, 0, ry, 0));
        add('lamp', new THREE.BoxGeometry(4.6, 0.5, 0.3), at(fx, vy + 3.7, fz, 0, ry, 0));
        for (let k = -3; k <= 3; k++) {
          const d = k * 11;
          circle(vault.x + ox * d, vault.z + oz * d, 12);
        }
        circle(vx, vz, 4.5);
      });
    }

    // --- Greenhouses: five inflatable tunnels on the west side, linked by a
    // pressurised spine to the west habitat
    {
      const zLen = 60;
      for (let k = 0; k < 5; k++) {
        const x = -120 - k * 16;
        const y = gy(x, 0);
        add('glass', new THREE.CylinderGeometry(6, 6, zLen, 28, 1, true, Math.PI / 2, Math.PI), at(x, y, 0, Math.PI / 2));
        for (const end of [-1, 1]) {
          add('glass', new THREE.CircleGeometry(6, 24, 0, Math.PI), at(x, y, end * zLen / 2));
        }
        for (let r = 0; r <= 10; r++) {
          add('metal', new THREE.TorusGeometry(6.05, 0.1, 4, 20, Math.PI), at(x, y, -zLen / 2 + r * 6));
        }
        for (const off of [-3, 0, 3]) {
          add('plants', new THREE.BoxGeometry(1.5, 0.9, zLen - 4), at(x + off, y + 0.45, 0));
        }
        for (let j = -2; j <= 2; j++) circle(x, j * 12, 6.5);
      }
      const ySpine = gy(-140, -34) + 2.2;
      add('white', new THREE.CylinderGeometry(2.2, 2.2, 90, 16), at(-145, ySpine, -34, 0, 0, Math.PI / 2));
      add('white', new THREE.CylinderGeometry(2.2, 2.2, 10, 16), at(-96.5, gy(-96.5, 0) + 2.2, 0, 0, 0, Math.PI / 2));
      add('white', new THREE.CylinderGeometry(2.2, 2.2, 36, 16), at(-101, gy(-101, -17) + 2.2, -17, Math.PI / 2));
    }

    // --- Garage hangar for rovers and trucks, shielded like the habitats
    {
      const x = 120, z = 150, y = gy(x, z);
      add('regolith', lumpify(new THREE.CylinderGeometry(12, 12, 36, 28, 6, true), 0.8),
        at(x, y - 1.5, z, 0, 0, Math.PI / 2, 0.85, 1, 1));
      add('white', new THREE.CircleGeometry(10.2, 28, 0, Math.PI), at(x - 18.1, y - 1.5, z, 0, -Math.PI / 2, 0, 1, 0.85, 1));
      add('dark', new THREE.BoxGeometry(0.4, 6.5, 12), at(x - 18.4, y + 3.25, z));
      add('lamp', new THREE.BoxGeometry(0.4, 0.6, 12), at(x - 18.5, y + 7.1, z));
      for (let k = -1; k <= 1; k++) circle(x + k * 12, z, 12);
    }

    // --- Deep-space antenna: tracks Earth and the relay orbiters
    {
      const x = -150, z = -110, y = gy(x, z);
      add('white', new THREE.CylinderGeometry(2.2, 2.8, 8, 16), at(x, y + 4, z));
      circle(x, z, 7);
      const dishGroup = new THREE.Group();
      dishGroup.position.set(cx + x, y + 8, cz + z);
      const alidade = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 3), mats.white);
      alidade.position.y = 2;
      const profile = [];
      for (let i = 0; i <= 10; i++) { const r = (i / 10) * 9; profile.push(new THREE.Vector2(r, (r * r) / (4 * 9.2))); }
      const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshStandardMaterial({
        color: 0xc4c4be, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide
      }));
      dish.position.y = 5;
      dish.rotation.x = -0.75; // elevation
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9.2, 6), mats.metal);
      feed.position.y = 4.6;
      dish.add(feed);
      dish.castShadow = alidade.castShadow = true;
      dishGroup.add(alidade, dish);
      this.scene.add(dishGroup);
      this.animatedObjects.push({ mesh: dishGroup, type: 'rotate', speed: 0.0009 });

      const mx = x - 15, mz = z + 15, my = gy(mx, mz);
      add('metal', new THREE.BoxGeometry(0.8, 30, 0.8), at(mx, my + 15, mz));
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
      beacon.position.set(cx + mx, my + 30.5, cz + mz);
      this.scene.add(beacon);
      this.animatedObjects.push({ mesh: beacon, type: 'blink', phase: 0.4 });
    }

    if (!core) {
      // --- ISRU propellant plant: mined ice -> water -> electrolysis; CO2
      // from the air + H2 -> Sabatier reactors -> methane. Stored cryogenic
      // in the tank farm and trucked to the spaceport.
      {
        const hx = 125, hz = -165, hy = gy(hx, hz);
        add('white', new THREE.BoxGeometry(36, 11, 18), at(hx, hy + 5.5, hz));
        add('metal', new THREE.BoxGeometry(36.6, 0.8, 18.6), at(hx, hy + 11.2, hz));
        add('dark', new THREE.BoxGeometry(0.4, 5, 7), at(hx + 18.1, hy + 2.5, hz));
        add('lamp', new THREE.BoxGeometry(0.3, 0.6, 30), at(hx - 18.2, hy + 8, hz));
        for (let k = -1; k <= 1; k++) circle(hx + k * 12, hz, 11);

        // Sabatier reactors
        for (let k = 0; k < 4; k++) {
          const z = hz + 7 - k * 5;
          add('metal', new THREE.CylinderGeometry(1.6, 1.6, 9, 16), at(hx - 22, gy(hx - 22, z) + 4.5, z));
        }
        circle(hx - 22, hz, 5);

        // Radiators rejecting the reactors' waste heat
        for (let k = 0; k < 6; k++) {
          const x = hx + 26 + k * 4, z = hz + 25;
          const y = gy(x, z);
          add('white', new THREE.BoxGeometry(0.25, 7, 14), at(x, y + 5, z));
          add('metal', new THREE.BoxGeometry(0.3, 1.5, 0.3), at(x, y + 0.75, z - 6));
          add('metal', new THREE.BoxGeometry(0.3, 1.5, 0.3), at(x, y + 0.75, z + 6));
        }
        circle(hx + 36, hz + 25, 11);

        // Cryogenic tank farm: methane (blue band) and oxygen
        for (let row = 0; row < 2; row++) {
          for (let k = 0; k < 4; k++) {
            const x = 95 + k * 11, z = -118 - row * 12;
            const y = gy(x, z);
            add('white', new THREE.CylinderGeometry(4, 4, 15, 20), at(x, y + 7.5, z));
            add('white', new THREE.SphereGeometry(4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), at(x, y + 15, z));
            add(row === 0 ? 'band' : 'metal', new THREE.CylinderGeometry(4.05, 4.05, 1.1, 20, 1, true), at(x, y + 11, z));
            circle(x, z, 5);
          }
        }
        // Pipe rack from the plant to the tanks
        for (const px of [118, 121]) {
          add('metal', new THREE.CylinderGeometry(0.35, 0.35, 28, 8), at(px, gy(px, -142) + 4, -142, Math.PI / 2));
        }
        for (let k = 0; k < 4; k++) add('metal', new THREE.BoxGeometry(5, 0.4, 0.4), at(119.5, gy(119.5, -130 - k * 8) + 3.6, -130 - k * 8));

        // Ice hopper at the unloading bay (end of the Mine-A haul road), with
        // a covered conveyor up to the plant
        const bx = 172, bz = -182, by = gy(bx, bz);
        add('metal', new THREE.CylinderGeometry(6, 1.6, 6, 20, 1, true), at(bx, by + 7.5, bz));
        for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
          add('metal', new THREE.BoxGeometry(0.4, 5, 0.4), at(bx + lx, by + 2.5, bz + lz));
        }
        const c0 = new THREE.Vector3(bx - 3, by + 4, bz + 2), c1 = new THREE.Vector3(hx + 18, hy + 9, hz - 4);
        const cLen = c0.distanceTo(c1);
        const cyaw = Math.atan2(c1.x - c0.x, c1.z - c0.z);
        const cpitch = Math.asin((c1.y - c0.y) / cLen);
        add('white', new THREE.BoxGeometry(2, 1.6, cLen), at((c0.x + c1.x) / 2, (c0.y + c1.y) / 2, (c0.z + c1.z) / 2, -cpitch, cyaw, 0, 1, 1, 1, 'YXZ'));
        circle(bx, bz, 7);
      }

      // --- Construction yard at the end of the Mine-B road: sintered
      // regolith bricks and a gantry printer building a new habitat shell
      {
        const x = -140, z = 150, y = gy(x, z);
        for (let k = 0; k < 12; k++) {
          const h = 0.25 + k * 0.5;
          const r = Math.sqrt(Math.max(0, 100 - h * h * 1.6));
          add('printed', new THREE.TorusGeometry(r, 0.3, 5, 48), at(x, y + h, z, Math.PI / 2));
        }
        circle(x, z, 11);
        for (const side of [-1, 1]) add('metal', new THREE.BoxGeometry(0.6, 0.5, 34), at(x + side * 14, gy(x + side * 14, z) + 0.25, z));
        for (let k = 0; k < 6; k++) {
          const px = -165 + (k % 3) * 4, pz = 183 + Math.floor(k / 3) * 4;
          add('printed', new THREE.BoxGeometry(3, 1.4 + (k % 2) * 0.7, 3), at(px, gy(px, pz) + 0.8, pz));
        }
        circle(-161, 185, 6);

        // Moving gantry (animated)
        const gantry = new THREE.Group();
        gantry.position.set(cx + x, y, cz + z);
        const pillarGeom = new THREE.BoxGeometry(0.8, 15, 0.8);
        const pillars = [-1, 1].map(side => {
          const p = new THREE.Mesh(pillarGeom, mats.metal);
          p.position.set(side * 14, 7.5, 0);
          gantry.add(p);
          return p;
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(29, 1, 1.2), mats.metal);
        bridge.position.y = 15;
        const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mats.white);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8, 8), mats.metal);
        carriage.add(nozzle);
        bridge.add(carriage);
        gantry.add(bridge);
        gantry.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(gantry);
        this.printers = this.printers || [];
        this.printers.push({ pillars, bridge, carriage, nozzle, angle: 0, radius: 7.2, top: 6.2 });
      }

      // --- Solar field north of the ring road and two small fission
      // reactors behind a berm, cabled into the colony grid
      {
        const panelGeom = new THREE.BoxGeometry(10, 0.12, 4);
        const legGeom = new THREE.BoxGeometry(0.25, 1.9, 0.25);
        const rows = 10, cols = 16;
        const panels = new THREE.InstancedMesh(panelGeom, mats.pv, rows * cols);
        const legs = new THREE.InstancedMesh(legGeom, mats.metal, rows * cols * 2);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.44, 0, 0));
        const one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), noRot = new THREE.Quaternion();
        let n = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = -70 + c * 12, z = -335 - r * 10;
            const y = gy(x, z);
            panels.setMatrixAt(n, m.compose(p.set(cx + x, y + 2.0, cz + z), q, one));
            legs.setMatrixAt(n * 2, m.compose(p.set(cx + x - 4, y + 0.95, cz + z), noRot, one));
            legs.setMatrixAt(n * 2 + 1, m.compose(p.set(cx + x + 4, y + 0.95, cz + z), noRot, one));
            n++;
          }
        }
        panels.receiveShadow = true;
        panels.frustumCulled = legs.frustumCulled = false;
        this.scene.add(panels, legs);
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 2) circle(-64 + c * 12, -335 - r * 10, 6.5);
        }

        // Inverter shed and cable trench to the north habitat
        add('white', new THREE.BoxGeometry(6, 3, 4), at(20, gy(20, -322) + 1.5, -322));
        const cableMat = mats.dark;
        const cable = resamplePath([new THREE.Vector3(cx + 20, 0, cz - 320), new THREE.Vector3(cx, 0, cz - 82)], 4, false);
        const cableMesh = new THREE.Mesh(buildDrapedRibbon(cable, 0.5, 0.06, false), cableMat);
        this.scene.add(cableMesh);

        for (const rx of [-30, 40]) {
          const rz = -505;
          const ry = gy(rx, rz);
          flattenMarsTerrain(cx + rx, cz + rz, 30, ry);
          add('metal', new THREE.CylinderGeometry(1.4, 1.6, 4.5, 16), at(rx, ry + 2.25, rz));
          add('white', new THREE.ConeGeometry(5.5, 4.5, 18, 1, true), at(rx, ry + 7, rz, Math.PI));
          add('regolith', lumpify(new THREE.TorusGeometry(12, 3.4, 10, 40), 0.6), at(rx, ry - 1.2, rz, Math.PI / 2, 0, 0, 1, 1, 0.8));
          const warn = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
          warn.position.set(cx + rx, ry + 9.8, cz + rz);
          this.scene.add(warn);
          this.animatedObjects.push({ mesh: warn, type: 'blink', phase: rx * 0.1 });
          circle(rx, rz, 14);
          const lead = resamplePath([new THREE.Vector3(cx + rx, 0, cz + rz + 12), new THREE.Vector3(cx + 20, 0, cz - 430)], 4, false);
          this.scene.add(new THREE.Mesh(buildDrapedRibbon(lead, 0.35, 0.06, false), cableMat));
        }
      }
    }

    // Build one merged mesh per material
    for (const [key, list] of Object.entries(parts)) {
      if (list.length === 0) continue;
      const mesh = new THREE.Mesh(mergeGeometryList(list), mats[key]);
      const opaque = key !== 'glass' && key !== 'lamp';
      mesh.castShadow = opaque;
      mesh.receiveShadow = opaque;
      mesh.name = 'Colony-' + key;
      this.scene.add(mesh);
    }
    return collide;
  }

  // Elevated maglev terminal. dir = +1 if the line leaves toward +x.
  buildRailTerminal(x, z, dir, platformHeight) {
    const mats = this.getColonyMaterials();
    const white = [], metal = [], lamp = [];
    const y = this.getTerrainHeight(x, z);
    const H = platformHeight;
    for (const px of [5, 20, 35, 50]) {
      for (const pz of [-4, 4]) {
        metal.push({ geometry: new THREE.BoxGeometry(1.6, H, 1.6), matrix: _xf(x + dir * px, y + H / 2, z + pz) });
      }
    }
    metal.push({ geometry: new THREE.BoxGeometry(56, 1.4, 13), matrix: _xf(x + dir * 28, y + H, z) });
    white.push({ geometry: new THREE.CylinderGeometry(3.4, 3.4, 40, 20), matrix: _xf(x + dir * 30, y + H + 4.2, z + 3, 0, 0, Math.PI / 2) });
    lamp.push({ geometry: new THREE.BoxGeometry(36, 0.8, 0.3), matrix: _xf(x + dir * 30, y + H + 4.6, z - 0.45) });
    white.push({ geometry: new THREE.CylinderGeometry(3, 3, H + 5, 20), matrix: _xf(x, y + (H + 5) / 2, z) });
    [[white, mats.white], [metal, mats.metal], [lamp, mats.lamp]].forEach(([list, mat]) => {
      const mesh = new THREE.Mesh(mergeGeometryList(list), mat);
      mesh.castShadow = mat !== mats.lamp;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
    this.registerCollidable({ x, z }, 3.5);
    for (const px of [5, 20, 35, 50]) this.registerCollidable({ x: x + dir * px, z }, 5);
    return new THREE.Vector3(x + dir * 55, y + H + 2, z);
  }

  createColonyGroundingDetails(center, groundY) {
    try {
      if (!center) return;
      const perfSettings = getPerformanceSettings();
      const highDetail = perfSettings.detailLevel === 'high' && !perfSettings.isMobile;
      const detailScale = perfSettings.isMobile ? 0.65 : highDetail ? 1 : 0.82;
      const group = new THREE.Group();
      group.name = 'ColonyGroundingDetails';

      const serviceMat = new THREE.MeshStandardMaterial({
        color: 0x3a302b,
        roughness: 0.95,
        metalness: 0.08
      });
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb45a });
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x56585d,
        roughness: 0.7,
        metalness: 0.35
      });
      const glowCyan = new THREE.MeshBasicMaterial({ color: 0x66eaff });
      const glowAmber = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
      const cargoMat = new THREE.MeshStandardMaterial({
        color: 0xb8c0ca,
        roughness: 0.45,
        metalness: 0.75
      });
      const darkCargoMat = new THREE.MeshStandardMaterial({
        color: 0x303842,
        roughness: 0.5,
        metalness: 0.65
      });
      // On desktop the Cybertruck ring road (createTrafficRoutes) is draped
      // over the terrain on this radius; the flat torus stays for mobile.
      if (perfSettings.isMobile) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(285, 2.6, 8, 160), serviceMat);
        ring.position.set(center.x, groundY + 0.35, center.z);
        ring.rotation.x = Math.PI / 2;
        ring.receiveShadow = true;
        group.add(ring);

        const ringLine = new THREE.Mesh(new THREE.TorusGeometry(285, 0.32, 6, 160), lineMat);
        ringLine.position.set(center.x, groundY + 0.55, center.z);
        ringLine.rotation.x = Math.PI / 2;
        group.add(ringLine);
      }

      const serviceSpokes = [
        { angle: -0.15, length: 560 },
        { angle: Math.PI * 0.34, length: 430 },
        { angle: Math.PI * 0.62, length: 470 }, // clear of the Mine-A haul road
        { angle: Math.PI * 1.18, length: 410 }
      ];

      // Service roads are draped over the ground (flat boxes used to float
      // or sink once they left the levelled colony pad). They stop either side
      // of the ring road instead of z-fighting across it, and their landing
      // pads sit clear of the ring on levelled ground.
      const roadMats = this.getRoadMaterials();
      const ringRadius = 285, ringGap = 6;
      serviceSpokes.forEach((spoke, index) => {
        const dirX = Math.sin(spoke.angle), dirZ = Math.cos(spoke.angle);
        const at = d => new THREE.Vector3(center.x + dirX * d, 0, center.z + dirZ * d);

        const padDist = Math.max(spoke.length * 0.72, 372);
        const padX = center.x + dirX * padDist, padZ = center.z + dirZ * padDist;
        const padY = this.getTerrainHeight(padX, padZ);
        flattenMarsTerrain(padX, padZ, 44, padY);

        const pieces = perfSettings.isMobile
          ? [[110, spoke.length]]
          : [[110, ringRadius - ringGap], [ringRadius + ringGap, spoke.length]];
        pieces.forEach(([from, to]) => {
          const pts = resamplePath([at(from), at(to)], 4, false);
          const road = new THREE.Mesh(buildDrapedRibbon(pts, 5.5, 0.08, false), roadMats.surface);
          road.receiveShadow = true;
          group.add(road);
          const dashes = new THREE.Mesh(this.buildRoadDashes(new TrafficPath(pts, false), 0.11), roadMats.marking);
          group.add(dashes);
        });

        const pad = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 1.2, 12), padMat);
        pad.position.set(padX, padY + 0.45, padZ);
        pad.rotation.y = spoke.angle;
        pad.receiveShadow = true;
        group.add(pad);

        const padRing = new THREE.Mesh(new THREE.TorusGeometry(21, 0.55, 6, 48), index % 2 === 0 ? glowCyan : glowAmber);
        padRing.position.set(pad.position.x, padY + 1.15, pad.position.z);
        padRing.rotation.x = Math.PI / 2;
        group.add(padRing);
        this.animatedObjects.push({ mesh: padRing, type: 'rotate', speed: index % 2 === 0 ? 0.01 : -0.012 });
        this.registerCollidable({ x: pad.position.x, z: pad.position.z }, 23);
      });

      const lightPostGeom = new THREE.CylinderGeometry(0.45, 0.7, 9, 8);
      const lightHeadGeom = new THREE.SphereGeometry(1.25, 10, 8);
      const perimeterCount = Math.floor((highDetail ? 30 : 20) * detailScale);
      // Lamps never stand in a service or haul road
      const onRoad = (x, z) => {
        const dx = x - center.x, dz = z - center.z;
        for (const spoke of serviceSpokes) {
          const along = dx * Math.sin(spoke.angle) + dz * Math.cos(spoke.angle);
          const across = dx * Math.cos(spoke.angle) - dz * Math.sin(spoke.angle);
          if (along > 0 && along < spoke.length && Math.abs(across) < 10) return true;
        }
        return (this.aiRoutes || []).some(route => !route.closed &&
          route.points.some(p => (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < 100));
      };
      for (let i = 0; i < perimeterCount; i++) {
        const angle = (i / perimeterCount) * Math.PI * 2;
        const radius = 318 + Math.sin(i * 2.13) * 18;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        if (onRoad(x, z)) continue;
        const y = this.getTerrainHeight(x, z);
        const post = new THREE.Mesh(lightPostGeom, darkCargoMat);
        post.position.set(x, y + 4.5, z);
        group.add(post);

        const head = new THREE.Mesh(lightHeadGeom, i % 3 === 0 ? glowCyan : glowAmber);
        head.position.y = 4.8;
        post.add(head);
        this.animatedObjects.push({ mesh: head, type: 'blink', phase: i * 0.37 });
      }

      // All inside the ring road (two used to sit on it)
      const cargoPositions = [
        { x: -210, z: 92, yaw: 0.2 },
        { x: 215, z: 84, yaw: -0.4 },
        { x: -95, z: 205, yaw: 0.9 },
        { x: 70, z: 215, yaw: -0.7 }
      ];
      cargoPositions.forEach((p, clusterIndex) => {
        for (let i = 0; i < 5; i++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(9, 6 + (i % 2) * 3, 8), i % 2 ? cargoMat : darkCargoMat);
          const localX = (i % 3) * 10 - 10;
          const localZ = Math.floor(i / 3) * 12;
          const c = Math.cos(p.yaw);
          const s = Math.sin(p.yaw);
          const x = center.x + p.x + localX * c - localZ * s;
          const z = center.z + p.z + localX * s + localZ * c;
          const y = this.getTerrainHeight(x, z);
          crate.position.set(x, y + crate.geometry.parameters.height / 2, z);
          crate.rotation.y = p.yaw + (i % 2) * 0.12;
          crate.castShadow = true;
          crate.receiveShadow = true;
          group.add(crate);
          if (i < 2) this.registerCollidable({ x, z }, 7);
        }

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 18, 8), darkCargoMat);
        const mx = center.x + p.x + 28 * Math.cos(p.yaw + 0.8);
        const mz = center.z + p.z + 28 * Math.sin(p.yaw + 0.8);
        const my = this.getTerrainHeight(mx, mz);
        mast.position.set(mx, my + 9, mz);
        group.add(mast);
        const mastHead = new THREE.Mesh(lightHeadGeom, glowCyan);
        mastHead.position.y = 9.6;
        mast.add(mastHead);
        this.animatedObjects.push({ mesh: mastHead, type: 'blink', phase: clusterIndex * 0.9 });
      });

      const rockCount = Math.floor((highDetail ? 190 : 120) * detailScale);
      const rockGeom = new THREE.DodecahedronGeometry(1, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x8a3f24,
        roughness: 0.96,
        metalness: 0.02
      });
      const rocks = new THREE.InstancedMesh(rockGeom, rockMat, rockCount);
      const matrix = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const pos = new THREE.Vector3();
      for (let i = 0; i < rockCount; i++) {
        const angle = i * 2.399963 + Math.sin(i * 0.71) * 0.35;
        const radius = 360 + (i % 37) * 13 + Math.sin(i * 1.91) * 26;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        const y = this.getTerrainHeight(x, z);
        pos.set(x, y + 0.55, z);
        quat.setFromEuler(new THREE.Euler(Math.sin(i) * 0.6, angle, Math.cos(i * 0.7) * 0.35));
        const s = 1.2 + (i % 9) * 0.24;
        scale.set(s * (1.0 + (i % 3) * 0.18), s * 0.7, s * (0.9 + (i % 5) * 0.11));
        matrix.compose(pos, quat, scale);
        rocks.setMatrixAt(i, matrix);
      }
      rocks.castShadow = true;
      rocks.receiveShadow = true;
      group.add(rocks);

      this.createRouteScanSites(group, center, groundY);
      this.scene.add(group);
    } catch (e) {
      console.warn('Failed to create colony grounding details:', e);
    }
  }

  createRouteScanSites(parentGroup, center, groundY) {
    const perfSettings = getPerformanceSettings();
    if (perfSettings.isMobile && perfSettings.mobileTier === 'low') return;

    const siteOffsets = [
      { x: -70, z: -95, color: 0x66eaff },
      { x: -160, z: -235, color: 0xffcc66 },
      { x: -265, z: -385, color: 0xaaff88 },
      { x: -335, z: -525, color: 0xff88dd }
    ];
    const ringGeom = new THREE.TorusGeometry(10, 0.7, 8, 48);
    const coreGeom = new THREE.OctahedronGeometry(3.2, 1);
    const postGeom = new THREE.CylinderGeometry(0.45, 0.8, 7, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x202832, roughness: 0.5, metalness: 0.8 });

    window.scanSiteProgress = window.scanSiteProgress || { reached: 0, total: siteOffsets.length };
    this.scanSites = [];

    siteOffsets.forEach((site, index) => {
      const x = center.x + site.x;
      const z = center.z + site.z;
      const y = this.getTerrainHeight(x, z);
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const mat = new THREE.MeshBasicMaterial({ color: site.color });
      const ring = new THREE.Mesh(ringGeom, mat);
      ring.position.y = 0.55;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const post = new THREE.Mesh(postGeom, postMat);
      post.position.y = 3.5;
      group.add(post);

      const core = new THREE.Mesh(coreGeom, mat);
      core.position.y = 9.2;
      group.add(core);

      parentGroup.add(group);
      this.animatedObjects.push({ mesh: ring, type: 'rotate', speed: 0.018 + index * 0.004 });
      this.animatedObjects.push({ mesh: core, type: 'blink', phase: index * 0.65 });
      this.scanSites.push({ position: new THREE.Vector3(x, y, z), group, reached: false });
    });
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
    // Beyond the terrain edge there is no ground; y=0 keeps far-off
    // structures level with the nominal surface.
    return sampleTerrainHeight(x, z, 0);
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

      console.log('🏙️ Creating third futuristic city node at', center.x, center.z);

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

    // Compact skyline — reduced object count for performance
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

      // Emissive beacon mesh — no PointLight needed per building
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

    // Flagship emissive glow is sufficient — SpotLights removed for performance

    // Single city-wide ambient glow (reduced intensity)
    const cityLight = new THREE.PointLight(0x88aaff, 2.0 * LEGACY_LIGHT_SCALE, 1200, 0);
    cityLight.position.set(center.x, center.y + 260, center.z);
    this.scene.add(cityLight);
    this.nightLights.push(cityLight);

    console.log('✅ Futuristic third-city skyline created with', structures.length, 'skyscraper structures');
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

      console.log('🚄 City bullet train system created between secondary colony and third city');
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
      // Keep route beacons on mobile too; they are core navigation objects.
      if (perfSettings.detailLevel === 'low' && !perfSettings.isMobile) return;

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

        const padMaterial = new THREE.MeshStandardMaterial({
          color: index === 0 ? 0x36505c : 0x2c3438,
          roughness: 0.78,
          metalness: 0.28
        });
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.45, 16), padMaterial);
        pad.position.y = 0.22;
        pad.receiveShadow = true;
        group.add(pad);

        const checkpointRing = new THREE.Mesh(
          new THREE.TorusGeometry(9.4, 0.42, 8, 48),
          new THREE.MeshBasicMaterial({ color: index === points.length - 1 ? 0xffcc66 : 0x66ddff })
        );
        checkpointRing.position.y = 0.72;
        checkpointRing.rotation.x = Math.PI / 2;
        group.add(checkpointRing);

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

        let light = null;
        if (!perfSettings.isMobile) {
          light = new THREE.PointLight(0x66ddff, lampIntensity(1.2, 120), 120);
          light.position.copy(head.position);
          group.add(light);
        }

        // Place on terrain so the base follows the hills
        this.positionOnTerrain(group, p.x, p.z);
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this.prepareSettlementFadeIn(group, now);
        this.scene.add(group);

        this.animatedObjects.push({
          mesh: light || head,
          type: 'blink',
          phase: index * 0.7
        });
        this.animatedObjects.push({
          mesh: checkpointRing,
          type: 'rotate',
          speed: index % 2 === 0 ? 0.014 : -0.014
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

  // Deterministic hash for a grid cell — decides if a settlement exists there and its type
  _settlementHash(gx, gz) {
    // Simple but effective integer hash
    let h = (gx * 374761393 + gz * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 15), 0x27d4eb2d);
    h = h ^ (h >>> 13);
    return h;
  }

  // Check and spawn/despawn settlements near the player
  // Settlements used to be built only while the rover stood still, so they
  // appeared after you had already driven past. Now: everything in range is
  // built during the loading screen (prewarm), then new ones are built as you
  // drive within a small per-check time budget, ones ahead of you first.
  updateSettlements(playerPosition, { prewarm = false, prewarmMax = Infinity } = {}) {
    const now = performance.now();
    const moving = typeof velocity === 'number' && Math.abs(velocity) > 0.012;
    if (!prewarm && now - this.lastSettlementCheck < (moving ? 250 : 600)) return;
    this.lastSettlementCheck = now;

    const perfSettings = getPerformanceSettings();
    if (perfSettings.isMobile && perfSettings.mobileTier === 'low') return;

    const px = playerPosition.x;
    const pz = playerPosition.z;
    const grid = this.settlementGrid;
    // Keep sites on the terrain mesh (phones have a smaller map)
    const half = marsSurface.geometry.userData.heightGrid.half - 160;
    const spawnDist = this.settlementSpawnDist;
    const despawnDist = this.settlementDespawnDist;

    // Determine which grid cells are within spawn range
    const scanRadius = Math.ceil(spawnDist / grid) + 1;
    const playerGX = Math.floor(px / grid);
    const playerGZ = Math.floor(pz / grid);

    // Despawn settlements that are too far away
    for (const [key, settlement] of this.settlements) {
      const dx = settlement.center.x - px;
      const dz = settlement.center.z - pz;
      if (dx * dx + dz * dz > despawnDist * despawnDist) {
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

    // Scan grid cells around the player for missing settlements
    const candidates = [];
    const headingX = -Math.sin(typeof roverYaw === 'number' ? roverYaw : 0);
    const headingZ = -Math.cos(typeof roverYaw === 'number' ? roverYaw : 0);
    for (let gx = playerGX - scanRadius; gx <= playerGX + scanRadius; gx++) {
      for (let gz = playerGZ - scanRadius; gz <= playerGZ + scanRadius; gz++) {
        const key = `${gx},${gz}`;
        if (this.settlements.has(key)) continue;

        // Skip the origin area (the hand-placed colony lives there)
        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;

        const hash = this._settlementHash(gx, gz);

        // ~60% of grid cells have a settlement
        if ((hash & 0xff) > 153) continue; // 154/256 ≈ 60%

        const cx = gx * grid + ((hash >>> 8) & 0xff) / 256 * grid * 0.6;
        const cz = gz * grid + ((hash >>> 16) & 0xff) / 256 * grid * 0.6;

        // Distance check
        const dx = cx - px;
        const dz2 = cz - pz;
        const distSq = dx * dx + dz2 * dz2;
        if (distSq > spawnDist * spawnDist) continue;
        if (Math.abs(cx) > half || Math.abs(cz) > half) continue; // off the edge of the map
        const minSpawnDist = 260;
        if (distSq < minSpawnDist * minSpawnDist) continue;
        if (!this._isSettlementSiteClear(cx, cz)) continue;
        // While driving, sites ahead of the rover count as closer
        const ahead = moving ? (dx * headingX + dz2 * headingZ) / Math.sqrt(distSq) : 0;
        candidates.push({ key, hash, cx, cz, score: distSq * (ahead > 0.3 ? 0.45 : 1) });
      }
    }
    candidates.sort((a, b) => a.score - b.score);

    // Phones are 3-5x slower at building geometry, and each settlement adds
    // ~20 draw calls: a smaller time budget and a cap on how many stay live
    const budgetMs = prewarm ? Infinity : perfSettings.isMobile ? (moving ? 4 : 8) : (moving ? 6 : 12);
    const maxLive = perfSettings.isMobile ? (perfSettings.mobileTier === 'high' ? 14 : 9) : Infinity;
    let builtNow = 0;
    for (const { key, hash, cx, cz } of candidates) {
      if (performance.now() - now > budgetMs) break;
      if (this.settlements.size >= maxLive || builtNow >= prewarmMax) break;
      // Determine settlement type from hash bits
      const typeBits = (hash >>> 24) & 0xff;
      let type;
      if (typeBits < 100) type = 'outpost';       // ~39% — small
      else if (typeBits < 200) type = 'base';      // ~39% — medium
      else type = 'city';                           // ~22% — large

      // A city is ~3x the build cost of a base; on a phone, wait until the
      // rover is stationary rather than hitch mid-drive
      if (type === 'city' && perfSettings.isMobile && moving && !prewarm) continue;
      builtNow++;

      const groundY = this.getTerrainHeight(cx, cz);
      const center = new THREE.Vector3(cx, groundY, cz);

      const collidableStart = this.collidables.length;
      const group = mergeStaticGroup(this._buildSettlement(type, center, hash));
      for (let i = collidableStart; i < this.collidables.length; i++) {
        this.collidables[i].dynamic = true;
      }
      const collidableCount = this.collidables.length - collidableStart;

      // Ease in rather than pop (it may still be inside the haze); settlements
      // built behind the loading screen are simply there
      if (!prewarm) this.prepareSettlementFadeIn(group, performance.now());
      this.scene.add(group);
      this.settlements.set(key, {
        group,
        center,
        type,
        collidableStart,
        collidableCount
      });
    }

    // Build roads between nearby settlements
    this._updateRoads(px, pz);
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

    const roadMats = this.getRoadMaterials();

    // Build roads between nearby spawned settlements
    const entries = [...this.settlements.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [keyA, a] = entries[i];
        const [keyB, b] = entries[j];
        const roadKey = keyA < keyB ? `${keyA}→${keyB}` : `${keyB}→${keyA}`;
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

        const angle = Math.atan2(b.center.z - a.center.z, b.center.x - a.center.x);
        const groundY = (a.center.y + b.center.y) / 2 + 0.15;

        // Road surface draped over the terrain, sampled every 4 m so it
        // hugs the ground closely enough for trucks to sit on it.
        const roadPoints = resamplePath([
          new THREE.Vector3(a.center.x, 0, a.center.z),
          new THREE.Vector3(b.center.x, 0, b.center.z)
        ], 4);
        const road = new THREE.Mesh(buildDrapedRibbon(roadPoints, 3, 0.1), roadMats.surface);
        road.receiveShadow = true;
        roadGroup.add(road);

        const dashes = new THREE.Mesh(this.buildRoadDashes(new TrafficPath(roadPoints), 0.13), roadMats.marking);
        roadGroup.add(dashes);

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

    const wallMat = new THREE.MeshStandardMaterial({ color: pal.wall, metalness: 0.7, roughness: 0.3, emissive: pal.emissive, emissiveIntensity: 0.35 });
    // Glowing window band material so towers light up at night
    const winMat = new THREE.MeshBasicMaterial({ color: pal.glow, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.85 });
    const glow2Mat = new THREE.MeshBasicMaterial({ color: pal.glow, transparent: true, opacity: 0.7 });
    const padMat  = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.4 });
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x31343a, roughness: 0.72, metalness: 0.32 });
    const laneMat = new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.78 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: pal.beacon });

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
        // Glowing window band per floor (skip the ground floor) so the tower
        // reads as a lit building at night.
        if (si > 0) {
          const bandGeom = new THREE.BoxGeometry(w + 0.25, segH * 0.34, d + 0.25);
          const band = new THREE.Mesh(bandGeom, winMat);
          band.position.copy(seg.position);
          band.rotation.y = seg.rotation.y;
          group.add(band);
        }
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

    const addFuturisticGroundLayer = () => {
      const scale = type === 'city' ? 1.55 : type === 'base' ? 1.15 : 0.82;
      const plazaRadius = type === 'city' ? 135 : type === 'base' ? 82 : 48;
      const plaza = new THREE.Mesh(new THREE.CylinderGeometry(plazaRadius, plazaRadius, 0.45, 18), plazaMat);
      plaza.position.set(cx, gy + 0.22, cz);
      plaza.receiveShadow = true;
      group.add(plaza);

      const ringCount = type === 'city' ? 3 : 2;
      for (let i = 0; i < ringCount; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(plazaRadius * (0.46 + i * 0.22), 0.42, 8, 72), laneMat);
        ring.position.set(cx, gy + 0.56 + i * 0.04, cz);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }

      const spokeCount = type === 'city' ? 8 : 5;
      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, plazaRadius * 1.55), laneMat);
        spoke.position.set(
          cx + Math.sin(angle) * plazaRadius * 0.38,
          gy + 0.7,
          cz + Math.cos(angle) * plazaRadius * 0.38
        );
        spoke.rotation.y = angle;
        group.add(spoke);
      }

      const markerCount = type === 'city' ? 12 : type === 'base' ? 8 : 5;
      const markerGeom = new THREE.CylinderGeometry(0.8 * scale, 1.1 * scale, 5.5 * scale, 8);
      for (let i = 0; i < markerCount; i++) {
        const angle = (i / markerCount) * Math.PI * 2 + 0.15;
        const x = cx + Math.cos(angle) * plazaRadius * 0.92;
        const z = cz + Math.sin(angle) * plazaRadius * 0.92;
        const marker = new THREE.Mesh(markerGeom, padMat);
        marker.position.set(x, gy + 2.8 * scale, z);
        group.add(marker);
        const head = new THREE.Mesh(new THREE.SphereGeometry(1.3 * scale, 10, 8), beaconMat);
        head.position.y = 3.1 * scale;
        marker.add(head);
      }

      const padCount = type === 'city' ? 3 : type === 'base' ? 2 : 1;
      for (let i = 0; i < padCount; i++) {
        const angle = (i / padCount) * Math.PI * 2 + 0.62;
        const dist = plazaRadius + 26 + i * 10;
        const px = cx + Math.cos(angle) * dist;
        const pz = cz + Math.sin(angle) * dist;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(15 * scale, 15 * scale, 0.9, 12), padMat);
        pad.position.set(px, gy + 0.45, pz);
        group.add(pad);
        const padRing = new THREE.Mesh(new THREE.TorusGeometry(12 * scale, 0.35, 8, 48), laneMat);
        padRing.position.set(px, gy + 1.05, pz);
        padRing.rotation.x = Math.PI / 2;
        group.add(padRing);
      }

      const panelRows = type === 'city' ? 3 : 2;
      const panelCols = type === 'city' ? 6 : 4;
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x12255d,
        roughness: 0.16,
        metalness: 0.75,
        emissive: 0x061245,
        emissiveIntensity: 0.25
      });
      for (let r = 0; r < panelRows; r++) {
        for (let c = 0; c < panelCols; c++) {
          const x = cx - plazaRadius * 0.55 + c * 10 * scale;
          const z = cz + plazaRadius + 20 + r * 8 * scale;
          const panel = new THREE.Mesh(new THREE.BoxGeometry(7 * scale, 0.28, 4 * scale), panelMat);
          panel.position.set(x, gy + 3.2, z);
          panel.rotation.x = -0.35;
          panel.rotation.y = -0.12;
          group.add(panel);
          const support = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.3, 5), padMat);
          support.position.set(x, gy + 1.7, z);
          group.add(support);
        }
      }
    };

    const addMarsHardenedArchitectureKit = () => {
      const scale = type === 'city' ? 1.6 : type === 'base' ? 1.15 : 0.85;
      const radius = type === 'city' ? 115 : type === 'base' ? 72 : 42;
      const modernWallMat = new THREE.MeshStandardMaterial({
        color: 0xc7c1b8,
        roughness: 0.62,
        metalness: 0.46,
        emissive: 0x120906,
        emissiveIntensity: 0.18
      });
      const darkTrimMat = new THREE.MeshStandardMaterial({
        color: 0x28211d,
        roughness: 0.7,
        metalness: 0.42
      });
      const modernGlassMat = new THREE.MeshStandardMaterial({
        color: 0x84c5dd,
        roughness: 0.18,
        metalness: 0.35,
        transparent: true,
        opacity: 0.38,
        emissive: 0x114466,
        emissiveIntensity: 0.22
      });
      const regolithMat = new THREE.MeshStandardMaterial({
        color: 0x8c3f24,
        roughness: 1.0,
        metalness: 0.0
      });
      const lightMat = new THREE.MeshBasicMaterial({ color: pal.glow, transparent: true, opacity: 0.74 });

      const commandW = 34 * scale;
      const commandH = 8 * scale;
      const commandD = 44 * scale;
      const command = new THREE.Group();
      command.position.set(cx + radius * 0.36, gy + commandH * 0.5, cz - radius * 0.34);
      command.rotation.y = -0.42;
      const body = new THREE.Mesh(new THREE.BoxGeometry(commandW, commandH, commandD), modernWallMat);
      body.castShadow = true;
      body.receiveShadow = true;
      command.add(body);

      const glassNose = new THREE.Mesh(new THREE.BoxGeometry(commandW * 0.62, commandH * 0.24, 0.55), modernGlassMat);
      glassNose.position.set(0, commandH * 0.08, commandD * 0.5 + 0.32);
      command.add(glassNose);

      const pressureCap = new THREE.Mesh(new THREE.CylinderGeometry(commandD * 0.18, commandD * 0.2, commandW * 0.88, 16), modernWallMat);
      pressureCap.rotation.z = Math.PI / 2;
      pressureCap.position.y = commandH * 0.48;
      command.add(pressureCap);
      group.add(command);
      this.registerCollidable({ x: command.position.x, z: command.position.z }, Math.max(commandW, commandD) * 0.42);

      const bermCount = type === 'city' ? 12 : type === 'base' ? 8 : 5;
      for (let i = 0; i < bermCount; i++) {
        const angle = (i / bermCount) * Math.PI * 2 + 0.28;
        const dist = radius * (0.72 + rand() * 0.22);
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;
        const berm = new THREE.Mesh(new THREE.BoxGeometry(18 * scale, 3.2 * scale, 8 * scale), regolithMat);
        berm.position.set(x, gy + 1.7 * scale, z);
        berm.rotation.y = -angle;
        berm.castShadow = true;
        berm.receiveShadow = true;
        group.add(berm);
      }

      const moduleCount = type === 'city' ? 7 : type === 'base' ? 5 : 3;
      for (let i = 0; i < moduleCount; i++) {
        const angle = (i / moduleCount) * Math.PI * 2 + 0.15;
        const dist = radius * (0.35 + rand() * 0.22);
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;
        const length = (18 + rand() * 18) * scale;
        const r = (5 + rand() * 2.5) * scale;
        const habitat = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 18), modernWallMat);
        habitat.rotation.z = Math.PI / 2;
        habitat.rotation.y = -angle;
        habitat.position.set(x, gy + r + 0.8, z);
        habitat.castShadow = true;
        habitat.receiveShadow = true;
        group.add(habitat);

        const windowBand = new THREE.Mesh(new THREE.BoxGeometry(length * 0.56, 0.45 * scale, 0.55 * scale), lightMat);
        windowBand.position.set(0, r * 0.35, r + 0.15);
        habitat.add(windowBand);
        this.registerCollidable({ x, z }, r + length * 0.22);
      }

      const towerCount = type === 'city' ? 6 : type === 'base' ? 3 : 1;
      for (let i = 0; i < towerCount; i++) {
        const angle = (i / towerCount) * Math.PI * 2 + rand() * 0.28;
        const dist = radius * (type === 'city' ? 0.22 + rand() * 0.42 : 0.32 + rand() * 0.36);
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;
        const towerH = (type === 'city' ? 88 + rand() * 105 : type === 'base' ? 52 + rand() * 48 : 34 + rand() * 26) * scale;
        const towerR = (type === 'city' ? 7.2 + rand() * 3.4 : type === 'base' ? 5.8 + rand() * 2.2 : 4.2 + rand() * 1.4) * scale;
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(towerR * 0.72, towerR, towerH, 14), modernWallMat);
        tower.position.set(x, gy + towerH * 0.5, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        group.add(tower);

        const buttressCount = 4;
        for (let b = 0; b < buttressCount; b++) {
          const bAngle = (b / buttressCount) * Math.PI * 2;
          const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, towerH * 0.52, 2.2 * scale), darkTrimMat);
          buttress.position.set(Math.cos(bAngle) * (towerR + 0.8 * scale), -towerH * 0.14, Math.sin(bAngle) * (towerR + 0.8 * scale));
          buttress.rotation.y = -bAngle;
          tower.add(buttress);
        }

        const bandCount = type === 'city' ? 5 : 3;
        for (let band = 1; band <= bandCount; band++) {
          const y = -towerH * 0.45 + (band / (bandCount + 1)) * towerH * 0.84;
          const windowRing = new THREE.Mesh(new THREE.TorusGeometry(towerR * 1.04, 0.22 * scale, 6, 36), lightMat);
          windowRing.position.y = y;
          windowRing.rotation.x = Math.PI / 2;
          tower.add(windowRing);
        }

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(towerR * 0.92, towerR * 1.12, 3.6 * scale, 14), darkTrimMat);
        cap.position.y = towerH * 0.5 + 1.6 * scale;
        tower.add(cap);

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.55 * scale, towerH * 0.18, 8), darkTrimMat);
        antenna.position.y = towerH * 0.58;
        tower.add(antenna);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.55 * scale, 10, 8), lightMat);
        beacon.position.y = towerH * 0.68;
        tower.add(beacon);
        this.registerCollidable({ x, z }, towerR + 4 * scale);
      }

      const commH = (type === 'city' ? 46 : type === 'base' ? 34 : 24) * scale;
      const comm = new THREE.Mesh(new THREE.CylinderGeometry(0.65 * scale, 1.1 * scale, commH, 8), darkTrimMat);
      comm.position.set(cx - radius * 0.32, gy + commH * 0.5, cz + radius * 0.28);
      group.add(comm);
      const beaconCore = new THREE.Mesh(new THREE.OctahedronGeometry(3.8 * scale, 1), lightMat);
      beaconCore.position.set(0, commH * 0.5 + 3.5 * scale, 0);
      comm.add(beaconCore);
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
        // Spire outpost — a cluster of pointed towers
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
        // Reactor core base — central glowing cylinder with orbiting modules
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
        // Bio-dome research base — large transparent domes with greenhouses
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
        // Industrial base — tall chimneys, storage tanks, cranes
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
      // ==== CITY — the wildest part ====
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
          // Crystal shard — tilted octahedron
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
          // Neon edges — random accent
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
        // Override material on flagship segments — re-add glow
        addFloatingRing(cx, gy + flagH * 0.5, cz, flagW + 10, 2);
        addFloatingRing(cx, gy + flagH * 0.75, cz, flagW + 6, 1.5);
        addFloatingRing(cx, gy + flagH * 0.95, cz, flagW + 3, 1.2);
      } else if (flagStyle === 1) {
        // Obelisk — tapered with a pointed crown
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
      // No PointLight here: settlements spawn and despawn while driving, and
      // every change in light count recompiles the shaders of all lit
      // materials (a visible hitch). The emissive windows carry the glow.
    }

    addFuturisticGroundLayer();
    addMarsHardenedArchitectureKit();

    return group;
  }

  update(playerPosition, deltaMs = 16.67) {
    const dt = Math.min(Math.max(deltaMs, 0), 100) / 1000;
    const now = performance.now();

    // Beacons, reactor rings and settlement fade-ins
    this.updateAnimations(now, dt);
    this.updateSettlementFades(now);

    // Starship launches and landings at the spaceport
    this.updateRocketTraffic(dt);

    // Cybertruck traffic
    this.updateTraffic(dt);

    // High-speed bullet train between the two colonies
    this.updateBulletTrain(now);

    // Procedural settlements - spawn/despawn based on proximity (throttled)
    this.updateSettlements(playerPosition);

    // Trucks on settlement roads. Spawning is cheap (instanced), so unlike
    // settlements this keeps running while the rover drives.
    if (now - (this._lastRoadTrafficCheck || 0) > 1000) {
      this._lastRoadTrafficCheck = now;
      this._updateRoadVehicles(playerPosition.x, playerPosition.z);
    }

    this.updateScanSites(playerPosition);
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
          if (obj.isPointLight) {
            obj.intensity = lampIntensity(0.4, obj.distance || 120);
            obj.userData.baseIntensity = obj.intensity; // keep the dimmed level while blinking
          }
        });
      }

      // Expose simple progress for HUD or notifications
      window.guidedRouteProgress = {
        reached: this.currentWaypointIndex,
        total: this.guidedRouteWaypoints.length
      };
      showMissionToast(this.currentWaypointIndex >= this.guidedRouteWaypoints.length
        ? 'Route complete'
        : `Beacon ${this.currentWaypointIndex} reached`);
    }
  }

  updateScanSites(playerPosition) {
    if (!this.scanSites || this.scanSites.length === 0 || !playerPosition) return;

    let reached = 0;
    for (const site of this.scanSites) {
      if (!site) continue;
      if (!site.reached && playerPosition.distanceTo(site.position) < 24) {
        site.reached = true;
        if (site.group) {
          site.group.scale.setScalar(0.72);
          site.group.traverse(obj => {
            if (obj.isMesh && obj.material && obj.material.color) {
              obj.material = obj.material.clone();
              obj.material.color.setHex(0x445566);
            }
          });
        }
        showMissionToast('Anomaly scanned');
      }
      if (site.reached) reached++;
    }

    window.scanSiteProgress = {
      reached,
      total: this.scanSites.length
    };
  }

  // Advance the Cybertruck fleet (route and settlement-road trucks)
  updateTraffic(dt) {
    if (!this.fleet) return;
    const dayAmount = typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0;
    const roverPos = typeof rover !== 'undefined' && rover ? rover.position : null;
    this.fleet.update(dt, dayAmount, roverPos);
  }

  // Create elevated rail and a bullet train between the primary and secondary colonies
  createBulletTrainSystem() {
    try {
      const perfSettings = getPerformanceSettings();
      if (perfSettings.isMobile) return;
      if (!this.colonyCenter || !this.secondaryColonyCenter) return;

      // Terminals at the facing edges of the two colonies, with the deck
      // high enough to clear every rise in between
      const ax = this.colonyCenter.x + 150, az = this.colonyCenter.z;
      const bx = this.secondaryColonyCenter.x - 230, bz = this.secondaryColonyCenter.z;
      const ga = this.getTerrainHeight(ax, az), gb = this.getTerrainHeight(bx, bz);
      let platformHeight = 24;
      for (let i = 1; i < 60; i++) {
        const t = i / 60;
        const ground = this.getTerrainHeight(ax + (bx - ax) * t, az + (bz - az) * t);
        platformHeight = Math.max(platformHeight, ground - (ga + (gb - ga) * t) + 14);
      }
      const start = this.buildRailTerminal(ax, az, 1, platformHeight);
      const end = this.buildRailTerminal(bx, bz, -1, platformHeight);

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

      console.log('🚄 Bullet train system created between colonies');
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
  createBulletTrainMesh(options = {}) {
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

        if (options.headlight !== false) {
          const headLight = new THREE.PointLight(0xffffff, lampIntensity(1.7, 140), 140);
          headLight.position.set(0, 2.4, -carLength / 2 - 1.9);
          car.add(headLight);
        }
      }

      const offsetZ = trainOriginOffset + i * (carLength + carGap);
      car.position.z = offsetZ;
      train.add(car);
    }

    // ~170 small meshes per train collapse to a few (one per material)
    return mergeStaticGroup(train);
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

      // Stand at the platform for a moment before heading back
      if (train.dwell > 0) {
        train.dwell -= dt;
        return;
      }

      let t = train.t + train.speed * dt * train.direction;

      // Ping-pong between endpoints
      if (t >= 1) {
        t = 1;
        train.direction = -1;
        train.dwell = train.dwellTime || 0;
      } else if (t <= 0) {
        t = 0;
        train.direction = 1;
        train.dwell = train.dwellTime || 0;
      }

      train.t = t;
      train.mesh.position.lerpVectors(train.start, train.end, t);

      // Flip heading when changing direction so the nose always points forward
      const baseYaw = train.yaw;
      train.mesh.rotation.y = baseYaw + (train.direction < 0 ? Math.PI : 0);
    });
  }

  // Simple time-based rocket launch/arrival cycles using the pre-created rockets
  updateRocketTraffic(dt) {
    if (!this.rocketTrafficEnabled || !this.spaceport) return;
    const day = typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0;
    this.spaceport.update(dt, day);
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

function _smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const _lerpColorScratch = new THREE.Color();
function _lerpColorHex(a, b, t, target = new THREE.Color()) {
  return target.set(a).lerp(_lerpColorScratch.set(b), t);
}

// Image-based lighting: a PMREM-filtered copy of a small gradient sky dome
// becomes scene.environment. Without it every metallic material (Cybertruck
// stainless, colony cladding) had nothing to reflect and rendered flat grey.
// Re-baked only when the light has changed noticeably (~every few seconds).
function createMarsEnvironment() {
  if ((perfSettings.isMobile && perfSettings.mobileTier !== 'high') || !THREE.PMREMGenerator) return null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const uniforms = {
      uDay: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 0.8, 0.5) }
    };
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      // The visible sky model above the horizon; below it, sunlit regolith
      // bouncing a warm glow back up (colony floodlights keep a little at night)
      fragmentShader: `
        uniform float uDay;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vDir;
        ${MARS_SKY_GLSL}
        void main() {
          vec3 dir = normalize(vDir);
          vec3 horizon = marsSkyRadiance(normalize(vec3(dir.x, 0.0, dir.z)), uSunDir);
          vec3 col;
          if (dir.y >= 0.0) {
            col = marsSkyRadiance(dir, uSunDir);
          } else {
            vec3 ground = vec3(0.34, 0.15, 0.08) * (0.05 + 0.95 * uDay) * max(uSunDir.y, 0.05) * 1.6
                        + vec3(0.03, 0.014, 0.008);
            col = mix(horizon, ground, smoothstep(0.0, 0.2, -dir.y));
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), material));

    let target = null;
    let lastDay = -1;
    const lastSun = new THREE.Vector3(0, -1, 0);
    return {
      update(dayAmount, sunDir, sunColor) {
        const dayChanged = Math.abs(dayAmount - lastDay) > 0.04;
        const sunMoved = dayAmount > 0.02 && lastSun.angleTo(sunDir) > 0.12;
        if (target && !dayChanged && !sunMoved) return;
        lastDay = dayAmount;
        lastSun.copy(sunDir);
        uniforms.uDay.value = dayAmount;
        uniforms.uSunDir.value.copy(sunDir);
        uniforms.uSunColor.value.copy(sunColor);
        const next = pmrem.fromScene(envScene, 0.02);
        scene.environment = next.texture;
        if (target) target.dispose();
        target = next;
      }
    };
  } catch (e) {
    console.warn('Environment lighting unavailable:', e);
    return null;
  }
}
const marsEnvironment = createMarsEnvironment();

// Scratch colours/vectors for the day-night cycle (no per-frame allocations)
const _dnc = {
  // Mobile distance fog: matches the sky model's horizon colour
  nightFog: new THREE.Color(0x030202),
  dayFog: new THREE.Color(0xe69461),
  duskFog: new THREE.Color(0x8a4a38),
  fog: new THREE.Color(),
  sunColor: new THREE.Color(),
  nightBg: new THREE.Color(0x020308),
  dayBg: new THREE.Color(0x87b8d8),
  // Sunlight reaches the surface warm-white; a low sun is reddened by the
  // long path through the dust. At night this light is faint sky glow.
  sunNight: new THREE.Color(0x5a3a30),
  sunDusk: new THREE.Color(0xff9a5c),
  sunDay: new THREE.Color(0xffe8cc),
  ambNight: new THREE.Color(0x3a2118),
  ambDay: new THREE.Color(0xffd4a0),
  // Mars skylight is butterscotch, not blue: shadows fill in warm brown
  hemiSkyNight: new THREE.Color(0x28304a),
  hemiSkyDay: new THREE.Color(0xd8a476),
  hemiGroundNight: new THREE.Color(0x2a1008),
  hemiGroundDay: new THREE.Color(0xa64724),
  sunDir: new THREE.Vector3(),
  lightDir: new THREE.Vector3(),
  right: new THREE.Vector3(),
  up: new THREE.Vector3(),
  center: new THREE.Vector3(),
  worldUp: new THREE.Vector3(0, 1, 0)
};

function updateDayNightCycle(time) {
  const perfSettings = getPerformanceSettings();
  const cycleProgress = ((time * dayNightCycleSpeed + dayNightCycleOffset) % 1 + 1) % 1;
  currentTimeOfDay = cycleProgress;

  const sunAngle = cycleProgress * Math.PI * 2;
  const sunElevation = -Math.cos(sunAngle);
  const dayAmount = _smoothstep(-0.22, 0.38, sunElevation);
  const duskWarmth = 1 - Math.abs(dayAmount * 2 - 1);
  window.dayNightBlend = dayAmount;
  isDaytime = dayAmount > 0.08;

  // True sun path: rises in the east, peaks ~62 degrees up, sets in the west
  // and genuinely dips below the horizon at night (the sky, haze and IBL use it)
  const sunAzimuth = sunAngle - Math.PI / 2;
  const sunAltitude = sunElevation * 1.08;
  const trueSun = marsAtmosphere.sunDir.set(
    Math.cos(sunAzimuth) * Math.cos(sunAltitude),
    Math.sin(sunAltitude),
    Math.sin(sunAzimuth) * Math.cos(sunAltitude)
  );
  marsAtmosphere.dayAmount = dayAmount;

  // Desktop: the atmosphere post-pass replaces distance fog entirely
  if (postProcessing) {
    scene.fog = null;
  } else {
    const renderDistance = Number(perfSettings.renderDistance) || 5000;
    const fogColor = _dnc.fog.copy(_dnc.nightFog).lerp(_dnc.dayFog, dayAmount).lerp(_dnc.duskFog, duskWarmth * 0.3);
    if (!scene.fog) {
      scene.fog = new THREE.Fog(fogColor, 900, renderDistance);
    } else {
      scene.fog.color.copy(fogColor);
      scene.fog.near = 700 - dayAmount * 360;
      scene.fog.far = renderDistance * (0.72 + dayAmount * 0.32);
    }
  }
  if (scene.background && scene.background.isColor) {
    scene.background.copy(_dnc.nightBg).lerp(_dnc.dayBg, dayAmount);
  }

  // One shadow-casting sun (a second, duplicate directional light used to
  // double the shading cost for the same result)
  const daySunIntensity = perfSettings.isMobile ? 1.4 : 1.7;
  const nightSunIntensity = perfSettings.isMobile ? 0.06 : 0.1;
  const targetSunIntensity = nightSunIntensity + dayAmount * (daySunIntensity - nightSunIntensity);
  const sunColorObj = _dnc.sunColor.copy(_dnc.sunNight)
    .lerp(_dnc.sunDusk, Math.min(1, dayAmount * 2.2))
    .lerp(_dnc.sunDay, _smoothstep(0.12, 0.45, trueSun.y));

  // The light follows the sun but never drops below ~12 degrees, which keeps
  // shadows a sane length; after sunset it is only faint sky glow anyway
  const sunDir = _dnc.lightDir.copy(trueSun);
  if (sunDir.y < 0.21) {
    const horiz = Math.hypot(sunDir.x, sunDir.z) || 1;
    sunDir.set(sunDir.x / horiz * 0.978, 0.21, sunDir.z / horiz * 0.978);
  }

  if (sunLight) {
    sunLight.intensity = targetSunIntensity * LEGACY_LIGHT_SCALE;
    sunLight.color.copy(sunColorObj);

    // Keep the shadow frustum centred on the rover so shadows exist wherever
    // it drives (they used to stop 400 m from the landing site). The centre
    // is snapped to whole shadow-map texels so edges don't shimmer.
    const focus = typeof rover !== 'undefined' && rover ? rover.position : _dnc.center.set(0, 0, 0);
    const shadowCam = sunLight.shadow.camera;
    const texel = (shadowCam.right - shadowCam.left) / sunLight.shadow.mapSize.width;
    const right = _dnc.right.crossVectors(_dnc.worldUp, sunDir);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = _dnc.up.crossVectors(sunDir, right);
    const r = focus.dot(right), u = focus.dot(up);
    const center = _dnc.center.copy(focus)
      .addScaledVector(right, Math.round(r / texel) * texel - r)
      .addScaledVector(up, Math.round(u / texel) * texel - u);
    sunLight.target.position.copy(center);
    sunLight.position.copy(center).addScaledVector(sunDir, 500);
    sunLight.target.updateMatrixWorld();
  }

  if (marsEnvironment) {
    marsEnvironment.update(dayAmount, trueSun, sunColorObj);
  }

  // Desktop PBR materials also receive sky light from the environment map,
  // so the flat ambient/hemisphere terms stay low in daylight there
  ambientLight.intensity = LEGACY_LIGHT_SCALE * ((perfSettings.isMobile ? 0.12 : 0.12) + dayAmount * (perfSettings.isMobile ? 0.46 : 0.16));
  _lerpColorHex(_dnc.ambNight, _dnc.ambDay, dayAmount, ambientLight.color);
  hemisphereLight.intensity = LEGACY_LIGHT_SCALE * ((perfSettings.isMobile ? 0.12 : 0.16) + dayAmount * (perfSettings.isMobile ? 0.34 : 0.28));

  // Eye adaptation: open up at night, stop down in full daylight (the noon
  // scene used to clip the regolith to pale peach)
  renderer.toneMappingExposure = (perfSettings.isMobile ? 1.25 : 1.75) - (perfSettings.isMobile ? 0.25 : 0.55) * dayAmount;
  _lerpColorHex(_dnc.hemiSkyNight, _dnc.hemiSkyDay, dayAmount, hemisphereLight.color);
  _lerpColorHex(_dnc.hemiGroundNight, _dnc.hemiGroundDay, dayAmount, hemisphereLight.groundColor);

  if (spaceSkybox) {
    spaceSkybox.visible = true;
  }

  // Rover lamps come on as the light fails, and are off in full daylight
  if (typeof rover !== 'undefined' && rover && rover.userData.lamps) {
    const night = 1 - _smoothstep(0.2, 0.65, dayAmount);
    for (const light of rover.userData.lamps.lights) light.intensity = light.userData.nightIntensity * night;
    rover.userData.lamps.material.color.setHex(0xfff6e0).multiplyScalar(0.25 + 0.35 * night);
  }
}

function toggleDayNight() {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  const targetProgress = isDaytime ? 0.0 : 0.5;
  dayNightCycleOffset = targetProgress - ((now * dayNightCycleSpeed) % 1);
  updateDayNightCycle(now);
}

// Scene manager is created via loadNonEssentialComponents / initializeScene - no duplicate needed here
let sceneManager = null;

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
  
  // A second call for a frame that already ran (same timestamp) must not
  // step the simulation again
  if (lastTime && time <= lastTime) return;

  scheduleAnimationFrame();
  
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
  const delta = lastTime ? time - lastTime : 16.67; // Default to 60fps on the first frame
  lastTime = time;

  // Skip frames if browser tab is inactive or delta is too large (indicating lag)
  if (delta > 100) {
    resetRoverMotion(false);
    return;
  }
  adaptiveResolution.update(delta, time);
  // Movement constants are tuned per 60 Hz frame. Scale by the real frame time
  // so the rover keeps the same speed at 30 or 144 fps (was capped at 1.0,
  // which made it crawl whenever the frame rate dropped below 60).
  const controlFrameScale = Math.min(delta / 16.67, 3.0);

  // Mobile adaptive throttling (frame times were sampled above)
  if (currentPerfSettings.isMobile) {
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

  // Smooth day/night cycle: night at start, daylight after one minute.
  if (typeof updateDayNightCycle === 'function') {
    updateDayNightCycle(time);
  }

  // Keep the sky around the camera and update fades continuously on all devices.
  if (spaceSkybox) {
    spaceSkybox.position.copy(camera.position);
    if (spaceSkybox.userData && spaceSkybox.userData.update) {
      spaceSkybox.userData.update(time);
    }
  }

  // Optimize operations for mobile with tier-based updates
  if (currentPerfSettings.isMobile) {
    // Mobile scene manager updates - heavily throttled
    const sceneUpdateThrottle = currentPerfSettings.mobileTier === 'high' ? 10 : 
                               currentPerfSettings.mobileTier === 'medium' ? 20 : 40;
    
    if (window.marsSceneManager && rover) {
      _mobileSceneDelta += delta;
      if (currentPerfSettings.mobileTier !== 'low' || frameCount % 3 === 0) {
        window.marsSceneManager.update(rover.position, _mobileSceneDelta);
        _mobileSceneDelta = 0;
      }
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
    // Scene manager runs every frame: traffic, trains and rockets are animated
    // with the real frame time. Heavy work inside it (settlement spawning) is
    // throttled internally.
    if (window.marsSceneManager && rover) {
      window.marsSceneManager.update(rover.position, delta);
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
  if (keys.w || keys.boost) {
    // keys.boost comes from the touch BOOST button: boost and drive forward
    const boosting = !!(keys[' '] || keys.boost);
    const topSpeed = boosting ? BOOST_SPEED : MAX_SPEED;
    if (velocity < 0) {
      velocity = Math.min(velocity + DECELERATION * controlFrameScale, 0);
    } else if (velocity < topSpeed) {
      const accel = boosting ? BOOST_ACCELERATION : ACCELERATION;
      velocity = Math.min(velocity + accel * controlFrameScale, topSpeed);
    } else {
      // Space released at boost speed: ease back to cruising, don't snap
      velocity = Math.max(velocity - BOOST_RELEASE_DECEL * controlFrameScale, topSpeed);
    }
  } else if (keys.s) {
    const accel = velocity > 0 ? DECELERATION : ACCELERATION;
    velocity = Math.max(velocity - accel * controlFrameScale, -MAX_SPEED * REVERSE_SPEED_FACTOR);
  } else {
    // Coast to a stop when no key held
    if (velocity > 0) {
      velocity = Math.max(velocity - COAST_DECEL * controlFrameScale, 0);
    } else if (velocity < 0) {
      velocity = Math.min(velocity + COAST_DECEL * controlFrameScale, 0);
    }
  }

  if (Math.abs(velocity) > 0.0005) {
    isMoving = true;
    // Forward is negative Z in Three.js — negate velocity to match original convention
    const frameVelocity = velocity * controlFrameScale;
    const moveX = Math.sin(roverYaw) * (-frameVelocity);
    const moveZ = Math.cos(roverYaw) * (-frameVelocity);

    rover.position.x += moveX;
    rover.position.z += moveZ;

    // Soft edge of the world: the terrain mesh ends here
    const grid = marsSurface.geometry.userData.heightGrid;
    const limit = grid.half - 60;
    if (Math.abs(rover.position.x) > limit || Math.abs(rover.position.z) > limit) {
      rover.position.x = THREE.MathUtils.clamp(rover.position.x, -limit, limit);
      rover.position.z = THREE.MathUtils.clamp(rover.position.z, -limit, limit);
      velocity *= 0.5;
      if (typeof window.showGameToast === 'function' && !window._edgeToastShown) {
        window._edgeToastShown = true;
        window.showGameToast('Edge of the survey area');
        setTimeout(() => { window._edgeToastShown = false; }, 4000);
      }
    }

    // Collision detection — revert if the rover hits a structure
    if (window.marsSceneManager &&
        window.marsSceneManager.checkCollision(rover.position.x, rover.position.z, 2.5,
          previousPosition.x, previousPosition.z)) {
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
  // (no longer blocks movement — the rover can explore freely)
  if (chunkDistance > 2) {
    terrainSystem.currentChunk = { ...currentChunk };
  }

  // Handle turning with smooth acceleration - turning radius scales with speed
  // Tighter steering at low speed, progressively gentler at cruise and boost
  const speedRatio = Math.abs(velocity) / MAX_SPEED;
  const speedFactor = 1.0 - 0.4 * Math.min(speedRatio, 1) - 0.3 * THREE.MathUtils.clamp((speedRatio - 1) / 3, 0, 1);
  if (keys.a || keys.d) {
    const turnDir = keys.a ? 1 : -1;
    rotationVelocity = Math.min(
      Math.abs(rotationVelocity) + ROTATION_ACCEL * controlFrameScale,
      MAX_ROTATION_SPEED
    ) * turnDir;
  } else {
    // Dampen rotation when key released
    rotationVelocity *= Math.pow(0.6, controlFrameScale);
    if (Math.abs(rotationVelocity) < 0.0001) rotationVelocity = 0;
  }

  if (rotationVelocity !== 0) {
    const effectiveRotation = rotationVelocity * speedFactor * controlFrameScale;
    roverYaw += effectiveRotation;

    // Normalize roverYaw to keep it within 0-2π range
    roverYaw = roverYaw % (Math.PI * 2);
    if (roverYaw < 0) roverYaw += Math.PI * 2;

    // Keep global variable in sync for mobile controls
    window.roverYaw = roverYaw;

    // Differential wheel rotation for turning - only update if moving
    if (isMoving) {
      const turnDirection = rotationVelocity > 0 ? 1 : -1;
      updateWheelRotation(wheels, currentSpeed * controlFrameScale, turnDirection);
    }
  } else if (isMoving) {
    // Straight movement, all wheels rotate at the same speed
    if (frameCount % 2 === 0) {
      wheels.forEach(wheel => {
        wheel.rotation.x += currentSpeed * controlFrameScale * 0.3;
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

  // Keep the chase camera responsive every frame; mobile throttling here makes
  // the rover outrun the camera and appear much farther away while moving.
  updateCamera(delta);

  // Update dust particles - only when moving and throttled based on performance
  if (isMoving && frameCount % (frameThrottle * 2) === 0) {
    dustParticles.update(rover.position, isMoving);
  }

  // Only update controls in orbit mode and throttle updates
  if (cameraMode === 'orbit' && frameCount % 2 === 0) {
    controls.update();
  }

  // Render scene (through the post-processing chain on desktop)
  renderFrame(time);

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

// Exact height of the rendered terrain at (x, z). The terrain is a regular
// PlaneGeometry grid, so this interpolates the same triangle the GPU draws in
// O(1) - raycasting the mesh tested every one of its ~40k+ triangles per call,
// and the rover, camera and traffic made a dozen of those calls per frame.
function sampleTerrainHeight(x, z, fallback = 0) {
  const grid = (typeof marsSurface !== 'undefined' && marsSurface)
    ? marsSurface.geometry.userData.heightGrid
    : null;
  if (!grid) return fallback;

  const fx = (x + grid.half) / grid.cell;
  const fz = (z + grid.half) / grid.cell;
  const n = grid.segments;
  if (!(fx >= 0 && fz >= 0 && fx <= n && fz <= n)) return fallback;

  const ix = Math.min(Math.floor(fx), n - 1);
  const iz = Math.min(Math.floor(fz), n - 1);
  const u = fx - ix;
  const v = fz - iz;
  const row = n + 1;
  const p = grid.positions;
  // Cell corners, matching PlaneGeometry's triangulation (a,b,d) + (b,c,d)
  const ha = p[(iz * row + ix) * 3 + 1];
  const hb = p[((iz + 1) * row + ix) * 3 + 1];
  const hc = p[((iz + 1) * row + ix + 1) * 3 + 1];
  const hd = p[(iz * row + ix + 1) * 3 + 1];
  if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
  return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
}

// Smoothed surface normal over a footprint of +-step (vehicle wheelbase scale),
// so vehicles tilt with the ground instead of snapping between flat facets.
function sampleTerrainNormal(x, z, target, step = 2, fallback = 0) {
  const hL = sampleTerrainHeight(x - step, z, fallback);
  const hR = sampleTerrainHeight(x + step, z, fallback);
  const hD = sampleTerrainHeight(x, z - step, fallback);
  const hU = sampleTerrainHeight(x, z + step, fallback);
  return target.set(hL - hR, 2 * step, hD - hU).normalize();
}

// Kept for existing callers (chase camera, debug tools)
function getGroundHeight(x, z, fallback = 0) {
  return sampleTerrainHeight(x, z, fallback);
}

// Flatten a disc of the Mars terrain toward a target height, with a smooth
// blended rim. Used to remove the bumps that poke up around colony buildings
// (which are placed at a fixed ground height, not the undulating terrain).
function flattenMarsTerrain(cx, cz, radius, targetY = 0) {
  if (typeof marsSurface === 'undefined' || !marsSurface || !marsSurface.geometry) return;
  const geo = marsSurface.geometry;
  const pos = geo.attributes.position;
  const arr = pos.array;
  const inner = radius * 0.6; // fully flat within the inner disc
  for (let i = 0; i < arr.length; i += 3) {
    const dx = arr[i] - cx;
    const dz = arr[i + 2] - cz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= radius) continue;
    let w = d <= inner ? 1.0 : 1.0 - (d - inner) / (radius - inner);
    w = w * w * (3 - 2 * w); // smoothstep blend
    arr[i + 1] = arr[i + 1] * (1 - w) + targetY * w;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// Grade a haul road into the terrain the way a real one is built: ground
// heights along the path are smoothed into a gentle longitudinal profile
// (cutting through bumps, filling dips, at most maxGrade), then the
// surrounding ground is blended onto it across a shoulder. Points should be
// evenly spaced (resamplePath). Normals are left to the caller.
function gradeTerrainAlongPath(points, closed, halfWidth = 7, shoulder = 24, maxGrade = 0.08) {
  if (typeof marsSurface === 'undefined' || !marsSurface || !marsSurface.geometry) return;
  const grid = marsSurface.geometry.userData.heightGrid;
  const n = points.length;
  if (!grid || n < 2) return;

  // Longitudinal profile: ground heights, box-filtered twice (~ +/-40 m)
  let profile = points.map(p => sampleTerrainHeight(p.x, p.z));
  const radius = 8;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0, count = 0;
      for (let k = -radius; k <= radius; k++) {
        let j = i + k;
        if (closed) j = (j + n) % n;
        else if (j < 0 || j >= n) continue;
        sum += profile[j];
        count++;
      }
      next[i] = sum / count;
    }
    profile = next;
  }
  // Limit the gradient in both directions
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < n; i++) {
      const lim = points[i].distanceTo(points[i - 1]) * maxGrade;
      profile[i] = Math.min(profile[i - 1] + lim, Math.max(profile[i - 1] - lim, profile[i]));
    }
    for (let i = n - 2; i >= 0; i--) {
      const lim = points[i].distanceTo(points[i + 1]) * maxGrade;
      profile[i] = Math.min(profile[i + 1] + lim, Math.max(profile[i + 1] - lim, profile[i]));
    }
  }

  // Nearest road segment for every grid vertex within reach
  const { positions, segments, cell, half } = grid;
  const row = segments + 1;
  const reach = halfWidth + shoulder;
  const bestDist = new Map();
  const target = new Map();
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const abx = b.x - a.x, abz = b.z - a.z;
    const lenSq = abx * abx + abz * abz || 1;
    const ix0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - reach + half) / cell));
    const ix1 = Math.min(segments, Math.ceil((Math.max(a.x, b.x) + reach + half) / cell));
    const iz0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - reach + half) / cell));
    const iz1 = Math.min(segments, Math.ceil((Math.max(a.z, b.z) + reach + half) / cell));
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const v = iz * row + ix;
        const vx = positions[v * 3], vz = positions[v * 3 + 2];
        const t = Math.max(0, Math.min(1, ((vx - a.x) * abx + (vz - a.z) * abz) / lenSq));
        const dx = vx - (a.x + abx * t), dz = vz - (a.z + abz * t);
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d >= reach) continue;
        const prev = bestDist.get(v);
        if (prev !== undefined && prev <= d) continue;
        bestDist.set(v, d);
        target.set(v, profile[i] + (profile[(i + 1) % n] - profile[i]) * t);
      }
    }
  }

  bestDist.forEach((d, v) => {
    let w = 1;
    if (d > halfWidth) {
      const u = 1 - (d - halfWidth) / shoulder;
      w = u * u * (3 - 2 * u);
    }
    const y = positions[v * 3 + 1];
    positions[v * 3 + 1] = y + (target.get(v) - y) * w;
  });
  marsSurface.geometry.attributes.position.needsUpdate = true;
}


function positionRoverOnTerrain() {
  const x = rover.position.x;
  const z = rover.position.z;
  rover.position.y = sampleTerrainHeight(x, z, 0) + 0.3;

  // Normal averaged over the wheelbase, eased so the body settles over bumps
  // like a sprung chassis rather than snapping between terrain facets.
  sampleTerrainNormal(x, z, _roverTargetNormal, 1.6);
  _roverGroundNormal.lerp(_roverTargetNormal, 0.25).normalize();

  // Clamp to 30 degrees so a steep crater wall never flips the rover
  const maxTilt = Math.PI / 6;
  const angle = _roverUp.angleTo(_roverGroundNormal);
  _roverTiltQuat.setFromUnitVectors(_roverUp, _roverGroundNormal);
  if (angle > maxTilt) {
    _roverTiltQuat.slerp(new THREE.Quaternion(), 1 - maxTilt / angle);
  }

  rover.rotation.set(0, roverYaw, 0);
  rover.quaternion.premultiply(_roverTiltQuat);
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

  // 2) Vehicle height error lines for every truck
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

  if (mgr.fleet) {
    mgr.fleet.vehicles.forEach(v => addVehicleErrorLine(v));
  }
}

function updateCamera(deltaMs) {
  const dt = Math.min((deltaMs || 16.67) / 1000, 0.05);
  const now = performance.now();

  if (!window.cameraVectors) {
    window.cameraVectors = {
      target: new THREE.Vector3(),
      head: new THREE.Vector3(),
      look: new THREE.Vector3(),
      toRover: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      quat: new THREE.Quaternion()
    };
  }
  const vectors = window.cameraVectors;
  const rig = cameraRig;
  const speed01 = Math.min(Math.abs(velocity) / MAX_SPEED, 1);
  const boost01 = THREE.MathUtils.clamp((Math.abs(velocity) - MAX_SPEED) / (BOOST_SPEED - MAX_SPEED), 0, 1);
  // A couple of seconds after the last drag, ease back to the default view
  // (quicker while driving, so the road ahead comes back into view)
  const recentre = !rig.dragging && now - rig.lastInput > 2500
    ? 1 - Math.exp(-dt * (0.5 + 2.5 * speed01))
    : 0;

  let targetFov = rig.fov;

  switch (cameraMode) {
    case 'thirdPerson': {
      rig.yaw = Math.atan2(Math.sin(rig.yaw), Math.cos(rig.yaw)); // keep in [-PI, PI]
      rig.yaw += (0 - rig.yaw) * recentre;
      rig.pitch += (rig.defaultPitch - rig.pitch) * recentre * 0.6;

      // Behind the rover (it faces -Z), swung round by the orbit yaw
      const heading = roverYaw + rig.yaw;
      const distance = rig.distance + 1.5 * boost01; // drop back a little at boost speed
      const horizontal = distance * Math.cos(rig.pitch);
      const pivotY = rover.position.y + 1.5;
      vectors.target.set(
        rover.position.x + Math.sin(heading) * horizontal,
        pivotY + distance * Math.sin(rig.pitch),
        rover.position.z + Math.cos(heading) * horizontal
      );

      // Terrain occlusion: march the rover->camera sight line over the height
      // field and lift the camera so a hill behind the rover never blocks the view.
      for (let i = 1; i <= 6; i++) {
        const t = i / 6;
        const sx = rover.position.x + (vectors.target.x - rover.position.x) * t;
        const sz = rover.position.z + (vectors.target.z - rover.position.z) * t;
        const lineY = pivotY + (vectors.target.y - pivotY) * t;
        const clearY = sampleTerrainHeight(sx, sz, rover.position.y) + 1.0;
        if (lineY < clearY) vectors.target.y += (clearY - lineY) / t;
      }

      // Spring-damper follow: a touch of lag sells the rover's weight, but a
      // drag should feel direct, so stiffen the spring while looking around
      const stiffness = rig.dragging ? 40.0 : 11.0;
      const damping = rig.dragging ? 12.0 : 7.0;

      // The spring trails a moving target by speed x damping / stiffness
      // (~46 m at full boost). Lead the target by half of the boost share of
      // that, so boosting pulls away half as far; cruising is unchanged.
      if (boost01 > 0) {
        const lead = Math.abs(velocity) * 60 * (damping / stiffness) * 0.5 * boost01 * Math.sign(velocity);
        vectors.target.x += -Math.sin(roverYaw) * lead;
        vectors.target.z += -Math.cos(roverYaw) * lead;
      }
      const displacement = vectors.head.subVectors(vectors.target, camera.position);
      cameraSpring.velocity.addScaledVector(displacement, stiffness * dt);
      cameraSpring.velocity.multiplyScalar(Math.max(0, 1 - damping * dt));
      camera.position.addScaledVector(cameraSpring.velocity, dt);

      const groundY = getGroundHeight(camera.position.x, camera.position.z, rover.position.y);
      if (camera.position.y < groundY + 1.2) camera.position.y = groundY + 1.2;

      // Look past the rover toward the horizon rather than down at it
      vectors.toRover.set(rover.position.x - camera.position.x, 0, rover.position.z - camera.position.z);
      if (vectors.toRover.lengthSq() > 1e-6) vectors.toRover.normalize();
      const lookAhead = 3.0 + 4.0 * speed01;
      vectors.look.set(
        rover.position.x + vectors.toRover.x * lookAhead,
        pivotY + 0.2,
        rover.position.z + vectors.toRover.z * lookAhead
      );
      // A faint high-frequency judder at speed, like a camera on a chase car
      if (speed01 > 0.05) {
        const t = now * 0.001;
        vectors.look.y += (Math.sin(t * 21.0) * 0.6 + Math.sin(t * 34.0) * 0.4) * 0.012 * speed01;
      }
      camera.lookAt(vectors.look);
      targetFov = rig.fov + 8 * speed01 + 12 * boost01;
      break;
    }

    case 'firstPerson': {
      rig.lookYaw += (0 - rig.lookYaw) * recentre;
      rig.lookPitch += (-0.08 - rig.lookPitch) * recentre;
      // Ride on the mast: the view pitches and rolls with the rover
      rover.updateMatrixWorld();
      camera.position.copy(FIRST_PERSON_MOUNT).applyMatrix4(rover.matrixWorld);
      vectors.euler.set(rig.lookPitch, rig.lookYaw, 0);
      camera.quaternion.copy(rover.quaternion).multiply(vectors.quat.setFromEuler(vectors.euler));
      targetFov = rig.firstPersonFov + 6 * speed01 + 10 * boost01;
      break;
    }

    case 'orbit':
      targetFov = rig.fov;
      break;
  }

  // Ease the field of view (it widens a little with speed)
  if (Math.abs(targetFov - rig.currentFov) > 0.01) {
    rig.currentFov += (targetFov - rig.currentFov) * (1 - Math.exp(-dt * 4));
    camera.fov = rig.currentFov;
    camera.updateProjectionMatrix();
  }
}

// Everything positionRoverOnTerrain() needs exists by now
positionRoverOnTerrain();
scheduleAnimationFrame();
// Add a simple HUD to show camera mode





// Resize Window - using centralized event listener management
const resizeHandler = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (postProcessing) postProcessing.setSize();
};

window.gameEventListeners.add(window, 'resize', resizeHandler);

// --- Deterministic CPU value-noise + fBm for natural terrain shaping ---
// (same idea as the skybox shader's noise3/fbm, on the CPU). Deterministic so
// the terrain is identical every load.
function _terrainHash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h); // [0,1)
}
function _terrainValueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = _terrainHash2(xi, yi);
  const b = _terrainHash2(xi + 1, yi);
  const c = _terrainHash2(xi, yi + 1);
  const d = _terrainHash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v; // [0,1]
}
function _terrainFbm(x, y, octaves) {
  let val = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    val += amp * _terrainValueNoise(x * freq, y * freq);
    norm += amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return val / norm; // normalised [0,1]
}

// ============================================================
// REGOLITH TERRAIN MATERIAL (desktop)
// ============================================================
// The terrain mesh is ~20 m per vertex, so all close-range detail comes from
// the shader: world-space texture layers at several scales (rotated against
// each other so nothing visibly tiles), dark basaltic sand sheets, layered
// rock on slopes and pebbly grit near the camera.

// Periodic value noise / fBm / Worley on a P x P lattice, so textures tile
function _periodicHash(x, y, P, seed) {
  x = ((x % P) + P) % P;
  y = ((y % P) + P) % P;
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function _periodicNoise(x, y, P, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = _periodicHash(xi, yi, P, seed), b = _periodicHash(xi + 1, yi, P, seed);
  const c = _periodicHash(xi, yi + 1, P, seed), d = _periodicHash(xi + 1, yi + 1, P, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function _periodicFbm(x, y, P, octaves, seed) {
  let val = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    val += amp * _periodicNoise(x, y, P, seed + o * 13);
    norm += amp;
    x *= 2; y *= 2; P *= 2;
    amp *= 0.5;
  }
  return val / norm;
}
// Distance to the nearest jittered cell point (0 at a pebble centre)
function _periodicWorley(x, y, P, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j;
      const px = cx + _periodicHash(cx, cy, P, seed);
      const py = cy + _periodicHash(cx, cy, P, seed + 1.7);
      const d = Math.hypot(px - x, py - y);
      if (d < best) best = d;
    }
  }
  return best;
}

// fBm whose finest octave still spans >= 6 texels per cycle at this texture
// size. Anything finer aliases into per-pixel noise (the "pixelated ground"),
// which low-angle night lighting then makes obvious. Returns 0.5 (flat) when
// even the base frequency is too fine to represent.
function _bandLimitedFbm(u, v, base, octaves, seed, size) {
  const maxCycles = size / 6;
  if (base > maxCycles) return 0.5;
  const fit = Math.max(1, Math.min(octaves, Math.floor(Math.log2(maxCycles / base)) + 1));
  return _periodicFbm(u * base, v * base, base, fit, seed);
}

// RGBA detail: R broad fBm, G pebble mask, B fine grit, A second broad fBm
function createRegolithDetailTexture(size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const broad = _bandLimitedFbm(u, v, 4, 5, 1, size);
      const pebble = Math.max(0, 1 - _periodicWorley(u * 24, v * 24, 24, 3) * 1.9);
      const grit = _bandLimitedFbm(u, v, 32, 2, 7, size);
      const broad2 = _bandLimitedFbm(u + 0.5 / 3, v + 0.5 / 3, 3, 5, 11, size);
      const i = (y * size + x) * 4;
      data[i] = broad * 255;
      data[i + 1] = Math.min(1, pebble * (0.6 + 0.8 * _periodicHash(Math.floor(u * 24), Math.floor(v * 24), 24, 5))) * 255;
      data[i + 2] = grit * 255;
      data[i + 3] = broad2 * 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

// Tangent-space normals of a rocky height field: fBm undulation plus rounded
// pebbles (Worley bumps) and fine grit
function createRegolithNormalTexture(size = 512) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const undulation = _bandLimitedFbm(u, v, 6, 5, 21, size);
      const stones = Math.pow(Math.max(0, 1 - _periodicWorley(u * 18, v * 18, 18, 23) * 2.2), 1.5);
      const grit = _bandLimitedFbm(u, v, 48, 2, 29, size);
      H[y * size + x] = undulation * 0.9 + stones * 0.55 + grit * 0.1;
    }
  }
  const raw = (x, y) => H[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  // 3x3 tent blur: stops the finite differences below from amplifying
  // single-texel noise
  const at = (x, y) => (4 * raw(x, y) + 2 * (raw(x - 1, y) + raw(x + 1, y) + raw(x, y - 1) + raw(x, y + 1))
    + raw(x - 1, y - 1) + raw(x + 1, y - 1) + raw(x - 1, y + 1) + raw(x + 1, y + 1)) / 16;
  const data = new Uint8Array(size * size * 4);
  const strength = size >= 512 ? 5.0 : 3.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      let ny = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = (nx / len * 0.5 + 0.5) * 255;
      data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

function createRegolithMaterial(textureSize = 512) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, // vertex colours carry the elevation tint
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.55,
    side: THREE.FrontSide
  });
  const detail = createRegolithDetailTexture(textureSize);
  const normals = createRegolithNormalTexture(textureSize);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.tRegolith = { value: detail };
    shader.uniforms.tRegolithNormal = { value: normals };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying highp vec3 vTerrainWorld;
        varying vec3 vTerrainNormal;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vTerrainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainNormal = normalize(mat3(modelMatrix) * objectNormal);`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tRegolith;
        uniform sampler2D tRegolithNormal;
        varying highp vec3 vTerrainWorld;
        varying vec3 vTerrainNormal;
        float terrainRock;
        float terrainNear;
        vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 wp = vTerrainWorld.xz;
          float dist = length(vTerrainWorld - cameraPosition);
          vec4 dMacro = texture2D(tRegolith, rot2(wp, 0.3) / 900.0);
          vec4 dA = texture2D(tRegolith, wp / 140.0);
          vec4 dB = texture2D(tRegolith, rot2(wp, 1.1) / 31.0);
          vec4 dC = texture2D(tRegolith, rot2(wp, 2.3) / 6.5);
          float slope = 1.0 - clamp(normalize(vTerrainNormal).y, 0.0, 1.0);
          terrainNear = 1.0 - smoothstep(35.0, 110.0, dist);

          vec3 albedo = diffuseColor.rgb;
          // Bright dust vs darker, coarser plains at the kilometre scale
          albedo *= mix(0.74, 1.14, smoothstep(0.32, 0.68, dMacro.r * 0.55 + dA.r * 0.45));
          // Wind-swept sheets of dark basaltic sand
          float darkSand = smoothstep(0.5, 0.8, dMacro.a * 0.6 + dA.a * 0.4);
          albedo = mix(albedo, vec3(0.19, 0.105, 0.075), darkSand * 0.42);
          // Mottling at the tens-of-metres scale
          albedo *= 0.86 + 0.28 * dB.r;

          // Slopes break out into layered sedimentary rock
          terrainRock = smoothstep(0.07, 0.2, slope + (dB.a - 0.5) * 0.12);
          float strata = 0.5 + 0.5 * sin(vTerrainWorld.y * 1.9 + dA.r * 7.0);
          vec3 rockCol = vec3(0.40, 0.21, 0.12) * (0.72 + 0.4 * strata);
          albedo = mix(albedo, rockCol, terrainRock);

          // Near-field grit and scattered dark pebbles (faded out before they could shimmer)
          albedo *= mix(1.0, 0.95 + 0.1 * dC.b, terrainNear);
          // Pebbles gather in patches rather than dusting everything evenly
          float pebbles = smoothstep(0.4, 0.9, dC.g) * smoothstep(0.4, 0.75, dB.a);
          albedo = mix(albedo, albedo * vec3(0.7, 0.68, 0.7), pebbles * terrainNear * 0.3);
          diffuseColor.rgb = albedo;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.82, terrainRock);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 wp = vTerrainWorld.xz;
          vec3 n1 = texture2D(tRegolithNormal, rot2(wp, 0.7) / 47.0).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(tRegolithNormal, wp / 9.0).xyz * 2.0 - 1.0;
          vec3 n3 = texture2D(tRegolithNormal, rot2(wp, 1.9) / 2.3).xyz * 2.0 - 1.0;
          // Whiteout blend of the three scales; rock gets extra relief
          vec2 slopeXY = n1.xy * (0.55 + 0.9 * terrainRock) + n2.xy * 0.35 + n3.xy * 0.18 * terrainNear;
          vec3 tn = normalize(vec3(slopeXY, n1.z * n2.z));
          vec3 N = normalize(vTerrainNormal);
          vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
          vec3 B = cross(N, T);
          vec3 worldN = normalize(T * tn.x + B * tn.y + N * tn.z);
          normal = normalize((viewMatrix * vec4(worldN, 0.0)).xyz);
        }`);
  };
  return material;
}

function createRealisticMarsTerrain() {
  // Performance-adaptive terrain creation with mobile optimization
  const perfSettings = getPerformanceSettings();
  
  // Adaptive terrain parameters based on performance. Ground height is now
  // sampled directly from the grid (sampleTerrainHeight) rather than
  // raycast, so resolution no longer costs CPU per frame - only a little
  // more generation time and GPU triangles. Desktop terrain spans 5 km so the
  // second colony (2.6 km out) stands on real ground instead of the void.
  const terrainSize = perfSettings.isMobile ? 3000 :
                     perfSettings.detailLevel === 'high' ? 5000 :
                     perfSettings.detailLevel === 'normal' ? 5000 : 3000;

  const segments = perfSettings.isMobile ? (perfSettings.mobileTier === 'low' ? 64 : 128) :
                   perfSettings.detailLevel === 'high' ? 288 :
                   perfSettings.detailLevel === 'normal' ? 224 : 128;
  
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
    
    {
      // Natural terrain via domain-warped fBm instead of summed sin/cos
      // (which reads as repetitive grid-aligned waves; phones used that). Domain warping
      // breaks up the regularity; a ridged octave adds rocky spines.
      const warpX = _terrainFbm(x * 0.0009 + 11.2, z * 0.0009 + 4.7, 3) - 0.5;
      const warpZ = _terrainFbm(x * 0.0009 + 23.5, z * 0.0009 + 9.1, 3) - 0.5;
      const wx = x + warpX * 140;
      const wz = z + warpZ * 140;

      // Broad continents (large rolling highs and lows)
      const continents = (_terrainFbm(wx * 0.0016, wz * 0.0016, 5) - 0.5) * 34;
      // Mid-scale hills
      const hills = (_terrainFbm(wx * 0.006, wz * 0.006, 4) - 0.5) * 10;
      // Ridged noise -> rocky ridges and crest lines
      const ridged = (1 - Math.abs(2 * _terrainFbm(wx * 0.012 + 50, wz * 0.012 + 50, 4) - 1)) * 6;

      // Fine rocky detail only on high detail to keep load fast
      const detailRocks = perfSettings.detailLevel === 'high'
        ? (_terrainFbm(wx * 0.05, wz * 0.05, 3) - 0.5) * 1.8 +
          (_terrainFbm(wx * 0.13 + 7, wz * 0.13 + 7, 2) - 0.5) * 0.7
        : 0;

      elevation = continents + hills * 0.8 + ridged * 0.7 + detailRocks;
    }

    // Add deterministic variation based on position (not Math.random) for consistent terrain
    const randomVariation = (Math.sin(x * 1.37 + z * 2.41) * Math.cos(x * 0.93 - z * 1.67)) * 0.25;
    elevation += randomVariation;
    const unfeaturedElevation = elevation;

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
    const highMountainCount = 3; // only 3 actual mountains (was 30 × 10% = ~3 anyway)
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

    // Fade the set-piece features out around the colony (a 36 m mesa used to
    // stand right on the ring road)
    {
      const cdx = x - COLONY_SITE_X, cdz = z - COLONY_SITE_Z;
      const colonyDist = Math.sqrt(cdx * cdx + cdz * cdz);
      if (colonyDist < 620) {
        const t = Math.max(0, (colonyDist - 420) / 200);
        elevation = unfeaturedElevation + (elevation - unfeaturedElevation) * (t * t * (3 - 2 * t));
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

  // Grid description used by sampleTerrainHeight(). Holds the live position
  // array, so later edits (flattenMarsTerrain) are picked up automatically.
  geometry.userData.heightGrid = {
    positions: geometry.attributes.position.array,
    segments,
    cell: terrainSize / segments,
    half: terrainSize / 2
  };

  // MOBILE EMERGENCY: Use basic material without textures to prevent WebGL context issues
  const terrainPerfSettings = getPerformanceSettings();
  let material;
  
  if (terrainPerfSettings.isMobile && terrainPerfSettings.mobileTier === 'low') {
    // Low-end phones: cheap per-vertex Lambert lighting. (An unlit
    // MeshBasicMaterial stayed fully bright through the night.)
    material = new THREE.MeshLambertMaterial({
      color: 0xffffff, // vertex colours carry the regolith tint (as on desktop)
      vertexColors: true,
      side: THREE.FrontSide, // terrain is only ever seen from above
      fog: true
    });
  } else {
    // Physically based regolith with shader-side detail layers (smaller
    // detail textures on phones: quicker to generate at load)
    material = createRegolithMaterial(terrainPerfSettings.isMobile ? 256 : 512);
  }

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = false; // ground receives shadows but shouldn't cast them

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

// Create a skybox with procedural shader sky, Milky Way, and planets
function createSpaceSkybox() {
  console.log("Creating shader-based night sky...");

  const skyboxGroup = new THREE.Group();
  skyboxGroup.renderOrder = -1000;

  // === LAYER 1: Procedural shader sky sphere ===
  // Low tessellation is fine — all sky detail lives in the fragment shader,
  // the vertex shader only needs a smooth direction interpolant.
  const skyboxGeometry = new THREE.SphereGeometry(5900, 32, 24);

  const skyboxMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uDayAmount: { value: 0.0 },
      uSunDir: { value: marsAtmosphere.sunDir }
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
      uniform float uDayAmount;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      ${MARS_SKY_GLSL}

      // --- Hash / noise helpers (GPU-friendly) ---
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

      void main() {
        vec3 dir = normalize(vWorldPos);
        float elevation = dir.y; // -1 bottom, +1 top

        // Physically inspired Mars sky (shared with the haze and the IBL)
        vec3 sky = marsSkyRadiance(dir, uSunDir);

        // The sun: ~2/3 the size it looks from Earth, but drawn a little
        // larger to read on screen. HDR-bright so bloom gives it real glare.
        float sunCos = dot(dir, uSunDir);
        float disk = smoothstep(0.99990, 0.99994, sunCos) * smoothstep(-0.01, 0.01, elevation);
        vec3 sunTint = mix(vec3(1.0, 0.55, 0.30), vec3(1.0, 0.94, 0.86), smoothstep(0.0, 0.3, uSunDir.y));
        sky += sunTint * disk * 60.0;

        // --- Milky Way band: subtle, high in the sky, and faded out toward the
        // horizon so it never reads as ground-level "smoke". ---
        float angle = -0.55;
        float ca = cos(angle), sa = sin(angle);
        vec3 rd = vec3(
          dir.x * ca - dir.z * sa,
          dir.y,
          dir.x * sa + dir.z * ca
        );
        float bandDist = abs(rd.y);
        float bandMask = smoothstep(0.16, 0.0, bandDist);
        // Gate by true elevation: nothing low in the sky, only well overhead.
        bandMask *= smoothstep(0.18, 0.5, elevation);

        if (bandMask > 0.01) {
          vec3 nCoord = rd * 6.0 + vec3(0.0, 0.0, uTime * 0.000002);
          float n = fbm(nCoord);
          float detail = fbm(nCoord * 3.0 + 1.5);

          float milky = bandMask * smoothstep(0.44, 0.74, n);
          milky += bandMask * 0.3 * smoothstep(0.48, 0.80, detail);

          // Dark dust lanes carve voids for a mottled look
          float dust = fbm(nCoord * 1.7 + 9.0);
          milky *= 1.0 - smoothstep(0.40, 0.62, dust) * 0.8;

          // Desaturated, dim so it's a hint of galaxy, not a glowing cloud
          vec3 milkyColor = vec3(0.16, 0.19, 0.28);
          sky += milkyColor * milky * 0.26 * (1.0 - uDayAmount);
        }

        // Stars are drawn by the dedicated particle layer (createTwinklingStars),
        // so the sky shader only paints the gradient + faint Milky Way here.

        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
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

  // === LAYER 4: Phobos and Deimos ===
  const moonSystem = createMarsMoonsLayer();
  skyboxGroup.add(moonSystem.group);
  skyboxGroup.userData.moons = moonSystem;

  // Store update function for animation loop
  skyboxGroup.userData.update = function(time) {
    // Update shader time uniform
    skyboxMaterial.uniforms.uTime.value = time;
    if (typeof window.dayNightBlend === 'number') {
      skyboxMaterial.uniforms.uDayAmount.value = window.dayNightBlend;
    }
    // Twinkle stars
    if (starSystem && starSystem.update) starSystem.update(time);
    // Shooting stars
    if (shootingStarSystem && shootingStarSystem.update) shootingStarSystem.update(time);
    // Moons
    moonSystem.update(time);
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
  const starCount = perfSettings.isMobile ? 12000 : 42000;
  const milkyWayStarCount = Math.floor(starCount * 0.28);
  const skyRadius = 5500;

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount); // twinkle phase
  const speeds = new Float32Array(starCount); // twinkle speed

  for (let i = 0; i < starCount; i++) {
    let x;
    let y;
    let z;

    if (i < milkyWayStarCount) {
      // Extra upper-sky density so the Milky Way reads as a richer star band.
      const theta = Math.random() * Math.PI * 2;
      const bandY = 0.48 + Math.sin(theta - 0.55) * 0.24;
      y = Math.max(0.18, Math.min(0.92, bandY + (Math.random() - 0.5) * 0.18));
      const horizontalRadius = Math.sqrt(Math.max(0.0, 1.0 - y * y));
      x = horizontalRadius * Math.cos(theta + (Math.random() - 0.5) * 0.035);
      z = horizontalRadius * Math.sin(theta + (Math.random() - 0.5) * 0.035);
    } else {
      // Fibonacci spiral for even coverage of the visible sky: from the zenith
      // down to just below the horizon (uniform in y = uniform in area).
      // Numbering from 0 here matters: the spiral used to start at index
      // milkyWayStarCount, so it began ~64 degrees down and left the top of
      // the sky empty, and half of it was wasted under the ground.
      const j = i - milkyWayStarCount;
      const spiralCount = starCount - milkyWayStarCount;
      const phi = Math.acos(1 - 1.14 * (j + 0.5) / spiralCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * j;
      // Add small jitter so it doesn't look too uniform
      const jitterPhi = phi + (Math.random() - 0.5) * 0.02;
      const jitterTheta = theta + (Math.random() - 0.5) * 0.02;
      x = Math.sin(jitterPhi) * Math.cos(jitterTheta);
      y = Math.cos(jitterPhi);
      z = Math.sin(jitterPhi) * Math.sin(jitterTheta);
    }

    positions[i * 3]     = skyRadius * x;
    positions[i * 3 + 1] = skyRadius * y;
    positions[i * 3 + 2] = skyRadius * z;

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
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  // Create soft circular star texture
  const starTexture = createStarTexture();

  // GPU twinkle: each star's brightness/size oscillates in the vertex shader,
  // so the whole field animates every frame for free (no per-frame CPU buffer
  // uploads). This also fixes the old PointsMaterial path, which ignored the
  // per-point size attribute entirely, so twinkling never actually showed.
  const dpr = (renderer && renderer.getPixelRatio) ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uTexture: { value: starTexture },
      uScale: { value: window.innerHeight * dpr * 0.5 }, // matches three.js size attenuation
      uVisibility: { value: 1.0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uScale;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        float t = uTime * 0.001;
        float tw = 0.60 + 0.28 * (
          sin(t * aSpeed + aPhase) * 0.5 +
          sin(t * aSpeed * 1.7 + aPhase * 2.3) * 0.3 +
          sin(t * aSpeed * 0.4 + aPhase * 0.7) * 0.2
        );
        vTwinkle = tw;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // 4x boost: the particle layer now carries the whole star field (the
        // old per-fragment shader stars were removed), so make points readable.
        gl_PointSize = max(aSize * tw * 4.0 * (uScale / -mvPosition.z), 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uVisibility;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * tex * (0.45 + vTwinkle) * uVisibility;
        // Linear light already: brighten into HDR (the biggest stars bloom a touch)
        gl_FragColor.rgb *= 2.4;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  // Return system with update function — just advances the shader clock.
  return {
    points,
    update(time) {
      material.uniforms.uTime.value = time;
      const dayBlend = typeof window.dayNightBlend === 'number' ? window.dayNightBlend : 0;
      material.uniforms.uVisibility.value = Math.max(0.04, 1.0 - dayBlend * 0.96);
      // Keep size attenuation correct if the window was resized
      const d = (renderer && renderer.getPixelRatio) ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
      material.uniforms.uScale.value = window.innerHeight * d * 0.5;
    }
  };
}

function createStarTexture() {
  // 64px is enough — stars are tiny points; higher res adds no benefit
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

    // Bright head glow (no PointLight — too expensive for transient effects)
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
  let lastTime = null;

  return {
    group,
    update(time) {
      // Real frame delta (seconds) so shooting stars move at a consistent
      // real-world speed regardless of display refresh rate.
      let dt = 0.016;
      if (lastTime != null) dt = Math.min(Math.max((time - lastTime) / 1000, 0), 0.1);
      lastTime = time;
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
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMarsMoonsLayer() {
  const group = new THREE.Group();

  // Phobos: a dark (~7% albedo), lumpy 27 km moon that crosses the sky west
  // to east, drawn a little larger than its real ~0.2 degrees so it reads
  const phobosGeometry = new THREE.IcosahedronGeometry(1, 5);
  {
    const p = phobosGeometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const lump = 1 + 0.16 * Math.sin(v.x * 3.1 + 0.4) * Math.cos(v.y * 2.3) + 0.09 * Math.sin(v.z * 5.7 + v.x * 2.0);
      v.multiplyScalar(lump);
      p.setXYZ(i, v.x * 1.3, v.y * 0.95, v.z * 0.86);
    }
    phobosGeometry.computeVertexNormals();
  }
  const phobosMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: marsAtmosphere.sunDir },
      uDay: { value: 0 }
    },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vLocal;
      void main() {
        vN = normalize(mat3(modelMatrix) * normal);
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform float uDay;
      varying vec3 vN;
      varying vec3 vLocal;
      float h3(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y + p.z) * p.x); }
      // Crater field: distance to jittered cell centres gives bowls with bright rims
      float craters(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        float d = 1.0;
        for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec3 o = vec3(x, y, z);
          vec3 c = o + vec3(h3(i + o), h3(i + o + 7.1), h3(i + o + 3.3)) - f;
          d = min(d, dot(c, c));
        }
        return d;
      }
      void main() {
        vec3 N = normalize(vN);
        float d = craters(vLocal * 3.2);
        float bowl = smoothstep(0.0, 0.18, d);
        // Stickney: the one huge crater on the leading face
        float stickney = smoothstep(0.35, 0.55, length(vLocal - vec3(1.15, 0.1, 0.2)));
        float albedo = 0.07 * (0.75 + 0.35 * bowl) * (0.7 + 0.3 * stickney);
        float lit = max(dot(N, normalize(uSunDir)), 0.0);
        vec3 col = vec3(1.0, 0.93, 0.86) * albedo * (lit * 9.0 + 0.004);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    depthWrite: false,
    fog: false
  });
  const phobos = new THREE.Mesh(phobosGeometry, phobosMaterial);
  phobos.scale.setScalar(22);
  phobos.frustumCulled = false;
  group.add(phobos);

  // Deimos: tiny and far, just a bright, steady star-like point
  const deimos = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2e2, depthWrite: false, fog: false })
  );
  deimos.scale.setScalar(3.2);
  deimos.frustumCulled = false;
  group.add(deimos);

  group.frustumCulled = false;
  const radius = 4600;
  const place = (mesh, angle, tilt) => {
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * Math.cos(tilt), Math.sin(angle) * radius * Math.sin(tilt) - radius * 0.25);
    mesh.lookAt(0, 0, 0);
  };

  return {
    group,
    update(time) {
      const t = (time || 0) * 0.001;
      // Phobos rises in the west and races east; Deimos drifts slowly the other way
      place(phobos, Math.PI - ((t * 0.035) % (Math.PI * 2)), 0.42);
      place(deimos, 0.8 + t * 0.004, 0.25);
      deimos.visible = phobosMaterial.uniforms.uDay.value < 0.5;
      phobosMaterial.uniforms.uDay.value = marsAtmosphere.dayAmount;
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
  console.log("🚀 MARS SCENE: initializeScene() called");
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
  console.log("🔧 MARS SCENE: loadCoreComponents() called");
  
  // Create the HUD (may not exist as a function, skip if undefined)
  if (typeof createHUD === 'function') {
    createHUD();
    console.log("HUD created");
  } else {
    console.log("createHUD not defined, skipping");
  }

  const perfSettings = getPerformanceSettings();

  // Sunlight comes from the single shadow-casting sunLight, driven by updateDayNightCycle

  // The sun itself is drawn by the sky shader (disk + dust aureole)

  // Eagerly create MarsSceneManager on desktop so colony and rockets
  // are always available even if lazy loading is delayed.
  console.log("🏗️ MARS SCENE: About to create MarsSceneManager, isMobile=", perfSettings.isMobile);
  if (!perfSettings.isMobile) {
    try {
      console.log("🏗️ MARS SCENE: Creating MarsSceneManager now...");
      sceneManager = new MarsSceneManager(scene, 5000);
      window.marsSceneManager = sceneManager;
      // Build the settlements around the landing site behind the loading screen
      sceneManager.updateSettlements(rover.position, { prewarm: true });
      console.log('✅ MarsSceneManager eagerly created for desktop');
    } catch (e) {
      console.error('❌ Failed to create MarsSceneManager eagerly:', e);
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
        // Settlements around the landing site exist from the first frame
        // (a handful, so loading stays quick on a phone)
        window.marsSceneManager.updateSettlements(rover.position, { prewarm: true, prewarmMax: 6 });
        return Promise.resolve();
      });
    }, 50); // Reduced from 2000ms to 50ms for immediate driving capability
    
    console.log("Essential mobile components queued for loading");
    return;
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
console.log('🎮 MARS SCRIPT: End of mars.js reached, about to call initializeScene()');
console.log('🎮 initializeScene exists:', typeof initializeScene);
console.log('🎮 scene exists:', typeof scene);
console.log('🎮 renderer exists:', typeof renderer);
try {
  if (typeof initializeScene === 'function') {
    console.log('🎮 CALLING initializeScene() NOW...');
    initializeScene();
    console.log('🎮 initializeScene() completed');
  } else {
    console.warn('❌ initializeScene is not defined; core components not initialized');
  }
} catch (e) {
  console.error('❌ Error during initializeScene:', e);
  console.error('Error stack:', e.stack);
}
