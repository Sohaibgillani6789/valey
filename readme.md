create three.js shaders grass this is vertex file code 
    varying vec2 vUv;
    varying vec3 vColor;
    uniform float iTime;
    
    void main() {
      vUv = uv;
      vColor = color;
      vec3 cpos = position;
      
      float waveSize = 10.0;
      float tipDistance = 0.3;
      float centerDistance = 0.1;
      
      // Animate blade tips (white vertices)
      if (color.x > 0.6) {
        cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * tipDistance;
      }
      // Animate blade centers (gray vertices)
      else if (color.x > 0.0) {
        cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * centerDistance;
      }
      
      vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);
      gl_Position = mvPosition;
    }
  `,

  this is fragment code 
    uniform sampler2D textures[4];
    varying vec2 vUv;
    varying vec3 vColor;
    
    void main() {
      float contrast = 1.5;
      float brightness = 0.1;
      
      // Sample grass texture and apply contrast/brightness
      vec3 color = texture2D(textures[0], vUv).rgb * contrast;
      color = color + vec3(brightness, brightness, brightness);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
and thsi is index.js code 
// Load grass texture
const grassTexture = new THREE.TextureLoader().load('grass.jpg');

// Time uniform for animation
const startTime = Date.now();
const timeUniform = { type: 'f', value: 0.0 };

// Shader material
const grassUniforms = {
  textures: { value: [grassTexture] },
  iTime: timeUniform
};

const grassMaterial = new THREE.ShaderMaterial({
  uniforms: grassUniforms,
  vertexShader: grassShader.vert,
  fragmentShader: grassShader.frag,
  vertexColors: true,
  side: THREE.DoubleSide
});

// Generate grass field
generateField();

// Animation loop
function animate() {
  const elapsedTime = Date.now() - startTime;
  grassUniforms.iTime.value = elapsedTime;
  controls.update();
  window.requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
3. Grass Generation Functions
Add these helper functions to generate individual blades:
javascript// Grass parameters
const PLANE_SIZE = 30;
const BLADE_COUNT = 100000;
const BLADE_WIDTH = 0.1;
const BLADE_HEIGHT = 0.8;
const BLADE_HEIGHT_VARIATION = 0.6;

function convertRange(val, oldMin, oldMax, newMin, newMax) {
  return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}

function generateField() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const colors = [];

  for (let i = 0; i < BLADE_COUNT; i++) {
    const VERTEX_COUNT = 5;
    const radius = PLANE_SIZE / 2;
    
    // Random position in circular distribution
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    
    const pos = new THREE.Vector3(x, 0, y);
    
    const surfaceMin = PLANE_SIZE / 2 * -1;
    const surfaceMax = PLANE_SIZE / 2;
    const uv = [
      convertRange(pos.x, surfaceMin, surfaceMax, 0, 1),
      convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)
    ];

    const blade = generateBlade(pos, i * VERTEX_COUNT, uv);
    
    blade.verts.forEach(vert => {
      positions.push(...vert.pos);
      uvs.push(...vert.uv);
      colors.push(...vert.color);
    });
    
    blade.indices.forEach(indice => indices.push(indice));
  }

  // Create buffer geometry
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(geom, grassMaterial);
  scene.add(mesh);
}

function generateBlade(center, vArrOffset, uv) {
  const MID_WIDTH = BLADE_WIDTH * 0.5;
  const TIP_OFFSET = 0.1;
  const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);

  // Random blade orientation
  const yaw = Math.random() * Math.PI * 2;
  const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  
  const tipBend = Math.random() * Math.PI * 2;
  const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

  // Blade vertices: bottom left, bottom right, top left, top right, tip center
  const bl = new THREE.Vector3().addVectors(center, 
    new THREE.Vector3().copy(yawUnitVec).multiplyScalar(BLADE_WIDTH / 2));
  const br = new THREE.Vector3().addVectors(center, 
    new THREE.Vector3().copy(yawUnitVec).multiplyScalar(-BLADE_WIDTH / 2));
  const tl = new THREE.Vector3().addVectors(center, 
    new THREE.Vector3().copy(yawUnitVec).multiplyScalar(MID_WIDTH / 2));
  const tr = new THREE.Vector3().addVectors(center, 
    new THREE.Vector3().copy(yawUnitVec).multiplyScalar(-MID_WIDTH / 2));
  const tc = new THREE.Vector3().addVectors(center, 
    new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

  tl.y += height / 2;
  tr.y += height / 2;
  tc.y += height;

  // Vertex colors for animation control
  const black = [0, 0, 0];    // Base (no movement)
  const gray = [0.5, 0.5, 0.5];  // Middle (slight movement)
  const white = [1.0, 1.0, 1.0]; // Tip (full movement)

  const verts = [
    { pos: bl.toArray(), uv: uv, color: black },
    { pos: br.toArray(), uv: uv, color: black },
    { pos: tr.toArray(), uv: uv, color: gray },
    { pos: tl.toArray(), uv: uv, color: gray },
    { pos: tc.toArray(), uv: uv, color: white }
  ];

  const indices = [
    vArrOffset, vArrOffset + 1, vArrOffset + 2,
    vArrOffset + 2, vArrOffset + 4, vArrOffset + 3,
    vArrOffset + 3, vArrOffset, vArrOffset + 2
  ];

  return { verts, indices };
}
How It Works
Blade Structure
Each grass blade consists of 5 vertices:

2 bottom vertices (black color): Base of the blade, no movement
2 middle vertices (gray color): Middle section, slight movement
1 top vertex (white color): Tip of the blade, maximum movement

Animation System
The vertex shader uses vertex colors to control animation:

Vertices with color.x > 0.6 (white/tips) get full wave motion
Vertices with color.x > 0.0 (gray/middle) get reduced wave motion
Vertices with color.x = 0.0 (black/base) remain static

Wind Effect
glslcpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * tipDistance;

iTime / 500.0: Controls wave speed
uv.x * waveSize: Creates spatial variation
tipDistance: Controls movement amplitude

Customization
Adjust Grass Density
javascriptconst BLADE_COUNT = 100000;  // Increase/decrease for more/fewer blades
Modify Blade Size
javascriptconst BLADE_WIDTH = 0.1;     // Blade width
const BLADE_HEIGHT = 0.8;    // Base blade height
const BLADE_HEIGHT_VARIATION = 0.6;  // Random height variation
Change Wind Speed
In the vertex shader:
glslfloat waveSize = 10.0;        // Wave frequency
float tipDistance = 0.3;      // Maximum tip movement
float centerDistance = 0.1;   // Middle section movement
Adjust Visual Style
In the fragment shader:
glslfloat contrast = 1.5;    // Color contrast
float brightness = 0.1;  // Brightness adjustment
Performance Tips

Reduce blade count for better performance on lower-end devices
Adjust PLANE_SIZE to match your scene scale
Use simpler textures for faster loading
Consider LOD (Level of Detail) for large scenes

Troubleshooting
Grass not appearing

Check that grass.jpg is in the correct directory
Verify camera position can see the grass field
Ensure shader compilation succeeded (check console)

No animation

Confirm iTime uniform is updating in animation loop
Check that vertex colors are properly set

note the grass.jpg is in the textures>grass folder integrate this in my scene 