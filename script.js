// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Mars Surface Texture
// const textureLoader = new THREE.TextureLoader();
// // Using a reliable Mars texture from Three.js examples
// const marsTexture = textureLoader.load('https://threejs.org/examples/textures/planets/mars_1k_color.jpg');
// const marsBumpMap = textureLoader.load('https://threejs.org/examples/textures/planets/mars_1k_normal.jpg');

// // Make the texture repeat for a larger surface
// marsTexture.wrapS = THREE.RepeatWrapping;
// marsTexture.wrapT = THREE.RepeatWrapping;
// marsTexture.repeat.set(4, 4);
// marsBumpMap.wrapS = THREE.RepeatWrapping;
// marsBumpMap.wrapT = THREE.RepeatWrapping;
// marsBumpMap.repeat.set(4, 4);

// Replace the simple Mars surface with the realistic terrain
// const marsSurface = new THREE.Mesh(
//   new THREE.PlaneGeometry(200, 200, 32, 32),
//   new THREE.MeshStandardMaterial({ 
//     map: marsTexture,
//     bumpMap: marsBumpMap,
//     bumpScale: 0.5,
//     roughness: 0.8,
//     metalness: 0.2
//   })
// );
// marsSurface.rotation.x = -Math.PI / 2;
// marsSurface.receiveShadow = true;
// scene.add(marsSurface);

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

// Update this function to use raycasting for proper terrain following
function positionRoverOnTerrain() {
  // Create a raycaster to detect the height of the terrain at the rover's position
  const raycaster = new THREE.Raycaster();
  raycaster.ray.direction.set(0, -1, 0); // Cast ray downward
  
  // Position the ray origin above the rover's current position
  raycaster.ray.origin.set(rover.position.x, 20, rover.position.z);
  
  // Check for intersections with the terrain
  const intersects = raycaster.intersectObject(marsSurface);
  
  if (intersects.length > 0) {
    // Position the rover at the intersection point plus a smaller offset to be closer to ground
    rover.position.y = intersects[0].point.y + 1.5;
    
    // Optional: Align rover to terrain normal for slopes
    const normal = intersects[0].face.normal.clone();
    normal.transformDirection(marsSurface.matrixWorld);
    
    // Create a temporary up vector
    const up = new THREE.Vector3(0, 1, 0);
    
    // Calculate the angle between the normal and up vector
    const angle = up.angleTo(normal);
    
    // Reset the rover's rotation
    rover.rotation.set(0, 0, 0);
    
    // First apply the yaw rotation (this is tracked separately)
    rover.rotateY(roverYaw);
    
    // Then apply terrain tilt if needed
    if (angle > 0.05 && angle < Math.PI / 6) {
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

// Add a new function to implement wheel suspension with performance improvements
function updateWheelSuspension(wheels, originalWheelPositions) {
  // Only update suspension every few frames to improve performance
  if (frameCount % 3 !== 0) return; // Skip 2 out of 3 frames
  
  // Create raycasters for each wheel to detect terrain height
  wheels.forEach((wheel, index) => {
    // Get wheel position in world space
    const wheelPos = new THREE.Vector3();
    wheel.getWorldPosition(wheelPos);
    
    // Create raycaster pointing down from wheel
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.set(wheelPos.x, wheelPos.y + 1, wheelPos.z);
    raycaster.ray.direction.set(0, -1, 0);
    
    // Check for intersections with terrain
    const intersects = raycaster.intersectObject(marsSurface);
    
    if (intersects.length > 0) {
      // Calculate how much the wheel should move based on terrain height
      const terrainHeight = intersects[0].point.y;
      const wheelHeight = wheelPos.y;
      const desiredHeight = terrainHeight + 0.8; // Desired height above terrain
      
      // Calculate suspension compression (limited range)
      const compression = Math.max(-0.3, Math.min(0.3, desiredHeight - wheelHeight));
      
      // Apply suspension to wheel position (in local space) with smoother transition
      const currentY = wheel.position.y;
      const targetY = originalWheelPositions[index] + compression;
      wheel.position.y = currentY + (targetY - currentY) * 0.3; // Smooth transition
    } else {
      // If no terrain detected, reset to original position gradually
      const currentY = wheel.position.y;
      wheel.position.y = currentY + (originalWheelPositions[index] - currentY) * 0.3;
    }
  });
}

// Add a frame counter for performance optimization
let frameCount = 0;

// Modify the animate function to use the separate yaw tracking
function animate() {
  requestAnimationFrame(animate);
  frameCount++;

  // Rover Movement
  isMoving = false;
  let wheelRotationSpeed = 0;
  
  // Store previous position for collision detection
  const previousPosition = {
    x: rover.position.x,
    z: rover.position.z
  };
  
  if (keys.w) {
    // Use the tracked yaw for movement calculations
    rover.position.x -= Math.sin(roverYaw) * speed;
    rover.position.z -= Math.cos(roverYaw) * speed;
    isMoving = true;
    wheelRotationSpeed = -0.1; // Forward wheel rotation
  }
  
  if (keys.s) {
    // Use the tracked yaw for movement calculations
    rover.position.x += Math.sin(roverYaw) * speed;
    rover.position.z += Math.cos(roverYaw) * speed;
    isMoving = true;
    wheelRotationSpeed = 0.1; // Backward wheel rotation
  }
  
  // Basic collision detection - prevent going off the edge
  const surfaceSize = 100; // Half the size of our 200x200 plane
  if (Math.abs(rover.position.x) > surfaceSize || Math.abs(rover.position.z) > surfaceSize) {
    // Reset to previous position if going off the edge
    rover.position.x = previousPosition.x;
    rover.position.z = previousPosition.z;
    isMoving = false;
  }
  
  // Handle turning by updating the tracked yaw value
  if (keys.a) {
    roverYaw += rotationSpeed;
    
    // Differential wheel rotation for turning
    if (isMoving) {
      for (let i = 0; i < wheels.length; i += 2) {
        wheels[i].rotation.x += wheelRotationSpeed * 0.7; // Left wheels slower
      }
      for (let i = 1; i < wheels.length; i += 2) {
        wheels[i].rotation.x += wheelRotationSpeed * 1.3; // Right wheels faster
      }
    }
  } else if (keys.d) {
    roverYaw -= rotationSpeed;
    
    // Differential wheel rotation for turning
    if (isMoving) {
      for (let i = 0; i < wheels.length; i += 2) {
        wheels[i].rotation.x += wheelRotationSpeed * 1.3; // Left wheels faster
      }
      for (let i = 1; i < wheels.length; i += 2) {
        wheels[i].rotation.x += wheelRotationSpeed * 0.7; // Right wheels slower
      }
    }
  } else if (isMoving) {
    // Straight movement, all wheels rotate at the same speed
    wheels.forEach(wheel => {
      wheel.rotation.x += wheelRotationSpeed;
    });
  }
  
  // Position rover on terrain
  positionRoverOnTerrain();
  
  // Update wheel suspension for realistic terrain following
  updateWheelSuspension(wheels, originalWheelPositions);
  
  // Update camera position based on mode
  updateCamera();
  
  // Update dust particles - only when moving and every other frame
  if (isMoving && frameCount % 2 === 0) {
    dustParticles.update(rover.position, isMoving);
  }

  // Only update controls in orbit mode
  if (cameraMode === 'orbit') {
    controls.update();
  }
  
  renderer.render(scene, camera);
}

// Update the camera function to use the tracked yaw
function updateCamera() {
  switch(cameraMode) {
    case 'thirdPerson':
      // Calculate the desired camera position in third-person view
      const offset = cameraOffset.clone();
      
      // Rotate the offset based on the rover's yaw
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), roverYaw);
      
      // Add the offset to the rover's position
      const targetPosition = new THREE.Vector3(
        rover.position.x + offset.x,
        rover.position.y + offset.y,
        rover.position.z + offset.z
      );
      
      // Smoothly move the camera to the target position
      camera.position.lerp(targetPosition, 0.05);
      
      // Make the camera look at the rover
      camera.lookAt(
        rover.position.x,
        rover.position.y + 1.5,
        rover.position.z
      );
      break;
      
    case 'firstPerson':
      // Position the camera at the rover's "head"
      const headPosition = new THREE.Vector3(
        rover.position.x,
        rover.position.y + 2.5,
        rover.position.z
      );
      
      // Get the forward direction based on the tracked yaw
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), roverYaw);
      
      // Set camera position
      camera.position.copy(headPosition);
      
      // Look in the direction the rover is facing
      camera.lookAt(
        headPosition.x + forward.x * 10,
        headPosition.y,
        headPosition.z + forward.z * 10
      );
      break;
      
    case 'orbit':
      // In orbit mode, the OrbitControls handle the camera
      break;
  }
}

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

// Add a Martian sky with dramatic clouds like in the reference image
function createMartianSky() {
  // Create a large sphere for the sky
  const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
  // We need to flip the geometry inside out
  skyGeometry.scale(-1, 1, 1);
  
  // Create a dramatic Martian sky texture
  const skyTexture = createMartianSkyTexture();
  
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    fog: false
  });
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  return sky;
}

// Create a texture for the Martian sky with dramatic clouds
function createMartianSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  
  // Create gradient for the sky - deep red at horizon to darker at top
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#421b0b'); // Dark reddish-brown at top
  gradient.addColorStop(0.4, '#7a2e14'); // Mid reddish-brown
  gradient.addColorStop(0.7, '#c44d22'); // Brighter orange-red
  gradient.addColorStop(1, '#ff7744'); // Bright orange at horizon
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add a sun
  const sunX = canvas.width * 0.7; // Position sun on the right side
  const sunY = canvas.height * 0.9; // Near the horizon
  const sunRadius = canvas.height * 0.08;
  
  // Sun glow
  const sunGlow = context.createRadialGradient(
    sunX, sunY, 0,
    sunX, sunY, sunRadius * 4
  );
  sunGlow.addColorStop(0, 'rgba(255, 200, 150, 0.8)');
  sunGlow.addColorStop(0.5, 'rgba(255, 150, 100, 0.3)');
  sunGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
  
  context.fillStyle = sunGlow;
  context.beginPath();
  context.arc(sunX, sunY, sunRadius * 4, 0, Math.PI * 2);
  context.fill();
  
  // Sun itself
  const sunGradient = context.createRadialGradient(
    sunX, sunY, 0,
    sunX, sunY, sunRadius
  );
  sunGradient.addColorStop(0, '#ffffff');
  sunGradient.addColorStop(0.7, '#ffdd88');
  sunGradient.addColorStop(1, '#ff8844');
  
  context.fillStyle = sunGradient;
  context.beginPath();
  context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  context.fill();
  
  // Add dramatic clouds like in the reference image
  // These are the wispy, streaky clouds
  for (let i = 0; i < 20; i++) {
    const cloudX = Math.random() * canvas.width;
    const cloudY = Math.random() * canvas.height * 0.7; // Keep clouds in upper part
    const cloudWidth = Math.random() * 600 + 400;
    const cloudHeight = Math.random() * 100 + 50;
    const cloudRotation = Math.random() * Math.PI / 6 - Math.PI / 12;
    
    context.save();
    context.translate(cloudX, cloudY);
    context.rotate(cloudRotation);
    
    const cloudGradient = context.createLinearGradient(-cloudWidth/2, 0, cloudWidth/2, 0);
    cloudGradient.addColorStop(0, 'rgba(180, 100, 70, 0)');
    cloudGradient.addColorStop(0.2, 'rgba(180, 100, 70, 0.2)');
    cloudGradient.addColorStop(0.5, 'rgba(180, 100, 70, 0.3)');
    cloudGradient.addColorStop(0.8, 'rgba(180, 100, 70, 0.2)');
    cloudGradient.addColorStop(1, 'rgba(180, 100, 70, 0)');
    
    context.fillStyle = cloudGradient;
    context.beginPath();
    context.ellipse(0, 0, cloudWidth/2, cloudHeight/2, 0, 0, Math.PI * 2);
    context.fill();
    
    context.restore();
  }
  
  return new THREE.CanvasTexture(canvas);
}

// Create and add the Martian sky
const martianSky = createMartianSky();
scene.add(martianSky);
