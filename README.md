# 🎵 NeuroChat

> **Une interface vocale intelligente et immersive alimentée par Google Gemini Multimodal Live API.**

NeuroChat est une application web expérimentale qui combine une conversation vocale naturelle en temps réel avec une visualisation 3D audio-réactive de haute qualité. Elle agit comme un assistant personnel doté d'une mémoire à long terme persistante et de personnalités configurables.

![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)
![Stack](https://img.shields.io/badge/tech-Lit_•_Three.js_•_Vite-orange.svg)
![API](https://img.shields.io/badge/AI-Google_Gemini_Live-purple.svg)

## ✨ Fonctionnalités Principales

- **🗣️ Conversation Temps Réel** : Latence ultra-faible grâce à l'API WebSocket de Gemini Live.
- **🧠 Mémoire Long Terme** : L'IA se "souvient" des informations importantes d'une session à l'autre (stockage local).
- **🎨 Visualisation 3D** : Rendu magnifique (Bloom, Shaders) qui réagit à la voix de l'utilisateur et de l'IA.
- **🎭 Personnalités Multiples** : Créez, modifiez et changez de personnalité (Assistant, Ami, Mentor, etc.).
- **🎛️ Contrôle Audio** : Ajustement de la vitesse, du pitch (detune) et choix de la voix en temps réel.
- **⚡ Performance** : Construit avec **Lit** (Web Components) pour une empreinte légère et rapide.

## 🛠️ Stack Technique

- **Framework Frontend** : [Lit](https://lit.dev/) (Web Components légers)
- **3D & Graphismes** : [Three.js](https://threejs.org/) (WebGL, Shaders custom)
- **Build Tool** : [Vite](https://vitejs.dev/)
- **IA & Audio** : [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (Gemini 2.5 Flash Live)
- **Langage** : TypeScript

## 🚀 Installation et Démarrage

### Prérequis
- **Node.js** (v18 ou supérieur recommandé)
- Une **Clé API Google Gemini** (disponible sur [Google AI Studio](https://aistudio.google.com/))

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/audio-orb.git
cd audio-orb
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration
Créez un fichier `.env` à la racine du projet (basé sur `.env.example` s'il existe) :

```env
# .env
GEMINI_API_KEY=votre_clé_api_ici
```

> **Note** : La clé est injectée par Vite au moment du build via `process.env`.

### 4. Lancer en développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

### 5. Build pour la production
```bash
npm run build
npm run preview
```

## 📂 Structure du Projet

```
audio-orb/
├── components/          # Composants UI (Lit)
│   ├── control-panel.ts # Panneau de contrôle (Mic, Reset)
│   ├── settings-panel.ts# Gestion des paramètres et personnalités
│   ├── vu-meter.ts      # Indicateur de volume
│   └── ...
├── public/              # Assets statiques (textures, sons)
├── index.html           # Point d'entrée HTML
├── index.tsx            # Composant racine (App) & Logique WebSocket
├── visual-3d.ts         # Moteur de rendu Three.js
├── personality.ts       # Gestionnaire de personnalités
├── analyser.ts          # Analyseur audio Web Audio API
└── vite.config.ts       # Configuration du bundler
```

## 🔧 Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `GEMINI_API_KEY` | Votre clé API Google Gemini (AI Studio) | ✅ Oui |

## 🤝 Contribuer

Les contributions sont les bienvenues !
1. Forkez le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Distribué sous la licence Apache 2.0. Voir le fichier `LICENSE` pour plus d'informations.
