/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:organize-imports
// tslint:disable:ban-malformed-import-paths
// tslint:disable:no-new-decorators

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';
import {AvatarConfig, DEFAULT_AVATAR_CONFIG} from './components/avatar-customizer';

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';

/**
 * 3D live audio visual with realistic human avatar.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private avatarGroup!: THREE.Group;
  private loadedModel!: THREE.Group | null;
  private mixer!: THREE.AnimationMixer | null;
  private idleAction!: THREE.AnimationAction | null;
  private talkingAction!: THREE.AnimationAction | null;
  private particles!: THREE.Points;
  private prevTime = 0;

  // Geometric avatar parts (fallback)
  private headGroup!: THREE.Group;
  private eyes!: THREE.Group;
  private leftEye!: THREE.Mesh;
  private rightEye!: THREE.Mesh;
  private mouthVisualizer!: THREE.Mesh;
  private leftEar!: THREE.Mesh;
  private rightEar!: THREE.Mesh;
  private ring!: THREE.Mesh;

  // Smoothed audio data
  private smoothedAudioData = new THREE.Vector3(0, 0, 0);

  // Morphs for facial animation (realistic models)
  private headMesh!: THREE.SkinnedMesh | null;
  private mouthOpenMorph = 0;
  private eyeBlinkMorph = 0;
  private blinkTimer = 0;
  private blinkState = 0;
  private targetLookAt = new THREE.Vector3(0, 0, 5);
  private currentLookAt = new THREE.Vector3(0, 0, 5);

  // Avatar configuration
  @property({type: Object}) 
  avatarConfig: AvatarConfig = {...DEFAULT_AVATAR_CONFIG};

  @property({type: String})
  modelUrl = ''; // URL du modèle GLB/GLTF

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('modelUrl') && this.modelUrl && this.scene) {
      this.loadGLTFModel(this.modelUrl);
    }
  }

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: auto;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: 'Google Sans', sans-serif;
      font-size: 1.2rem;
      z-index: 100;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #8ab4f8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  private async loadGLTFModel(url: string) {
    try {
      // Clear existing model
      if (this.loadedModel) {
        this.avatarGroup.remove(this.loadedModel);
      }

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      
      this.loadedModel = gltf.scene;
      
      // Setup animations
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.loadedModel);
        
        // Find idle and talking animations
        gltf.animations.forEach((clip) => {
          const action = this.mixer.clipAction(clip);
          if (clip.name.toLowerCase().includes('idle')) {
            this.idleAction = action;
            action.play();
          } else if (clip.name.toLowerCase().includes('talk')) {
            this.talkingAction = action;
          }
        });
      }

      // Find head mesh for morph targets
      this.loadedModel.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh) {
          if (child.name.toLowerCase().includes('head') || 
              child.name.toLowerCase().includes('face')) {
            this.headMesh = child;
          }
        }
      });

      // Scale and position
      const box = new THREE.Box3().setFromObject(this.loadedModel);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.8 / Math.max(size.x, size.y, size.z);
      this.loadedModel.scale.setScalar(scale);

      // Center and position
      const center = box.getCenter(new THREE.Vector3());
      this.loadedModel.position.x = -center.x * scale;
      this.loadedModel.position.y = -box.min.y * scale - 0.3; // Feet on ground
      this.loadedModel.position.z = -center.z * scale;

      // Enable shadows
      this.loadedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.avatarGroup.add(this.loadedModel);
      
      console.log('✅ Modèle 3D chargé avec succès');
      
    } catch (error) {
      console.error('Error loading GLTF model:', error);
      // Fallback to geometric avatar
      this.buildGeometricAvatar();
    }
  }

  private getHeadGeometry(): THREE.BufferGeometry {
    switch (this.avatarConfig.headShape) {
      case 'sphere':
        return new THREE.SphereGeometry(1.0, 32, 32);
      case 'cube':
        return new THREE.BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4);
      case 'octahedron':
        return new THREE.OctahedronGeometry(1.2, 1);
      case 'icosahedron':
      default:
        return new THREE.IcosahedronGeometry(1.0, 2);
    }
  }

  private getEyeGeometry(): THREE.BufferGeometry {
    switch (this.avatarConfig.eyeShape) {
      case 'sphere':
        return new THREE.SphereGeometry(0.08, 16, 16);
      case 'box':
        return new THREE.BoxGeometry(0.15, 0.25, 0.08);
      case 'capsule':
      default:
        return new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
    }
  }

  private buildGeometricAvatar() {
    // Clear existing parts
    this.avatarGroup.children = [];

    this.headGroup = new THREE.Group();
    this.avatarGroup.add(this.headGroup);

    const cfg = this.avatarConfig;

    // Head
    const headGeometry = this.getHeadGeometry();
    const headMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.headColor),
      metalness: cfg.headMetalness,
      roughness: cfg.headRoughness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(cfg.headColor).multiplyScalar(0.2),
      emissiveIntensity: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    this.headGroup.add(head);

    // Face plate
    const facePlateGeometry = new THREE.CircleGeometry(0.8, 64);
    const facePlateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111122,
      metalness: 0.8,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
      transmission: 0.1
    });
    const facePlate = new THREE.Mesh(facePlateGeometry, facePlateMaterial);
    facePlate.position.set(0, 0.1, 1.02);
    this.headGroup.add(facePlate);

    // Eyes
    this.eyes = new THREE.Group();
    this.eyes.position.set(0, 0.25, 1.05);
    this.headGroup.add(this.eyes);

    const eyeGeometry = this.getEyeGeometry();
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cfg.eyeColor),
      transparent: true,
      opacity: 0.9
    });

    this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    if (cfg.eyeShape === 'capsule') this.leftEye.rotation.z = Math.PI / 2;
    this.leftEye.position.set(-cfg.eyeSpacing, 0, 0);
    this.leftEye.scale.setScalar(cfg.eyeSize);
    this.eyes.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    if (cfg.eyeShape === 'capsule') this.rightEye.rotation.z = Math.PI / 2;
    this.rightEye.position.set(cfg.eyeSpacing, 0, 0);
    this.rightEye.scale.setScalar(cfg.eyeSize);
    this.eyes.add(this.rightEye);

    // Mouth
    let mouthGeometry: THREE.BufferGeometry;
    switch (cfg.mouthStyle) {
      case 'wave':
        mouthGeometry = new THREE.TorusGeometry(0.25, 0.04, 8, 32, Math.PI);
        break;
      case 'circle':
        mouthGeometry = new THREE.TorusGeometry(0.2, 0.04, 16, 32);
        break;
      case 'line':
        mouthGeometry = new THREE.BoxGeometry(0.5, 0.03, 0.03);
        break;
      case 'bar':
      default:
        mouthGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.08);
    }

    const mouthMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.mouthColor),
      emissive: new THREE.Color(cfg.mouthColor),
      emissiveIntensity: cfg.mouthIntensity,
      metalness: 0.7,
      roughness: 0.3
    });
    this.mouthVisualizer = new THREE.Mesh(mouthGeometry, mouthMaterial);
    this.mouthVisualizer.position.set(0, -0.25, 1.08);
    if (cfg.mouthStyle === 'wave') this.mouthVisualizer.rotation.z = Math.PI;
    this.headGroup.add(this.mouthVisualizer);

    // Ears
    if (cfg.hasEars) {
      const earGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
      const earMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x222233,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x001144,
        emissiveIntensity: 0.5
      });

      this.leftEar = new THREE.Mesh(earGeometry, earMaterial.clone());
      this.leftEar.rotation.z = Math.PI / 2;
      this.leftEar.position.set(-1.1, 0.1, 0);
      this.headGroup.add(this.leftEar);

      this.rightEar = new THREE.Mesh(earGeometry, earMaterial.clone());
      this.rightEar.rotation.z = Math.PI / 2;
      this.rightEar.position.set(1.1, 0.1, 0);
      this.headGroup.add(this.rightEar);
    }

    // Ring
    if (cfg.hasRing) {
      const ringGeometry = new THREE.TorusGeometry(1.4, 0.02, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.ringColor),
        transparent: true,
        opacity: 0.4
      });
      this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
      this.ring.rotation.x = Math.PI / 6;
      this.headGroup.add(this.ring);
    }

    // Apply global scale
    this.avatarGroup.scale.setScalar(cfg.scale);
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020204);

    // Lighting for realistic models
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 5, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.8);
    fillLight.position.set(-3, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x44ffff, 2.0, 20);
    rimLight.position.set(0, 3, -3);
    this.scene.add(rimLight);

    // Backdrop
    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(20, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: {value: new THREE.Vector2(1, 1)},
          rand: {value: 0},
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.2
      }),
    );
    this.scene.add(backdrop);
    this.backdrop = backdrop;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 1, 4);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Avatar Group
    this.avatarGroup = new THREE.Group();
    this.scene.add(this.avatarGroup);

    // Load model or fallback
    if (this.modelUrl) {
      this.loadGLTFModel(this.modelUrl);
    } else {
      this.buildGeometricAvatar();
    }

    // Particles
    const particleCount = 1500;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount; i++) {
        const r = 3 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0x5588aa,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.particles);

    // Post Processing
    const renderPass = new RenderPass(this.scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.4,
      0.4,
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    this.composer = composer;

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const dPR = renderer.getPixelRatio();
      const w = window.innerWidth;
      const h = window.innerHeight;
      backdrop.material.uniforms.resolution.value.set(w * dPR, h * dPR);
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    this.animation();
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const t = performance.now() / 1000;
    const dt = t - this.prevTime;
    this.prevTime = t;

    // Audio processing
    const inLow = this.inputAnalyser.data[0] / 255;
    const inMid = this.inputAnalyser.data[1] / 255;
    const inHigh = this.inputAnalyser.data[2] / 255;
    
    const outLow = this.outputAnalyser.data[0] / 255;
    const outMid = this.outputAnalyser.data[1] / 255;
    const outHigh = this.outputAnalyser.data[2] / 255;

    const targetLow = Math.max(inLow, outLow);
    const targetMid = Math.max(inMid, outMid);
    const targetHigh = Math.max(inHigh, outHigh);

    // Smooth audio data
    const lerpFactor = 0.2;
    this.smoothedAudioData.x += (targetLow - this.smoothedAudioData.x) * lerpFactor;
    this.smoothedAudioData.y += (targetMid - this.smoothedAudioData.y) * lerpFactor;
    this.smoothedAudioData.z += (targetHigh - this.smoothedAudioData.z) * lerpFactor;

    // Animation for realistic 3D models
    const hasRealisticModel = this.loadedModel && !this.headGroup;
    
    if (hasRealisticModel) {
      // Update animation mixer
      if (this.mixer) {
        this.mixer.update(dt);
        
        // Blend between idle and talking
        if (this.idleAction && this.talkingAction) {
          const talkWeight = this.smoothedAudioData.x;
          this.idleAction.setEffectiveWeight(1 - talkWeight);
          this.talkingAction.setEffectiveWeight(talkWeight);
          if (!this.talkingAction.isRunning() && talkWeight > 0.1) {
            this.talkingAction.play();
          }
        }
      }

      // Morph targets for facial expressions
      if (this.headMesh && this.headMesh.morphTargetInfluences) {
        const influences = this.headMesh.morphTargetInfluences;
        const dict = this.headMesh.morphTargetDictionary;
        
        // Mouth open based on audio
        if (dict && dict['mouthOpen'] !== undefined) {
          influences[dict['mouthOpen']] = this.smoothedAudioData.x * 0.8;
        }
        
        // Blinking
        this.blinkTimer += dt;
        if (this.blinkTimer > 3) {
          this.eyeBlinkMorph = 1;
          this.blinkTimer = 0;
        }
        if (this.eyeBlinkMorph > 0) {
          this.eyeBlinkMorph -= dt * 5;
          if (dict && dict['eyesClosed'] !== undefined) {
            influences[dict['eyesClosed']] = Math.max(0, this.eyeBlinkMorph);
          }
        }
      }

      // Idle bob animation (always active)
      const idleY = Math.sin(t * 1.2) * 0.03;
      const speechBob = Math.sin(t * 8) * this.smoothedAudioData.x * 0.05;
      this.avatarGroup.position.y = idleY + speechBob;

      // Subtle head movement
      const lookX = Math.sin(t * 0.4) * 0.1;
      const lookY = Math.cos(t * 0.6) * 0.05 + this.smoothedAudioData.x * 0.1;
      this.avatarGroup.rotation.y = lookX;
      this.avatarGroup.rotation.x = lookY;

      // Slight head tilt when talking
      this.avatarGroup.rotation.z = Math.sin(t * 0.5) * 0.05 + 
                                     Math.sin(t * 12) * this.smoothedAudioData.x * 0.08;
    }

    // Animation for geometric avatar
    if (this.headGroup && this.eyes) {
      // Idle bob and speech bob
      const idleY = Math.sin(t * 1.2) * 0.08;
      const speechBob = Math.sin(t * 10) * this.smoothedAudioData.x * 0.12;
      this.avatarGroup.position.y = idleY + speechBob;

      // Head tilt
      const idleTilt = Math.sin(t * 0.6) * 0.08;
      const speechNod = Math.sin(t * 8) * this.smoothedAudioData.x * 0.15;
      this.avatarGroup.rotation.z = idleTilt;
      this.avatarGroup.rotation.x = speechNod;

      // Squash and stretch
      const scaleX = 1.0 + this.smoothedAudioData.x * 0.08;
      const scaleY = 1.0 + (1.0 - scaleX) * 0.5;
      this.headGroup.scale.set(scaleX, scaleY, scaleX);

      // Blinking
      this.blinkTimer += dt;
      if (this.blinkTimer > 3 && this.blinkState === 0) {
        this.blinkState = 1;
        this.blinkTimer = 0;
        this.targetLookAt.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1,
          5
        );
      }

      if (this.blinkState === 1) {
        this.leftEye.scale.y = Math.max(0.1, this.leftEye.scale.y - 0.15);
        this.rightEye.scale.y = Math.max(0.1, this.rightEye.scale.y - 0.15);
        if (this.leftEye.scale.y <= 0.1) {
          this.blinkState = 2;
        }
      } else if (this.blinkState === 2) {
        this.leftEye.scale.y = Math.min(1.0, this.leftEye.scale.y + 0.15);
        this.rightEye.scale.y = Math.min(1.0, this.rightEye.scale.y + 0.15);
        if (this.leftEye.scale.y >= 1.0) {
          this.blinkState = 0;
        }
      }

      // Eye expression
      if (this.blinkState === 0) {
        const eyeWide = 1.0 + this.smoothedAudioData.x * 0.4;
        this.leftEye.scale.y = eyeWide;
        this.rightEye.scale.y = eyeWide;
      }

      // Look at
      this.currentLookAt.lerp(this.targetLookAt, 0.03);
      this.eyes.lookAt(this.currentLookAt);

      // Mouth animation
      if (this.mouthVisualizer) {
        const mouthHeight = 0.08 + this.smoothedAudioData.x * 0.6;
        const mouthWidth = 1.0 + this.smoothedAudioData.y * 0.4;
        this.mouthVisualizer.scale.set(mouthWidth, mouthHeight / 0.08, 1);

        const mouthMat = this.mouthVisualizer.material as THREE.MeshStandardMaterial;
        const hue = 0.55 - this.smoothedAudioData.x * 0.15;
        mouthMat.color.setHSL(hue, 0.9, 0.5);
        mouthMat.emissive.setHSL(hue, 0.9, 0.4 + this.smoothedAudioData.x * 0.4);
        mouthMat.emissiveIntensity = 1.5 + this.smoothedAudioData.x * 2.0;
      }

      // Ears
      if (this.leftEar && this.rightEar) {
        const inMid = this.inputAnalyser.data[1] / 255;
        [this.leftEar, this.rightEar].forEach(ear => {
          const earMat = ear.material as THREE.MeshPhysicalMaterial;
          const pulse = 0.5 + inMid * 3.0;
          earMat.emissiveIntensity = pulse;
          const earScale = 1.0 + inMid * 0.15;
          ear.scale.set(earScale, earScale, earScale);
        });
      }
    }

    // Particles
    this.particles.rotation.y += 0.001;
    const particleScale = 1.0 + this.smoothedAudioData.x * 0.1;
    this.particles.scale.setScalar(particleScale);

    // Backdrop
    const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
    backdropMaterial.uniforms.rand.value = Math.random();

    this.composer.render();
  }

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    this.init();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}

