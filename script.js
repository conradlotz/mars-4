// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

// Performance-optimized renderer
const renderer = new THREE.WebGLRenderer({ 
  antialias: false, // Disable antialiasing for performance
  powerPreference: 'high-performance',
  precision: 'mediump' // Use medium precision for better performance
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // Disable shadows for performance
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Limit pixel ratio to 1
document.body.appendChild(renderer.domElement);

// Fog for distance culling - increased distance for smoother transitions
scene.fog = new THREE.Fog(0xb77c5a, 150, 400);

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
  const chassisGeometry = new THREE.BoxGeometry(2.4, 0.2, 3.2);
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

// Start the animation loop with timestamp
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

animate();

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
  // Use a sphere instead of a cube for a dome-like appearance without corners
  // Increased size and segments for better quality
  const skyboxGeometry = new THREE.SphereGeometry(2000, 96, 96);
  
  // Create a single material for the entire skybox sphere
  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: createSphericalSkyTexture(),
    side: THREE.BackSide,
    fog: false
  });
  
  // Create the skybox mesh
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  return skybox;
}

// Create a single spherical texture for the dome-like skybox
function createSphericalSkyTexture() {
  // Cache for texture to avoid regenerating it on every call
  if (window.cachedSkyboxTexture) {
    return window.cachedSkyboxTexture;
  }
  
  // Create a large canvas for the spherical map
  const canvas = document.createElement('canvas');
  const canvasSize = 4096; // High resolution for better quality
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  
  // Fill with deep space color - using a darker base for better contrast with stars
  context.fillStyle = '#000005'; // Almost black with slight blue tint
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add background stars across the entire sky - dense layer
  addBackgroundStarsLayer(context, canvasSize);
  
  // Add a prominent Milky Way band across the sky
  addMilkyWayToSphericalCanvas(context, canvasSize);
  
  // Add mid-layer stars that appear in front of distant nebulae but behind bright features
  addMidLayerStars(context, canvasSize);
  
  // Add atmospheric glow at the horizon
  addAtmosphericGlow(context, canvasSize);
  
  // Add foreground stars - brighter stars that appear in front of everything
  addForegroundStars(context, canvasSize);
  
  // Add a few planets
  // Mars-like planet
  addPlanetToCanvas(context, canvasSize * 0.7, canvasSize * 0.3, canvasSize * 0.03, '#A67C52');
  
  // Earth-like planet
  addPlanetToCanvas(context, canvasSize * 0.2, canvasSize * 0.6, canvasSize * 0.02, '#C9E3F5');
  
  // Saturn-like planet with rings
  addPlanetToCanvas(context, canvasSize * 0.8, canvasSize * 0.8, canvasSize * 0.04, '#E0B568', true);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Set texture mapping for a sphere
  texture.mapping = THREE.EquirectangularReflectionMapping;
  
  // Cache the texture
  window.cachedSkyboxTexture = texture;
  
  return texture;
}

// Add a dense background layer of stars
function addBackgroundStarsLayer(context, size) {
  // Extremely dense background star field - fills the entire sky
  const starCount = Math.floor(size * size / 100); // Much denser star field
  
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 0.8; // Smaller stars for background
    
    // Vary star colors slightly for more realism
    const colorVariation = Math.random();
    let starColor;
    
    if (colorVariation < 0.7) {
      // White to slightly blue stars (most common)
      const blueIntensity = 180 + Math.floor(Math.random() * 75);
      starColor = `rgba(220, 220, ${blueIntensity}, ${Math.random() * 0.3 + 0.2})`;
    } else if (colorVariation < 0.85) {
      // Slightly yellow/orange stars
      const redGreen = 180 + Math.floor(Math.random() * 75);
      starColor = `rgba(${redGreen}, ${redGreen - 20}, 150, ${Math.random() * 0.3 + 0.2})`;
    } else {
      // Slightly red stars (least common)
      starColor = `rgba(200, 150, 150, ${Math.random() * 0.3 + 0.2})`;
    }
    
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = starColor;
    context.fill();
  }
}

// Add mid-layer stars that appear between nebulae layers
function addMidLayerStars(context, size) {
  // Medium density star layer
  const starCount = Math.floor(size * size / 400);
  
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 1.2 + 0.3;
    
    // Vary star colors slightly for more realism
    const colorVariation = Math.random();
    let starColor;
    
    if (colorVariation < 0.7) {
      // White to slightly blue stars (most common)
      const blueIntensity = 220 + Math.floor(Math.random() * 35);
      starColor = `rgba(255, 255, ${blueIntensity}, ${Math.random() * 0.6 + 0.4})`;
    } else if (colorVariation < 0.85) {
      // Slightly yellow/orange stars
      const redGreen = 220 + Math.floor(Math.random() * 35);
      starColor = `rgba(${redGreen}, ${redGreen}, 180, ${Math.random() * 0.6 + 0.4})`;
    } else {
      // Slightly red stars (least common)
      starColor = `rgba(255, 200, 200, ${Math.random() * 0.6 + 0.4})`;
    }
    
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = starColor;
    context.fill();
  }
}

// Add foreground stars - the brightest stars with glow effects
function addForegroundStars(context, size) {
  // Add larger, brighter stars with glow
  const brightStarCount = Math.floor(size * size / 3000);
  for (let i = 0; i < brightStarCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 2.5 + 1.5;
    
    // Vary bright star colors for realism
    const colorVariation = Math.random();
    let coreColor, glowColor;
    
    if (colorVariation < 0.6) {
      // White/blue stars
      coreColor = 'rgba(255, 255, 255, 1)';
      glowColor = 'rgba(200, 220, 255, 0.8)';
    } else if (colorVariation < 0.85) {
      // Yellow/orange stars
      coreColor = 'rgba(255, 250, 220, 1)';
      glowColor = 'rgba(255, 240, 180, 0.8)';
    } else {
      // Red stars
      coreColor = 'rgba(255, 230, 230, 1)';
      glowColor = 'rgba(255, 180, 180, 0.8)';
    }
    
    // Create a radial gradient for the star glow
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 4);
    gradient.addColorStop(0, coreColor);
    gradient.addColorStop(0.5, glowColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.beginPath();
    context.arc(x, y, radius * 4, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    
    // Star core
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = coreColor;
    context.fill();
    
    // Add random diffraction spikes to some bright stars for realism
    if (Math.random() > 0.3) {
      const spikeLength = radius * (Math.random() * 6 + 6);
      context.strokeStyle = glowColor;
      context.lineWidth = Math.random() * 1.2 + 0.5;
      
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
      
      // Optional diagonal spikes for some stars
      if (Math.random() > 0.5) {
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

// Add a prominent Milky Way band to the spherical canvas
function addMilkyWayToSphericalCanvas(context, size) {
  // Create a wide, sweeping Milky Way band across the sky
  // The band will be positioned diagonally across the equirectangular map
  
  // Define the Milky Way path
  const centerY = size * 0.5;
  const bandWidth = size * 0.7; // Even wider band for more prominence
  const startY = centerY - bandWidth / 2;
  const endY = centerY + bandWidth / 2;
  
  // Draw the main band with a slight curve
  context.save();
  context.translate(size/2, size/2);
  context.rotate(Math.PI * 0.1); // Slight rotation
  context.translate(-size/2, -size/2);
  
  // Create a gradient for the main Milky Way band - brighter and more realistic
  const gradient = context.createLinearGradient(0, startY, 0, endY);
  gradient.addColorStop(0, 'rgba(30, 50, 100, 0)');
  gradient.addColorStop(0.2, 'rgba(70, 120, 200, 0.6)');
  gradient.addColorStop(0.5, 'rgba(180, 215, 255, 0.8)');
  gradient.addColorStop(0.8, 'rgba(70, 120, 200, 0.6)');
  gradient.addColorStop(1, 'rgba(30, 50, 100, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, startY, size, endY - startY);
  
  // Add a secondary band crossing the main one for a more realistic galaxy structure
  context.globalCompositeOperation = 'screen'; // Blend mode for additive light
  
  const secondaryGradient = context.createLinearGradient(startY, 0, endY, 0);
  secondaryGradient.addColorStop(0, 'rgba(30, 50, 100, 0)');
  secondaryGradient.addColorStop(0.2, 'rgba(70, 100, 180, 0.4)');
  secondaryGradient.addColorStop(0.5, 'rgba(140, 180, 255, 0.5)');
  secondaryGradient.addColorStop(0.8, 'rgba(70, 100, 180, 0.4)');
  secondaryGradient.addColorStop(1, 'rgba(30, 50, 100, 0)');
  
  context.fillStyle = secondaryGradient;
  context.fillRect(startY, 0, endY - startY, size);
  
  // Add tertiary bands for more structure
  const tertiaryBandCount = 5; // More bands for complexity
  for (let i = 0; i < tertiaryBandCount; i++) {
    const bandPosition = centerY + (Math.random() - 0.5) * bandWidth * 0.8;
    const bandThickness = size * (0.05 + Math.random() * 0.15);
    
    const tertiaryGradient = context.createLinearGradient(0, bandPosition - bandThickness/2, 0, bandPosition + bandThickness/2);
    tertiaryGradient.addColorStop(0, 'rgba(70, 100, 180, 0)');
    tertiaryGradient.addColorStop(0.5, 'rgba(140, 180, 255, 0.4)');
    tertiaryGradient.addColorStop(1, 'rgba(70, 100, 180, 0)');
    
    context.fillStyle = tertiaryGradient;
    context.fillRect(0, bandPosition - bandThickness/2, size, bandThickness);
  }
  
  // Reset blend mode
  context.globalCompositeOperation = 'source-over';
  
  // Add nebula-like clouds to the Milky Way
  const nebulaCount = 35; // Even more nebulae for a richer galaxy
  for (let i = 0; i < nebulaCount; i++) {
    // Position nebulae along the Milky Way band with some variation
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.45;
    const cloudX = size/2 + Math.cos(angle) * distance;
    const cloudY = size/2 + Math.sin(angle) * distance;
    const cloudRadius = Math.random() * size * 0.18 + size * 0.06;
    
    const cloudGradient = context.createRadialGradient(
      cloudX, cloudY, 0,
      cloudX, cloudY, cloudRadius
    );
    
    // More varied and vibrant nebula colors
    const colorType = Math.random();
    let hue, saturation, lightness;
    
    if (colorType < 0.35) {
      // Blue to purple nebulae
      hue = Math.floor(Math.random() * 60 + 200);
      saturation = 70 + Math.floor(Math.random() * 30);
      lightness = 55 + Math.floor(Math.random() * 20);
    } else if (colorType < 0.7) {
      // Red to orange nebulae
      hue = Math.floor(Math.random() * 30);
      saturation = 70 + Math.floor(Math.random() * 30);
      lightness = 55 + Math.floor(Math.random() * 20);
    } else if (colorType < 0.9) {
      // Teal to green nebulae
      hue = Math.floor(Math.random() * 40 + 160);
      saturation = 60 + Math.floor(Math.random() * 30);
      lightness = 50 + Math.floor(Math.random() * 20);
    } else {
      // Pink to magenta nebulae (rare)
      hue = Math.floor(Math.random() * 30 + 300);
      saturation = 70 + Math.floor(Math.random() * 30);
      lightness = 60 + Math.floor(Math.random() * 15);
    }
    
    // Use screen blend mode for some nebulae to create brighter overlaps
    if (Math.random() > 0.4) {
      context.globalCompositeOperation = 'screen';
    }
    
    cloudGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`);
    cloudGradient.addColorStop(0.5, `hsla(${hue}, ${saturation-15}%, ${lightness-10}%, 0.5)`);
    cloudGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    
    context.fillStyle = cloudGradient;
    context.beginPath();
    context.arc(cloudX, cloudY, cloudRadius, 0, Math.PI * 2);
    context.fill();
    
    // Reset blend mode
    context.globalCompositeOperation = 'source-over';
    
    // Add star clusters within nebulae
    const clusterStarCount = Math.floor(Math.random() * 50 + 40);
    for (let j = 0; j < clusterStarCount; j++) {
      // Position stars within the nebula
      const starAngle = Math.random() * Math.PI * 2;
      const starDistance = Math.random() * cloudRadius * 0.8;
      const starX = cloudX + Math.cos(starAngle) * starDistance;
      const starY = cloudY + Math.sin(starAngle) * starDistance;
      const starRadius = Math.random() * 1.8 + 0.6;
      
      // Brighter stars in the nebula
      context.beginPath();
      context.arc(starX, starY, starRadius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.4})`;
      context.fill();
    }
  }
  
  // Add a galactic core - bright central region
  context.globalCompositeOperation = 'screen'; // Use screen blend mode for brighter core
  
  const coreGradient = context.createRadialGradient(
    size * 0.6, size * 0.5, 0,
    size * 0.6, size * 0.5, size * 0.3
  );
  
  coreGradient.addColorStop(0, 'rgba(255, 245, 230, 0.8)');
  coreGradient.addColorStop(0.2, 'rgba(255, 230, 200, 0.6)');
  coreGradient.addColorStop(0.5, 'rgba(220, 180, 140, 0.4)');
  coreGradient.addColorStop(0.8, 'rgba(180, 140, 100, 0.2)');
  coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(size * 0.6, size * 0.5, size * 0.3, 0, Math.PI * 2);
  context.fill();
  
  // Add dense star field in the galactic core
  for (let i = 0; i < 500; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.25;
    const x = size * 0.6 + Math.cos(angle) * distance;
    const y = size * 0.5 + Math.sin(angle) * distance;
    const radius = Math.random() * 1.8 + 0.4;
    
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
    context.fill();
  }
  
  // Add bright central bulge
  const bulgeGradient = context.createRadialGradient(
    size * 0.6, size * 0.5, 0,
    size * 0.6, size * 0.5, size * 0.1
  );
  
  bulgeGradient.addColorStop(0, 'rgba(255, 250, 240, 0.9)');
  bulgeGradient.addColorStop(0.5, 'rgba(255, 240, 220, 0.7)');
  bulgeGradient.addColorStop(1, 'rgba(255, 230, 200, 0)');
  
  context.fillStyle = bulgeGradient;
  context.beginPath();
  context.arc(size * 0.6, size * 0.5, size * 0.1, 0, Math.PI * 2);
  context.fill();
  
  // Reset blend mode
  context.globalCompositeOperation = 'source-over';
  
  // Add dark dust lanes across the Milky Way
  for (let i = 0; i < 12; i++) {
    const laneY = centerY + (Math.random() - 0.5) * bandWidth * 0.8;
    const laneWidth = size * (0.05 + Math.random() * 0.15);
    const laneOpacity = Math.random() * 0.6 + 0.2;
    
    // Create curved dust lanes
    context.fillStyle = `rgba(0, 0, 0, ${laneOpacity})`;
    
    context.beginPath();
    context.moveTo(0, laneY - laneWidth/2);
    
    // Add some waviness to the dust lanes
    const segments = 10;
    for (let j = 1; j <= segments; j++) {
      const x = size * j / segments;
      const yOffset = Math.sin(j * 0.5) * laneWidth * (Math.random() * 0.5 + 0.5);
      context.lineTo(x, laneY - laneWidth/2 + yOffset);
    }
    
    for (let j = segments; j >= 0; j--) {
      const x = size * j / segments;
      const yOffset = Math.sin(j * 0.5) * laneWidth * (Math.random() * 0.3 + 0.3);
      context.lineTo(x, laneY + laneWidth/2 + yOffset);
    }
    
    context.closePath();
    context.fill();
  }
  
  context.restore();
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

// Create and add the space skybox with Milky Way and planets
const spaceSkybox = createSpaceSkybox();
scene.add(spaceSkybox);
