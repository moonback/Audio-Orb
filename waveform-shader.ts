/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Professional waveform shader - Elegant and performant
 */

const vs = `
  uniform float time;
  uniform vec3 audioData; // x=low, y=mid, z=high
  uniform float barIndex; // 0.0 to 1.0
  uniform float audioValue; // 0.0 to 1.0
  
  varying vec3 vColor;
  varying float vIntensity;
  varying vec2 vUv;
  varying float vHeight;
  
  void main() {
    vIntensity = audioValue;
    vUv = uv;
    
    // Elegant gradient color palette - Professional blue to cyan
    vec3 primaryColor = vec3(0.4, 0.7, 1.0);   // Bright cyan-blue
    vec3 secondaryColor = vec3(0.6, 0.4, 0.9); // Purple accent
    vec3 accentColor = vec3(0.2, 0.9, 0.8);    // Cyan highlight
    
    // Smooth color transition based on position
    float colorMix = smoothstep(0.0, 1.0, barIndex);
    vec3 baseColor = mix(primaryColor, secondaryColor, colorMix * 0.6);
    
    // Add accent color based on high frequencies
    baseColor = mix(baseColor, accentColor, audioData.z * 0.3);
    
    vColor = baseColor;
    
    // Calculate height for gradient effect
    vHeight = (position.y + 0.5) * 2.0;
    
    // Standard vertex transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fs = `
  uniform float time;
  uniform vec3 audioData;
  uniform float audioValue;
  uniform float barIndex;
  
  varying vec3 vColor;
  varying float vIntensity;
  varying vec2 vUv;
  varying float vHeight;
  
  void main() {
    // Base color with subtle gradient
    vec3 color = vColor;
    
    // Elegant vertical gradient (brighter at top)
    float gradient = smoothstep(0.0, 1.0, vHeight);
    color = mix(color * 0.6, color, gradient);
    
    // Subtle glow effect - more refined
    float glow = pow(vIntensity, 2.0) * 0.4;
    vec3 glowColor = vColor * 1.5;
    color += glowColor * glow;
    
    // Smooth brightness variation with audio
    float brightness = 0.5 + audioValue * 0.5;
    color *= brightness;
    
    // Refined edge glow
    float edge = abs(vUv.x - 0.5) * 2.0;
    float edgeGlow = pow(1.0 - edge, 3.0) * 0.3;
    color += vColor * edgeGlow * vIntensity;
    
    // Professional alpha with smooth fade
    float alpha = 0.3 + vIntensity * 0.7;
    alpha = smoothstep(0.0, 1.0, alpha);
    
    // Subtle time-based shimmer (very subtle)
    float shimmer = sin(time * 0.5 + barIndex * 10.0) * 0.02 + 1.0;
    color *= shimmer;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export {vs, fs};

