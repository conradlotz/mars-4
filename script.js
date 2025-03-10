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

// Modify the animate function to use the separate yaw tracking and implement performance optimizations
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

  // Rover Movement
  isMoving = false;
  let wheelRotationSpeed = 0;
  
  // Store previous position for collision detection
  const previousPosition = {
    x: rover.position.x,
    z: rover.position.z
  };
  
  // Movement calculations
  if (keys.w || keys.s) {
    const direction = keys.w ? -1 : 1;
    
    // Calculate new position
    const newX = rover.position.x + Math.sin(roverYaw) * speed * direction;
    const newZ = rover.position.z + Math.cos(roverYaw) * speed * direction;
    
    // Apply movement
    rover.position.x = newX;
    rover.position.z = newZ;
    
    isMoving = true;
    wheelRotationSpeed = keys.w ? -0.1 : 0.1;
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
      updateWheelRotation(wheels, wheelRotationSpeed, turnDirection);
    }
  } else if (isMoving) {
    // Straight movement, all wheels rotate at the same speed
    // Only update every other frame for performance
    if (frameCount % 2 === 0) {
      wheels.forEach(wheel => {
        wheel.rotation.x += wheelRotationSpeed;
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
  hudElement.innerHTML = 'Camera: Third Person Mode (Press C to change)';
  document.body.appendChild(hudElement);
  
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
  const terrainSize = 500; // Increased size for more exploration area
  const resolution = 512; // Higher resolution for more detail
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, resolution, resolution);
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
  
  const material = new THREE.MeshStandardMaterial({
    map: marsTexture,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide,
    displacementMap: null, // We're using vertex displacement instead
    displacementScale: 0
  });
  
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  
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
  
  // Use a sphere instead of a cube for a dome-like appearance without corners
  // Increased size for proper placement but lower segments for performance
  const skyboxGeometry = new THREE.SphereGeometry(4000, 64, 64);
  
  // Create a single material for the entire skybox sphere
  const texture = createSphericalSkyTexture();
  
  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: false,
    transparent: true,
    opacity: 1.0
  });
  
  // Create the skybox mesh
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  
  // Ensure skybox is visible by explicitly setting these properties
  skybox.renderOrder = -1000; // Render before other objects
  skybox.frustumCulled = false; // Prevent frustum culling
  
  console.log("Skybox created successfully"); // Debug log
  
  return skybox;
}

// Create a single spherical texture for the dome-like skybox
function createSphericalSkyTexture() {
  // Create a new texture every time to avoid caching issues
  
  // Create a large canvas for the spherical map
  const canvas = document.createElement('canvas');
  const canvasSize = 4096; // High resolution for better quality
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  
  // Fill with dark but not completely black background
  context.fillStyle = '#010114'; // Very dark blue instead of pure black
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Make stars more visible by increasing their brightness and quantity
  addBrighterBackgroundStars(context, canvasSize);
  
  // Add a brighter Milky Way band
  addBrighterMilkyWay(context, canvasSize);
  
  // Add more prominent mid-layer stars
  addBrighterMidLayerStars(context, canvasSize);
  
  // Add atmospheric glow at the horizon
  addAtmosphericGlow(context, canvasSize);
  
  // Add more prominent foreground stars
  addBrighterForegroundStars(context, canvasSize);
  
  // Add a few planets - made slightly larger for visibility
  // Mars-like planet
  addPlanetToCanvas(context, canvasSize * 0.7, canvasSize * 0.3, canvasSize * 0.06, '#A67C52');
  
  // Earth-like planet
  addPlanetToCanvas(context, canvasSize * 0.2, canvasSize * 0.6, canvasSize * 0.05, '#C9E3F5');
  
  // Saturn-like planet with rings
  addPlanetToCanvas(context, canvasSize * 0.8, canvasSize * 0.8, canvasSize * 0.07, '#E0B568', true);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Set texture mapping for a sphere
  texture.mapping = THREE.EquirectangularReflectionMapping;
  
  console.log("Sky texture created successfully"); // Debug log
  
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
  
  // Initialize the terrain system
  terrainSystem.init();
  console.log("Terrain system initialized");
  
  // Start the animation loop with timestamp - ONLY CALL THIS ONCE
  console.log("Starting animation loop");
  animate(0);
}

// Add a day/night toggle and cycle
let isDaytime = false; // Start with night scene

function toggleDayNight() {
  isDaytime = !isDaytime;
  updateSkyAppearance();
}

function updateSkyAppearance() {
  if (isDaytime) {
    // Create Martian daytime sky
    scene.fog = new THREE.Fog(0xd09060, 200, 2000); // Dusty orange-tan fog
    scene.background = createMarsDaySkyTexture();
    // Adjust lighting
    sunLight.intensity = 0.9;
    sunLight.position.set(10, 100, 10); // Sun overhead
    ambientLight.intensity = 0.7;
    ambientLight.color.set(0xff9966); // Warm ambient light
  } else {
    // Revert to night sky
    scene.fog = new THREE.Fog(0xb77c5a, 500, 5000);
    // Restore night skybox
    scene.add(spaceSkybox);
    // Adjust lighting
    sunLight.intensity = 0.3;
    sunLight.position.set(-10, -5, 10); // Low sun angle
    ambientLight.intensity = 0.4;
    ambientLight.color.set(0xff8866);
  }
}

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
  addMarsDust(context, canvasSize);
  
  // Add sun
  addMarsSun(context, canvasSize);
  
  // Add Phobos and Deimos (Mars' moons)
  addMarsMoons(context, canvasSize);
  
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
        metalness: 0.1, 
        // Increase roughness to reduce specular highlights
        roughness: 0.9
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

// Mission system to provide goals and progression
const missionSystem = {
  missions: [
    {
      id: 'sample_collection',
      title: 'Collect Rock Samples',
      description: 'Collect 5 rock samples from different locations',
      objectives: [
        { location: { x: 50, z: 30 }, collected: false },
        { location: { x: -80, z: 60 }, collected: false },
        // ... more sample locations
      ],
      complete: false
    },
    {
      id: 'photograph_formation',
      title: 'Photograph Ancient River Bed',
      description: 'Take 3 photos of the dried river formations',
      // ... mission details
    }
    // ... more missions
  ],
  
  currentMission: 0,
  
  checkObjectiveProximity(roverPosition) {
    // Check if rover is near any objective
    const mission = this.missions[this.currentMission];
    mission.objectives.forEach(objective => {
      if (!objective.collected) {
        const distance = Math.sqrt(
          Math.pow(roverPosition.x - objective.location.x, 2) +
          Math.pow(roverPosition.z - objective.location.z, 2)
        );
        
        if (distance < 10) {
          objective.collected = true;
          this.showNotification(`Sample collected! (${this.getCompletedCount()}/${mission.objectives.length})`);
          
          // Create visual effect for collection
          createCollectionEffect(objective.location);
          
          // Check if mission complete
          if (this.getCompletedCount() === mission.objectives.length) {
            mission.complete = true;
            this.showNotification(`Mission Complete: ${mission.title}!`);
            
            // Advance to next mission if available
            if (this.currentMission < this.missions.length - 1) {
              setTimeout(() => {
                this.currentMission++;
                this.showNotification(`New Mission: ${this.missions[this.currentMission].title}`);
              }, 3000);
            }
          }
        }
      }
    });
  },
  
  getCompletedCount() {
    return this.missions[this.currentMission].objectives.filter(o => o.collected).length;
  },
  
  showNotification(message) {
    // Display message on HUD
    const notification = document.createElement('div');
    notification.className = 'mission-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 1000);
    }, 3000);
  }
};

// Power management system with solar charging
const powerSystem = {
  maxPower: 100,
  currentPower: 100,
  consumptionRate: 0.05,
  chargingRate: 0.03,
  
  update(delta, isDaytime, isMoving) {
    // Consume power when moving
    if (isMoving) {
      this.currentPower -= this.consumptionRate * delta/16.67;
    }
    
    // Charge when in sunlight and not fully charged
    if (isDaytime && this.currentPower < this.maxPower) {
      this.currentPower += this.chargingRate * delta/16.67;
    }
    
    // Cap power level
    this.currentPower = Math.max(0, Math.min(this.maxPower, this.currentPower));
    
    // Update UI
    this.updatePowerIndicator();
    
    // Check for power depletion
    if (this.currentPower <= 0) {
      this.triggerLowPowerMode();
    }
  },
  
  updatePowerIndicator() {
    const powerIndicator = document.getElementById('power-indicator');
    if (powerIndicator) {
      powerIndicator.style.width = `${this.currentPower}%`;
      
      // Change color based on level
      if (this.currentPower < 20) {
        powerIndicator.style.backgroundColor = '#ff3333';
      } else if (this.currentPower < 50) {
        powerIndicator.style.backgroundColor = '#ffaa33';
      } else {
        powerIndicator.style.backgroundColor = '#33cc33';
      }
    }
  },
  
  triggerLowPowerMode() {
    // Slow down movement and trigger warning
    speed = 0.05; // Reduced speed
    document.getElementById('power-warning').classList.add('flashing');
  }
};

// Create a rover dashboard UI
function createRoverDashboard() {
  // Create container
  const dashboard = document.createElement('div');
  dashboard.id = 'rover-dashboard';
  dashboard.innerHTML = `
    <div class="dash-section">
      <div class="dash-label">POWER</div>
      <div class="dash-gauge">
        <div id="power-indicator" class="gauge-fill"></div>
      </div>
      <div id="power-warning" class="warning-light">LOW POWER</div>
    </div>
    
    <div class="dash-section">
      <div class="dash-label">SPEED</div>
      <div id="speed-value">0.0 m/s</div>
    </div>
    
    <div class="dash-section">
      <div class="dash-label">COORDINATES</div>
      <div id="coords-display">X: 0.0 Z: 0.0</div>
    </div>
    
    <div class="dash-section">
      <div class="dash-label">MISSION</div>
      <div id="mission-objective">No Active Mission</div>
      <div id="mission-progress">0/0</div>
    </div>
    
    <div class="dash-section">
      <div class="dash-label">TEMPERATURE</div>
      <div id="temp-value">-60°C</div>
      <div class="temp-indicator"></div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #rover-dashboard {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 120px;
      background-color: rgba(20, 20, 30, 0.8);
      border: 2px solid #555;
      border-radius: 10px;
      color: #eee;
      font-family: 'Courier New', monospace;
      display: flex;
      padding: 10px;
      z-index: 1000;
    }
    
    .dash-section {
      flex: 1;
      padding: 0 10px;
      border-right: 1px solid #555;
    }
    
    .dash-section:last-child {
      border-right: none;
    }
    
    .dash-label {
      font-size: 14px;
      color: #aaa;
      margin-bottom: 5px;
    }
    
    .dash-gauge {
      height: 15px;
      background-color: #333;
      border-radius: 7px;
      overflow: hidden;
      margin: 5px 0;
    }
    
    .gauge-fill {
      height: 100%;
      width: 100%;
      background-color: #33cc33;
      transition: width 0.3s, background-color 0.3s;
    }
    
    .warning-light {
      color: #ff3333;
      font-weight: bold;
      opacity: 0;
    }
    
    .warning-light.flashing {
      animation: flash 1s infinite;
    }
    
    @keyframes flash {
      0%, 100% { opacity: 0; }
      50% { opacity: 1; }
    }
    
    .mission-notification {
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(30, 30, 40, 0.8);
      color: #fff;
      padding: 15px 30px;
      border-radius: 8px;
      font-family: 'Arial', sans-serif;
      font-size: 18px;
      z-index: 1001;
      transition: opacity 1s;
    }
    
    .mission-notification.fade-out {
      opacity: 0;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(dashboard);
}

// Weather system with dust storms
const weatherSystem = {
  currentWeather: 'clear',
  stormIntensity: 0,
  maxStormIntensity: 1.0,
  stormDuration: 0,
  stormProbability: 0.0005, // Chance per frame of storm starting
  
  // Create particle system for dust storms
  createStormParticles() {
    const particleCount = 2000;
    const stormGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Initialize particles in random positions around the camera
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sizes[i] = Math.random() * 2 + 1;
    }
    
    stormGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stormGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const stormMaterial = new THREE.PointsMaterial({
      color: 0xaa7755,
      size: 1.5,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    this.stormParticles = new THREE.Points(stormGeometry, stormMaterial);
    scene.add(this.stormParticles);
  },
  
  update(delta, roverPosition) {
    // Randomly start storms
    if (this.currentWeather === 'clear' && Math.random() < this.stormProbability) {
      this.startStorm();
    }
    
    // Update active storm
    if (this.currentWeather === 'storm') {
      this.updateStorm(delta, roverPosition);
    }
  },
  
  startStorm() {
    this.currentWeather = 'storm';
    this.stormIntensity = 0;
    this.stormDuration = Math.random() * 20000 + 10000; // 10-30 seconds
    
    // Notification
    const notification = document.createElement('div');
    notification.className = 'mission-notification';
    notification.textContent = 'WARNING: Dust storm approaching!';
    notification.style.backgroundColor = 'rgba(170, 80, 30, 0.8)';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 1000);
    }, 3000);
    
    // Affect visuals
    this.stormFog = new THREE.Fog(0xaa7744, 10, 50);
    this.originalFog = scene.fog;
  },
  
  updateStorm(delta, roverPosition) {
    // Update storm duration
    this.stormDuration -= delta;
    
    if (this.stormDuration <= 0) {
      this.endStorm();
      return;
    }
    
    // Ramp up and down intensity
    if (this.stormDuration > 15000) {
      // Building up
      this.stormIntensity = Math.min(this.maxStormIntensity, 
                           this.stormIntensity + 0.002 * delta/16.67);
    } else if (this.stormDuration < 5000) {
      // Winding down
      this.stormIntensity = Math.max(0, 
                           this.stormIntensity - 0.002 * delta/16.67);
    }
    
    // Apply visual effects
    if (this.stormParticles) {
      // Adjust particle opacity
      this.stormParticles.material.opacity = this.stormIntensity * 0.6;
      
      // Move particles across the scene
      const positions = this.stormParticles.geometry.attributes.position.array;
      const windSpeed = this.stormIntensity * 0.5;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += windSpeed * delta/16.67; // X movement
        positions[i+2] += (windSpeed * 0.5) * delta/16.67; // Z movement
        
        // Wrap particles around the rover
        if (positions[i] > roverPosition.x + 100) positions[i] = roverPosition.x - 100;
        if (positions[i+2] > roverPosition.z + 100) positions[i+2] = roverPosition.z - 100;
      }
      
      this.stormParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Adjust fog based on intensity
    scene.fog.near = Math.max(10, 200 * (1 - this.stormIntensity));
    scene.fog.far = Math.max(50, 2000 * (1 - this.stormIntensity));
    
    // Affect rover speed
    speed = 0.2 * (1 - this.stormIntensity * 0.7);
  },
  
  endStorm() {
    this.currentWeather = 'clear';
    this.stormIntensity = 0;
    
    // Reset fog
    scene.fog = this.originalFog;
    
    // Reset speed
    speed = 0.2;
    
    // Notification
    const notification = document.createElement('div');
    notification.className = 'mission-notification';
    notification.textContent = 'Dust storm subsiding';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 1000);
    }, 3000);
  }
};

// Points of interest system
const pointsOfInterest = {
  locations: [
    {
      id: 'ancient_riverbed',
      name: 'Ancient Riverbed',
      position: { x: 120, z: -80 },
      radius: 20,
      description: 'Evidence of flowing water from Mars\' ancient past.',
      discovered: false,
      model: null
    },
    {
      id: 'impact_crater',
      name: 'Meteorite Impact Site',
      position: { x: -200, z: 150 },
      radius: 30,
      description: 'A recent impact crater with exposed subsurface materials.',
      discovered: false,
      model: null
    },
    {
      id: 'cave_entrance',
      name: 'Lava Tube Cave',
      position: { x: 300, z: 200 },
      radius: 15,
      description: 'A natural cave formed by ancient lava flows.',
      discovered: false,
      model: null
    },
    // More POIs
  ],
  
  // Create visual markers for points of interest
  createMarkers() {
    this.locations.forEach(poi => {
      // Create a marker for each POI
      const markerGeometry = new THREE.CylinderGeometry(0.5, 5, 15, 8);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0x33bbff,
        transparent: true,
        opacity: 0,
        emissive: 0x3377ff,
        emissiveIntensity: 0.5
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(poi.position.x, 5, poi.position.z);
      
      // Add animation for the marker
      marker.userData.animationOffset = Math.random() * Math.PI * 2;
      marker.userData.poiId = poi.id;
      
      scene.add(marker);
      poi.model = marker;
      
      // Create a unique object for each POI
      this.createPOIObject(poi);
    });
  },
  
  createPOIObject(poi) {
    let object;
    
    switch(poi.id) {
      case 'ancient_riverbed':
        // Create a dried riverbed
        const riverGeometry = new THREE.PlaneGeometry(40, 15, 20, 10);
        // Apply undulating riverbed shape
        const positions = riverGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] = -0.5 - Math.sin(positions[i] * 0.1) * 0.3;
        }
        riverGeometry.rotateX(-Math.PI / 2);
        riverGeometry.translate(poi.position.x, 0, poi.position.z);
        
        const riverMaterial = new THREE.MeshStandardMaterial({
          color: 0x997766,
          roughness: 0.9,
          metalness: 0.1
        });
        
        object = new THREE.Mesh(riverGeometry, riverMaterial);
        break;
        
      case 'impact_crater':
        // Create a crater with scattered rocks
        const craterGeometry = new THREE.CircleGeometry(20, 32);
        craterGeometry.rotateX(-Math.PI / 2);
        
        // Create a depression
        const craterPositions = craterGeometry.attributes.position.array;
        for (let i = 0; i < craterPositions.length; i += 3) {
          const distFromCenter = Math.sqrt(
            craterPositions[i] * craterPositions[i] + 
            craterPositions[i+2] * craterPositions[i+2]
          );
          
          if (distFromCenter < 20) {
            // Create crater depression
            let depth;
            if (distFromCenter < 15) {
              depth = -3 * (1 - distFromCenter/15);
            } else {
              depth = -1 * (20 - distFromCenter) / 5;
            }
            craterPositions[i+1] = depth;
          }
        }
        
        craterGeometry.translate(poi.position.x, 0, poi.position.z);
        
        const craterMaterial = new THREE.MeshStandardMaterial({
          color: 0xaa8855,
          roughness: 0.8,
          metalness: 0.2
        });
        
        object = new THREE.Mesh(craterGeometry, craterMaterial);
        
        // Add scattered rocks
        for (let i = 0; i < 20; i++) {
          const rockSize = Math.random() * 2 + 0.5;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 25;
          const x = poi.position.x + Math.cos(angle) * distance;
          const z = poi.position.z + Math.sin(angle) * distance;
          
          const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
          const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x886644,
            roughness: 0.9
          });
          
          const rock = new THREE.Mesh(rockGeometry, rockMaterial);
          rock.position.set(x, 0, z);
          rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );
          
          scene.add(rock);
        }
        break;
        
      // More POI types...
    }
    
    if (object) {
      scene.add(object);
      poi.objectModel = object;
    }
  },
  
  update(time, roverPosition) {
    // Check for POI discovery
    this.locations.forEach(poi => {
      if (!poi.discovered) {
        const distance = Math.sqrt(
          Math.pow(roverPosition.x - poi.position.x, 2) +
          Math.pow(roverPosition.z - poi.position.z, 2)
        );
        
        if (distance < poi.radius) {
          this.discoverPOI(poi);
        }
      }
      
      // Animate markers
      if (poi.model) {
        if (poi.discovered) {
          poi.model.position.y = 5 + Math.sin(time * 0.001 + poi.model.userData.animationOffset) * 2;
          poi.model.rotation.y += 0.01;
        }
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
