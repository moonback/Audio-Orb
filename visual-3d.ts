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
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as waveformVS, fs as waveformFS} from './waveform-shader';

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private waveformGroup!: THREE.Group;
  private waveformBars: THREE.Mesh[] = [];
  private prevTime = 0;
  
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

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

    // Professional Waveform with adaptive quality
    const aspect = window.innerWidth / window.innerHeight;
    const barCount = this.qualitySettings.barCount;
    const baseRadius = Math.min(2.2, 2.0 * Math.min(aspect, 1.0 / aspect));
    const barWidth = 0.05;
    
    const waveformGroup = new THREE.Group();
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barGeometry = new THREE.BoxGeometry(barWidth, 0.1, barWidth);
      
      const barMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioData: { value: new THREE.Vector3() },
          barIndex: { value: i / barCount },
          audioValue: { value: 0 },
          activeSpeaker: { value: 0 } // New uniform
        },
        vertexShader: waveformVS,
        fragmentShader: waveformFS,
        transparent: true,
      });
      
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      
      bar.position.x = Math.cos(angle) * baseRadius;
      bar.position.y = Math.sin(angle) * baseRadius;
      bar.position.z = 0;
      
      bar.rotation.z = angle + Math.PI / 2;
      
      waveformGroup.add(bar);
      this.waveformBars.push(bar);
    }
    
    scene.add(waveformGroup);
    this.waveformGroup = waveformGroup;

    // Post Processing
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.qualitySettings.bloomIntensity,
      this.qualitySettings.bloomThreshold,
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
      
      const aspect = w / h;
      const baseRadius = Math.min(2.2, 2.0 * Math.min(aspect, 1.0 / aspect));
      const barCount = this.waveformBars.length;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        this.waveformBars[i].position.x = Math.cos(angle) * baseRadius;
        this.waveformBars[i].position.y = Math.sin(angle) * baseRadius;
      }
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
    
    this.waveformBars.forEach(bar => {
      (bar.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(bar.material)) {
        bar.material.forEach(mat => mat.dispose());
      } else {
        bar.material.dispose();
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
       // If complete silence, we can skip heavy rendering or reduce frame rate
       // For now, we just let it rotate slowly but skip bar updates to save some CPU
       if (inputMax === 0 && outputMax === 0) {
           this.waveformGroup.rotation.z += 0.001;
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

    const barCount = this.waveformBars.length;
    const aspect = window.innerWidth / window.innerHeight;
    const baseRadius = Math.min(2.0, 1.8 * Math.min(aspect, 1.0 / aspect));
    
    for (let i = 0; i < barCount; i++) {
      const bar = this.waveformBars[i];
      const mat = bar.material as THREE.ShaderMaterial;
      
      const audioIndex = Math.floor((i / barCount) * 16);
      const inVal = this.inputAnalyser.data[audioIndex] || 0;
      const outVal = this.outputAnalyser.data[audioIndex] || 0;
      const audioValue = Math.max(inVal, outVal) / 255.0;
      
      mat.uniforms.time.value = t;
      mat.uniforms.audioData.value.copy(this.smoothedAudioData);
      mat.uniforms.audioValue.value = audioValue;
      mat.uniforms.activeSpeaker.value = this.smoothedSpeaker; // Pass speaker info
      
      const angle = (i / barCount) * Math.PI * 2;
      const barHeight = 0.15 + audioValue * 2.8;
      
      const currentScale = bar.scale.y;
      const targetScale = barHeight;
      bar.scale.y += (targetScale - currentScale) * 0.3;
      
      bar.position.x = Math.cos(angle) * baseRadius;
      bar.position.y = Math.sin(angle) * baseRadius;
    }
    
    this.waveformGroup.rotation.z += 0.001 + this.smoothedAudioData.x * 0.005;

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
