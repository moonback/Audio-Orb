<div align="center">
<img width="1200" height="475" alt="Audio Orb Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎵 Audio Orb

**Audio Orb** est une application web immersive d'assistant vocal en temps réel, combinant l'intelligence artificielle de Google Gemini avec une visualisation 3D interactive. Parlez à l'orbe, et il répond avec une voix naturelle tout en générant des visualisations audio-réactives en temps réel.

## 🎯 Présentation

Audio Orb transforme vos conversations vocales en une expérience visuelle et auditive unique. L'application utilise l'API Live Audio de Google Gemini pour des interactions vocales fluides, accompagnées d'une sphère 3D qui réagit dynamiquement à l'audio d'entrée et de sortie.

## 🛠️ Stack Technique

### Frontend
- **Lit** (v3.3.0) - Framework Web Components pour une architecture modulaire
- **Three.js** (v0.176.0) - Moteur de rendu 3D et visualisation audio-réactive
- **TypeScript** (v5.8.2) - Typage statique et développement robuste
- **Vite** (v6.2.0) - Build tool rapide et moderne

### APIs & Services
- **Google Gemini Live API** - Assistant vocal en temps réel
  - Modèle : `gemini-2.5-flash-native-audio-preview-09-2025`
  - Support audio bidirectionnel (entrée/sortie)
  - Transcription automatique
  - Mode "Thinking" avec budget configurable

### Outils de Développement
- **@google/genai** (v1.15.0) - SDK officiel Google Gemini
- **@lit/context** (v1.1.5) - Gestion de contexte pour Lit
- **@types/node** (v22.14.0) - Types TypeScript pour Node.js

## ✨ Fonctionnalités Principales (MVP)

### 🎤 Assistant Vocal
- **Conversation en temps réel** - Interactions vocales fluides avec latence minimale
- **7 voix disponibles** - Orus, Puck, Charon, Kore, Fenrir, Zephyr, Aoede
- **7 styles d'expression** - Natural, Professional, Cheerful, British Accent, French Accent, Whispering, Enthusiastic
- **Contrôles audio avancés** - Vitesse de lecture (0.5x - 2.0x) et pitch ajustable (-1200 à +1200 cents)
- **Mode Thinking** - Active le mode réflexion de Gemini 2.5 Flash (latence plus élevée)

### 🧠 Mémoire Long Terme
- **Mémoire persistante** - Stockage local des informations utilisateur
- **Consolidation automatique** - Mise à jour intelligente de la mémoire après chaque session
- **Personnalisation** - L'IA adapte ses réponses selon vos préférences et historique

### 🎨 Visualisation 3D
- **Sphère audio-réactive** - Réagit en temps réel à l'audio d'entrée et de sortie
- **Backdrop dynamique** - Arrière-plan génératif avec shaders personnalisés
- **Effets visuels** - Bloom, post-processing, éclairage dynamique
- **Animation fluide** - Rotation, échelle et déformation basées sur l'analyse audio

### ⚙️ Paramètres & Personnalisation
- **Interface de paramètres** - Panneau modulaire accessible
- **Persistance des préférences** - Sauvegarde automatique dans le localStorage
- **Réinitialisation de session** - Bouton pour redémarrer une nouvelle conversation

## 📋 Prérequis

- **Node.js** >= 18.0.0 (recommandé : LTS)
- **npm** >= 9.0.0 (ou équivalent : yarn, pnpm)
- **Clé API Google Gemini** - Obtenez-la sur [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Navigateur moderne** - Chrome/Edge (recommandé), Firefox, Safari avec support WebGL 2.0
- **Microphone** - Accès au microphone pour les interactions vocales

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-username/Audio-Orb.git
cd Audio-Orb
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# .env
GEMINI_API_KEY=votre_cle_api_google_gemini_ici
```

**Important :** 
- Ne commitez jamais votre fichier `.env` dans Git
- Ajoutez `.env` à votre `.gitignore`
- Obtenez votre clé API sur [Google AI Studio](https://makersuite.google.com/app/apikey)

### 4. Vérifier la configuration

Assurez-vous que `vite.config.ts` charge correctement la variable d'environnement (déjà configuré par défaut).

## 🎮 Lancement du Projet

### Mode Développement

```bash
npm run dev
```

L'application sera accessible sur :
- **Local** : `http://localhost:3000`
- **Réseau** : `http://0.0.0.0:3000` (accessible depuis d'autres appareils sur le même réseau)

### Build de Production

```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

### Prévisualisation du Build

```bash
npm run preview
```

Permet de tester le build de production localement avant déploiement.

## 📁 Structure du Projet

```
Audio-Orb/
├── public/                      # Assets statiques
│   └── piz_compressed.exr      # Texture HDR (optionnelle)
│
├── index.html                   # Point d'entrée HTML
├── index.tsx                    # Point d'entrée TypeScript
├── index.css                    # Styles globaux
│
├── index.tsx                    # Composant principal (GdmLiveAudio)
├── visual-3d.ts                # Composant de visualisation 3D
├── analyser.ts                 # Analyseur audio pour visualisation
├── utils.ts                    # Utilitaires (encodage/décodage audio)
│
├── sphere-shader.ts            # Shader vertex pour la sphère
├── backdrop-shader.ts          # Shaders pour l'arrière-plan
│
├── package.json                # Dépendances et scripts
├── tsconfig.json               # Configuration TypeScript
├── vite.config.ts              # Configuration Vite
├── metadata.json               # Métadonnées de l'application
│
├── README.md                   # Documentation principale
├── ARCHITECTURE.md             # Documentation architecture
├── localstorage_DOCS.md        # Documentation APIs et localStorage
└── ROADMAP.md                  # Plan de développement
```

### Description des Fichiers Principaux

#### `index.tsx`
Composant principal `GdmLiveAudio` (Lit Element) qui gère :
- La connexion à l'API Gemini Live
- La capture audio du microphone
- La lecture audio de l'IA
- L'interface utilisateur et les paramètres
- La gestion de la mémoire long terme

#### `visual-3d.ts`
Composant `GdmLiveAudioVisuals3D` qui gère :
- La scène Three.js
- La sphère audio-réactive
- Le backdrop génératif
- Les effets de post-processing (bloom, FXAA)
- L'animation en temps réel

#### `analyser.ts`
Classe utilitaire pour analyser les signaux audio :
- Analyse FFT (Fast Fourier Transform)
- Extraction des données de fréquence
- Utilisé pour piloter les animations 3D

#### `utils.ts`
Fonctions utilitaires :
- `createBlob()` - Conversion Float32Array → Blob PCM pour Gemini
- `decodeAudioData()` - Décodage audio depuis l'API
- `encode/decode()` - Encodage Base64

## 🔐 Variables d'Environnement

| Variable | Description | Requis | Exemple |
|----------|-------------|--------|---------|
| `GEMINI_API_KEY` | Clé API Google Gemini pour l'API Live Audio | ✅ Oui | `AIzaSy...` |

### Configuration dans Vite

Les variables d'environnement sont injectées via `vite.config.ts` :

```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

## 🎨 Personnalisation

### Modifier les Voix Disponibles

Éditez le tableau `VOICES` dans `index.tsx` :

```typescript
const VOICES = ['Orus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
```

### Modifier les Styles

Éditez le tableau `STYLES` dans `index.tsx` :

```typescript
const STYLES = ['Natural', 'Professional', 'Cheerful', 'British Accent', 'French Accent', 'Whispering', 'Enthusiastic'];
```

### Ajuster la Visualisation 3D

Modifiez les paramètres dans `visual-3d.ts` :
- **Bloom** : `UnrealBloomPass` (intensité, seuil, rayon)
- **Géométrie** : `IcosahedronGeometry` (rayon, subdivisions)
- **Lumières** : Position et intensité des PointLights

## 🤝 Contribution

### Bonnes Pratiques

1. **Code Style**
   - Utilisez TypeScript strict
   - Suivez les conventions Lit (Web Components)
   - Commentez les shaders GLSL complexes

2. **Commits**
   - Messages clairs et descriptifs
   - Format : `type(scope): description`
   - Exemple : `feat(visual): add new color scheme`

3. **Tests**
   - Testez sur plusieurs navigateurs
   - Vérifiez la compatibilité WebGL
   - Testez avec différents microphones

4. **Pull Requests**
   - Une fonctionnalité par PR
   - Description détaillée des changements
   - Screenshots/GIFs pour les changements visuels

### Workflow de Développement

```bash
# 1. Créer une branche
git checkout -b feature/ma-fonctionnalite

# 2. Développer
npm run dev

# 3. Tester
npm run build
npm run preview

# 4. Commiter
git add .
git commit -m "feat: ajout de ma fonctionnalité"

# 5. Pousser et créer une PR
git push origin feature/ma-fonctionnalite
```

## 🐛 Dépannage

### Problèmes Courants

#### L'application ne se connecte pas à Gemini
- ✅ Vérifiez que `GEMINI_API_KEY` est défini dans `.env`
- ✅ Vérifiez que la clé API est valide et active
- ✅ Consultez la console du navigateur pour les erreurs

#### Le microphone ne fonctionne pas
- ✅ Autorisez l'accès au microphone dans les paramètres du navigateur
- ✅ Vérifiez que le microphone n'est pas utilisé par une autre application
- ✅ Testez sur HTTPS (requis pour `getUserMedia` en production)

#### La visualisation 3D ne s'affiche pas
- ✅ Vérifiez que votre navigateur supporte WebGL 2.0
- ✅ Testez sur Chrome/Edge (meilleure compatibilité)
- ✅ Vérifiez la console pour les erreurs de shaders

#### Latence audio élevée
- ✅ Réduisez la qualité audio si nécessaire
- ✅ Désactivez le mode "Thinking" pour réduire la latence
- ✅ Vérifiez votre connexion internet

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

## 🔗 Liens Utiles

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Lit Documentation](https://lit.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

## 👤 Auteur

Développé avec ❤️ pour une expérience vocale immersive.

---

**Note** : Cette application nécessite une clé API Google Gemini valide. Les quotas et tarifs s'appliquent selon le plan Google Cloud utilisé.
