import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import starVertexShader from './shaders/starVertex.glsl';
import starFragmentShader from './shaders/starFragment.glsl';
import grassVertexShader from './shaders/grassVertex.glsl';
import grassFragmentShader from './shaders/grassFragment.glsl';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import flowerVertexShader from './shaders/flowerVertex.glsl';
import flowerFragmentShader from './shaders/flowerFragment.glsl';





// Loading Manager
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () => {
        window.setTimeout(() => {
            const loaderContainer = document.querySelector('.loader-container');
            loaderContainer.style.opacity = '0';
            setTimeout(() => {
                loaderContainer.style.display = 'none';
            }, 500);
        }, 500);
    },
    // Progress
    (itemUrl, itemsLoaded, itemsTotal) => {
        const progressRatio = itemsLoaded / itemsTotal;
        document.querySelector('.loader-bar').style.width = `${progressRatio * 100}%`;
    }
);

// Texture loader (must be before any texture loads)
const textureLoader = new THREE.TextureLoader(loadingManager);

// Add Audio
const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader(loadingManager);

// Load the audio but don't play it yet
let audioBuffer = null;
audioLoader.load(
    '/sounds/lol.mp3',
    (buffer) => {
        audioBuffer = buffer;
        console.log("✅ Audio loaded and ready to play");
    },
    (progress) => {
        console.log('Audio loading:', (progress.loaded / progress.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading audio:', error);
    }
);

// Setup play button functionality
const playButton = document.querySelector('.play-button');
playButton.addEventListener('click', () => {
    if (!sound.isPlaying) {
        // Resume AudioContext if it was suspended
        if (listener.context.state === 'suspended') {
            listener.context.resume();
        }
        
        // Set up and play the sound if it's not already playing
        if (!sound.buffer) {
            sound.setBuffer(audioBuffer);
            sound.setLoop(true);
            sound.setVolume(0.5);
        }
        sound.play();
        
        // Update button icon to pause (optional)
        playButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        `;
    } else {
        sound.pause();
        // Update button icon back to play
        playButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
    }
});

// Grass
const grassTexture = textureLoader.load(
    '/textures/grass/grass.jpg',
    () => console.log("✅ Grass texture loaded")
);
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.colorSpace = THREE.SRGBColorSpace;

// Clouds
const cloudTexture = textureLoader.load(
    '/textures/clouds/cloud.jpg',
    () => console.log("✅ Cloud texture loaded")
);
cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;
cloudTexture.repeat.set(2, 2);
cloudTexture.colorSpace = THREE.SRGBColorSpace;

// --- GRASS SHADER SYSTEM ---
const PLANE_SIZE = 50;
const BLADE_COUNT = 100000;
const BLADE_WIDTH = 0.5;
const BLADE_HEIGHT = 0.7;
const BLADE_HEIGHT_VARIATION = 0.6;

// Time uniform for animation
const startTime = Date.now();
const timeUniform = { value: 0.0 };

// 🌸 NEW FLOWER UNIFORMS 🌸
const flowerUniforms = {
    uTime: { value: 0.0 },
    // Customize these values for different wind effects!
    uWindDirection: { value: new THREE.Vector3(1.0, 0.0, 0.0) }, // Wind blows along X-axis
    uWindSpeed: { value: 3.0 }, // How fast the wave moves
    uWindStrength: { value: 0.1 } // How far the flower bends
};





// Shader uniforms for grass (no texture anymore)
const grassUniforms = {
    textures: { value: [grassTexture, cloudTexture] },
    iTime: { value: 0.0 }
};

const grassMaterial = new THREE.ShaderMaterial({
    uniforms: grassUniforms,
    vertexShader: grassVertexShader,
    fragmentShader: grassFragmentShader,
    vertexColors: true,
    side: THREE.DoubleSide
});

// ...existing code...

function convertRange(val, oldMin, oldMax, newMin, newMax) {
    return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}

function generateBlade(center, vArrOffset, uv) {
    const MID_WIDTH = BLADE_WIDTH * 0.5;
    const TIP_OFFSET = 0.1;
    const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);

    const yaw = Math.random() * Math.PI * 2;
    const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const tipBend = Math.random() * Math.PI * 2;
    const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

    const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar(BLADE_WIDTH / 2));
    const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar(-BLADE_WIDTH / 2));
    const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar(MID_WIDTH / 2));
    const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar(-MID_WIDTH / 2));
    const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

    tl.y += height / 2;
    tr.y += height / 2;
    tc.y += height;

    const black = [0, 0, 0];
    const gray = [0.5, 0.5, 0.5];
    const white = [1.0, 1.0, 1.0];

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

function generateField() {
    const positions = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    for (let i = 0; i < BLADE_COUNT; i++) {
        const VERTEX_COUNT = 5;
        const radius = PLANE_SIZE / 2;
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

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, grassMaterial);
    scene.add(mesh);
}


const ambientColor = new THREE.Color(0x333333); // A dark gray ambient light
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(10, 10, 10); 

const lightUniforms = {
    uAmbientColor: { value: ambientColor },
    uDiffuseLightColor: { value: light.color },
    // Use the normalized direction of your light source
    uLightDirection: { value: light.position.clone().normalize() } 
};

const mtlLoader = new MTLLoader();
mtlLoader.setPath('/models/maps/');
mtlLoader.setMaterialOptions({
    side: THREE.DoubleSide,
    wrap: THREE.RepeatWrapping,
    normalizeRGB: true,
    invertTrProperty: true,
    ignoreZeroRGBs: false,
    multiplier: 1.0
});

console.log('Loading MTL file...');
mtlLoader.load('anemone_hybrida.mtl', (materials) => {
    console.log('MTL loaded:', materials);
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('/models/maps/');
    
    console.log('Loading OBJ file...');
    objLoader.load('anemone_hybrida.obj', (obj) => {
        console.log('OBJ loaded:', obj);
        
        // Store a reference to the created shader materials to reuse them for clones
        const baseShaderMaterials = new Map(); 

        // Process each mesh in the loaded object
        obj.traverse((child) => {
            if (child.isMesh) {
                console.log('Processing mesh:', child.name);
                
                // Handle both single material and material array cases
                const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
                
                // Process each material on the mesh
                meshMaterials.forEach((material, index) => {
                    try {
                        console.log(`Processing material ${index}:`, {
                            hasMap: !!material.map,
                            name: material.name || `material_${index}`,
                            color: material.color ? material.color.getHexString() : 'none'
                        });

                        // Create new shader material
                        const shaderMaterial = new THREE.ShaderMaterial({
                            vertexShader: flowerVertexShader,
                            fragmentShader: flowerFragmentShader,
                            uniforms: {
                                ...flowerUniforms,
                                ...lightUniforms,
                                uMap: { value: material.map || null },
                                uBaseColor: { value: material.color || new THREE.Color(0xffffff) }
                            },
                            transparent: true,
                            side: THREE.DoubleSide
                        });

                        // Store for reuse
                        const materialKey = material.name || `${child.name}_material_${index}`;
                        baseShaderMaterials.set(materialKey, shaderMaterial);

                        // Apply the material
                        if (Array.isArray(child.material)) {
                            child.material[index] = shaderMaterial;
                        } else {
                            child.material = shaderMaterial;
                        }

                        console.log(`Successfully applied shader material ${materialKey}`);
                    } catch (error) {
                        console.error(`Error processing material ${index}:`, error);
                    }
                });
            }
        });

        // Setup base flower position and scale
        obj.scale.set(3, 5, 5);
        obj.position.set(24, 0, -3);
        obj.rotation.y = -Math.PI / 18;
        scene.add(obj);

        // Create clones with proper material references
        const clone = obj.clone(true);
        clone.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map((mat, index) => {
                        const key = mat.name || `${child.name}_material_${index}`;
                        return baseShaderMaterials.get(key) || mat;
                    });
                } else {
                    const key = child.material.name || `${child.name}_material_0`;
                    if (baseShaderMaterials.has(key)) {
                        child.material = baseShaderMaterials.get(key);
                    }
                }
            }
        });

        clone.position.set(24, 0, -2);
        clone.rotation.x = -Math.PI / 4;
        scene.add(clone);

        // Create second clone
        const clone2 = obj.clone(true);
        clone2.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map((mat, index) => {
                        const key = mat.name || `${child.name}_material_${index}`;
                        return baseShaderMaterials.get(key) || mat;
                    });
                } else {
                    const key = child.material.name || `${child.name}_material_0`;
                    if (baseShaderMaterials.has(key)) {
                        child.material = baseShaderMaterials.get(key);
                    }
                }
            }
        });
        clone2.position.set(24, 0, -1);
                clone.rotation.y = -Math.PI / 6;

        scene.add(clone2);
    }, 
    (xhr) => {
        console.log('Loading progress:', (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading OBJ:', error);
    });
}, 
undefined,
(error) => {
    console.error('Error loading MTL:', error);
});



// --- IMPROVED FLOWER GEOMETRY GENERATION - REALISTIC SIZES AND DISTRIBUTION ---
// (Flower code removed)
// ------------------------------------------



// Animation loop for grass (optional: comment out if using your main tick loop)
function animateGrass() {
    const elapsedTime = Date.now() - startTime;
    controls.update();
    window.requestAnimationFrame(animateGrass);
    renderer.render(scene, camera);
}
 //animateGrass();

 


// Debug
const gui = new GUI();
gui.hide();
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Generate grass field (after scene is initialized)
generateField();

// --- GENERATE FLOWERS ---
// (Flower generation removed)
// ------------------------

// ⬇️ Add this block right after generateField()
const groundGeometry = new THREE.CircleGeometry(PLANE_SIZE / 2, 64);
const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0x0b3d0b,   // dark green
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;  // lay flat
ground.position.y = -0.01;        // just below grass
scene.add(ground);

// --- Starry Sky (Background Sphere) ---
const skyUniforms = {
    uSunsetColor: { value: new THREE.Color(0xffd580) }, // warm sunset
    uZenithColor: { value: new THREE.Color(0x0a1446) },  // deep blue

     // 🌟 NEW UNIFORMS FOR STARS 🌟
    uTime: { value: 0.1 }, // For animation
    uStarDensity: { value: 0.01 } // Control how many stars show up (e.g., 0.15 for sparser)
};
const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: skyUniforms,
    side: THREE.BackSide
});
const skyGeometry = new THREE.SphereGeometry(60, 64, 64);
const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(skyMesh);

// --- Terrain / Mountains ---
// Remove old terrain, add distant mountain silhouette
const grassRadius = 30; // match circle radius
const mountainSegments = 78;
const mountainVertices = [];
const mountainIndices = [];
const mountainHeights = [];
const mountainBaseY = 0.05;
const mountainInnerRadius = grassRadius * 0.91;
const mountainOuterRadius = grassRadius * 1.18;

// Generate mountain ring vertices
for (let i = 0; i <= mountainSegments; i++) {
    const theta = (i / mountainSegments) * Math.PI * 2;
    
    // ⛰️ MODIFIED LINE FOR GREATER HEIGHT ⛰️
    // Base height increased from 2 to 10
    // Amplitude of sin wave increased from 2 to 5
    // Random height variation increased from 2 to 5
    const height = 6 + Math.sin(theta * 3) * 5 + Math.random() * 5; 
    
    mountainHeights.push(height);

    // Outer vertex (mountain peak)
    const xOuter = Math.cos(theta) * mountainOuterRadius;
    const yOuter = height + mountainBaseY;
    const zOuter = Math.sin(theta) * mountainOuterRadius;
    mountainVertices.push(xOuter, yOuter, zOuter);

    // Inner vertex (base, near grass edge)
    const xInner = Math.cos(theta) * mountainInnerRadius;
    const yInner = mountainBaseY;
    const zInner = Math.sin(theta) * mountainInnerRadius;
    mountainVertices.push(xInner, yInner, zInner);
}

// Generate indices for triangle strip
for (let i = 0; i < mountainSegments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    // Two triangles per segment
    mountainIndices.push(a, b, c);
    mountainIndices.push(b, d, c);
}

const mountainGeometry = new THREE.BufferGeometry();
mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mountainVertices, 3));
mountainGeometry.setIndex(mountainIndices);
mountainGeometry.computeVertexNormals();
const mountainMaterial = new THREE.MeshBasicMaterial({ color: 0x181c2a, side: THREE.DoubleSide });
const mountainMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
mountainMesh.position.y = 0;
scene.add(mountainMesh);


/**
 * Textures
 */

const doorColorTexture = textureLoader.load('/textures/door/color.jpg')
doorColorTexture.colorSpace = THREE.SRGBColorSpace
const doorAlphaTexture = textureLoader.load('/textures/door/alpha.jpg')
const doorAmbientOcclusionTexture = textureLoader.load('/textures/door/ambientOcclusion.jpg')
const doorHeightTexture = textureLoader.load('/textures/door/height.jpg')
const doorNormalTexture = textureLoader.load('/textures/door/normal.jpg')
const doorMetalnessTexture = textureLoader.load('/textures/door/metalness.jpg')
const doorRoughnessTexture = textureLoader.load('/textures/door/roughness.jpg')


// const roofColorTexture = textureLoader.load('/textures/roof/color.jpg')
// roofColorTexture.colorSpace = THREE.SRGBColorSpace
// const roofAmbientOcclusionTexture = textureLoader.load('/textures/door/AmbientOclussion.jpg')
// const roofHeightTexture = textureLoader.load('/textures/roof/height.jpg')
// const roofNormalTexture = textureLoader.load('/textures/door/normal.jpg')
// const roofRoughnessTexture = textureLoader.load('/textures/door/roughness.jpg')




// const bricksColorTexture = textureLoader.load('/textures/bricks/color.jpg')
// bricksColorTexture.colorSpace = THREE.SRGBColorSpace
// const bricksAmbientOcclusionTexture = textureLoader.load('/textures/bricks/ambientOcclusion.jpg')
// const bricksNormalTexture = textureLoader.load('/textures/bricks/normal.jpg')
// const bricksRoughnessTexture = textureLoader.load('/textures/bricks/roughness.jpg')


/**
 * House
 */
// House container
const house = new THREE.Group()
scene.add(house)

// Load house OBJ/MTL model and place in the middle where the walls are
const houseMtlLoader = new MTLLoader();
houseMtlLoader.setPath('/models/house/');
houseMtlLoader.load('cottage_obj.mtl', (materials) => {
    materials.preload();
    const houseObjLoader = new OBJLoader();
    houseObjLoader.setMaterials(materials);
    houseObjLoader.setPath('/models/house/');
    houseObjLoader.load('cottage_obj.obj', (obj) => {
        const scaleFactor = 0.4; // Change this value to adjust the size
        obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
        obj.position.set(0, 0, 4); // Centered at origin
        obj.rotation.y = Math.PI * 0.8; 

        obj.castShadow = true;
        obj.receiveShadow = true;
        house.add(obj);
        console.log('✅ House OBJ added to scene');
    },
    undefined,
    (error) => { console.error('❌ Error loading house OBJ:', error); });
},
undefined,
(error) => { console.error('❌ Error loading house MTL:', error); });



// Door
const door = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2, 100, 100),
    new THREE.MeshStandardMaterial({
        map: doorColorTexture,
        transparent: true,
        alphaMap: doorAlphaTexture,
        aoMap: doorAmbientOcclusionTexture,
        displacementMap: doorHeightTexture,
        displacementScale: 0.1,
        normalMap: doorNormalTexture,
        metalnessMap: doorMetalnessTexture,
        roughnessMap: doorRoughnessTexture
    })
)
door.position.y = 1
door.position.z = 5 + 0.01
house.add(door)


// //window 
// const windowGeometry = new THREE.PlaneGeometry(0.25,0.25)
// const windowMaterial = new THREE.MeshBasicMaterial({color: 'black'})

// const window1 = new THREE.Mesh(windowGeometry,windowMaterial)
// window1.position.y=1.8
// window1.rotation.y=7.8
// window1.position.x=2.1
// window1.position.z=-1

// const window2 = new THREE.Mesh(windowGeometry,windowMaterial)
// window2.position.y=1.5
// window2.rotation.y=7.8
// window2.position.x=2.1
// window2.position.z=-1

// const window3 = new THREE.Mesh(windowGeometry,windowMaterial)
// window3.position.y=1.5
// window3.rotation.y=7.8
// window3.position.x=2.1
// window3.position.z=-1.3

// const window4 = new THREE.Mesh(windowGeometry,windowMaterial)
// window4.position.y=1.8
// window4.rotation.y=7.8
// window4.position.x=2.1
// window4.position.z=-1.3




// house.add(window1,window2,window3,window4)







// // Bushes
// const bushGeometry = new THREE.SphereGeometry(1, 16, 16)
// const bushMaterial = new THREE.MeshStandardMaterial({ color: '#89c854' })

// const bush1 = new THREE.Mesh(bushGeometry, bushMaterial)
// bush1.scale.set(0.5, 0.5, 0.5)
// bush1.position.set(0.8, 0.2, 2.2)

// const bush2 = new THREE.Mesh(bushGeometry, bushMaterial)
// bush2.scale.set(0.25, 0.25, 0.25)
// bush2.position.set(1.4, 0.1, 2.1)

// const bush3 = new THREE.Mesh(bushGeometry, bushMaterial)
// bush3.scale.set(0.4, 0.4, 0.4)
// bush3.position.set(- 0.8, 0.1, 2.2)

// const bush4 = new THREE.Mesh(bushGeometry, bushMaterial)
// bush4.scale.set(0.15, 0.15, 0.15)
// bush4.position.set(- 1, 0.05, 2.6)

// house.add(bush1, bush2, bush3, bush4)


/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#b9d5ff', 0.12)
ambientLight.intensity = 0.176;

gui.add(ambientLight, 'intensity').min(0).max(1).step(0.001)
scene.add(ambientLight)

// Directional light
const moonLight = new THREE.DirectionalLight(0xffffff, 2.6);
moonLight.position.set(4, 5, - 2)
gui.add(moonLight, 'intensity').min(0).max(5).step(0.001)
gui.add(moonLight.position, 'x').min(- 5).max(5).step(0.001)
gui.add(moonLight.position, 'y').min(- 5).max(5).step(0.001)
gui.add(moonLight.position, 'z').min(- 5).max(5).step(0.001)
scene.add(moonLight)


// Door light
const doorLight = new THREE.PointLight('orange', 23, 17)
doorLight.position.set(4, 2, 8)
house.add(doorLight)


// //window light 
const windowLight = new THREE.PointLight('orange' , 7, 5 )
windowLight.position.set(5,3.1,1)
house.add(windowLight)




/**
 * Fog
//  */
// const fog = new THREE.Fog('#262837', 1, 18)
// scene.fog = fog

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 24
camera.position.y = 3.6
camera.position.z = -2
camera.add(listener); // Add audio listener to camera
scene.add(camera)



// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
// controls.enabled = false 
controls.enablePan = false        // Disables moving the camera sideways/up/down (panning)
controls.enableRotate = false    // Disables rotating the camera (orbiting)
controls.enableZoom = true  

// Minimum zoom (how close the camera can get to the focus point)
controls.minDistance = 3; 

// Maximum zoom (how far the camera can move away from the focus point)
controls.maxDistance = 25;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setClearColor('#262837')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// --- Post Processing (UnrealBloomPass) ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomParams = {
    strength: 0.087,
    radius: 0.6,
    threshold: 1
};
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomParams.strength,
    bloomParams.radius,
    bloomParams.threshold
);
composer.addPass(bloomPass);
const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(bloomParams, 'strength', 0, 3).onChange(v => bloomPass.strength = v);
bloomFolder.add(bloomParams, 'radius', 0, 2).onChange(v => bloomPass.radius = v);
bloomFolder.add(bloomParams, 'threshold', 0, 1).onChange(v => bloomPass.threshold = v);
bloomFolder.open();

/**
 * Shadows
 */
renderer.shadowMap.enabled = true

moonLight.castShadow = true
doorLight.castShadow = true

// bush1.castShadow = true
// bush2.castShadow = true
// bush3.castShadow = true
// bush4.castShadow = true


moonLight.shadow.mapSize.width = 256
moonLight.shadow.mapSize.height = 256
moonLight.shadow.camera.far = 15

doorLight.shadow.mapSize.width = 256
doorLight.shadow.mapSize.height = 256
doorLight.shadow.camera.far = 7

renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;


/**
 * Animate
 */
const clock = new THREE.Clock()
    
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()



    // Animate grass: scale to ms to match shader
    grassUniforms.iTime.value = elapsedTime * 1000.0;
 // 🌟 Animate stars slowly 🌟
    skyUniforms.uTime.value = elapsedTime * 0.05 // <-- small speed factor

         // 🌸 NEW: Animate Flowers 🌸
    flowerUniforms.uTime.value = elapsedTime;

     // 🌟 Animate stars slowly 🌟




    // Render with post-processing
    composer.render();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()