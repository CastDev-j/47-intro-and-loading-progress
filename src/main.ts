import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, Timer } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

/**
 * Set up stats.js
 */
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

/**
 * Loaders
 */
const loadingBar = document.querySelector(".loading-bar") as HTMLDivElement;

const loadingManager = new THREE.LoadingManager();

const gltfLoader = new GLTFLoader(loadingManager);
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);

loadingManager.onProgress = (_, itemsLoaded, itemsTotal) => {
  const progress = itemsLoaded / itemsTotal;

  const loadingAnimation = gsap.to(loadingBar, {
    duration: 0.5,
    scaleX: progress,
    ease: "power2.inOut",
  });

  if (progress === 1) {
    loadingAnimation.eventCallback("onComplete", () => {
      const completedSequence = gsap.timeline();

      completedSequence.to(loadingBar, {
        duration: 0.3,
        delay: 0.3,
        opacity: 0,
        ease: "power2.inOut",
        onComplete: () => {
          loadingBar.style.display = "none";
        },
      });

      completedSequence.to(overlay.material.uniforms.uAlpha, {
        duration: 2,
        value: 0,
        ease: "linear",
        onComplete: () => {
          overlay.material.dispose();
          scene.remove(overlay);
        },
      });
    });
  }
};

/**
 * Set up scene
 */

const scene = new THREE.Scene();

/**
 * Set up canvas
 */

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

/**
 * Set up debug object
 */

const debugObject = {
  envMapIntensity: 2.5,
};

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(4, 1, -4);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;

/**
 * Renderer
 */

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  powerPreference: "high-performance",
  antialias: true,
});
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Update all materials
 */
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial
    ) {
      // child.material.envMap = environmentMap
      child.material.envMapIntensity = debugObject.envMapIntensity;
      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

/**
 * Overlay
 */

const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const overlayMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uAlpha: new THREE.Uniform(1.0),
  },
  vertexShader: `

    void main() {
      gl_Position = vec4(position, 1.0);
  
    }
  `,
  fragmentShader: `
    uniform float uAlpha;

    void main() {
      gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
    }
  `,
  transparent: true,
  // wireframe: true,
});
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);

scene.add(overlay);

/**
 * Environment map
 */
const environmentMap = await cubeTextureLoader.loadAsync([
  "/textures/environmentMaps/0/px.jpg",
  "/textures/environmentMaps/0/nx.jpg",
  "/textures/environmentMaps/0/py.jpg",
  "/textures/environmentMaps/0/ny.jpg",
  "/textures/environmentMaps/0/pz.jpg",
  "/textures/environmentMaps/0/nz.jpg",
]);

environmentMap.colorSpace = THREE.SRGBColorSpace;

scene.background = environmentMap;
scene.environment = environmentMap;

/**
 * Models
 */
const gltf = await gltfLoader.loadAsync(
  "/models/FlightHelmet/glTF/FlightHelmet.gltf"
);

gltf.scene.scale.set(10, 10, 10);
gltf.scene.position.set(0, -4, 0);
gltf.scene.rotation.y = Math.PI * 0.5;
scene.add(gltf.scene);

updateAllMaterials();

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(0.25, 3, -2.25);
scene.add(directionalLight);

/**
 * Animation loop
 */

const timer = new Timer();

const tick = () => {
  stats.begin();

  timer.update();
  // const elapsedTime = timer.getElapsed();
  // const deltaTime = timer.getDelta();

  // update controls to enable damping
  controls.update();

  // animations

  // render
  renderer.render(scene, camera);

  stats.end();

  // request next frame
  window.requestAnimationFrame(tick);
};

tick();

/**
 * Handle window resize
 */

function handleResize() {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

/**
 * Usar el evento 'resize' de visualViewport para móviles
 */

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleResize);
} else {
  window.addEventListener("resize", handleResize);
}
