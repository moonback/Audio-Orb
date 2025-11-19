/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Device detection and performance profiling utilities
 */
export class DeviceDetector {
  private static instance: DeviceDetector;
  private cachedInfo: {
    isMobile: boolean;
    isTablet: boolean;
    isLowEnd: boolean;
    gpuTier: 'high' | 'medium' | 'low';
    recommendedQuality: 'high' | 'medium' | 'low';
  } | null = null;

  private constructor() {}

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * Detect device capabilities and performance tier
   */
  detect(): {
    isMobile: boolean;
    isTablet: boolean;
    isLowEnd: boolean;
    gpuTier: 'high' | 'medium' | 'low';
    recommendedQuality: 'high' | 'medium' | 'low';
  } {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    // Detect low-end device
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const isLowEnd = hardwareConcurrency <= 2 || deviceMemory <= 2;

    // Detect GPU tier
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
    let gpuTier: 'high' | 'medium' | 'low' = 'medium';
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        
        // High-end GPUs
        if (renderer.includes('NVIDIA') || 
            renderer.includes('AMD') || 
            renderer.includes('Apple M') ||
            renderer.includes('Intel Iris')) {
          gpuTier = 'high';
        }
        // Low-end GPUs
        else if (renderer.includes('Intel HD') || 
                 renderer.includes('Mali') ||
                 renderer.includes('Adreno 3') ||
                 renderer.includes('PowerVR')) {
          gpuTier = 'low';
        }
      }
    }

    // Determine recommended quality
    let recommendedQuality: 'high' | 'medium' | 'low' = 'medium';
    if (isMobile || isLowEnd || gpuTier === 'low') {
      recommendedQuality = 'low';
    } else if (gpuTier === 'high' && !isMobile && !isLowEnd) {
      recommendedQuality = 'high';
    }

    this.cachedInfo = {
      isMobile,
      isTablet,
      isLowEnd,
      gpuTier,
      recommendedQuality,
    };

    return this.cachedInfo;
  }

  /**
   * Get recommended buffer size for audio processing
   * Must be a power of 2 between 256 and 16384
   */
  getRecommendedBufferSize(): number {
    const info = this.detect();
    // Smaller buffer = lower latency but more CPU
    // Must be power of 2: 256, 512, 1024, 2048, 4096, 8192, 16384
    if (info.isLowEnd) {
      return 512; // Larger buffer for low-end devices
    } else if (info.isMobile) {
      return 256; // Medium buffer for mobile
    } else {
      return 256; // Small buffer for desktop (lower latency) - minimum is 256
    }
  }

  /**
   * Get recommended 3D quality settings
   */
  get3DQualitySettings(): {
    pixelRatio: number;
    antialias: boolean;
    bloomIntensity: number;
    bloomThreshold: number;
    bloomRadius: number;
    barCount: number;
    enableFXAA: boolean;
  } {
    const info = this.detect();
    
    if (info.recommendedQuality === 'low') {
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 1),
        antialias: false,
        bloomIntensity: 0.4,
        bloomThreshold: 0.5,
        bloomRadius: 0.2,
        barCount: 32,
        enableFXAA: false,
      };
    } else if (info.recommendedQuality === 'medium') {
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        antialias: true,
        bloomIntensity: 0.6,
        bloomThreshold: 0.4,
        bloomRadius: 0.3,
        barCount: 40,
        enableFXAA: false,
      };
    } else {
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        antialias: true,
        bloomIntensity: 0.8,
        bloomThreshold: 0.3,
        bloomRadius: 0.4,
        barCount: 48,
        enableFXAA: true,
      };
    }
  }
}

export const deviceDetector = DeviceDetector.getInstance();

