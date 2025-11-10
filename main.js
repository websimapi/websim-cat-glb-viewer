import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, clock, mixer, actions = {};
let model;
let activeAction;

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    scene.fog = new THREE.Fog(0xcccccc, 10, 50);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 2, 5);

    // Renderer setup
    const container = document.getElementById('container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Clock
    clock = new THREE.Clock();

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 4;
    dirLight.shadow.camera.bottom = -4;
    dirLight.shadow.camera.left = -4;
    dirLight.shadow.camera.right = 4;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);
    
    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);


    // Model Loader
    const loader = new GLTFLoader();
    loader.load('/cat.glb', (gltf) => {
        model = gltf.scene;
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
            }
        });
        
        // Scale and position the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        const scale = 2.0 / box.getSize(new THREE.Vector3()).length();
        model.scale.set(scale, scale, scale);
        
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.5; // Adjust based on model pivot

        scene.add(model);

        // Animation setup
        mixer = new THREE.AnimationMixer(model);
        const animations = gltf.animations;

        if (animations && animations.length) {
            const controlsContainer = document.getElementById('animation-controls');
            animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                actions[clip.name] = action;

                const button = document.createElement('button');
                button.innerText = clip.name;
                button.addEventListener('click', () => {
                    playAnimation(clip.name);
                });
                controlsContainer.appendChild(button);
            });
            // Play the first animation by default
            const firstClipName = animations[0].name;
            playAnimation(firstClipName);
        } else {
            document.getElementById('info').innerText = 'Cat Model (No animations found)';
        }

    }, undefined, (error) => {
        console.error(error);
        document.getElementById('info').innerText = 'Error loading model';
    });

    // Window resize listener
    window.addEventListener('resize', onWindowResize, false);
}

function playAnimation(name) {
    const newAction = actions[name];
    if (activeAction === newAction) return;

    if (activeAction) {
        activeAction.fadeOut(0.5);
    }
    
    activeAction = newAction;
    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(0.5)
        .play();
        
    updateButtons();
}

function updateButtons() {
    if (!activeAction) return;
    const buttons = document.querySelectorAll('#animation-controls button');
    buttons.forEach(button => {
        if (button.innerText === activeAction.getClip().name) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}