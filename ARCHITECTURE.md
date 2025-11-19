# 🏗️ Architecture Technique - Audio Orb

Ce document décrit l'architecture complète de l'application Audio Orb, ses composants, flux de données et interactions.

## 📐 Vue d'Ensemble

Audio Orb est une **application frontend monolithique** construite avec des Web Components (Lit) et Three.js. L'application communique directement avec l'API Google Gemini Live via WebSocket, sans backend intermédiaire.

```
┌─────────────────────────────────────────────────────────────┐
│                    Navigateur Web                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Audio Orb Application (Frontend)              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │   GdmLive    │  │  Visuals3D   │  │  Analyser  │ │  │
│  │  │   Audio      │◄─┤  Component   │◄─┤  (Audio)   │ │  │
│  │  │  Component   │  │  (Three.js)  │  │            │ │  │
│  │  └──────┬───────┘  └──────────────┘  └────────────┘ │  │
│  │         │                                            │  │
│  │         │ WebSocket                                  │  │
│  │         ▼                                            │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │      Google Gemini Live API                   │   │  │
│  │  │  (gemini-2.5-flash-native-audio-preview)      │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Microphone  │  │  AudioContext│  │  localStorage │    │
│  │  (Input)     │  │  (Web Audio) │  │  (Settings)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Composants Principaux

### 1. GdmLiveAudio (`index.tsx`)

**Type** : Lit Element (Web Component)  
**Responsabilité** : Composant principal orchestrant toute l'application

#### Architecture Interne

```
GdmLiveAudio
├── État (State)
│   ├── isRecording: boolean
│   ├── status: string
│   ├── selectedVoice: string
│   ├── selectedStyle: string
│   ├── playbackRate: number
│   ├── detune: number
│   ├── isThinkingMode: boolean
│   └── memory: string
│
├── Audio Contexts
│   ├── inputAudioContext (16kHz) - Capture microphone
│   └── outputAudioContext (24kHz) - Lecture réponse IA
│
├── Audio Nodes
│   ├── inputNode: GainNode (entrée)
│   ├── outputNode: GainNode (sortie)
│   ├── sourceNode: MediaStreamSourceNode
│   └── scriptProcessorNode: ScriptProcessorNode
│
├── Session Gemini
│   ├── client: GoogleGenAI
│   └── session: Session (WebSocket)
│
└── Méthodes Principales
    ├── initClient() - Initialise le client Gemini
    ├── initSession() - Crée une nouvelle session Live
    ├── startRecording() - Démarre la capture audio
    ├── stopRecording() - Arrête la capture
    ├── updateMemoryFromSession() - Met à jour la mémoire
    └── reset() - Réinitialise la session
```

#### Flux de Données Audio

```
Microphone
    │
    ▼
MediaStream (getUserMedia)
    │
    ▼
MediaStreamSourceNode
    │
    ▼
ScriptProcessorNode (bufferSize: 256)
    │
    ▼
Float32Array (PCM)
    │
    ▼
createBlob() → Int16Array → Base64
    │
    ▼
session.sendRealtimeInput({media: blob})
    │
    ▼
Google Gemini Live API
```

#### Flux de Réponse Audio

```
Google Gemini Live API
    │
    ▼
onmessage (LiveServerMessage)
    │
    ├─► Audio (inlineData)
    │   │
    │   ▼
    │   decodeAudioData()
    │   │
    │   ▼
    │   AudioBuffer
    │   │
    │   ▼
    │   BufferSourceNode
    │   │
    │   ▼
    │   outputNode → Speakers
    │
    └─► Transcription
        │
        ▼
        currentSessionTranscript[]
        │
        ▼
        updateMemoryFromSession()
```

### 2. GdmLiveAudioVisuals3D (`visual-3d.ts`)

**Type** : Lit Element (Web Component)  
**Responsabilité** : Rendu 3D et visualisation audio-réactive

#### Architecture Three.js

```
Scene
├── Lights
│   ├── AmbientLight (0.4 intensity)
│   ├── DirectionalLight (2.0 intensity)
│   ├── PointLight (blue, -5, 0, 2)
│   └── PointLight (red, 5, 0, 2)
│
├── Backdrop
│   ├── Geometry: IcosahedronGeometry(10, 5)
│   └── Material: RawShaderMaterial
│       ├── Vertex Shader: backdropVS
│       └── Fragment Shader: backdropFS
│
├── Sphere (Principal)
│   ├── Geometry: IcosahedronGeometry(1, 60)
│   └── Material: MeshStandardMaterial
│       ├── Custom Vertex Shader: sphereVS
│       ├── Uniforms: time, inputData, outputData
│       └── Properties: metalness, roughness, emissive
│
└── Post-Processing
    ├── RenderPass
    ├── UnrealBloomPass (intensity: 1.5, threshold: 0.4, radius: 0.85)
    └── FXAAShader (optionnel, commenté)
```

#### Connexion Audio → Visualisation

```
inputNode (AudioNode)
    │
    ▼
Analyser (inputAnalyser)
    │
    ▼
getByteFrequencyData()
    │
    ▼
dataArray: Uint8Array[16]
    │
    ├─► sphere.scale (outputAnalyser.data[1])
    ├─► rotation.x (outputAnalyser.data[1])
    ├─► rotation.z (inputAnalyser.data[1])
    ├─► rotation.y (inputAnalyser.data[2] + outputAnalyser.data[2])
    ├─► shader.uniforms.time (outputAnalyser.data[0])
    ├─► shader.uniforms.inputData (inputAnalyser.data[0,1,2])
    └─► shader.uniforms.outputData (outputAnalyser.data[0,1,2])
```

### 3. Analyser (`analyser.ts`)

**Type** : Classe utilitaire  
**Responsabilité** : Analyse FFT des signaux audio

```typescript
Analyser
├── analyser: AnalyserNode
│   └── fftSize: 32 (16 bins de fréquence)
├── bufferLength: number
├── dataArray: Uint8Array
│
└── Méthodes
    ├── update() - Met à jour les données FFT
    └── get data() - Retourne dataArray
```

**FFT Size = 32** signifie :
- 16 bins de fréquence (32 / 2)
- Chaque bin représente une bande de fréquence
- `dataArray[0]` = Basses fréquences
- `dataArray[15]` = Hautes fréquences

### 4. Utils (`utils.ts`)

**Fonctions utilitaires audio** :

| Fonction | Description | Entrée | Sortie |
|----------|-------------|--------|--------|
| `createBlob()` | Convertit Float32Array PCM en Blob pour Gemini | `Float32Array` | `Blob {data: base64, mimeType}` |
| `decodeAudioData()` | Décode les données audio de Gemini | `Uint8Array`, `AudioContext`, `sampleRate`, `channels` | `AudioBuffer` |
| `encode()` | Encode bytes en Base64 | `Uint8Array` | `string` (base64) |
| `decode()` | Décode Base64 en bytes | `string` (base64) | `Uint8Array` |

## 🔄 Flux de Données Complet

### 1. Initialisation

```
1. Chargement de l'application
   │
   ▼
2. GdmLiveAudio.constructor()
   ├─► Charge settings depuis localStorage
   ├─► initClient() → GoogleGenAI
   └─► initSession() → WebSocket connection
   │
   ▼
3. GdmLiveAudioVisuals3D.firstUpdated()
   ├─► Crée la scène Three.js
   ├─► Initialise les shaders
   └─► Démarre animation loop
```

### 2. Conversation Vocale

```
1. Utilisateur clique "Start"
   │
   ▼
2. startRecording()
   ├─► getUserMedia() → MediaStream
   ├─► Crée MediaStreamSourceNode
   ├─► Crée ScriptProcessorNode
   └─► onaudioprocess → Envoie chunks audio
   │
   ▼
3. ScriptProcessorNode.onaudioprocess
   ├─► Float32Array (256 samples)
   ├─► createBlob() → Int16Array → Base64
   └─► session.sendRealtimeInput()
   │
   ▼
4. Google Gemini Live API
   ├─► Traite l'audio
   ├─► Génère la réponse
   └─► Envoie audio + transcription
   │
   ▼
5. onmessage (LiveServerMessage)
   ├─► Audio → decodeAudioData() → BufferSourceNode → Speakers
   ├─► Transcription → currentSessionTranscript[]
   └─► Visualisation → inputAnalyser/outputAnalyser.update()
   │
   ▼
6. Utilisateur clique "Stop"
   │
   ▼
7. stopRecording()
   ├─► Arrête MediaStream
   └─► updateMemoryFromSession()
       ├─► Génère résumé avec Gemini
       └─► Met à jour memory + localStorage
```

### 3. Visualisation en Temps Réel

```
Animation Loop (60 FPS)
   │
   ├─► inputAnalyser.update()
   │   └─► getByteFrequencyData() → dataArray
   │
   ├─► outputAnalyser.update()
   │   └─► getByteFrequencyData() → dataArray
   │
   ├─► Calcul transformations
   │   ├─► sphere.scale (basé sur outputAnalyser.data[1])
   │   ├─► rotation (basé sur inputAnalyser + outputAnalyser)
   │   └─► camera.position (rotation appliquée)
   │
   ├─► Mise à jour shaders
   │   ├─► sphere shader uniforms (time, inputData, outputData)
   │   └─► backdrop shader uniforms (rand)
   │
   └─► composer.render()
       └─► RenderPass → BloomPass → Canvas
```

## 💾 Stockage Local (localStorage)

### Clés Utilisées

| Clé | Type | Description | Défaut |
|-----|------|-------------|--------|
| `gdm-voice` | `string` | Voix sélectionnée | `'Orus'` |
| `gdm-style` | `string` | Style d'expression | `'Natural'` |
| `gdm-rate` | `string` | Vitesse de lecture | `'1.0'` |
| `gdm-detune` | `string` | Pitch (cents) | `'0'` |
| `gdm-thinking` | `string` | Mode Thinking activé | `'false'` |
| `gdm-memory` | `string` | Mémoire long terme | `''` |

### Cycle de Vie

```
Chargement
   │
   ▼
localStorage.getItem() → État initial
   │
   ▼
Utilisateur modifie paramètres
   │
   ▼
localStorage.setItem() → Sauvegarde immédiate
   │
   ▼
updated() (Lit lifecycle)
   │
   ▼
Si changement critique → reset() → Nouvelle session
```

## 🔌 Intégration Google Gemini Live API

### Configuration de Session

```typescript
{
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: selectedVoice // 'Orus', 'Puck', etc.
      }
    }
  },
  systemInstruction: `You are a helpful AI assistant. 
                      Please speak with a ${selectedStyle} tone...`,
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  thinkingConfig?: { thinkingBudget: 24576 } // Si isThinkingMode
}
```

### Callbacks WebSocket

| Callback | Événement | Action |
|----------|-----------|--------|
| `onopen` | Connexion établie | `updateStatus('Ready')` |
| `onmessage` | Message reçu | Traite audio + transcription |
| `onerror` | Erreur | `updateError(message)` |
| `onclose` | Déconnexion | `updateStatus('Disconnected')` |

### Format Audio

**Entrée (vers Gemini)** :
- Format : PCM 16-bit, mono
- Sample Rate : 16000 Hz
- Buffer Size : 256 samples
- Encodage : Base64

**Sortie (depuis Gemini)** :
- Format : PCM 16-bit, mono
- Sample Rate : 24000 Hz
- Décodage : Base64 → Int16Array → Float32Array → AudioBuffer

## 🎨 Shaders GLSL

### Sphere Shader (`sphere-shader.ts`)

**Type** : Vertex Shader personnalisé  
**Objectif** : Déformer la sphère selon l'audio

```glsl
// Uniforms
uniform float time;              // Temps écoulé
uniform vec4 inputData;         // [freq0, freq1, freq2, 0]
uniform vec4 outputData;        // [freq0, freq1, freq2, 0]

// Fonction de déformation
vec3 calc(vec3 pos) {
  vec3 dir = normalize(pos);
  vec3 p = dir + vec3(time, 0., 0.);
  return pos +
    1. * inputData.x * inputData.y * dir * sin(inputData.z * pos.x + time) +
    1. * outputData.x * outputData.y * dir * sin(outputData.z * pos.y + time);
}
```

**Effet** : La sphère se déforme selon les fréquences audio, créant des vagues et des pulsations.

### Backdrop Shader (`backdrop-shader.ts`)

**Type** : Vertex + Fragment Shader  
**Objectif** : Arrière-plan génératif avec gradient radial

```glsl
// Fragment Shader
uniform vec2 resolution;
uniform float rand;

// Gradient radial avec bruit
float d = factor * length(vUv);
vec3 from = vec3(3.) / 255.;
vec3 to = vec3(16., 12., 20.) / 2550.;
fragmentColor = vec4(mix(from, to, d) + noise, 1.);
```

**Effet** : Gradient sombre avec bruit procédural, créant une ambiance immersive.

## 🔄 Cycle de Vie des Composants

### GdmLiveAudio (Lit Element)

```
1. constructor()
   ├─► Charge localStorage
   └─► initClient()

2. connectedCallback()
   └─► (automatique via Lit)

3. firstUpdated()
   └─► (si nécessaire)

4. updated(changedProperties)
   ├─► Si playbackRate/detune changent → Met à jour sources audio
   ├─► Si voice/style/thinking changent → reset()
   └─► Si memory change → Sauvegarde localStorage

5. render()
   └─► Génère le template HTML

6. disconnectedCallback()
   └─► Nettoyage (arrêt recording, fermeture session)
```

### GdmLiveAudioVisuals3D (Lit Element)

```
1. constructor()
   └─► (vide)

2. connectedCallback()
   └─► (automatique via Lit)

3. firstUpdated()
   ├─► Sélectionne le canvas
   └─► init() → Crée la scène Three.js

4. animation() (loop)
   ├─► inputAnalyser.update()
   ├─► outputAnalyser.update()
   ├─► Calcule transformations
   ├─► Met à jour shaders
   └─► composer.render()

5. render()
   └─► Retourne <canvas></canvas>
```

## 🚀 Optimisations

### Performance Audio

- **Buffer Size** : 256 samples (équilibre latence/performance)
- **FFT Size** : 32 (16 bins, suffisant pour visualisation)
- **Sample Rates** : 16kHz entrée, 24kHz sortie (optimisé pour Gemini)

### Performance 3D

- **Pixel Ratio** : `devicePixelRatio / 1` (réduit pour performance)
- **Antialiasing** : Désactivé (`antialias: false`)
- **Géométrie** : Icosahedron avec subdivisions (60 pour la sphère)
- **Post-Processing** : Bloom uniquement (FXAA commenté)

### Mémoire

- **localStorage** : Limité à ~5-10MB (suffisant pour settings + mémoire)
- **Audio Buffers** : Libérés automatiquement après lecture
- **Three.js** : Dispose des ressources si nécessaire

## 🔒 Sécurité

### Clé API

- **Stockage** : Variable d'environnement (`.env`)
- **Injection** : Via `vite.config.ts` (définie au build)
- **Exposition** : Accessible côté client (nécessaire pour WebSocket)
- **Recommandation** : Utiliser des quotas API et surveiller l'usage

### Permissions Navigateur

- **Microphone** : Requis, demandé via `getUserMedia()`
- **HTTPS** : Requis en production pour `getUserMedia()`

## 📊 Métriques et Monitoring

### Latence

- **Audio Input → API** : ~50-100ms (buffer 256 samples @ 16kHz)
- **API → Audio Output** : ~200-500ms (selon modèle et mode Thinking)
- **Total Round-Trip** : ~250-600ms

### Ressources

- **CPU** : Modéré (animation 60 FPS + traitement audio)
- **GPU** : Modéré (Three.js + shaders)
- **Mémoire** : ~50-100MB (selon durée de session)
- **Réseau** : WebSocket persistant (bande passante audio)

---

**Note** : Cette architecture est conçue pour être simple, performante et maintenable. Tous les composants sont découplés et peuvent être modifiés indépendamment.

