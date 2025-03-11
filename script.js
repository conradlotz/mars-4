// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 10, 20);

// Performance-optimized renderer with better quality settings for visibility
const renderer = new THREE.WebGLRenderer({ 
  antialias: true, // Enable antialiasing for better star visibility
  powerPreference: 'high-performance',
  precision: 'highp' // Higher precision for better visibility
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Use device pixel ratio for sharper rendering
document.body.appendChild(renderer.domElement);

// Fog for distance culling - more distant and less intense for better star visibility
scene.fog = new THREE.Fog(0xb77c5a, 1000, 7000);

// Endless terrain system with reduced complexity
const terrainSystem = {
  chunkSize: 200, // Size of each terrain chunk
  visibleRadius: 1, // Reduced visible radius (3x3 grid instead of 5x5)
  chunks: new Map(), // Store active chunks
  currentChunk: { x: 0, z: 0 }, // Current chunk coordinates
  lastUpdateTime: 0, // Track last update time for throttling
  
  // Get chunk key from coordinates
  getChunkKey: function(x, z) {
    return `${x},${z}`;
  },
  
  // Get chunk coordinates from world position
  getChunkCoords: function(worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
  },
  
  // Update visible chunks based on rover position
  update: function(roverPosition) {
    // Throttle updates based on time instead of frames for more consistent performance
    const now = performance.now();
    if (now - this.lastUpdateTime < 1000) return; // Only update once per second
    
    // Get current chunk from rover position
    const newChunk = this.getChunkCoords(roverPosition.x, roverPosition.z);
    
    // If rover moved to a new chunk, update visible chunks
    if (newChunk.x !== this.currentChunk.x || newChunk.z !== this.currentChunk.z) {
      this.currentChunk = newChunk;
      this.updateVisibleChunks();
      this.lastUpdateTime = now;
    }
  },
  
  // Update which chunks should be visible
  updateVisibleChunks: function() {
    // Track which chunks should be visible
    const shouldBeVisible = new Set();
    
    // Calculate which chunks should be visible
    for (let xOffset = -this.visibleRadius; xOffset <= this.visibleRadius; xOffset++) {
      for (let zOffset = -this.visibleRadius; zOffset <= this.visibleRadius; zOffset++) {
        const x = this.currentChunk.x + xOffset;
        const z = this.currentChunk.z + zOffset;
        const key = this.getChunkKey(x, z);
        shouldBeVisible.add(key);
        
        // If chunk doesn't exist yet, create it
        if (!this.chunks.has(key)) {
          const chunk = this.createChunk(x, z);
          this.chunks.set(key, chunk);
          scene.add(chunk);
        }
      }
    }
    
    // Remove chunks that are no longer visible
    for (const [key, chunk] of this.chunks.entries()) {
      if (!shouldBeVisible.has(key)) {
        scene.remove(chunk);
        this.chunks.delete(key);
      }
    }
  },
  
  // Create a new terrain chunk
  createChunk: function(chunkX, chunkZ) {
    // Calculate world position of chunk
    const worldX = chunkX * this.chunkSize;
    const worldZ = chunkZ * this.chunkSize;
    
    // Create terrain with offset for this chunk
    const terrain = createRealisticMarsTerrainChunk(this.chunkSize, worldX, worldZ);
    
    // Position the chunk correctly in world space
    terrain.position.set(worldX + this.chunkSize/2, 0, worldZ + this.chunkSize/2);
    
    return terrain;
  },
  
  // Initialize the terrain system
  init: function() {
    this.lastUpdateTime = performance.now();
    this.updateVisibleChunks();
  }
};

// Create and add the realistic Mars terrain
const marsSurface = createRealisticMarsTerrain();
scene.add(marsSurface);

// Improved Rover Model
function createRealisticRover() {
  // Create a group to hold all rover parts
  const roverGroup = new THREE.Group();
  
  // Main chassis - lower platform
  const chassisGeometry = new THREE.BoxGeometry(2.4, 0.2, 3.2); // Increased size for better visibility
  const chassisMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888,
    roughness: 0.7,
    metalness: 0.3
  });
  const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
  chassis.position.y = 0.6;
  chassis.castShadow = true;
  roverGroup.add(chassis);
  
  // Main body - central electronics box
  const bodyGeometry = new THREE.BoxGeometry(1.8, 0.6, 2.2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xdddddd,
    roughness: 0.5,
    metalness: 0.5
  });
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
    color: 0x2244aa,
    roughness: 0.3,
    metalness: 0.8
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
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
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

// Dust Particle System
const createDustParticles = () => {
  const particleCount = 500;
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

// Enhanced Lighting for Mars - update to match the reference image
// Ambient light (stronger reddish to simulate Mars atmosphere)
const ambientLight = new THREE.AmbientLight(0xff8866, 0.6);
scene.add(ambientLight);

// Directional light (sun) - make it more orange/red like in the image
const sunLight = new THREE.DirectionalLight(0xff7744, 1.0);
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

// Add a subtle hemisphere light to simulate light bouncing off the surface
const hemisphereLight = new THREE.HemisphereLight(0xff6633, 0xaa4400, 0.4);
scene.add(hemisphereLight);

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below the ground
controls.enabled = false; // Disable orbit controls since we're starting in third-person mode

// Movement Logic
const keys = { w: false, a: false, s: false, d: false };
const speed = 0.2;
const rotationSpeed = 0.03;
let isMoving = false;
let currentSpeed = 0; // Track the current speed of the rover

// Distance tracking variables
let distanceTraveled = 0;
let lastUpdateTime = 0;
const DISTANCE_SCALE_FACTOR = 50; // Increased scale factor to make distance more visible

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

// Add camera modes and third-person view
const cameraOffset = new THREE.Vector3(0, 7, 15); // Positive Z to position behind the rover

// Change default camera mode to thirdPerson
let cameraMode = 'thirdPerson'; // 'orbit', 'thirdPerson', 'firstPerson'

// Function to toggle between camera modes
function toggleCameraMode() {
  switch(cameraMode) {
    case 'orbit':
      cameraMode = 'thirdPerson';
      controls.enabled = false; // Disable orbit controls in third-person mode
      console.log('Camera Mode: Third Person');
      break;
    case 'thirdPerson':
      cameraMode = 'firstPerson';
      controls.enabled = false; // Disable orbit controls in first-person mode
      console.log('Camera Mode: First Person');
      break;
    case 'firstPerson':
      cameraMode = 'orbit';
      controls.enabled = true; // Enable orbit controls in orbit mode
      console.log('Camera Mode: Orbit');
      break;
  }
}

// Add key listener for camera toggle (press 'c' to change camera mode)
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'c') {
    toggleCameraMode();
  }
});

// Add a variable to track the rover's yaw rotation separately
let roverYaw = 0;

// Add a frame counter for performance optimization
let frameCount = 0;
let lastTime = 0;
const FRAME_THROTTLE = 3; // Only perform heavy operations every N frames

// Add these variables at the top level of your script
let isTransitioning = false;
let transitionStartTime = 0;
let transitionDuration = 10000; // 10 seconds in milliseconds
let transitionStartState = 'day'; // or 'night'

// Modify the animate function
function animate(time) {
  requestAnimationFrame(animate);
  
  // Calculate delta time for consistent movement regardless of frame rate
  const delta = time - lastTime || 16.67; // Default to 60fps if lastTime is not set
  lastTime = time;
  
  // Skip frames if browser tab is inactive or delta is too large (indicating lag)
  if (delta > 100) return;
  
  frameCount++;

  // Make the skybox follow the camera ONLY if it exists
  if (window.spaceSkybox) {
    window.spaceSkybox.position.copy(camera.position);
  }
  
  // Update meteor system if it exists and we're in night mode
  if (window.meteorSystem && (!isDaytime || isTransitioning)) {
    window.meteorSystem.update(delta);
  }

  // Rover Movement
  isMoving = false;
  currentSpeed = 0; // Reset current speed
  
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
  if (frameCount % FRAME_THROTTLE === 0) {
    positionRoverOnTerrain();
  }
  
  // Update wheel suspension for realistic terrain following - already throttled internally
  updateWheelSuspension(wheels, originalWheelPositions);
  
  // Update camera position based on mode - throttle for performance
  if (frameCount % 2 === 0) {
    updateCamera();
  }
  
  // Update dust particles - only when moving and throttled
  if (isMoving && frameCount % 4 === 0) {
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
  
  switch(cameraMode) {
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
  hudElement.innerHTML = '<p>Camera: Third Person Mode (Press C to change)<br /><br />Controls: W/A/S/D to move, Arrow keys to rotate camera</p>';
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
  
  // Update HUD when camera mode changes
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
      const hud = document.getElementById('cameraHUD');
      if (hud) {
        switch(cameraMode) {
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
  });
}

// Create the HUD
createHUD();

// Resize Window
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function createRealisticMarsTerrain() {
  // Create a much larger terrain with more detailed features
  const terrainSize = 5000; // Increased size for more exploration area
  const resolution = 1024; // Higher resolution for more detail
  const geometry = new THREE.PlaneGeometry(
    terrainSize, 
    terrainSize, 
    256,  // increase segments for smoother terrain
    256   // increase segments for smoother terrain
  );
  geometry.rotateX(-Math.PI / 2);
  
  // Apply more complex noise to create realistic terrain elevation
  const positions = geometry.attributes.position.array;
  
  // Create a more varied and realistic terrain with multiple noise frequencies
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    
    // Multi-layered noise for more realistic terrain
    // Large features (mountains and valleys)
    const largeFeatures = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 8 +
                         Math.sin(x * 0.02 + 10) * Math.cos(z * 0.015) * 6;
    
    // Medium features (hills and craters)
    const mediumFeatures = Math.sin(x * 0.05) * Math.cos(z * 0.04) * 3 + 
                          Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06) * 2;
    
    // Small features (bumps and rocks)
    const smallFeatures = Math.sin(x * 0.2 + 2) * Math.cos(z * 0.15) * 1 +
                         Math.sin(x * 0.3 + 3) * Math.cos(z * 0.25) * 0.5;
    
    // Micro details
    const microDetails = Math.sin(x * 0.8 + 4) * Math.cos(z * 0.6) * 0.3;
    
    // Combine all features with different weights
    let elevation = largeFeatures + mediumFeatures + smallFeatures + microDetails;
    
    // Add some random variation for more natural look
    const randomVariation = Math.random() * 0.5 - 0.25;
    elevation += randomVariation;
    
    // Add specific Martian features
    
    // 1. Add impact craters
    const craterCount = 15;
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
    const riverCount = 5;
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
    const duneCount = 10;
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
    
    // 4. Add mountain ranges
    const mountainRangeCount = 5;
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
    
    // 5. Add impact craters
    const impactCraterCount = 15;
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
          const craterDepth = -3.5 - craterSize * 0.08;
          
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
  
  // Create material with Mars texture
  const marsTexture = createRealisticMarsTexture();
  marsTexture.wrapS = THREE.RepeatWrapping;
  marsTexture.wrapT = THREE.RepeatWrapping;
  marsTexture.repeat.set(8, 8); // Repeat texture to avoid stretching
  
  // Create a normal map for additional detail
  const normalMap = createMarsNormalMap();
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(8, 8);
  
  // Create a roughness map
  const roughnessMap = createMarsRoughnessMap();
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(8, 8);
  
  // Create material with smooth shading
  const material = new THREE.MeshStandardMaterial({
    color: 0xaa6633,  // Martian reddish-brown color
    roughness: 0.9,   // Very rough surface
    metalness: 0.1,   // Low metalness for a dusty appearance
    flatShading: false, // Use smooth shading
    side: THREE.DoubleSide
  });
  
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

// Create a realistic Mars texture
function createRealisticMarsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const context = canvas.getContext('2d');
  
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
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
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
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
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
  
  // Create a higher resolution texture
  const texture = createSphericalSkyTexture(8192); // Increase texture size to 4096x4096
  
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
function createSphericalSkyTexture(size = 8192) {
  // Create a high-resolution canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  // Fill with deep space black
  context.fillStyle = '#000005';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add stars and other elements with higher quality
  addBrighterBackgroundStars(context, size);
  addBrighterMidLayerStars(context, size);
  addBrighterForegroundStars(context, size);
  addBrighterMilkyWay(context, size);
  
  // Add atmospheric glow for realism
  addAtmosphericGlow(context, size);
  
  // Add some distant planets
  addPlanetToCanvas(context, size * 0.8, size * 0.2, size * 0.03, '#A67B5B');
  addPlanetToCanvas(context, size * 0.15, size * 0.75, size * 0.02, '#C8A080', true);
  
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

// Add much brighter background stars
function addBrighterBackgroundStars(context, size) {
  // Very dense star field
  const starCount = Math.floor(size * size / 50);
  
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
  // Medium density star layer
  const starCount = Math.floor(size * size / 300);
  
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
  // Brighter stars - increased number
  const brightStarCount = Math.floor(size * size / 3000); 
  
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
  const mainGradient = context.createLinearGradient(0, centerY - bandWidth/2, 0, centerY + bandWidth/2);
  mainGradient.addColorStop(0, 'rgba(10, 20, 40, 0)');
  mainGradient.addColorStop(0.2, 'rgba(30, 40, 70, 0.2)'); // Brighter
  mainGradient.addColorStop(0.5, 'rgba(40, 50, 90, 0.3)'); // Brighter
  mainGradient.addColorStop(0.8, 'rgba(30, 40, 70, 0.2)'); // Brighter
  mainGradient.addColorStop(1, 'rgba(10, 20, 40, 0)');
  
  context.fillStyle = mainGradient;
  context.fillRect(0, centerY - bandWidth/2, size, bandWidth);
  
  // Secondary bands for more complexity
  const secondaryBandCount = 4;
  for (let i = 0; i < secondaryBandCount; i++) {
    const bandPosition = centerY + (Math.random() - 0.5) * bandWidth * 0.6;
    const bandThickness = size * (0.08 + Math.random() * 0.12);
    
    const secondaryGradient = context.createLinearGradient(0, bandPosition - bandThickness/2, 0, bandPosition + bandThickness/2);
    secondaryGradient.addColorStop(0, 'rgba(15, 25, 50, 0)');
    secondaryGradient.addColorStop(0.5, 'rgba(40, 60, 100, 0.25)'); // Brighter
    secondaryGradient.addColorStop(1, 'rgba(15, 25, 50, 0)');
    
    context.fillStyle = secondaryGradient;
    context.fillRect(0, bandPosition - bandThickness/2, size, bandThickness);
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
    const cloudX = size/2 + Math.cos(angle) * distance;
    const cloudY = size/2 + Math.sin(angle) * distance;
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
    cloudGradient.addColorStop(0.5, `hsla(${hue}, ${saturation-10}%, ${lightness-5}%, ${opacity*0.6})`);
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
    context.fillRect(x - width/2, size - height, width, height);
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

// Initialize scene elements in the correct order
function initializeScene() {
  console.log("Initializing scene elements...");
  
  // Create the HUD
  createHUD();
  console.log("HUD created");
  
  // Create the skybox first and make it globally accessible
  window.spaceSkybox = createSpaceSkybox();
  scene.add(window.spaceSkybox);
  console.log("Skybox added to scene");
  
  // Initialize meteor system
  window.meteorSystem = new MeteorSystem(5000, 25);
  console.log("Meteor system initialized");
  
  // Initialize the terrain system
  terrainSystem.init();
  console.log("Terrain system initialized");
  
  // Create the sun directional light
  sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(10, 100, 10);
  scene.add(sun);
  console.log("Sun light added to scene");
  
  // Create a visible sun sphere
  const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee66,
    transparent: true,
    opacity: 0.9
  });
  sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
  sunSphere.position.set(500, 300, -1000);
  scene.add(sunSphere);
  
  // Add a glow effect to the sun
  const sunGlowGeometry = new THREE.SphereGeometry(60, 32, 32);
  const sunGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
  sunSphere.add(sunGlow);
  
  console.log("Sun sphere added to scene");
  
  // Initialize sound system
  soundSystem.initialize();
  console.log("Sound system initialized");
  
  // Start the animation loop with timestamp - ONLY CALL THIS ONCE
  console.log("Starting animation loop");
  animate(0);
}

// Add a day/night toggle and cycle
let isDaytime = true;

function startDayNightCycle() {
  // Use a 1-minute cycle duration
  setInterval(() => {
    toggleDayNight();
  }, 30000); // 1 minute for each cycle
  
  // Add a manual toggle button for testing
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Toggle Day/Night';
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
    }
  });
  
  document.body.appendChild(toggleButton);
}

function toggleDayNight() {
  console.log(isDaytime)
  console.log("Toggling day/night");
  isDaytime = !isDaytime;
  updateSkyAppearance();
}

function updateSkyAppearance(transitionProgress = null) {
  console.log("Updating sky appearance");
  console.log(sunSphere);
  // Ensure sunSphere is defined before accessing it
  if (typeof sunSphere === 'undefined') {
    console.warn('sunSphere is not defined yet.');
    return;
  }
  
  // If we're not transitioning, use the current state
  const isDay = transitionProgress === null ? isDaytime : 
                (transitionStartState === 'day' ? 1 - transitionProgress : transitionProgress);
  
  // Create or update fog based on time of day
  const dayFog = new THREE.Fog(0xd09060, 200, 2000); // Dusty orange-tan fog
  const nightFog = new THREE.Fog(0xb77c5a, 500, 5000);
  
  if (transitionProgress === null) {
    // No transition, just set the fog directly
    scene.fog = isDaytime ? dayFog : nightFog;
  } else {
    // Interpolate fog color and near/far values
    const fogColor = new THREE.Color();
    fogColor.r = dayFog.color.r * isDay + nightFog.color.r * (1 - isDay);
    fogColor.g = dayFog.color.g * isDay + nightFog.color.g * (1 - isDay);
    fogColor.b = dayFog.color.b * isDay + nightFog.color.b * (1 - isDay);
    
    const fogNear = dayFog.near * isDay + nightFog.near * (1 - isDay);
    const fogFar = dayFog.far * isDay + nightFog.far * (1 - isDay);
    
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  }
  
  // Handle skybox and background
  if (transitionProgress !== null) {
    // During transition, create a blended sky texture
    if (isDay > 0.01 && isDay < 0.99) {
      // Create a blended sky texture during transition
      scene.background = createBlendedSkyTexture(isDay);
    }
  } else {
    // Not transitioning, use appropriate sky
    if (isDaytime) {
      scene.background = createMarsDaySkyTexture();
      
      // Remove night skybox if it exists
      if (scene.getObjectById(spaceSkybox.id)) {
        scene.remove(spaceSkybox);
      }
    } else {
      // Add night skybox if not already in scene
      if (!scene.getObjectById(spaceSkybox.id)) {
        scene.add(spaceSkybox);
      }
    }
  }
  
  // Adjust lighting based on time of day or transition progress
  const daySunIntensity = 0.9;
  const nightSunIntensity = 0.3;
  const dayAmbientIntensity = 0.7;
  const nightAmbientIntensity = 0.4;
  
  // Interpolate light intensities
  sunLight.intensity = daySunIntensity * isDay + nightSunIntensity * (1 - isDay);
  ambientLight.intensity = dayAmbientIntensity * isDay + nightAmbientIntensity * (1 - isDay);
  
  // Interpolate sun position
  const daySunPosition = new THREE.Vector3(10, 100, 10);
  const nightSunPosition = new THREE.Vector3(-10, -5, 10);
  sunLight.position.set(
    daySunPosition.x * isDay + nightSunPosition.x * (1 - isDay),
    daySunPosition.y * isDay + nightSunPosition.y * (1 - isDay),
    daySunPosition.z * isDay + nightSunPosition.z * (1 - isDay)
  );
  
  // Interpolate ambient light color
  const dayAmbientColor = new THREE.Color(0xff9966);
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
  }
  
  // Handle sun light visibility
  if (typeof sun !== 'undefined' && sun) {
    sun.visible = isDay > 0.1; // Keep visible until almost night
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
      
      // Remove skybox when fully transparent
      if (isDay >= 0.99) {
        scene.remove(spaceSkybox);
      }
    }
  }
}

// Start the day/night cycle
startDayNightCycle();

// Add a keypress handler for toggling
document.addEventListener('keydown', function(event) {
  if (event.key === 'l' || event.key === 'L') { // 'L' for Light cycle
    toggleDayNight();
  }
});

function createMarsDaySkyTexture() {
  const canvas = document.createElement('canvas');
  const canvasSize = 2048;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  
  // Create gradient from horizon to zenith
  const gradient = context.createLinearGradient(0, canvasSize, 0, 0);
  gradient.addColorStop(0, '#c27e54'); // Dusty orange-brown at horizon
  gradient.addColorStop(0.5, '#d7a28b'); // Pinkish in middle
  gradient.addColorStop(1, '#e6b499'); // Lighter at zenith
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasSize, canvasSize);
  
  // Add atmospheric haze/dust
  context.fillStyle = 'rgba(210, 170, 130, 0.2)';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvasSize;
    const y = Math.random() * canvasSize * 0.6 + canvasSize * 0.4; // More dust near horizon
    const size = Math.random() * 100 + 50;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  
  // Add subtle clouds
  context.fillStyle = 'rgba(230, 200, 180, 0.15)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * canvasSize;
    const y = Math.random() * canvasSize * 0.3 + canvasSize * 0.2; // Clouds in middle of sky
    const width = Math.random() * 300 + 200;
    const height = Math.random() * 100 + 50;
    
    // Draw cloud as a series of circles for a fluffy appearance
    for (let j = 0; j < 8; j++) {
      const cloudX = x + (Math.random() - 0.5) * width * 0.8;
      const cloudY = y + (Math.random() - 0.5) * height * 0.8;
      const cloudSize = Math.random() * 80 + 40;
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

// Run the initialization in the correct order
initializeScene();

// Initialize the camera mode toggle
document.addEventListener('keydown', function(event) {
  if (event.key === 'c' || event.key === 'C') {
    toggleCameraMode();
  }
});

// Resize Window
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function initializeCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    
    // Adjust initial camera position to be higher and further back
    camera.position.set(0, 15, 55); // Increased height and distance
    
    // Tilt the camera down slightly to see the rover and the skyline
    camera.rotation.x = -0.2; // Add a slight downward tilt
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 1.5; // Allow more upward view for the skyline
}

// Find where the Mars terrain material is defined and modify it
function createMarsEnvironment() {
    // ... existing code ...
    
    // If Mars terrain uses a MeshStandardMaterial or similar
    const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsTexture,
        normalMap: marsNormalMap,
        roughnessMap: marsRoughnessMap,
        // Reduce the color brightness by making it darker
        color: new THREE.Color(0xaa5533), // Darker reddish-brown
        // Reduce metalness if it's too reflective
        metalness: 0.3, 
        // Increase roughness to reduce specular highlights
        roughness: 1.5
    });
    
    // ... existing code ...
}

// Adjust lighting intensity
function setupLighting() {
    // ... existing code ...
    
    // Reduce the intensity of any sun/directional lights
    sunLight.intensity = 0.8; // Reduced from whatever value it was (typically 1.0)
    
    // If there's ambient light, reduce that too
    if (ambientLight) {
        ambientLight.intensity = 0.3; // Reduced ambient light
    }
    
    // ... existing code ...
}

// ===== MARS EXPLORER GAME =====
// Create a more visible game interface
window.MarsExplorer = {
  initialized: false,
  gameState: {
    score: 0,
    fuel: 100,
    samplesCollected: 0,
    missionComplete: false,
    gameOver: false,
    gameStarted: false
  },
  controls: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 0,
    rotationSpeed: 0,
    maxSpeed: 0.3,
    acceleration: 0.01,
    deceleration: 0.005,
    maxRotationSpeed: 0.03
  },
  rover: null,
  wheels: [],
  samples: [],
  hudElements: null,
  
  // Initialize the game
  init: function() {
    console.log("Initializing Mars Explorer game...");
    
    // Create start screen
    this.createStartScreen();
    
    // Set up key listeners
    this.setupControls();
    
    // Create game objects
    this.createRover();
    this.createSamples(10);
    this.createHUD();
    
    // Start game loop
    this.initialized = true;
    this.gameLoop();
    
    console.log("Mars Explorer initialized with", this.samples.length, "samples");
  },
  
  // Create start screen with instructions
  createStartScreen: function() {
    const startScreen = document.createElement('div');
    startScreen.id = 'mars-explorer-start';
    startScreen.style.position = 'absolute';
    startScreen.style.top = '0';
    startScreen.style.left = '0';
    startScreen.style.width = '100%';
    startScreen.style.height = '100%';
    startScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    startScreen.style.color = 'white';
    startScreen.style.display = 'flex';
    startScreen.style.flexDirection = 'column';
    startScreen.style.justifyContent = 'center';
    startScreen.style.alignItems = 'center';
    startScreen.style.zIndex = '1000';
    startScreen.style.fontFamily = 'Arial, sans-serif';
    
    const title = document.createElement('h1');
    title.textContent = 'MARS EXPLORER';
    title.style.fontSize = '48px';
    title.style.marginBottom = '20px';
    title.style.color = '#ff6b35';
    startScreen.appendChild(title);
    
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <p style="font-size: 24px; margin-bottom: 30px;">Explore Mars and collect all samples before your fuel runs out!</p>
      <div style="background-color: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <h2 style="margin-top: 0;">CONTROLS:</h2>
        <p><strong>W</strong> - Move Forward</p>
        <p><strong>S</strong> - Move Backward</p>
        <p><strong>A</strong> - Turn Left</p>
        <p><strong>D</strong> - Turn Right</p>
        <p><strong>R</strong> - Restart Game</p>
      </div>
    `;
    startScreen.appendChild(instructions);
    
    const startButton = document.createElement('button');
    startButton.textContent = 'START MISSION';
    startButton.style.padding = '15px 30px';
    startButton.style.fontSize = '24px';
    startButton.style.backgroundColor = '#22ffaa';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.onclick = () => {
      startScreen.style.display = 'none';
      this.gameState.gameStarted = true;
    };
    startScreen.appendChild(startButton);
    
    document.body.appendChild(startScreen);
    this.startScreen = startScreen;
  },
  
  // Set up keyboard controls
  setupControls: function() {
    const game = this;
    
    document.addEventListener('keydown', function(e) {
      if (!game.gameState.gameStarted) {
        if (e.key === 'Enter' || e.key === ' ') {
          game.startScreen.style.display = 'none';
          game.gameState.gameStarted = true;
        }
        return;
      }
      
      switch(e.key.toLowerCase()) {
        case 'w': game.controls.forward = true; break;
        case 's': game.controls.backward = true; break;
        case 'a': game.controls.left = true; break;
        case 'd': game.controls.right = true; break;
        case 'r': game.restartGame(); break;
      }
    });
    
    document.addEventListener('keyup', function(e) {
      switch(e.key.toLowerCase()) {
        case 'w': game.controls.forward = false; break;
        case 's': game.controls.backward = false; break;
        case 'a': game.controls.left = false; break;
        case 'd': game.controls.right = false; break;
      }
    });
  },
  
  // Create rover vehicle with more visible design
  createRover: function() {
    // Simple rover body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.7, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCCCCCC,
      emissive: 0x333333,
      emissiveIntensity: 0.2
    });
    const roverBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    roverBody.position.y = 1.2;
    
    // Create rover wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const wheels = [];
    const wheelPositions = [
      [-0.8, 0.5, 1],  // front left
      [0.8, 0.5, 1],   // front right
      [-0.8, 0.5, -1], // back left
      [0.8, 0.5, -1]   // back right
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(...pos);
      wheel.rotation.z = Math.PI / 2;
      roverBody.add(wheel);
      wheels.push(wheel);
    });
    
    // Add solar panel with glow
    const panelGeometry = new THREE.BoxGeometry(1.8, 0.1, 1.8);
    const panelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0055ff,
      emissive: 0x0033aa,
      emissiveIntensity: 0.5
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.y = 0.5;
    roverBody.add(panel);
    
    // Add antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1, -1);
    roverBody.add(antenna);
    
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 1
    });
    
    const headlightPositions = [[-0.6, 0.2, 1.5], [0.6, 0.2, 1.5]];
    headlightPositions.forEach(pos => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(...pos);
      headlight.scale.set(1, 0.7, 1);
      roverBody.add(headlight);
      
      // Add actual light source
      const light = new THREE.PointLight(0xffffaa, 1, 20);
      light.position.set(...pos);
      roverBody.add(light);
    });
    
    // Create full rover group
    const rover = new THREE.Group();
    rover.add(roverBody);
    
    // Set initial position
    rover.position.set(0, 2, 0);
    
    // Add to scene
    scene.add(rover);
    
    this.rover = rover;
    this.wheels = wheels;
  },
  
  // Create more visible collectible samples
  createSamples: function(count) {
    const terrainMeshes = [];
    
    // Find all mesh objects in the scene to check for terrain
    scene.traverse(object => {
      if (object.isMesh && object.geometry) {
        terrainMeshes.push(object);
      }
    });
    
    if (terrainMeshes.length === 0) {
      console.error("No terrain meshes found in scene");
      return;
    }
    
    // Use the first mesh as our terrain
    const terrainMesh = terrainMeshes[0];
    
    for (let i = 0; i < count; i++) {
      // Random position within terrain
      const x = (Math.random() * 2 - 1) * terrainSize * 0.7;
      const z = (Math.random() * 2 - 1) * terrainSize * 0.7;
      
      // Find height at this position
      const heightRay = new THREE.Raycaster(
        new THREE.Vector3(x, 100, z),
        new THREE.Vector3(0, -1, 0)
      );
      
      const intersects = heightRay.intersectObject(terrainMesh);
      
      if (intersects.length > 0) {
        const y = intersects[0].point.y + 1;
        
        // Create sample group
        const sampleGroup = new THREE.Group();
        sampleGroup.position.set(x, y, z);
        
        // Create glowing crystal
        const sampleGeometry = new THREE.OctahedronGeometry(0.5, 1);
        const sampleMaterial = new THREE.MeshStandardMaterial({
          color: 0x22ffaa,
          emissive: 0x22ffaa,
          emissiveIntensity: 1,
    transparent: true,
          opacity: 0.9
        });
        
        const sample = new THREE.Mesh(sampleGeometry, sampleMaterial);
        sampleGroup.add(sample);
        
        // Add point light
        const light = new THREE.PointLight(0x22ffaa, 1, 10);
        light.position.set(0, 0, 0);
        sampleGroup.add(light);
        
        // Add marker beam
        const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 20, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({
          color: 0x22ffaa,
          transparent: true,
          opacity: 0.3
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 10;
        sampleGroup.add(beam);
        
        // Add animation data
        sampleGroup.userData.rotSpeed = 0.01 + Math.random() * 0.01;
        sampleGroup.userData.floatSpeed = 0.005 + Math.random() * 0.005;
        sampleGroup.userData.floatHeight = 0.5;
        sampleGroup.userData.initialY = y;
        sampleGroup.userData.collected = false;
        
        scene.add(sampleGroup);
        this.samples.push(sampleGroup);
      }
    }
  },
  
  // Create improved HUD
  createHUD: function() {
    // Create HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'mars-explorer-hud';
    hudContainer.style.position = 'absolute';
    hudContainer.style.top = '20px';
    hudContainer.style.left = '20px';
    hudContainer.style.color = 'white';
    hudContainer.style.fontFamily = 'Arial, sans-serif';
    hudContainer.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
    hudContainer.style.userSelect = 'none';
    hudContainer.style.zIndex = '100';
    
    // Create fuel gauge
    const fuelContainer = document.createElement('div');
    fuelContainer.style.marginBottom = '15px';
    
    const fuelLabel = document.createElement('div');
    fuelLabel.textContent = 'FUEL';
    fuelLabel.style.fontSize = '16px';
    fuelLabel.style.marginBottom = '5px';
    fuelContainer.appendChild(fuelLabel);
    
    const fuelBarContainer = document.createElement('div');
    fuelBarContainer.style.width = '200px';
    fuelBarContainer.style.height = '20px';
    fuelBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fuelBarContainer.style.border = '2px solid white';
    fuelBarContainer.style.borderRadius = '10px';
    fuelBarContainer.style.overflow = 'hidden';
    
    const fuelBar = document.createElement('div');
    fuelBar.style.width = '100%';
    fuelBar.style.height = '100%';
    fuelBar.style.backgroundColor = '#22ffaa';
    fuelBar.style.transition = 'width 0.3s';
    
    fuelBarContainer.appendChild(fuelBar);
    fuelContainer.appendChild(fuelBarContainer);
    hudContainer.appendChild(fuelContainer);
    
    // Create samples counter
    const samplesContainer = document.createElement('div');
    samplesContainer.style.marginBottom = '15px';
    
    const samplesLabel = document.createElement('div');
    samplesLabel.textContent = 'SAMPLES';
    samplesLabel.style.fontSize = '16px';
    samplesLabel.style.marginBottom = '5px';
    samplesContainer.appendChild(samplesLabel);
    
    const samplesCounter = document.createElement('div');
    samplesCounter.style.fontSize = '24px';
    samplesCounter.style.fontWeight = 'bold';
    samplesContainer.appendChild(samplesCounter);
    
    hudContainer.appendChild(samplesContainer);
    
    // Create message area
    const messageArea = document.createElement('div');
    messageArea.style.fontSize = '24px';
    messageArea.style.fontWeight = 'bold';
    messageArea.style.color = '#22ffaa';
    messageArea.style.marginTop = '20px';
    messageArea.style.padding = '10px';
    messageArea.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    messageArea.style.borderRadius = '5px';
    messageArea.style.display = 'none';
    hudContainer.appendChild(messageArea);
    
    document.body.appendChild(hudContainer);
    
    this.hudElements = {
      container: hudContainer,
      fuelBar: fuelBar,
      samplesCounter: samplesCounter,
      messageArea: messageArea,
      
      updateHUD: () => {
        // Update fuel bar
        fuelBar.style.width = this.gameState.fuel + '%';
        
        // Change color based on fuel level
        if (this.gameState.fuel > 60) {
          fuelBar.style.backgroundColor = '#22ffaa';
        } else if (this.gameState.fuel > 30) {
          fuelBar.style.backgroundColor = '#ffaa22';
        } else {
          fuelBar.style.backgroundColor = '#ff4422';
        }
        
        // Update samples counter
        samplesCounter.textContent = this.gameState.samplesCollected + ' / ' + this.samples.length;
        
        // Show messages
        if (this.gameState.missionComplete) {
          messageArea.textContent = 'MISSION COMPLETE! Press R to restart';
          messageArea.style.display = 'block';
          messageArea.style.backgroundColor = 'rgba(34, 255, 170, 0.5)';
        } else if (this.gameState.gameOver) {
          messageArea.textContent = 'OUT OF FUEL! Press R to restart';
          messageArea.style.display = 'block';
          messageArea.style.backgroundColor = 'rgba(255, 68, 34, 0.5)';
        } else {
          messageArea.style.display = 'none';
        }
      }
    };
    
    // Initial update
    this.hudElements.updateHUD();
  },
  
  // Update game state
  update: function() {
    if (!this.initialized || !this.gameState.gameStarted) return;
    if (this.gameState.gameOver || this.gameState.missionComplete) return;
    
    // Update speed based on controls
    if (this.controls.forward) {
      this.controls.speed = Math.min(this.controls.speed + this.controls.acceleration, 
                                 this.controls.maxSpeed);
      this.gameState.fuel -= 0.05;
    } else if (this.controls.backward) {
      this.controls.speed = Math.max(this.controls.speed - this.controls.acceleration, 
                                -this.controls.maxSpeed);
      this.gameState.fuel -= 0.05;
    } else {
      // Apply deceleration
      if (this.controls.speed > 0) {
        this.controls.speed = Math.max(0, this.controls.speed - this.controls.deceleration);
      } else if (this.controls.speed < 0) {
        this.controls.speed = Math.min(0, this.controls.speed + this.controls.deceleration);
      }
    }
    
    // Update rotation based on controls
    if (this.controls.left) {
      this.controls.rotationSpeed = Math.min(this.controls.rotationSpeed + this.controls.acceleration * 0.5, 
                                        this.controls.maxRotationSpeed);
      this.gameState.fuel -= 0.01;
    } else if (this.controls.right) {
      this.controls.rotationSpeed = Math.max(this.controls.rotationSpeed - this.controls.acceleration * 0.5, 
                                       -this.controls.maxRotationSpeed);
      this.gameState.fuel -= 0.01;
    } else {
      // Gradually reduce rotation
      if (this.controls.rotationSpeed > 0) {
        this.controls.rotationSpeed = Math.max(0, this.controls.rotationSpeed - this.controls.deceleration * 0.5);
      } else if (this.controls.rotationSpeed < 0) {
        this.controls.rotationSpeed = Math.min(0, this.controls.rotationSpeed + this.controls.deceleration * 0.5);
      }
    }
    
    // Apply rotation
    this.rover.rotation.y += this.controls.rotationSpeed;
    
    // Calculate movement direction based on rover's orientation
    const direction = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), 
                                                               this.rover.rotation.y);
    
    // Move rover
    this.rover.position.x += direction.x * this.controls.speed;
    this.rover.position.z += direction.z * this.controls.speed;
    
    // Animate wheels
    this.wheels.forEach(wheel => {
      wheel.rotation.x += this.controls.speed * 0.3;
    });
    
    // Find terrain mesh
    let terrainMesh = null;
    scene.traverse(object => {
      if (!terrainMesh && object.isMesh && object.geometry) {
        terrainMesh = object;
      }
    });
    
    if (terrainMesh) {
      // Raycasting for height adjustment
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(this.rover.position.x, 100, this.rover.position.z),
        new THREE.Vector3(0, -1, 0)
      );
      
      const intersects = raycaster.intersectObject(terrainMesh);
      if (intersects.length > 0) {
        this.rover.position.y = intersects[0].point.y + 1.2;
        
        // Add tire tracks if moving
        if (Math.abs(this.controls.speed) > 0.01) {
          try {
            // Try to call addTireTrack if it exists
            if (typeof addTireTrack === 'function') {
              const wheelSpacing = 1.6;
              addTireTrack(
                this.rover.position.x - (direction.z * wheelSpacing/2),
                this.rover.position.z + (direction.x * wheelSpacing/2),
                1, 0.2
              );
              addTireTrack(
                this.rover.position.x + (direction.z * wheelSpacing/2),
                this.rover.position.z - (direction.x * wheelSpacing/2),
                1, 0.2
              );
            }
          } catch (e) {
            // Ignore errors if function doesn't exist
          }
        }
      }
    }
    
    // Check for sample collection
    this.samples.forEach(sample => {
      if (!sample.userData.collected) {
        const distance = this.rover.position.distanceTo(sample.position);
        if (distance < 2) {
          sample.userData.collected = true;
          sample.visible = false;
          this.gameState.samplesCollected++;
          
          // Play collection sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/03/22/sfx-2019-03-22-18-50-42-371.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log("Audio play failed:", e));
          } catch (e) {
            console.log("Audio play failed:", e);
          }
        }
      }
    });
    
    // Check for mission complete
    if (this.gameState.samplesCollected === this.samples.length && this.samples.length > 0) {
      this.gameState.missionComplete = true;
    }
    
    // Check for game over (out of fuel)
    if (this.gameState.fuel <= 0) {
      this.gameState.fuel = 0;
      this.gameState.gameOver = true;
    }
    
    // Update HUD
    this.hudElements.updateHUD();
    
    // Update camera to follow rover
    camera.position.x = this.rover.position.x - direction.x * 10;
    camera.position.z = this.rover.position.z - direction.z * 10;
    camera.position.y = this.rover.position.y + 5;
    camera.lookAt(this.rover.position);
  },
  
  // Animate samples
  animateSamples: function() {
    if (!this.initialized) return;
    
    this.samples.forEach(sample => {
      if (!sample.userData.collected) {
        sample.rotation.y += sample.userData.rotSpeed;
        sample.position.y = sample.userData.initialY + 
          Math.sin(Date.now() * sample.userData.floatSpeed) * sample.userData.floatHeight;
      }
    });
  },
  
  discoverPOI(poi) {
    poi.discovered = true;
    
    // Make marker visible
    if (poi.model) {
      poi.model.material.opacity = 0.6;
    }
    
    // Show discovery notification
    const notification = document.createElement('div');
    notification.className = 'mission-notification';
    notification.innerHTML = `<h3>New Discovery: ${poi.name}</h3>
                            <p>${poi.description}</p>`;
    notification.style.padding = '20px';
    notification.style.width = '300px';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 1000);
    }, 6000);
    
    // Add to discoveries list
    this.updateDiscoveriesList(poi);
  },
  
  updateDiscoveriesList(poi) {
    let discoveriesList = document.getElementById('discoveries-list');
    
    if (!discoveriesList) {
      // Create discoveries panel if it doesn't exist
      const panel = document.createElement('div');
      panel.id = 'discoveries-panel';
      panel.innerHTML = `
        <h3>Discoveries</h3>
        <ul id="discoveries-list"></ul>
      `;
      
      panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: rgba(20, 20, 30, 0.8);
        color: white;
        padding: 15px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        max-width: 250px;
      `;
      
      document.body.appendChild(panel);
      discoveriesList = document.getElementById('discoveries-list');
    }
    
    // Add discovery to list
    const listItem = document.createElement('li');
    listItem.textContent = poi.name;
    discoveriesList.appendChild(listItem);
  }
};

// Rover damage and obstacle system
const damageSystem = {
  maxHealth: 100,
  currentHealth: 100,
  repairRate: 0.01,
  
  // Create dangerous obstacles
  createObstacles() {
    this.obstacles = [];
    
    // Create sharp rocks that can damage the rover
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      
      const rockGeometry = new THREE.ConeGeometry(2, 4, 5);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x665544,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, 0, z);
      rock.rotation.x = Math.PI; // Point upward
      
      // Position on terrain
      const raycaster = new THREE.Raycaster();
      raycaster.set(
        new THREE.Vector3(x, 20, z),
        new THREE.Vector3(0, -1, 0)
      );
      
      const intersects = raycaster.intersectObject(marsSurface);
      if (intersects.length > 0) {
        rock.position.y = intersects[0].point.y;
      }
      
      scene.add(rock);
      
      this.obstacles.push({
        type: 'sharp_rock',
        position: {x, z},
        radius: 4,
        damage: 10,
        model: rock
      });
    }
    
    // Create sand pits that slow the rover
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      const radius = Math.random() * 15 + 10;
      
      const sandGeometry = new THREE.CircleGeometry(radius, 32);
      sandGeometry.rotateX(-Math.PI / 2);
      
      const sandMaterial = new THREE.MeshStandardMaterial({
        color: 0xddbb88,
        roughness: 1.0,
        metalness: 0.0
      });
      
      const sandPit = new THREE.Mesh(sandGeometry, sandMaterial);
      sandPit.position.set(x, 0.1, z);
      
      // Position on terrain
      const raycaster = new THREE.Raycaster();
      raycaster.set(
        new THREE.Vector3(x, 20, z),
        new THREE.Vector3(0, -1, 0)
      );
      
      const intersects = raycaster.intersectObject(marsSurface);
      if (intersects.length > 0) {
        sandPit.position.y = intersects[0].point.y + 0.1;
      }
      
      scene.add(sandPit);
      
      this.obstacles.push({
        type: 'sand_pit',
        position: {x, z},
        radius: radius,
        slowFactor: 0.3,
        model: sandPit
      });
    }
  },
  
  checkCollisions(roverPosition, delta) {
    let inSandPit = false;
    let speedModifier = 1.0;
    
    this.obstacles.forEach(obstacle => {
      const distance = Math.sqrt(
        Math.pow(roverPosition.x - obstacle.position.x, 2) +
        Math.pow(roverPosition.z - obstacle.position.z, 2)
      );
      
      if (distance < obstacle.radius) {
        if (obstacle.type === 'sharp_rock') {
          // Damage the rover when hitting rocks
          this.takeDamage(obstacle.damage * delta/1000);
          
          // Bounce effect
          const angle = Math.atan2(
            roverPosition.z - obstacle.position.z,
            roverPosition.x - obstacle.position.x
          );
          
          rover.position.x += Math.cos(angle) * 0.5;
          rover.position.z += Math.sin(angle) * 0.5;
          
          // Visual feedback
          if (obstacle.model) {
            obstacle.model.material.emissive.set(0xff0000);
            setTimeout(() => {
              obstacle.model.material.emissive.set(0x000000);
            }, 200);
          }
        }
        else if (obstacle.type === 'sand_pit') {
          // Slow down in sand
          inSandPit = true;
          speedModifier = Math.min(speedModifier, 1 - obstacle.slowFactor);
          
          // Sink effect - lower rover position slightly
          rover.position.y -= 0.05 * delta/16.67;
          
          // Visual feedback - ripple effect in sand
          if (!obstacle.rippleEffect) {
            createSandRipple(obstacle.position.x, obstacle.position.z);
            obstacle.rippleEffect = true;
            
            // Reset ripple effect after a delay
            setTimeout(() => {
              obstacle.rippleEffect = false;
            }, 2000);
          }
        }
      }
    });
    
    return {inSandPit, speedModifier};
  },
  
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    
    // Update UI
    this.updateHealthIndicator();
    
    // Check for critical damage
    if (this.currentHealth < 20) {
      document.getElementById('damage-warning').classList.add('flashing');
    }
    
    // Play damage sound
    if (amount > 1) {
      playSound('damage');
    }
    
    // Visual effect on rover
    if (amount > 5) {
      createDamageEffect();
    }
  },
  
  repair(delta) {
    // Auto-repair when not taking damage
    if (this.currentHealth < this.maxHealth) {
      this.currentHealth = Math.min(
        this.maxHealth, 
        this.currentHealth + this.repairRate * delta/16.67
      );
      this.updateHealthIndicator();
      
      // Remove warning when health improves
      if (this.currentHealth >= 20) {
        document.getElementById('damage-warning').classList.remove('flashing');
      }
    }
  },
  
  updateHealthIndicator() {
    const healthIndicator = document.getElementById('health-indicator');
    if (healthIndicator) {
      healthIndicator.style.width = `${this.currentHealth}%`;
      
      // Change color based on health level
      if (this.currentHealth < 30) {
        healthIndicator.style.backgroundColor = '#ff3333';
      } else if (this.currentHealth < 60) {
        healthIndicator.style.backgroundColor = '#ffaa33';
      } else {
        healthIndicator.style.backgroundColor = '#33cc33';
      }
    }
  }
};

// Sound effects system
const soundSystem = {
  sounds: {},
  youtubeAudio: null,
  
  initialize() {
    // Load sounds
    this.loadSound('engine', 'sounds/rover_engine.mp3', true);
    this.loadSound('damage', 'sounds/damage.mp3', false);
    this.loadSound('alert', 'sounds/alert.mp3', false);
    this.loadSound('collect', 'sounds/collect.mp3', false);
    this.loadSound('storm', 'sounds/dust_storm.mp3', true);
    this.loadSound('sand', 'sounds/sand.mp3', true);
    this.loadSound('discovery', 'sounds/discovery.mp3', false);
    
    // Create audio listeners
    const listener = new THREE.AudioListener();
    camera.add(listener);
    
    // Add ambient Martian wind
    this.loadAmbientSound('wind', 'sounds/mars_wind.mp3', listener);
  },
  
  loadSound(name, url, loop) {
    const audio = new Audio(url);
    audio.loop = loop;
    this.sounds[name] = audio;
  },
  
  loadAmbientSound(name, url, listener) {
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    audioLoader.load(url, function(buffer) {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.5);
      sound.play();
    });
    
    this.sounds[name] = sound;
  },
  
  loadYoutubeAudio(videoId, options = {}) {
    // Remove any existing YouTube player
    if (this.youtubeAudio) {
      const existingPlayer = document.getElementById('youtube-audio-player');
      if (existingPlayer) {
        existingPlayer.remove();
      }
    }
    
    // Create container for YouTube iframe
    const container = document.createElement('div');
    container.id = 'youtube-audio-container';
    container.style.position = 'absolute';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.color = 'white';
    
    // Create iframe for YouTube video (hidden visually but audio still plays)
    const iframe = document.createElement('iframe');
    iframe.id = 'youtube-audio-player';
    iframe.width = '1';
    iframe.height = '1';
    iframe.style.opacity = '0.01'; // Almost invisible but still functional
    iframe.style.pointerEvents = 'none'; // Prevent interaction with the iframe
    iframe.allow = 'autoplay'; // Allow autoplay
    
    // Set YouTube parameters
    const params = new URLSearchParams({
      enablejsapi: '1',
      autoplay: options.autoplay ? '1' : '0',
      loop: options.loop ? '1' : '0',
      playlist: options.loop ? videoId : '',
      controls: '0',
      showinfo: '0',
      modestbranding: '1',
      iv_load_policy: '3',
      rel: '0'
    });
    
    iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    
    // Create controls
    const controls = document.createElement('div');
    controls.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="youtube-play-pause" style="padding: 5px 10px;">Play</button>
        <div>
          <label for="youtube-volume">Volume:</label>
          <input type="range" id="youtube-volume" min="0" max="100" value="${options.volume || 50}" style="width: 100px;">
        </div>
        <div id="youtube-title" style="margin-left: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          YouTube Audio
        </div>
      </div>
    `;
    
    // Add elements to the DOM
    container.appendChild(iframe);
    container.appendChild(controls);
    document.body.appendChild(container);
    
    // Store reference to the YouTube player
    this.youtubeAudio = {
      iframe,
      videoId,
      player: null,
      isPlaying: options.autoplay || false
    };
    
    // Initialize YouTube API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        this._initializeYouTubePlayer();
      };
    } else {
      this._initializeYouTubePlayer();
    }
    
    // Set up event listeners for controls
    document.getElementById('youtube-play-pause').addEventListener('click', () => {
      this.toggleYoutubeAudio();
    });
    
    document.getElementById('youtube-volume').addEventListener('input', (e) => {
      if (this.youtubeAudio && this.youtubeAudio.player) {
        this.youtubeAudio.player.setVolume(parseInt(e.target.value));
      }
    });
    
    return this.youtubeAudio;
  },
  
  _initializeYouTubePlayer() {
    if (!this.youtubeAudio) return;
    
    this.youtubeAudio.player = new YT.Player('youtube-audio-player', {
      events: {
        'onReady': (event) => {
          // Set initial volume
          const volumeSlider = document.getElementById('youtube-volume');
          if (volumeSlider) {
            event.target.setVolume(parseInt(volumeSlider.value));
          }
          
          // Auto-play if specified
          if (this.youtubeAudio.isPlaying) {
            event.target.playVideo();
            document.getElementById('youtube-play-pause').textContent = 'Pause';
          }
          
          // Get video title
          const videoTitle = event.target.getVideoData().title;
          const titleElement = document.getElementById('youtube-title');
          if (titleElement && videoTitle) {
            titleElement.textContent = videoTitle;
          }
        },
        'onStateChange': (event) => {
          // Update play/pause button based on player state
          if (event.data === YT.PlayerState.PLAYING) {
            this.youtubeAudio.isPlaying = true;
            document.getElementById('youtube-play-pause').textContent = 'Pause';
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            this.youtubeAudio.isPlaying = false;
            document.getElementById('youtube-play-pause').textContent = 'Play';
          }
        }
      }
    });
  },
  
  toggleYoutubeAudio() {
    if (!this.youtubeAudio || !this.youtubeAudio.player) return;
    
    if (this.youtubeAudio.isPlaying) {
      this.youtubeAudio.player.pauseVideo();
      this.youtubeAudio.isPlaying = false;
      document.getElementById('youtube-play-pause').textContent = 'Play';
    } else {
      this.youtubeAudio.player.playVideo();
      this.youtubeAudio.isPlaying = true;
      document.getElementById('youtube-play-pause').textContent = 'Pause';
    }
  },
  
  play(name) {
    if (this.sounds[name]) {
      // For non-loop sounds, play from beginning
      if (!this.sounds[name].loop) {
        this.sounds[name].currentTime = 0;
      }
      this.sounds[name].play();
    }
  },
  
  stop(name) {
    if (this.sounds[name]) {
      this.sounds[name].pause();
      if (!this.sounds[name].loop) {
        this.sounds[name].currentTime = 0;
      }
    }
  },
  
  updateEngine(speed, inSandPit) {
    // Engine sound changes with speed
    if (this.sounds.engine) {
      if (speed > 0) {
        if (this.sounds.engine.paused) {
          this.sounds.engine.play();
        }
        this.sounds.engine.volume = 0.3 + speed * 1.5;
        this.sounds.engine.playbackRate = 0.8 + speed * 2;
      } else {
        this.sounds.engine.pause();
      }
    }
    
    // Sand sound
    if (this.sounds.sand) {
      if (inSandPit) {
        if (this.sounds.sand.paused) {
          this.sounds.sand.play();
        }
      } else {
        this.sounds.sand.pause();
      }
    }
  }
};

// Make soundSystem globally accessible
window.soundSystem = soundSystem;

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
var sunSphere;

function createSunSphere() {
  // Create a glowing sun sphere
  const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee66,
    transparent: true,
    opacity: 0.9
  });
  sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
  sunSphere.position.set(500, 300, -1000);
  scene.add(sunSphere);
  
  // Add a glow effect
  const sunGlowGeometry = new THREE.SphereGeometry(60, 32, 32);
  const sunGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
  sunSphere.add(sunGlow);
  
  return sunSphere;
}

function initializeScene() {
  console.log("Initializing scene elements...");
  
  // Create the HUD
  createHUD();
  console.log("HUD created");
  
  // Create the skybox first and make it globally accessible
  window.spaceSkybox = createSpaceSkybox();
  scene.add(window.spaceSkybox);
  console.log("Skybox added to scene");
  
  // Initialize meteor system
  window.meteorSystem = new MeteorSystem(5000, 25);
  console.log("Meteor system initialized");
  
  // Initialize the terrain system
  terrainSystem.init();
  console.log("Terrain system initialized");
  
  // Create the sun directional light
  sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(10, 100, 10);
  scene.add(sun);
  console.log("Sun light added to scene");
  
  // Create a visible sun sphere
  const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee66,
    transparent: true,
    opacity: 0.9
  });
  sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
  sunSphere.position.set(500, 300, -1000);
  scene.add(sunSphere);
  
  // Add a glow effect to the sun
  const sunGlowGeometry = new THREE.SphereGeometry(60, 32, 32);
  const sunGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
  sunSphere.add(sunGlow);
  
  console.log("Sun sphere added to scene");
  
  // Initialize sound system
  soundSystem.initialize();
  console.log("Sound system initialized");
  
  // Start the animation loop with timestamp - ONLY CALL THIS ONCE
  console.log("Starting animation loop");
  animate(0);
}

function updateSkyAppearance(transitionProgress = null) {
  // Ensure sunSphere is defined before accessing it
  if (typeof sunSphere === 'undefined') {
    console.warn('sunSphere is not defined yet.');
    return;
  }
  
  // If we're not transitioning, use the current state
  const isDay = transitionProgress === null ? isDaytime : 
                (transitionStartState === 'day' ? 1 - transitionProgress : transitionProgress);
  
  // Create or update fog based on time of day
  const dayFog = new THREE.Fog(0xd09060, 200, 2000); // Dusty orange-tan fog
  const nightFog = new THREE.Fog(0xb77c5a, 500, 5000);
  
  if (transitionProgress === null) {
    // No transition, just set the fog directly
    scene.fog = isDaytime ? dayFog : nightFog;
  } else {
    // Interpolate fog color and near/far values
    const fogColor = new THREE.Color();
    fogColor.r = dayFog.color.r * isDay + nightFog.color.r * (1 - isDay);
    fogColor.g = dayFog.color.g * isDay + nightFog.color.g * (1 - isDay);
    fogColor.b = dayFog.color.b * isDay + nightFog.color.b * (1 - isDay);
    
    const fogNear = dayFog.near * isDay + nightFog.near * (1 - isDay);
    const fogFar = dayFog.far * isDay + nightFog.far * (1 - isDay);
    
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  }
  
  // Handle skybox and background
  if (transitionProgress !== null) {
    // During transition, create a blended sky texture
    if (isDay > 0.01 && isDay < 0.99) {
      // Create a blended sky texture during transition
      scene.background = createBlendedSkyTexture(isDay);
    }
  } else {
    // Not transitioning, use appropriate sky
    if (isDaytime) {
      scene.background = createMarsDaySkyTexture();
      
      // Remove night skybox if it exists
      if (scene.getObjectById(spaceSkybox.id)) {
        scene.remove(spaceSkybox);
      }
    } else {
      // Add night skybox if not already in scene
      if (!scene.getObjectById(spaceSkybox.id)) {
        scene.add(spaceSkybox);
      }
    }
  }
  
  // Adjust lighting based on time of day or transition progress
  const daySunIntensity = 0.9;
  const nightSunIntensity = 0.3;
  const dayAmbientIntensity = 0.7;
  const nightAmbientIntensity = 0.4;
  
  // Interpolate light intensities
  sunLight.intensity = daySunIntensity * isDay + nightSunIntensity * (1 - isDay);
  ambientLight.intensity = dayAmbientIntensity * isDay + nightAmbientIntensity * (1 - isDay);
  
  // Interpolate sun position
  const daySunPosition = new THREE.Vector3(10, 100, 10);
  const nightSunPosition = new THREE.Vector3(-10, -5, 10);
  sunLight.position.set(
    daySunPosition.x * isDay + nightSunPosition.x * (1 - isDay),
    daySunPosition.y * isDay + nightSunPosition.y * (1 - isDay),
    daySunPosition.z * isDay + nightSunPosition.z * (1 - isDay)
  );
  
  // Interpolate ambient light color
  const dayAmbientColor = new THREE.Color(0xff9966);
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
  }
  
  // Handle sun light visibility
  if (typeof sun !== 'undefined' && sun) {
    sun.visible = isDay > 0.1; // Keep visible until almost night
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
      
      // Remove skybox when fully transparent
      if (isDay >= 0.99) {
        scene.remove(spaceSkybox);
      }
    }
  }
}

function createMarsDaySkyTexture() {
  const canvas = document.createElement('canvas');
  const canvasSize = 2048;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  
  // Create gradient from horizon to zenith
  const gradient = context.createLinearGradient(0, canvasSize, 0, 0);
  gradient.addColorStop(0, '#c27e54'); // Dusty orange-brown at horizon
  gradient.addColorStop(0.5, '#d7a28b'); // Pinkish in middle
  gradient.addColorStop(1, '#e6b499'); // Lighter at zenith
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasSize, canvasSize);
  
  // Add atmospheric haze/dust
  context.fillStyle = 'rgba(210, 170, 130, 0.2)';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvasSize;
    const y = Math.random() * canvasSize * 0.6 + canvasSize * 0.4; // More dust near horizon
    const size = Math.random() * 100 + 50;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  
  // Add subtle clouds
  context.fillStyle = 'rgba(230, 200, 180, 0.15)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * canvasSize;
    const y = Math.random() * canvasSize * 0.3 + canvasSize * 0.2; // Clouds in middle of sky
    const width = Math.random() * 300 + 200;
    const height = Math.random() * 100 + 50;
    
    // Draw cloud as a series of circles for a fluffy appearance
    for (let j = 0; j < 8; j++) {
      const cloudX = x + (Math.random() - 0.5) * width * 0.8;
      const cloudY = y + (Math.random() - 0.5) * height * 0.8;
      const cloudSize = Math.random() * 80 + 40;
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

// Meteor System - Create shooting stars in the night sky
class MeteorSystem {
  constructor(skyRadius = 5000, count = 25) {
    this.skyRadius = skyRadius;
    this.meteors = [];
    this.meteorPool = [];
    this.maxMeteors = count;
    this.activeMeteors = 0;
    this.meteorProbability = 0.03; // Probability of a new meteor each frame
    
    // Create meteor textures
    this.createMeteorTextures();
    
    // Create the meteor pool
    this.createMeteorPool();
  }
  
  createMeteorTextures() {
    // Create a glow texture for the meteor head
    const glowSize = 64;
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
    gradient.addColorStop(0.3, 'rgba(255, 240, 220, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 220, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 220, 200, 0.0)');
    
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, glowSize, glowSize);
    
    this.glowTexture = new THREE.CanvasTexture(glowCanvas);
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
  
  activateMeteor() {
    // Find an inactive meteor from the pool
    for (let i = 0; i < this.meteorPool.length; i++) {
      const meteorGroup = this.meteorPool[i];
      
      if (!meteorGroup.userData.active) {
        // Randomize meteor properties
        const phi = Math.random() * Math.PI * 2; // Random angle around the sky
        const theta = Math.random() * Math.PI * 0.5; // Angle from zenith (top half of sky)
        
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
        meteorGroup.userData.speed = 50 + Math.random() * 250; // Random speed
        meteorGroup.userData.direction = direction;
        meteorGroup.userData.positions = [];
        meteorGroup.userData.positions.push(new THREE.Vector3(startX, startY, startZ));
        meteorGroup.userData.life = 0;
        meteorGroup.userData.maxLife = 1.5 + Math.random() * 2; // 1.5-3.5 seconds
        meteorGroup.userData.size = 0.5 + Math.random() * 2.5; // Random size
        
        // Set meteor color (white to yellow-orange)
        const colorHue = 30 + Math.random() * 20; // 30-50 (orange-yellow)
        const colorSaturation = 80 + Math.random() * 20; // 80-100%
        const colorLightness = 70 + Math.random() * 30; // 70-100%
        const meteorColor = new THREE.Color(`hsl(${colorHue}, ${colorSaturation}%, ${colorLightness}%)`);
        
        meteorGroup.userData.trail.material.color = meteorColor;
        
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
        
        // Scale the head based on meteor size
        const headSize = 5 + meteorGroup.userData.size * 10;
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
    // Try to activate a new meteor based on probability
    if (Math.random() < this.meteorProbability && this.activeMeteors < this.maxMeteors) {
      this.activateMeteor();
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
}

// Create a single spherical texture for the dome-like skybox