# 🎵 NeuroChat

> Assistant vocal immersif : conversation Gemini Live temps réel, rendu 3D audio-réactif, mémoire persistante et personnalités dynamiques – directement dans le navigateur.

![Stack](https://img.shields.io/badge/stack-Lit_%2B_Three.js_%2B_Vite-orange)
![API](https://img.shields.io/badge/AI-Google_Gemini_Live-purple)
![Status](https://img.shields.io/badge/state-MVP-brightgreen)

## Sommaire

- [🎵 NeuroChat](#-neurochat)
  - [Sommaire](#sommaire)
  - [Présentation](#présentation)
  - [Stack technique](#stack-technique)
  - [Fonctionnalités](#fonctionnalités)
  - [Prérequis](#prérequis)
  - [Installation \& configuration](#installation--configuration)
  - [Lancement](#lancement)
  - [Structure du projet](#structure-du-projet)
  - [Variables d’environnement](#variables-denvironnement)
  - [Bonnes pratiques de contribution](#bonnes-pratiques-de-contribution)
  - [Licence](#licence)

## Présentation

NeuroChat est une SPA construite avec Lit qui combine :
- une boucle audio ultra-basse latence appuyée sur l’API Google Gemini Live (WebSocket) ;
- une mémoire structurée persistée dans `localStorage` pour conserver le contexte utilisateur ;
- une scène 3D Three.js qui réagit aux flux audio entrants et sortants ;
- un panneau de réglages avancés (voix, styles, égaliseur, personnalités).

## Stack technique

| Domaine | Choix | Rôle |
| --- | --- | --- |
| Framework UI | [Lit 3](https://lit.dev) | Web Component racine `gdm-live-audio`, diffing fin, décorateurs `@state`. |
| Rendu 3D | [Three.js 0.176](https://threejs.org) | Scène sphérique, shaders personnalisés, effets Bloom. |
| Audio temps réel | Web Audio API + AudioWorklet | Capture micro 16 kHz, pipeline playback 24 kHz, détection de silence. |
| IA temps réel | [@google/genai](https://www.npmjs.com/package/@google/genai) | Session Live Gemini 2.5 Flash audio, transcripts, latence < 300 ms. |
| Build & DX | [Vite 6](https://vitejs.dev) + TypeScript 5.8 | Hot reload, injection des variables d’env. |
| Stockage local | `localStorage` + wrapper `debouncedStorage` | Persistance des préférences, mémoire structurée, personnalités. |

## Fonctionnalités

- **Streaming bidirectionnel** : capture micro, conversion PCM16, envoi chunké, lecture audio en file d’attente avec rattrapage de latence.
- **Personnalités & voix** : sélection de voix Gemini pré-construites, styles de diction, création/suppression de personnalités custom (prompts persistés).
- **Mémoire structurée** : catégorisation préférences / faits / contexte, import/export JSON, purge ciblée par catégorie.
- **Visualisation 3D** : orbites, anneaux, particules et bloom synchronisés avec les analyseurs fréquentiels entrée/sortie.
- **Contrôles audio** : vitesse (`playbackRate`), `detune`, égaliseur bass/treble + presets (Voix, Musique, Neutre, etc.).
- **Modes d’interaction** : Focus mode (double-clic), raccourcis clavier (Espace, S, R, D, Échap), export texte des transcriptions.
- **Résilience** : buffer adaptatif (`AdaptiveBufferManager`), détection appareil (`deviceDetector`) pour ajuster qualité, reconnexion automatique Gemini (3 tentatives).
- **Accessibilité** : panneaux en verre dépolis, indicateurs latence/VU, statut connecté/déconnecté en direct.

## Prérequis

- Node.js ≥ 18 (LTS recommandé) + npm ≥ 10.
- Navigateur Chromium récent (support AudioWorklet + WebGL2).
- Clé API Google Gemini Live (via [Google AI Studio](https://aistudio.google.com/)).
- Microphone fonctionnel ; carte graphique compatible WebGL pour les visuels.

## Installation & configuration

1. **Cloner et installer**
   ```bash
   git clone https://github.com/votre-organisation/audio-orb.git
   cd audio-orb
   npm install
   ```

2. **Créer l’environnement**
   ```bash
   cp .env.example .env # si le fichier existe, sinon créez-le
   ```
   ```env
   GEMINI_API_KEY=votre_cle_ai_studio
   ```
   Vite expose automatiquement `process.env.GEMINI_API_KEY` grâce aux `define` du `vite.config.ts`.

3. **Activer l’AudioWorklet**
   - L’application charge `public/audio-processor.js`. Aucun build manuel requis, mais l’hébergement doit servir ce fichier sous `/audio-processor.js`.

## Lancement

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre Vite en mode développement (http://localhost:5173 par défaut). |
| `npm run build` | Build production (`dist/`) avec minification et hashing. |
| `npm run preview` | Sert le build de production localement (utile pour tester HTTPS/WebSocket). |

> Déploiement : servir le contenu de `dist/` derrière HTTPS (obligatoire pour `getUserMedia`). Prévoir un proxy backend si vous devez masquer la clé Gemini.

## Structure du projet

```
audio-orb/
├── components/                 # Web Components UI (Lit)
│   ├── control-panel.ts        # Boutons micro, reset, export
│   ├── settings-panel.ts       # Voix, égaliseur, personnalités, mémoire
│   ├── status-display.ts       # Statut connexion + focus mode
│   ├── latency-indicator.ts    # Latence Gemini en ms
│   └── vu-meter.ts             # Niveaux entrée/sortie
├── services/
│   ├── audio-engine.ts         # AudioWorklet, EQ, analyzers
│   └── gemini-client.ts        # Wrapper GoogleGenAI Live
├── utils/                      # Helpers (buffer adaptatif, device detection, storage…)
├── visual-3d.ts                # Scène Three.js + shaders
├── analyser.ts                 # Wrapper AnalyserNode
├── memory.ts / personality.ts  # Gestion mémoire persistante & prompts
├── public/audio-processor.js   # AudioWorklet (PCM32 → PCM16, silence)
├── index.tsx                   # Composant racine `gdm-live-audio`
├── index.html / index.css      # Shell statique + styles globaux
├── vite.config.ts              # Build & env injection
└── docs (.md)                  # Architecture, roadmap, local storage
```

## Variables d’environnement

| Variable | Description | Obligatoire | Défaut |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Clé API Gemini Live utilisée par `GeminiClient`. | ✅ | `""` (connexion bloquée) |

> Aucune autre variable n’est lue côté client. Pour sécuriser la clé, prévoir un serveur proxy qui signe les requêtes.

## Bonnes pratiques de contribution

- **Branches** : `main` protégé → créez des branches `feature/*` ou `fix/*`.
- **Qualité** : TypeScript strict, privilégier les Web Components Lit (`@customElement`). Documenter les nouvelles propriétés/événements.
- **UI/UX** : tester sur bureau + mobile (mode focus, dégradations). Garder les scènes 3D < 60k vertices pour préserver les FPS.
- **Audio** : ne pas bloquer le thread AudioWorklet (pur JavaScript, pas d’accès DOM). Vérifier le budget latence avant merge.
- **Docs/tests** : mettre à jour `README`, `ARCHITECTURE.md`, `localstorage_DOCS.md` et ajouter des snapshots (GIF/vidéos) si possible.
- **Commits** : messages impératifs courts, ex. `feat: add adaptive buffer quality hints`.

## Licence

Projet distribué sous licence **MIT** (si aucun fichier `LICENSE` n’est présent, créez-le avant publication). Ajustez si vous adoptez une licence différente.
