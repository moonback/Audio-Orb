# 🏗️ Architecture Technique - Audio Orb

Ce document décrit l'architecture de haut niveau de l'application Audio Orb. L'application est conçue comme une **SPA (Single Page Application)** purement client-side, qui interagit directement avec l'API Google Gemini via WebSocket.

## 📐 Schéma Global

```mermaid
graph TD
    User[Utilisateur] -- "Parle (Microphone)" --> Browser
    Browser -- "Audio (PCM)" --> Gemini[Google Gemini API (Live)]
    Gemini -- "Audio (Réponse)" --> Browser
    Gemini -- "Transcription" --> Browser
    
    subgraph "Navigateur (Client)"
        direction TB
        AudioEngine[Moteur Audio]
        VisualEngine[Moteur Visuel 3D]
        Logic[Logique App (Lit)]
        Storage[(LocalStorage)]
        
        Logic --> AudioEngine
        Logic --> VisualEngine
        Logic <--> Storage
    end
    
    AudioEngine -- "Données Fréquentielles" --> VisualEngine
    Browser -- "Rendu Visuel" --> User
```

## 🧩 Composants Clés

### 1. `GdmLiveAudio` (`index.tsx`)
C'est le **cerveau** de l'application (Web Component racine).
- **Rôle** : 
  - Gère la connexion WebSocket avec Google GenAI.
  - Gère le cycle de vie audio (Microphone -> Envoi, Réception -> Haut-parleurs).
  - Orchestre l'état global (Recording, Status, Error).
  - Gère la "Mémoire Long Terme" (injection du contexte au début de la session).

### 2. `GdmLiveAudioVisuals3D` (`visual-3d.ts`)
Le moteur de rendu visuel.
- **Tech** : Three.js.
- **Rôle** :
  - Crée la scène 3D (Caméra, Lumières).
  - Génère le Waveform circulaire et les effets de Bloom.
  - Reçoit les données de l'`AnalyserNode` pour animer les formes en temps réel.
  - Utilise des **Shaders personnalisés** pour la performance et l'esthétique.

### 3. Pipeline Audio
Le flux audio est critique pour éviter la latence.

1. **Input** : `Navigator.getUserMedia` -> `MediaStream` -> `ScriptProcessorNode`.
   - L'audio est converti en base64 et envoyé en chunks au WebSocket Gemini.
2. **Output** : WebSocket (Message) -> `decodeAudioData` -> `AudioBufferSourceNode`.
   - L'audio reçu est mis en file d'attente (queue) pour être joué sans coupure.

### 4. Gestion de la Mémoire (`localStorage`)
L'application simule une persistance backend via le navigateur.
- Au démarrage : Chargement de la chaîne "Memory" depuis le `localStorage`.
- Injection : La mémoire est ajoutée au `systemInstruction` envoyé à Gemini.
- Mise à jour : À la fin d'une session ou sur demande, l'IA résume la conversation actuelle et met à jour la mémoire stockée.

## 📂 Structure des Données (État)

L'état est géré de manière réactive via les décorateurs `@state` de Lit.

| État | Description | Persistant ? |
|------|-------------|--------------|
| `isRecording` | Si le micro est actif | Non |
| `status` | État de la connexion (Prêt, Connecté...) | Non |
| `memory` | Faits retenus sur l'utilisateur | **Oui** |
| `personalities` | Liste des personnalités disponibles | **Oui** |
| `selectedVoice` | Voix choisie (ex: "Orus") | **Oui** |

## 🛡️ Sécurité

- **Clé API** : La clé `GEMINI_API_KEY` est requise. 
  - *Attention* : Comme c'est une app client-side, la clé est exposée dans le code source compilé. Pour un déploiement public sécurisé, il faudrait un proxy backend (Node/Go) pour relayer les appels WebSocket sans exposer la clé.
