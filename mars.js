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
    // Throttle updates based on time instead of frames for more consistent performance
    const now = performance.now();
    if (now - this.lastUpdateTime < 1000) return; // Only update once per second

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
  switch (cameraMode) {
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
    // Focus only on the city - removed rocket launch sites for simplicity
  }

  createSingleBase(x, z) {
    const baseGroup = new THREE.Group();
    baseGroup.position.set(x, 0, z);

    // Add base structures
    const structures = this.createBaseStructures();
    baseGroup.add(...structures);

    // Add atmospheric lighting
    const baseLight = new THREE.PointLight(0x88aaff, 1, 500);
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

    // Create a single impressive skyscraper city
    const cityLocation = { x: 1500, z: 1000 };
    const city = this.createSingleBase(cityLocation.x, cityLocation.z);
    this.marsBases.push(city);
    this.scene.add(city);

    // Add atmospheric effects around the city
    this.addCityAtmosphere(city);
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

  createBaseStructures() {
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
      
      const height = 300 + Math.random() * 200; // Vary heights
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
      { x: 1500, z: 1500 },
      { x: -2000, z: 1000 },
      { x: 1000, z: -1500 }
    ];

    siteLocations.forEach(loc => {
      const site = this.createLaunchSite(loc.x, loc.z);
      this.rocketLaunchSites.push(site);
      this.scene.add(site);
    });
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

  createRocket() {
    const rocketGroup = new THREE.Group();

    // Main body - stainless steel with metallic finish
    const bodyGeometry = new THREE.CylinderGeometry(10, 10, 150, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE8E8E8,
      metalness: 0.8,
      roughness: 0.2,
      envMapIntensity: 1.0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Nose section - slightly tapered
    const noseGeometry = new THREE.CylinderGeometry(7, 10, 30, 32);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.y = 90;

    // Black thermal protection band near bottom
    const heatShieldGeometry = new THREE.CylinderGeometry(10.1, 10.1, 40, 32);
    const heatShieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.3
    });
    const heatShield = new THREE.Mesh(heatShieldGeometry, heatShieldMaterial);
    heatShield.position.y = -40;

    // Upper flaps (smaller and more angular than previous version)
    const upperFlapGeometry = new THREE.BoxGeometry(20, 2, 10);
    const flapMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE8E8E8,
      metalness: 0.8,
      roughness: 0.2
    });

    // Two upper flaps
    const upperFlapLeft = new THREE.Mesh(upperFlapGeometry, flapMaterial);
    upperFlapLeft.position.set(-12, 60, 0);
    upperFlapLeft.rotation.z = -0.2;
    
    const upperFlapRight = new THREE.Mesh(upperFlapGeometry, flapMaterial);
    upperFlapRight.position.set(12, 60, 0);
    upperFlapRight.rotation.z = 0.2;

    // Lower flaps (slightly larger than upper)
    const lowerFlapGeometry = new THREE.BoxGeometry(25, 2, 12);
    
    const lowerFlapLeft = new THREE.Mesh(lowerFlapGeometry, flapMaterial);
    lowerFlapLeft.position.set(-14, -30, 0);
    lowerFlapLeft.rotation.z = 0.2;
    
    const lowerFlapRight = new THREE.Mesh(lowerFlapGeometry, flapMaterial);
    lowerFlapRight.position.set(14, -30, 0);
    lowerFlapRight.rotation.z = -0.2;

    // Engine section with Raptor engines
    const engineSection = new THREE.Group();
    const engineCount = 3; // Starship has 3 sea-level Raptor engines
    const engineRadius = 6;

    for (let i = 0; i < engineCount; i++) {
      const angle = (i / engineCount) * Math.PI * 2;
      
      // Engine bell
      const engineGeometry = new THREE.CylinderGeometry(2, 3, 8, 16);
      const engineMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.9,
        roughness: 0.3
      });
      const engine = new THREE.Mesh(engineGeometry, engineMaterial);
      
      engine.position.x = Math.cos(angle) * engineRadius;
      engine.position.z = Math.sin(angle) * engineRadius;
      engine.position.y = -78;
      
      // Add engine detail (injector plate)
      const injectorGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
      const injector = new THREE.Mesh(injectorGeometry, engineMaterial);
      injector.position.y = 4;
      engine.add(injector);
      
      engineSection.add(engine);
    }

    // Add surface details - grid pattern for tiles
    const gridSize = 5;
    const tileSize = 2;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const tileGeometry = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
        const tile = new THREE.Mesh(tileGeometry, heatShieldMaterial);
        tile.position.set(
          (i - gridSize/2) * (tileSize + 0.5),
          -20,
          (j - gridSize/2) * (tileSize + 0.5)
        );
        body.add(tile);
      }
    }

    // Add surface details - pipes and conduits
    const pipeCount = 8;
    for (let i = 0; i < pipeCount; i++) {
      const pipeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 40, 8);
      const pipe = new THREE.Mesh(pipeGeometry, bodyMaterial);
      pipe.position.y = -20;
      pipe.position.x = Math.cos(i * Math.PI / 4) * 9;
      pipe.position.z = Math.sin(i * Math.PI / 4) * 9;
      body.add(pipe);
    }

    // Combine all parts
    rocketGroup.add(body, nose, heatShield, upperFlapLeft, upperFlapRight, 
                    lowerFlapLeft, lowerFlapRight, engineSection);

    // Add subtle ambient occlusion to the entire rocket
    const aoMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.1
    });
    
    const aoGeometry = new THREE.CylinderGeometry(10.2, 10.2, 150, 32);
    const ao = new THREE.Mesh(aoGeometry, aoMaterial);
    rocketGroup.add(ao);

    return rocketGroup;
  }

  triggerRocketEvent(type, startPosition) {
    const rocket = this.createRocket();
    const startPos = startPosition || this.getRandomLaunchSite().position;
    rocket.position.copy(startPos);
  
    // Increase duration for slower launch/landing
    const duration = 10000; // 20 seconds for a more dramatic effect
  
    const event = {
      type: type,
      rocket: rocket,
      startTime: Date.now(),
      duration: duration,
      startPos: startPos.clone(),
      endPos: type === 'launch' ?
        startPos.clone().add(new THREE.Vector3(0, 1000, 0)) :
        startPos.clone(),
      engineParticles: this.createRocketEngineEffect(rocket)
    };
  
    this.scene.add(rocket);
    this.activeEvents.add(event);
  }
  
  createRocketEngineEffect(rocket) {
    // Create particle system for engine exhaust
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
  
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      // Position at rocket base
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -2; // Just below the rocket
      positions[i * 3 + 2] = 0;
  
      // Color gradient from white to orange to red
      const colorFactor = Math.random();
      colors[i * 3] = 1; // R
      colors[i * 3 + 1] = 0.5 + (colorFactor * 0.5); // G
      colors[i * 3 + 2] = colorFactor * 0.3; // B
  
      // Random sizes for variation
      sizes[i] = Math.random() * 2 + 1;
    }
  
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
    // Create shader material for better-looking particles
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
    particleSystem.position.y = -2; // Position at base of rocket
    rocket.add(particleSystem);
  
    // Add point light for engine glow
    const engineLight = new THREE.PointLight(0xff3300, 2, 10);
    engineLight.position.y = -2;
    rocket.add(engineLight);
  
    return {
      particles: particleSystem,
      light: engineLight,
      update: (progress) => {
        const positions = particleSystem.geometry.attributes.position.array;
        const time = Date.now() * 0.001;
  
        for (let i = 0; i < particleCount; i++) {
          // Create expanding cone shape for exhaust
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.5 * (1 - progress); // Cone gets wider as rocket rises
          const speed = Math.random() * 2 + 1;
  
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = -2 - (Math.random() * 4 * speed);
          positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
  
        particleSystem.geometry.attributes.position.needsUpdate = true;
        material.uniforms.time.value = time;
  
        // Pulse the engine light
        engineLight.intensity = 2 + Math.sin(time * 10) * 0.5;
      }
    };
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
    // Create multiple particle systems for more realistic effects
    const mainEngineParticles = this.createParticleSystem(2000, 0xff3300);
    const smokeParticles = this.createParticleSystem(1000, 0x888888);
    
    // Add multiple engine lights for better glow effect
    const engineLights = [
      new THREE.PointLight(0xff3300, 2, 20),
      new THREE.PointLight(0xff5500, 1.5, 30),
      new THREE.PointLight(0xff8800, 1, 40)
    ];
  
    engineLights.forEach(light => {
      light.position.y = -2;
      rocket.add(light);
    });
  
    return {
      particles: [mainEngineParticles, smokeParticles],
      lights: engineLights,
      update: (intensity, isWarmup = false) => {
        const positions = mainEngineParticles.geometry.attributes.position.array;
        const smokePositions = smokeParticles.geometry.attributes.position.array;
        const time = Date.now() * 0.001;
  
        // Update main engine particles
        for (let i = 0; i < positions.length; i += 3) {
          if (Math.random() > 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.5 * intensity;
            const speed = isWarmup ? 2 : (Math.random() * 4 + 2) * intensity;
  
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = -2 - (Math.random() * 8 * speed);
            positions[i + 2] = Math.sin(angle) * radius;
          }
        }
  
        // Update smoke particles
        for (let i = 0; i < smokePositions.length; i += 3) {
          if (Math.random() > 0.05) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2 * intensity;
            const speed = (Math.random() * 2 + 1) * intensity;
  
            smokePositions[i] = Math.cos(angle) * radius;
            smokePositions[i + 1] = -4 - (Math.random() * 12 * speed);
            smokePositions[i + 2] = Math.sin(angle) * radius;
          }
        }
  
        mainEngineParticles.geometry.attributes.position.needsUpdate = true;
        smokeParticles.geometry.attributes.position.needsUpdate = true;
  
        // Animate engine lights
        engineLights.forEach((light, index) => {
          const pulseSpeed = 10 + index * 5;
          light.intensity = (2 - index * 0.5) * intensity * 
            (1 + Math.sin(time * pulseSpeed) * 0.2);
        });
      }
    };
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

      const slowProgress = progress * 0.5; // Slow down the progress by half

      if (event.type === 'launch') {
        // Rocket launch animation
        event.rocket.position.lerp(event.endPos, slowProgress);
        event.rocket.rotation.z = Math.sin(slowProgress * Math.PI * 2) * 0.1;
      } else {
        // Rocket landing animation
        event.rocket.position.lerp(event.endPos, slowProgress);
        event.rocket.rotation.z = Math.sin(slowProgress * Math.PI * 2) * 0.1;
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

  // Modify the existing triggerRocketEvent method to include effects
  triggerRocketEvent(type, startPosition) {
    const rocket = this.createRocket();
    const startPos = startPosition || this.getRandomLaunchSite().position;
    rocket.position.copy(startPos);

    // Add rocket effects
    this.addRocketEffects(rocket, type);

    const event = {
      type: type,
      rocket: rocket,
      startTime: Date.now(),
      duration: 10000,
      startPos: startPos.clone(),
      endPos: type === 'launch' ?
        startPos.clone().add(new THREE.Vector3(0, 1000, 0)) :
        startPos.clone()
    };

    this.scene.add(rocket);
    this.activeEvents.add(event);

  }

  // Modify the updateActiveEvents method to include particle animation
  updateActiveEvents() {
    for (const event of this.activeEvents) {
      const progress = (Date.now() - event.startTime) / event.duration;

      if (progress >= 1) {
        this.scene.remove(event.rocket);
        this.activeEvents.delete(event);
        continue;
      }

      if (event.type === 'launch') {
        event.rocket.position.lerp(event.endPos, progress);
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
      } else {
        event.rocket.position.lerp(event.endPos, progress);
        event.rocket.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
      }

      // Animate particles
      if (event.rocket.userData.animateParticles) {
        event.rocket.userData.animateParticles();
      }
    }
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

// Modify the animate function
function animate(time) {
  requestAnimationFrame(animate);

  // Calculate delta time for consistent movement regardless of frame rate
  const delta = time - lastTime || 16.67; // Default to 60fps if lastTime is not set
  lastTime = time;

  // Skip frames if browser tab is inactive or delta is too large (indicating lag)
  if (delta > 100) return;

  frameCount++;

  // // Make the skybox follow the camera ONLY if it exists
  // if (window.spaceSkybox) {
  //   window.spaceSkybox.position.copy(camera.position);
  // }

  // // Update meteor system if it exists and we're in night mode
  if (window.meteorSystem && (!isDaytime || isTransitioning)) {
    window.meteorSystem.update(delta);
  }

  // Update Mars Scene Manager if it exists
  if (window.marsSceneManager && rover) {
    window.marsSceneManager.update(rover.position);
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

  // // Update Mars Scene Manager and its events
  // if (window.marsSceneManager) {
  //   console.log("Updating Mars Scene Manager");
  //   //window.marsSceneManager.update(rover.position);
  //   window.marsSceneManager.updateActiveEvents();
  // }
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

    // 4.5 Add occasional very high mountains (rare and random)
    const highMountainCount = 30; // Small number of high mountains
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
    const impactCraterCount = 25;
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
  //terrainSystem.init();
  console.log("Terrain system initialized");

  // Initialize Mars Scene Manager and make it globally accessible
  window.marsSceneManager = new MarsSceneManager(scene, 5000);
  console.log("Mars Scene Manager initialized");

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

  // // Initialize sound system
  // if (typeof soundSystem !== 'undefined') {
  //   soundSystem.initialize();
  //   console.log("Sound system initialized");
  // }

  // Initialize UI elements including realistic mode toggle
  initializeUI();
  console.log("UI elements initialized");
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

// Add a keypress handler for toggling
document.addEventListener('keydown', function (event) {
  if (event.key === 'l' || event.key === 'L') { // 'L' for Light cycle
    toggleDayNight();
  }
});

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
  const canvasSize = 2048;
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
  const size = 2048;
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
  const size = 2048;
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
  const size = 2048;
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

// Call forceDayMode after a short delay to ensure everything is initialized
setTimeout(() => {
  console.log("Auto-forcing day mode after initialization");
  forceDayMode();
}, 2000);

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

// Add a keypress handler for toggling
document.addEventListener('keydown', function (event) {
  if (event.key === 'l' || event.key === 'L') { // 'L' for Light cycle
    toggleDayNight();
  }
});