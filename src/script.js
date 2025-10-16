import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
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





// First, let's create a Promise-based asset loader
const loadingPromises = [];

// Loading Manager modification
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () => {
        Promise.all(loadingPromises).then(() => {
            window.setTimeout(() => {
                const loaderContainer = document.querySelector('.loader-container');
                loaderContainer.style.opacity = '0';
                setTimeout(() => {
                    loaderContainer.style.display = 'none';
                }, 500);
            }, 500);
        });
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



// Move flower loading into a function and add to promises
function loadFlowerModel() {
    return new Promise((resolve, reject) => {
        const mtlLoader = new MTLLoader(loadingManager);
        mtlLoader.setPath('/models/maps/');
        mtlLoader.setMaterialOptions({
            side: THREE.DoubleSide,
            wrap: THREE.RepeatWrapping,
            normalizeRGB: true,
            invertTrProperty: true,
            ignoreZeroRGBs: false,
            multiplier: 1.0
        });

        mtlLoader.load('anemone_hybrida.mtl', (materials) => {
            materials.preload();
            const objLoader = new OBJLoader(loadingManager);
            objLoader.setMaterials(materials);
            objLoader.setPath('/models/maps/');
            
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
                resolve();
            }, 
            undefined,
            reject);
        }, 
        undefined,
        reject);
    });
}

// Add model loading promises to the array
loadingPromises.push(loadHouseModel());
loadingPromises.push(loadFlowerModel());


// --- IMPROVED FLOWER GEOMETRY GENERATION - REALISTIC SIZES AND DISTRIBUTION ---
// (Flower code removed)
// ------------------------------------------



// // Animation loop for grass (optional: comment out if using your main tick loop)
// function animateGrass() {
//     const elapsedTime = Date.now() - startTime;
//     controls.update();
//     window.requestAnimationFrame(animateGrass);
//     renderer.render(scene, camera);
// }
//  //animateGrass();

 





// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();


// Debug
const gui = new GUI({ closed: true }); 
 gui.hide();

// House container
const house = new THREE.Group()
scene.add(house)

// Move house loading into a function and add to promises
function loadHouseModel() {
    return new Promise((resolve, reject) => {
        const houseMtlLoader = new MTLLoader(loadingManager);
        houseMtlLoader.setPath('/models/house/');
        houseMtlLoader.load('cottage_obj.mtl', (materials) => {
            materials.preload();
            const houseObjLoader = new OBJLoader(loadingManager);
            houseObjLoader.setMaterials(materials);
            houseObjLoader.setPath('/models/house/');
            houseObjLoader.load('cottage_obj.obj', (obj) => {
                const scaleFactor = 0.4;
                obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
                obj.position.set(0, 0, 4);
                obj.rotation.y = Math.PI * 0.8;
                obj.castShadow = true;
                obj.receiveShadow = true;
                house.add(obj);
                console.log('✅ House OBJ added to scene');
                resolve();
            },
            undefined,
            reject);
        },
        undefined,
        reject);
    });
}



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
    uSunsetColor: { value: new THREE.Color(0xffd580) },
    uZenithColor: { value: new THREE.Color(0x0a1446) },
    uTime: { value: 0.0 }, // Start at 0
    uStarDensity: { value: 0.01 }
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

// textures
const mountainColorTexture = textureLoader.load('/textures/mountain/color.jpg')
const mountainAmbientOcclusionTexture = textureLoader.load('/textures/mountain/ao.jpg')
const mountainRoughnessTexture = textureLoader.load('/textures/mountain/roughness.jpg')
const mountainNormalTexture = textureLoader.load('/textures/mountain/normal.jpg')
const mountainHeightTexture = textureLoader.load('/textures/mountain/height.jpg')

// --- TEXTURE SETTINGS ---
mountainColorTexture.wrapS = THREE.ClampToEdgeWrapping;
mountainColorTexture.wrapT = THREE.ClampToEdgeWrapping;

mountainAmbientOcclusionTexture.wrapS = THREE.ClampToEdgeWrapping;
mountainAmbientOcclusionTexture.wrapT = THREE.ClampToEdgeWrapping;

mountainRoughnessTexture.wrapS = THREE.ClampToEdgeWrapping;
mountainRoughnessTexture.wrapT = THREE.ClampToEdgeWrapping;

mountainNormalTexture.wrapS = THREE.ClampToEdgeWrapping;
mountainNormalTexture.wrapT = THREE.ClampToEdgeWrapping;

mountainHeightTexture.wrapS = THREE.ClampToEdgeWrapping;
mountainHeightTexture.wrapT = THREE.ClampToEdgeWrapping;

mountainColorTexture.colorSpace = THREE.SRGBColorSpace;




// --- COMPLETELY NEW APPROACH: Planar Projection ---
const grassRadius = 30;
// SIMPLE APPROACH: Create individual mountains
// ALTERNATIVE: More natural mountain generation with multiple peaks
// Seeded random number generator for consistent results
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Use a fixed seed for consistent mountains
const mountainSeed = 12345;

const mountainCount = 88;
const mountains = [];

for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2;
    const radius = grassRadius * 1.05;
    
    // Use seeded random for consistent positioning
    const rand1 = seededRandom(mountainSeed + i);
    const rand2 = seededRandom(mountainSeed + i + 1000);
    
    // Position with consistent variation
    const x = Math.cos(angle) * radius + (rand1 - 0.5) * 2;
    const z = Math.sin(angle) * radius + (rand2 - 0.5) * 2;
    
    // Use seeded random for mountain dimensions
    const rand3 = seededRandom(mountainSeed + i + 2000);
    const rand4 = seededRandom(mountainSeed + i + 3000);
    const rand5 = seededRandom(mountainSeed + i + 4000);
    
    // Create base cylinder geometry with more segments
    const segments = 94;
    const heightSegments = 1;
    const mountainGeometry = new THREE.CylinderGeometry(
        2 + rand3 * 2, // Base radius   
        0.5 + rand4 * 12, // Top radius
        4.5 + rand5 * 12, // Height
        segments,
        heightSegments,
        true
    );
    
    // Get the position attribute
    const positionAttribute = mountainGeometry.getAttribute('position');
    const positions = positionAttribute.array;
    
    // Create multiple peaks and ridges with consistent patterns
    for (let j = 0; j < positions.length; j += 3) {
        const x = positions[j];
        const y = positions[j + 1];
        const z = positions[j + 2];
        
        // Only modify upper part of the mountain
        if (y > 0.2) {
            const distance = Math.sqrt(x * x + z * z);
            const angleAround = Math.atan2(z, x);
            
            // Use deterministic patterns instead of random
            const mainPeak = Math.sin(distance * 4) * 0.4;
            const secondaryPeaks = Math.cos(angleAround * 3) * 0.3;
            const ridgeEffect = Math.sin(angleAround * 2 + distance * 6) * 0.2;
            const consistentVariation = (seededRandom(mountainSeed + i + j) - 0.5) * 0.15;
            
            const totalHeightVariation = mainPeak + secondaryPeaks + ridgeEffect + consistentVariation;
            
            // Apply more variation to higher vertices
            const heightMultiplier = y * 0.2;
            positions[j + 1] = y + totalHeightVariation * heightMultiplier;
        }
        
        // Add consistent base roughness
        if (y > -0.5 && y < 0.5) {
            const baseRand1 = seededRandom(mountainSeed + i + j + 5000);
            const baseRand2 = seededRandom(mountainSeed + i + j + 6000);
            positions[j] += (baseRand1 - 0.5) * 0.1;
            positions[j + 2] += (baseRand2 - 0.5) * 0.1;
        }
    }
    
    positionAttribute.needsUpdate = true;
    mountainGeometry.computeVertexNormals();
    
    // Consistent rotation
    const rotationRand = seededRandom(mountainSeed + i + 7000);
    mountainGeometry.rotateY(angle + rotationRand * 0.5);
    mountainGeometry.translate(x, 5, z);
    
    // Material
    const mountainMaterial = new THREE.MeshStandardMaterial({
        map: mountainColorTexture,
        aoMap: mountainAmbientOcclusionTexture,
        roughnessMap: mountainRoughnessTexture,
        normalMap: mountainNormalTexture,
        side: THREE.DoubleSide,
        roughness: 0.9, // Fixed from 5.9 to more reasonable value
    });
    
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.y = -7;
    scene.add(mountain);
    mountains.push(mountain);
}


/**
 * Textures
 */

// const doorColorTexture = textureLoader.load('/textures/door/color.jpg')
// const doorAlphaTexture = textureLoader.load('/textures/door/alpha.jpg')
// const doorAmbientOcclusionTexture = textureLoader.load('/textures/door/ambientOcclusion.jpg')
// const doorHeightTexture = textureLoader.load('/textures/door/height.jpg')
// const doorNormalTexture = textureLoader.load('/textures/door/normal.jpg')
// const doorMetalnessTexture = textureLoader.load('/textures/door/metalness.jpg')
// const doorRoughnessTexture = textureLoader.load('/textures/door/roughness.jpg')






// const bricksColorTexture = textureLoader.load('/textures/bricks/color.jpg')
// const bricksAmbientOcclusionTexture = textureLoader.load('/textures/bricks/ambientOcclusion.jpg')
// const bricksNormalTexture = textureLoader.load('/textures/bricks/normal.jpg')
// const bricksRoughnessTexture = textureLoader.load('/textures/bricks/roughness.jpg')
// bricksColorTexture.colorSpace = THREE.SRGBColorSpace



/**
 * House
 */


// // Door
// const door = new THREE.Mesh(
//     new THREE.PlaneGeometry(2.2, 2.2, 100, 100),
//     new THREE.MeshStandardMaterial({
//         map: doorColorTexture,
//         transparent: true,
//         alphaMap: doorAlphaTexture,
//         aoMap: doorAmbientOcclusionTexture,
//         displacementMap: doorHeightTexture,
//         displacementScale: 0.1,
//         normalMap: doorNormalTexture,
//         metalnessMap: doorMetalnessTexture,
//         roughnessMap: doorRoughnessTexture
//     })
// )
// door.position.y = 1
// door.position.z = 5 + 0.01
// house.add(door)


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

// gui.add(ambientLight, 'intensity').min(0).max(1).step(0.001)
scene.add(ambientLight)

// Directional light
const moonLight = new THREE.DirectionalLight(0xffffff, 2.6);
moonLight.position.set(4, 5, - 2)
// gui.add(moonLight, 'intensity').min(0).max(5).step(0.001)
// gui.add(moonLight.position, 'x').min(- 5).max(5).step(0.001)
// gui.add(moonLight.position, 'y').min(- 5).max(5).step(0.001)
// gui.add(moonLight.position, 'z').min(- 5).max(5).step(0.001)
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

    // Update renderer and composer
    renderer.setSize(sizes.width, sizes.height);
    composer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
// Calculate initial position at start distance
const cameraDirection = new THREE.Vector3(24, 3.6, -2).normalize();
camera.position.copy(cameraDirection.multiplyScalar(17)); // Use startDistance (17) for initial position
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
controls.minDistance = 17; 

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
    radius: 1.386,
    threshold: 0.545
};
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomParams.strength,
    bloomParams.radius,
    bloomParams.threshold
);
composer.addPass(bloomPass);
const bloomFolder = gui.addFolder('Bloom');
bloomFolder.close();   // ✅ start closed

bloomFolder.add(bloomParams, 'strength', 0, 0.478).onChange(v => bloomPass.strength = v);
// bloomFolder.add(bloomParams, 'radius', 0, 2).onChange(v => bloomPass.radius = v);
// bloomFolder.add(bloomParams, 'threshold', 0, 1).onChange(v => bloomPass.threshold = v);
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
    // stats.begin() // Start measuring

    const elapsedTime = clock.getElapsedTime()

    // Camera zoom animation
    if (cameraAnimation.active) {
        const now = Date.now();
        const progress = Math.min((now - cameraAnimation.startTime) / cameraAnimation.duration, 1);
        
        // Smoother easing function
        const eased = -(Math.cos(Math.PI * progress) - 1) / 2; // Sinusoidal ease-in-out
        
        // Calculate new camera distance from startDistance to endDistance
        const newDistance = cameraAnimation.startDistance + 
            (cameraAnimation.endDistance - cameraAnimation.startDistance) * eased;
        
        // Apply new distance while maintaining camera direction
        const direction = camera.position.clone().normalize();
        camera.position.copy(direction.multiplyScalar(newDistance));
        
        // End animation when complete
        if (progress === 1) {
            cameraAnimation.active = false;
        }
    }

    // Update controls
    controls.update()



    // Animate grass: scale to ms to match shader
    grassUniforms.iTime.value = elapsedTime * 1000.0;
 // 🌟 Animate stars slowly 🌟
    skyUniforms.uTime.value += 0.005;

         // 🌸 NEW: Animate Flowers 🌸
    flowerUniforms.uTime.value = elapsedTime;

     // 🌟 Animate stars slowly 🌟




    // Render with post-processing
    composer.render()

    // stats.end() // End measuring

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}
const cameraAnimation = {
    active: false,
    startTime: 0,
    duration: 4000, // Animation duration in ms
    startDistance: 17, // Starting camera distance (closer)
    endDistance: 25    // Ending camera distance (farther)
};



tick()

// Scene initialization state
let sceneInitialized = false;

// Fullscreen and scene initialization handling
async function goFullscreen() {
    try {
        const element = document.documentElement;
        const options = { navigationUI: 'hide' };
        
        if (element.requestFullscreen) {
            await element.requestFullscreen(options);
        } else if (element.webkitRequestFullscreen) {
            await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            await element.msRequestFullscreen();
        }
    } catch (error) {
        console.warn('Fullscreen request failed:', error);
        // Still initialize scene even if fullscreen fails
        initializeScene();
    }
}

function initializeScene() {
    if (sceneInitialized) return;
    
    const canvas = document.querySelector('.webgl');
    const fullscreenContainer = document.querySelector('.fullscreen-container');
    
    // Hide fullscreen container and show canvas
    fullscreenContainer.style.opacity = '0';
    setTimeout(() => {
        fullscreenContainer.style.display = 'none';
        canvas.style.display = 'block';
        
        // Start camera animation
        cameraAnimation.active = true;
        cameraAnimation.startTime = Date.now();
        
        // Trigger any initial animations or state
        if (sound.buffer && !sound.isPlaying) {
            sound.play();
        }
    }, 500);
    
    sceneInitialized = true;
}

// Orientation logic
const orientationPrompt = document.querySelector('.orientation-prompt');
const fullscreenContainerEl = document.querySelector('.fullscreen-container'); // renamed to avoid clash

function checkOrientation() {
    if (window.innerHeight > window.innerWidth) {
        // Portrait → show orientation prompt
        orientationPrompt.classList.add('visible');
        fullscreenContainerEl.style.display = 'none';
    } else {
        // Landscape → hide prompt & show "Enter Experience"
        orientationPrompt.classList.remove('visible');
        fullscreenContainerEl.style.display = 'flex';
    }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
checkOrientation(); // run once at start

fullscreenContainerEl.querySelector('.fullscreen-btn').addEventListener('click', async () => {
    try {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            await element.requestFullscreen({ navigationUI: 'hide' });
        } else if (element.webkitRequestFullscreen) {
            await element.webkitRequestFullscreen();
        }
    } catch (error) {
        console.warn('Fullscreen request failed:', error);
    }

    // Hide container, show scene
    fullscreenContainerEl.style.opacity = '0';
    setTimeout(() => {
        fullscreenContainerEl.style.display = 'none';
        document.querySelector('.webgl').style.display = 'block';

        cameraAnimation.active = true;
        cameraAnimation.startTime = Date.now();
    }, 500);
});
