import '../css/style.css';
import * as THREE from 'three'; 
import GUI from "lil-gui";
import vertex from './shader/vertex.glsl'; 
import fragment from './shader/fragment.glsl'; 
import backgroundImage from '../static/gerome.jpg';

// canvas
const canvas = document.querySelector('canvas.webgl')
// scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#141718')
// red cube
const geometry = new THREE.PlaneGeometry(1,1,1,1)

let dataTexture = new THREE.DataTexture()

const gui = new GUI();

// camera
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// const raycaster = new THREE.Raycaster();
const mouse = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vX: 0,
    vY: 0
};

const settings = {
    grid: 15,
    mouse: 0.13,
    strength: 0.15,
    relaxation: 0.9,
}

// Image cover -- keep ratio
const imageAspect = 938/1501;
let a1; let a2;

gui.add(settings, "grid", 2, 1000, 1).onFinishChange(() => {
    regenerateGrid()
});
gui.add(settings, "mouse", 0, 1, 0.01);
gui.add(settings, "strength", 0, 1, 0.01);
gui.add(settings, "relaxation", 0, 1, 0.01);
gui.destroy();

const clamp = (number, min, max) => {
    return Math.max(min, Math.min(number, max));
}

const keepImageAspect = () => {
    if ( sizes.height/sizes.width > imageAspect ){
        a1 = (sizes.width/sizes.height) * imageAspect;
        a2 = 1;
    } else {
        a1 = 1
        a2 = (sizes.height/sizes.width) / imageAspect;
    }
    if (material) {
        material.uniforms.uResolution.value.x = sizes.width;
        material.uniforms.uResolution.value.y = sizes.height;
        material.uniforms.uResolution.value.z = a1;
        material.uniforms.uResolution.value.w = a2;
    }
} 

const regenerateGrid = () => {
    const gridSize = settings.grid;

    const width = gridSize;
    const height = gridSize;

    const size = width * height;
    const data = new Float32Array(4 * size);

    for (let i = 0; i < size; i++) {

        let r = Math.random() * 255 - 125;
        let r1 = Math.random() * 255 - 125;
        const stride = i * 4;

        data[stride] = r;
        data[stride + 1] = r1;
        data[stride + 2] = r;
        data[stride + 3] = 1;

    }

    // used the buffer to create a DataTexture
    dataTexture =  new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    if ( material ) {
        material.uniforms.uDataTexture.value = dataTexture;
        material.uniforms.uDataTexture.value.needsUpdate = true;
    }

}

const updateDataTexture = () => {
    let data = dataTexture.image.data ?? [];

    for (let i = 0; i < data.length; i += 4) {
      data[i] *= settings.relaxation
      data[i + 1] *= settings.relaxation
    }

    let gridMouseX = settings.grid * mouse.x;
    let gridMouseY = settings.grid * (1 - mouse.y);
    let maxDist = settings.grid * settings.mouse;
    let aspect = sizes.height / sizes.width

    for (let i = 0; i < settings.grid; i++) {
      for (let j = 0; j < settings.grid; j++) {

        let distance = ((gridMouseX - i) ** 2) / aspect + (gridMouseY - j) ** 2
        let maxDistSq = maxDist ** 2;

        if (distance < maxDistSq) {

          let index = 4 * (i + settings.grid * j);

          let power = maxDist / Math.sqrt(distance);
          power = clamp(power, 0, 10)
          // if(distance <settings.grid/32) power = 1;
          // power = 1;

          data[index] += settings.strength * 100 * mouse.vX * power;
          data[index + 1] -= settings.strength * 100 * mouse.vY * power;

        }
      }
    }

    mouse.vX *= 0.9;
    mouse.vY *= 0.9;
    dataTexture.needsUpdate = true
}

const imgTexture = new THREE.TextureLoader().load(backgroundImage);
imgTexture.needsUpdate = true;

// ================
// Material
// ================

const material = new THREE.ShaderMaterial({ 
    extensions: {
        derivatives: "#extension GL_OES_standard_derivatives: enable"
    },
    side: THREE.DoubleSide,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    uniforms: {
        uTime: { value: 0 },
        uTexture: { value: imgTexture },
        uDataTexture: { value: dataTexture },
        uResolution: { value: new THREE.Vector4(sizes.width,sizes.height, a1, a2) }
    }
})

const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX / sizes.width;
    mouse.y = event.clientY / sizes.height;

    mouse.vX = mouse.x - mouse.prevX;
    mouse.vY = mouse.y - mouse.prevY;

    mouse.prevX = mouse.x
    mouse.prevY = mouse.y;
})

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    keepImageAspect();
    regenerateGrid();
})

const frustumSize = 1;

// Camera
const camera = new THREE.OrthographicCamera(
    frustumSize / -2, 
    frustumSize / 2, 
    frustumSize / 2,
    frustumSize / -2,
    -1000, 
    1000 
)

camera.position.set(0,0,2);
scene.add(camera)

/**
 * Renderer
 */
 const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0xeeeeee, 1);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update data texture
    updateDataTexture()

    // Update material
    material.uniforms.uTime.value = elapsedTime;

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

keepImageAspect()
regenerateGrid()
tick()