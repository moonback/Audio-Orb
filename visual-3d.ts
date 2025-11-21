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
import {deviceDetector} from './utils/device-detection';

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private audioVisualGroup!: THREE.Group;
  private particles!: THREE.Points;
  private particleSystem!: THREE.BufferGeometry;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private particleSizes!: Float32Array;
  private lines!: THREE.Line[];
  private centralShape!: THREE.Mesh;
  private outerRings: THREE.Mesh[] = [];
  private audioSpheres: THREE.Mesh[] = [];
  private prevTime = 0;
  private scene!: THREE.Scene;
  
  // Smoothed audio data
  private smoothedAudioData = new THREE.Vector3(0, 0, 0);
  
  // Speaker tracking (-1 = User, 1 = AI, 0 = None/Mixed)
  private currentSpeaker = 0; 
  private smoothedSpeaker = 0;
  
  // Performance settings
  private qualitySettings: ReturnType<typeof deviceDetector.get3DQualitySettings>;
  private renderer!: THREE.WebGLRenderer;
  private isPageVisible = true;
  private animationFrameId: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  @property({ type: Boolean }) 
  lowPowerMode = false;

  private _outputNode!: AudioNode;

  @property({attribute: false})
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    if (node) {
      this.outputAnalyser = new Analyser(this._outputNode);
    }
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property({attribute: false})
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    if (node) {
      this.inputAnalyser = new Analyser(this._inputNode);
    }
  }

  get inputNode() {
    return this._inputNode;
  }

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: auto;
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  private init() {
    // Get device-specific quality settings
    this.qualitySettings = deviceDetector.get3DQualitySettings();
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure black
    scene.fog = new THREE.FogExp2(0x000000, 0.05); // Subtle fog for depth
    this.scene = scene;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(ambientLight);
    
    // Add point lights for dynamic lighting
    const light1 = new THREE.PointLight(0x00ffff, 0.5, 10);
    light1.position.set(2, 2, 2);
    scene.add(light1);
    
    const light2 = new THREE.PointLight(0xff00ff, 0.5, 10);
    light2.position.set(-2, -2, 2);
    scene.add(light2);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.qualitySettings.antialias,
      powerPreference: "high-performance",
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(this.qualitySettings.pixelRatio);
    renderer.setClearColor(0x000000, 1);
    this.renderer = renderer;

    // Create main audio visual group
    const audioVisualGroup = new THREE.Group();
    this.audioVisualGroup = audioVisualGroup;
    scene.add(audioVisualGroup);

    // Enhanced Particle System with variable sizes
    const particleCount = Math.min(800, this.qualitySettings.barCount * 30);
    const particles = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      particles[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particles[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particles[i3 + 2] = radius * Math.cos(phi);
      
      velocities[i3] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.015;
      
      // Variable particle sizes for depth
      sizes[i] = Math.random() * 0.08 + 0.02;
      
      // Dynamic color based on radius (creates layers)
      const layerT = radius / 3.5;
      colors[i3] = 0.0 + layerT * 1.0;       // R: 0 -> 1
      colors[i3 + 1] = 0.9 - layerT * 0.9;   // G: 0.9 -> 0
      colors[i3 + 2] = 1.0;                  // B: constant
    }
    
    this.particlePositions = particles;
    this.particleVelocities = velocities;
    this.particleSizes = sizes;
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      map: this.createParticleTexture(),
    });
    
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.particleSystem = particleGeometry;
    audioVisualGroup.add(this.particles);

    // Central geometric shape - Audio-reactive icosahedron
    const icosaGeometry = new THREE.IcosahedronGeometry(0.6, 1);
    const icosaMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
      emissive: 0x00ffff,
      emissiveIntensity: 0.3,
    });
    this.centralShape = new THREE.Mesh(icosaGeometry, icosaMaterial);
    audioVisualGroup.add(this.centralShape);
    
    // Add outer rotating rings for depth
    for (let i = 0; i < 3; i++) {
      const ringRadius = 1.2 + i * 0.4;
      const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.02, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ffff : i === 1 ? 0xff00ff : 0x7f55cc,
        transparent: true,
        opacity: 0.3,
        wireframe: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI / 6);
      this.outerRings.push(ring);
      audioVisualGroup.add(ring);
    }
    
    // Add audio-reactive spheres at different positions
    const sphereCount = 6;
    for (let i = 0; i < sphereCount; i++) {
      const angle = (i / sphereCount) * Math.PI * 2;
      const radius = 2.5;
      const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
      this.audioSpheres.push(sphere);
      audioVisualGroup.add(sphere);
    }

    // Enhanced audio-reactive lines with glow
    this.lines = [];
    const lineCount = Math.min(50, particleCount / 10);
    for (let i = 0; i < lineCount; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(2 * 3);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.25,
        linewidth: 2,
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.lines.push(line);
      audioVisualGroup.add(line);
    }

    // Post Processing
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.qualitySettings.bloomIntensity * 1.5, // Increased intensity
      this.qualitySettings.bloomThreshold * 0.7, // Lower threshold for more glow
      this.qualitySettings.bloomRadius,
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    
    // Add FXAA only for high quality
    if (this.qualitySettings.enableFXAA) {
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * this.qualitySettings.pixelRatio);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * this.qualitySettings.pixelRatio);
      composer.addPass(fxaaPass);
    }

    this.composer = composer;

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(this.qualitySettings.pixelRatio);
      composer.setSize(w, h);
      
      // Update FXAA resolution if enabled
      if (this.qualitySettings.enableFXAA && composer.passes.length > 2) {
        const fxaaPass = composer.passes[2] as ShaderPass;
        if (fxaaPass && fxaaPass.material.uniforms['resolution']) {
          fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * this.qualitySettings.pixelRatio);
          fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * this.qualitySettings.pixelRatio);
        }
      }
      
      // Resize handled by camera aspect update
    };

    this.resizeHandler = onWindowResize;
    window.addEventListener('resize', this.resizeHandler);
    onWindowResize();

    // Pause animation when page is hidden (performance optimization)
    this.visibilityHandler = () => {
      this.isPageVisible = !document.hidden;
      if (this.isPageVisible && !this.animationFrameId) {
        this.animation();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.animation();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Cancel animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    if (this.particles) {
      if (Array.isArray(this.particles.material)) {
        this.particles.material.forEach(mat => mat.dispose());
      } else {
        this.particles.material.dispose();
      }
    }
    if (this.centralShape) {
      (this.centralShape.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(this.centralShape.material)) {
        this.centralShape.material.forEach(mat => mat.dispose());
      } else {
        this.centralShape.material.dispose();
      }
    }
    this.outerRings.forEach(ring => {
      (ring.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(ring.material)) {
        ring.material.forEach(mat => mat.dispose());
      } else {
        ring.material.dispose();
      }
    });
    this.audioSpheres.forEach(sphere => {
      (sphere.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(sphere.material)) {
        sphere.material.forEach(mat => mat.dispose());
      } else {
        sphere.material.dispose();
      }
    });
    this.lines.forEach(line => {
      (line.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach(mat => mat.dispose());
      } else {
        line.material.dispose();
      }
    });
    
    if (this.composer) {
      this.composer.dispose();
    }
  }

  private animation() {
    if (!this.isPageVisible) {
      this.animationFrameId = null;
      return; // Pause when page is hidden
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.animation());

    if (!this.inputAnalyser || !this.outputAnalyser) return;

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    // Low Power Mode Optimization
    if (this.lowPowerMode) {
       const inputMax = Math.max(...this.inputAnalyser.data);
       const outputMax = Math.max(...this.outputAnalyser.data);
       // If complete silence, slow ambient animation
       if (inputMax === 0 && outputMax === 0) {
           this.audioVisualGroup.rotation.y += 0.001;
           this.audioVisualGroup.rotation.x += 0.0005;
           this.composer.render();
           return;
       }
    }

    const t = performance.now() / 1000;
    this.prevTime = t;

    const inLow = this.inputAnalyser.data[0] / 255;
    const inMid = this.inputAnalyser.data[1] / 255;
    const inHigh = this.inputAnalyser.data[2] / 255;
    const inputSum = inLow + inMid + inHigh;
    
    const outLow = this.outputAnalyser.data[0] / 255;
    const outMid = this.outputAnalyser.data[1] / 255;
    const outHigh = this.outputAnalyser.data[2] / 255;
    const outputSum = outLow + outMid + outHigh;

    // Determine active speaker
    if (inputSum > 0.1 && inputSum > outputSum) {
        this.currentSpeaker = -1.0; // User
    } else if (outputSum > 0.1) {
        this.currentSpeaker = 1.0; // AI
    } else {
        this.currentSpeaker = 0.0; // Silence/Mixed
    }

    // Smooth transition for speaker color
    this.smoothedSpeaker += (this.currentSpeaker - this.smoothedSpeaker) * 0.05;

    const targetLow = Math.max(inLow, outLow);
    const targetMid = Math.max(inMid, outMid);
    const targetHigh = Math.max(inHigh, outHigh);

    const lerpFactor = 0.2;
    this.smoothedAudioData.x += (targetLow - this.smoothedAudioData.x) * lerpFactor;
    this.smoothedAudioData.y += (targetMid - this.smoothedAudioData.y) * lerpFactor;
    this.smoothedAudioData.z += (targetHigh - this.smoothedAudioData.z) * lerpFactor;

    // Update particle system
    const positions = this.particleSystem.attributes.position.array as Float32Array;
    const particleCount = positions.length / 3;
    const energy = this.smoothedAudioData.x + this.smoothedAudioData.y + this.smoothedAudioData.z;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Update velocity based on audio
      const audioIndex = Math.floor((i / particleCount) * 16);
      const inVal = this.inputAnalyser.data[audioIndex] || 0;
      const outVal = this.outputAnalyser.data[audioIndex] || 0;
      const audioValue = Math.max(inVal, outVal) / 255.0;
      
      // Apply audio-reactive forces (only when audio is present)
      if (audioValue > 0.1) {
        const force = audioValue * 0.05;
        this.particleVelocities[i3] += (Math.random() - 0.5) * force;
        this.particleVelocities[i3 + 1] += (Math.random() - 0.5) * force;
        this.particleVelocities[i3 + 2] += (Math.random() - 0.5) * force;
      }
      
      // Update positions
      positions[i3] += this.particleVelocities[i3];
      positions[i3 + 1] += this.particleVelocities[i3 + 1];
      positions[i3 + 2] += this.particleVelocities[i3 + 2];
      
      // Damping
      this.particleVelocities[i3] *= 0.97;
      this.particleVelocities[i3 + 1] *= 0.97;
      this.particleVelocities[i3 + 2] *= 0.97;
      
      // Boundary - pull back to center with audio-reactive expansion
      const dist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2);
      const maxDist = 2.5 + energy * 1.5;
      
      if (dist > maxDist) {
        const pull = 0.03;
        const normalized = dist > 0 ? dist : 1;
        positions[i3] *= (1 - pull);
        positions[i3 + 1] *= (1 - pull);
        positions[i3 + 2] *= (1 - pull);
      } else if (dist < 0.5) {
        // Push away from center if too close
        const push = 0.01;
        positions[i3] += (positions[i3] / dist) * push;
        positions[i3 + 1] += (positions[i3 + 1] / dist) * push;
        positions[i3 + 2] += (positions[i3 + 2] / dist) * push;
      }
    }
    
    this.particleSystem.attributes.position.needsUpdate = true;
    
    // Update central shape with smooth color transitions
    const icosaMat = this.centralShape.material as THREE.MeshPhongMaterial;
    const targetColor = new THREE.Color();
    if (this.smoothedSpeaker < -0.1) {
      targetColor.setHex(0x00ffff); // Cyan for user
    } else if (this.smoothedSpeaker > 0.1) {
      targetColor.setHex(0xff00ff); // Magenta for AI
    } else {
      targetColor.setHex(0x7f55cc); // Purple neutral
    }
    icosaMat.color.lerp(targetColor, 0.1);
    icosaMat.emissive.copy(icosaMat.color).multiplyScalar(0.3);
    
    const scale = 1 + energy * 0.4;
    this.centralShape.scale.set(scale, scale, scale);
    this.centralShape.rotation.x += 0.012 + energy * 0.025;
    this.centralShape.rotation.y += 0.018 + energy * 0.03;
    this.centralShape.rotation.z += 0.005 + energy * 0.01;
    
    // Update outer rings with audio-reactive rotation
    this.outerRings.forEach((ring, index) => {
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      ringMat.color.lerp(targetColor, 0.08);
      ringMat.opacity = 0.2 + energy * 0.3;
      
      const speed = 0.01 + (index * 0.005) + energy * 0.02;
      ring.rotation.z += speed * (index % 2 === 0 ? 1 : -1);
      ring.rotation.y += speed * 0.5;
      
      const ringScale = 1 + energy * 0.2;
      ring.scale.set(ringScale, ringScale, ringScale);
    });
    
    // Update audio-reactive spheres
    this.audioSpheres.forEach((sphere, index) => {
      const sphereMat = sphere.material as THREE.MeshBasicMaterial;
      sphereMat.color.lerp(targetColor, 0.1);
      
      const audioIndex = Math.floor((index / this.audioSpheres.length) * 16);
      const inVal = this.inputAnalyser.data[audioIndex] || 0;
      const outVal = this.outputAnalyser.data[audioIndex] || 0;
      const audioValue = Math.max(inVal, outVal) / 255.0;
      
      const sphereScale = 1 + audioValue * 2;
      sphere.scale.set(sphereScale, sphereScale, sphereScale);
      sphereMat.opacity = 0.4 + audioValue * 0.4;
      
      // Orbit animation
      const angle = (index / this.audioSpheres.length) * Math.PI * 2 + t * 0.3;
      const radius = 2.5 + Math.sin(t * 2 + index) * 0.3;
      sphere.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(t + index) * 0.5
      );
    });
    
    // Update connecting lines with smarter connections
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const linePos = line.geometry.attributes.position.array as Float32Array;
      
      // Connect nearby particles for more natural look
      const idx1 = Math.floor(Math.random() * particleCount);
      let minDist = Infinity;
      let idx2 = idx1;
      
      // Find a nearby particle
      for (let j = 0; j < Math.min(20, particleCount); j++) {
        const testIdx = Math.floor(Math.random() * particleCount);
        const i3_1 = idx1 * 3;
        const i3_2 = testIdx * 3;
        const dist = Math.sqrt(
          (positions[i3_1] - positions[i3_2]) ** 2 +
          (positions[i3_1 + 1] - positions[i3_2 + 1]) ** 2 +
          (positions[i3_1 + 2] - positions[i3_2 + 2]) ** 2
        );
        if (dist < minDist && dist > 0.1) {
          minDist = dist;
          idx2 = testIdx;
        }
      }
      
      const i3_1 = idx1 * 3;
      const i3_2 = idx2 * 3;
      
      linePos[0] = positions[i3_1];
      linePos[1] = positions[i3_1 + 1];
      linePos[2] = positions[i3_1 + 2];
      linePos[3] = positions[i3_2];
      linePos[4] = positions[i3_2 + 1];
      linePos[5] = positions[i3_2 + 2];
      
      line.geometry.attributes.position.needsUpdate = true;
      
      const lineMat = line.material as THREE.LineBasicMaterial;
      // Fade lines based on distance
      const maxLineDistance = 1.5;
      const distanceFade = Math.max(0, 1 - minDist / maxLineDistance);
      lineMat.opacity = (0.1 + energy * 0.4) * distanceFade;
      
      const targetLineColor = new THREE.Color();
      if (this.smoothedSpeaker < -0.1) {
        targetLineColor.setHex(0x00ffff);
      } else if (this.smoothedSpeaker > 0.1) {
        targetLineColor.setHex(0xff00ff);
      } else {
        targetLineColor.setHex(0x7f55cc);
      }
      lineMat.color.lerp(targetLineColor, 0.1);
    }
    
    // Rotate entire group with dynamic camera movement
    this.audioVisualGroup.rotation.y += 0.002 + this.smoothedAudioData.x * 0.004;
    this.audioVisualGroup.rotation.x += 0.001 + this.smoothedAudioData.y * 0.003;
    
    // Dynamic camera movement for depth
    this.camera.position.z = 5 + Math.sin(t * 0.5) * 0.3;
    this.camera.position.x = Math.sin(t * 0.3) * 0.2;
    this.camera.position.y = Math.cos(t * 0.3) * 0.2;
    this.camera.lookAt(0, 0, 0);

    this.composer.render();
  }
  
  // Create a circular gradient texture for particles
  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
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
