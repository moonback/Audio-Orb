/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const noise = `
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;

    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

const vs = `
  ${noise}
  
  uniform float time;
  uniform float frequency; // Overall amplitude/frequency factor
  uniform vec3 audioData; // x=low, y=mid, z=high
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Base noise for organic movement
    float noise1 = snoise(position * 1.5 + time * 0.5);
    
    // Detail noise reacting to high frequencies
    float noise2 = snoise(position * 4.0 - time * 1.0);
    
    // Combine noise with audio data
    // Low freqs affect large slow movements
    // High freqs affect small sharp movements
    float displacement = 
      (noise1 * (0.5 + audioData.x * 1.5)) + 
      (noise2 * (audioData.z * 0.5));
      
    vDisplacement = displacement;

    vec3 newPosition = position + normal * displacement * 0.3;
    vPosition = newPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fs = `
  uniform float time;
  uniform vec3 audioData;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Cosine based palette, 4 vec3 params
  vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
      return a + b * cos( 6.28318 * ( c * t + d ) );
  }

  void main() {
    // Darker, Moody Palette (Deep Space)
    // Lower 'a' component means darker average color
    vec3 a = vec3(0.15, 0.12, 0.25); 
    vec3 b = vec3(0.3, 0.3, 0.35);
    vec3 c = vec3(0.8, 0.8, 0.8);
    vec3 d = vec3(0.0, 0.33, 0.67); // Blue/Purple hues

    // Calculate a parameter 't' for the palette based on position and displacement
    float t = vDisplacement * 1.2 + length(vPosition) * 0.5 + time * 0.15;
    
    // Audio reactivity on color cycle speed
    t += audioData.y * 0.3; 

    vec3 color = palette(t, a, b, c, d);

    // Add extra vibrancy based on high frequencies (sparkle effect) - Reduced intensity
    vec3 sparkleColor = vec3(0.8, 0.7, 0.5); // Muted Gold
    float noiseVal = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    
    // Only sparkle on very high peaks
    if (audioData.z > 0.5 && noiseVal > 0.92) {
        color += sparkleColor * (audioData.z - 0.4);
    }

    // Deepen shadows significantly for "dark mode" feel
    float cavity = smoothstep(-0.5, 0.6, vDisplacement);
    color *= 0.3 + 0.7 * cavity; // Darker shadows

    // Fresnel / Rim Light - Darker and subtler
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 4.0); // Higher power = thinner rim
    
    // Rim color
    vec3 rimColor = mix(vec3(0.0, 0.2, 0.5), vec3(0.6, 0.0, 0.3), audioData.x);
    color += rimColor * fresnel * 1.0;

    // Reduced final boost
    color *= 0.9;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export {vs, fs};
