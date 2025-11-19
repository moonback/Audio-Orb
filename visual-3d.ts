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

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS, fs as sphereFS} from './sphere-shader';

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private particles!: THREE.Points;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);

  // Smoothed audio data
  private smoothedAudioData = new THREE.Vector3(0, 0, 0);

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

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  private init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204); // Even darker background

    // Lights (still kept for backup, though shader is emissive)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Backdrop
    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(20, 5), // Larger backdrop
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
        opacity: 0.3 // Reduced opacity
      }),
    );
    scene.add(backdrop);
    this.backdrop = backdrop;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 4); // Slightly closer
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance

    // Main Sphere
    const geometry = new THREE.SphereGeometry(1.2, 128, 128); // High res sphere
    
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        frequency: { value: 0 },
        audioData: { value: new THREE.Vector3() }
      },
      vertexShader: sphereVS,
      fragmentShader: sphereFS,
      transparent: true,
    });

    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);
    this.sphere = sphere;

    // Particle System
    const particleCount = 1500; // Slightly fewer particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount; i++) {
        const r = 2 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0x5588aa, // Darker blue/grey
        size: 0.02,
        transparent: true,
        opacity: 0.4, // Reduced opacity
        blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(this.particles);


    // Post Processing
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,  // strength (reduced from 2.0)
      0.4,  // radius
      0.25, // threshold (increased from 0.1 to reduce overall glow)
    );
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;
    bloomPass.threshold = 0.2;

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

    const t = performance.now() / 1000; // Time in seconds
    const dt = t - this.prevTime;
    this.prevTime = t;

    // Audio Data Processing
    // Get max values from input (mic) and output (AI)
    // Analyser data is 0-255
    
    // Combine input and output for a unified visual
    // We want the sphere to react to both user and AI
    const inLow = this.inputAnalyser.data[0] / 255;
    const inMid = this.inputAnalyser.data[1] / 255;
    const inHigh = this.inputAnalyser.data[2] / 255;
    
    const outLow = this.outputAnalyser.data[0] / 255;
    const outMid = this.outputAnalyser.data[1] / 255;
    const outHigh = this.outputAnalyser.data[2] / 255;

    const targetLow = Math.max(inLow, outLow);
    const targetMid = Math.max(inMid, outMid);
    const targetHigh = Math.max(inHigh, outHigh);

    // Smooth the data (Lerp)
    const lerpFactor = 0.15;
    this.smoothedAudioData.x += (targetLow - this.smoothedAudioData.x) * lerpFactor;
    this.smoothedAudioData.y += (targetMid - this.smoothedAudioData.y) * lerpFactor;
    this.smoothedAudioData.z += (targetHigh - this.smoothedAudioData.z) * lerpFactor;

    // Update Sphere Uniforms
    const sphereMat = this.sphere.material as THREE.ShaderMaterial;
    sphereMat.uniforms.time.value = t;
    sphereMat.uniforms.audioData.value.copy(this.smoothedAudioData);
    
    // Subtle rotation
    this.sphere.rotation.y += 0.005 + this.smoothedAudioData.x * 0.02;
    this.sphere.rotation.z += 0.002;

    // Particles Animation
    this.particles.rotation.y -= 0.002;
    this.particles.rotation.x += 0.001;
    
    // Pulse particles on kick
    const scale = 1 + this.smoothedAudioData.x * 0.2;
    this.particles.scale.set(scale, scale, scale);

    // Camera Movement (gentle orbit)
    const camTime = t * 0.2;
    this.camera.position.x = Math.sin(camTime) * 0.5;
    this.camera.position.y = Math.cos(camTime * 0.7) * 0.5;
    this.camera.lookAt(0, 0, 0);

    // Backdrop update
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
