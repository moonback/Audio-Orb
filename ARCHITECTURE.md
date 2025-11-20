# 🏗️ Architecture Technique – NeuroChat

NeuroChat est une application **100 % client-side**. Le navigateur orchestre la capture/lecture audio, la connexion à l’API Google Gemini Live et le rendu 3D. Aucun backend propriétaire n’est déployé : la persistance repose sur `localStorage` et l’API Gemini sert de backend conversationnel.

## Diagramme global

```mermaid
flowchart LR
    subgraph User Device (Navigateur)
        UI[LIT UI<br/>`gdm-live-audio`]
        Settings[Control & Settings Panels]
        AudioSvc[Audio Engine<br/>AudioContext + Worklet]
        Visuals[Three.js Visuals<br/>`gdm-live-audio-visuals-3d`]
        Memory[(LocalStorage<br/>+ MemoryManager)]
    end

    Mic[(Microphone)]
    Speakers[(Casque / HP)]
    Gemini[[Google Gemini Live<br/>WebSocket API]]

    Mic --> AudioSvc
    AudioSvc -- PCM16 chunks --> Gemini
    Gemini -- Audio + transcripts --> AudioSvc
    AudioSvc --> Speakers
    AudioSvc -- FFT data --> Visuals
    UI <-- state/events --> Settings
    UI <-- γ state --> Visuals
    UI <--> Memory
    UI <--status/latence--> Gemini
```

## Couches principales

### 1. Frontend Lit (`index.tsx`)
- Composant racine `gdm-live-audio` (LitElement).
- État réactif (`@state`) : statut, niveaux VU, latence, mémoire, personnalités, réglages audio, mode focus.
- Gère les raccourcis clavier, le téléchargement de transcripts, le focus mode (double-clic) et la synchronisation des panneaux personnalisés (`settings-panel`, `control-panel`, `status-display`, `latency-indicator`, `vu-meter`).

### 2. Service Audio
- `AudioEngine` (`services/audio-engine.ts`) encapsule deux `AudioContext` (input 16 kHz, output 24 kHz).
- Chaîne input : `getUserMedia` → `MediaStreamAudioSourceNode` → `AudioWorkletNode` (`public/audio-processor.js`) → buffer PCM32 → conversion PCM16 (dans `index.tsx`) → envoi WebSocket.
- Chaîne output : `GeminiClient` reçoit des buffers base64 → `decodeAudioData` → queue `AudioBufferSourceNode` avec `nextStartTime` pour éviter les gaps → EQ (bass/treble) → destination.
- Analyseurs : `Analyser` wrappers branchés sur `inputGain` et `masterGain`, exposent des FFT pour les VU meters et les visuels.
- Optimisations : détection de silence côté Worklet (pause d’envoi API), `AdaptiveBufferManager`, `deviceDetector` pour choisir la taille des buffers et réduire la qualité sur mobile.

### 3. Service IA
- `GeminiClient` (`services/gemini-client.ts`) wrappe `@google/genai`.
- Méthodes : `connect(model, config)`, `sendAudio(base64)`, `disconnect`.
- Événements customs : `status`, `audio-response`, `transcript`, `error`, `interrupted`, `turn-complete`, `disconnected`.
- Configuration par session : `responseModalities = AUDIO`, `speechConfig.prebuiltVoiceConfig.voiceName`, transcription entrée/sortie activée.
- Stratégie de reconnexion : 3 tentatives avec backoff 3 s ; latence mesurée sur boucle audio envoyée/reçue.

### 4. Visualisation 3D (`visual-3d.ts`, `visual.ts`)
- Lit Web Component `gdm-live-audio-visuals-3d`.
- Utilise Three.js + post-processing (bloom, DOF léger).
- Entrées : `inputNode` et `outputNode` (AudioNode) → création locale d’`AnalyserNode`.
- Composants : orbites, halo, particules, waveform circulaire ; degrade automatique via `deviceDetector` (`recommendedQuality`) et `lowPowerMode`.
- Pause/Resume : détection de visibilité page.

### 5. Données & persistance
- `MemoryManager` : stockage JSON structure `{preferences[], facts[], context[]}` dans `gdm-structured-memory`, migration depuis `gdm-memory`.
- `PersonalityManager` : personnalités par défaut + personnalisées (`audio_orb_custom_personalities`).
- `debouncedStorage` : réduit les écritures locales (voix, style, playback, detune, EQ, preset, personnalité active).
- Export/import mémoire + suppression par élément via UI.

## Flux principal

1. Initialisation :
   - Lecture des préférences (`debouncedStorage`), personnalités, mémoire structurée.
   - Instanciation `GeminiClient` avec `process.env.GEMINI_API_KEY`.
   - Préparation AudioContexts + chargement Worklet.
   - Démarrage des boucles VU et latence (`ThrottledRAF`).
2. Connexion :
   - `initSession()` compose `systemInstruction` = prompt personnalité + style + mémoire.
   - `GeminiClient.connect()` ouvre la WebSocket.
3. Enregistrement :
   - `startRecording()` demande le micro, route l’entrée vers le Worklet.
   - Worklet bufferise 4096 samples, transmet au composant via `CustomEvent('audio-data')`.
   - `index.tsx` convertit en PCM16, encode Base64, appelle `GeminiClient.sendAudio`.
4. Réception :
   - `audio-response` → `decodeAudioData` (24 kHz, mono) → `audioService.playBuffer`.
   - Calcul latence = `now - lastAudioSendTime`.
   - `transcript` events alimentent `currentSessionTranscript`.
5. Post-session :
   - `stopRecording()` → `updateMemoryFromSession()` : envoi transcript au modèle `gemini-2.5-flash` pour détecter de nouvelles entrées et les stocker par catégorie.
   - Import/export JSON et purge par UI.

## Données persistées

Voir `localstorage_DOCS.md` pour la matrice complète. Résumé :

| Clé | Contenu | Utilisé par |
| --- | --- | --- |
| `gdm-voice`, `gdm-style`, `gdm-rate`, `gdm-detune` | Préférences audio et voix | `settings-panel`, `index.tsx` |
| `gdm-bass`, `gdm-treble`, `gdm-audio-preset` | Égaliseur/preset | `settings-panel`, `audio-engine` |
| `gdm-personality` | ID personnalité active | `index.tsx` |
| `gdm-structured-memory` | JSON mémoire structurée | `MemoryManager` |
| `audio_orb_custom_personalities` | Array personnalités custom | `PersonalityManager` |
| `gdm-memory` | Legacy (texte) | Migration automatique |

## Sécurité & contraintes

- **Clé API** : disponible dans le bundle (Vite `define`). Pour un déploiement public, prévoir un proxy (Cloud Run, Cloudflare Worker…) pour signer les requêtes Gemini et appliquer des quotas.
- **HTTPS obligatoire** : `getUserMedia`, AudioWorklet et WebGL nécessitent un contexte sécurisé.
- **CORS/WSS** : Gemini Live impose wss://. Vérifier que le domaine figure dans la console Google AI Studio.
- **Persistant storage** : pas de chiffrement local ; toutes les données sont stockées en clair dans le navigateur. Informer l’utilisateur avant usage multi-compte.

## Directories clés

| Dossier/Fichier | Description |
| --- | --- |
| `components/` | Web Components UI (control panel, settings, status, latency, VU). |
| `services/audio-engine.ts` | AudioContexts, Worklet, EQ, analyzers, playback queue. |
| `services/gemini-client.ts` | Wrapper Google GenAI Live + événements. |
| `visual-3d.ts` / `visual.ts` | Scène 3D, matériaux, gestion du low-power. |
| `utils/` | `adaptive-buffer`, `device-detection`, `performance`, `storage`. |
| `memory.ts`, `personality.ts` | Domain models + persistence. |
| `public/audio-processor.js` | AudioWorklet (rms, silence detection, bufferization). |
| `docs/*.md` | `README`, `ARCHITECTURE`, `localstorage_DOCS`, `ROADMAP`. |

## Extension future

- **Backend proxy** : relayer WebSocket et gérer l’auth utilisateur (JWT/OAuth), ajouter un cache conversationnel ou un stockage centralisé des mémoires.
- **DB** : si nécessaire, déplacer `MemoryManager` vers une base (ex. Supabase, Firestore) pour synchroniser plusieurs appareils.
- **Observabilité** : instrumentation (Sentry, LogRocket) pour suivre la latence, les erreurs micro/WebGL et améliorer la qualité de service.
