# 🗺️ Roadmap - Audio Orb

Ce document présente le plan de développement futur d'Audio Orb, depuis le MVP actuel jusqu'aux fonctionnalités avancées.

## 📊 État Actuel : MVP ✅

### Fonctionnalités Implémentées
- ✅ Assistant vocal en temps réel avec Google Gemini Live API
- ✅ 7 voix et 7 styles d'expression configurables
- ✅ Visualisation 3D audio-réactive (sphère + backdrop + bloom)
- ✅ Contrôles audio (vitesse, pitch)
- ✅ Mémoire long terme avec consolidation automatique
- ✅ Interface de paramètres complète
- ✅ Persistance des préférences (localStorage)

## 🎯 Phase 1 : Améliorations MVP (Court Terme)

### 1.1 Expérience Utilisateur
- [ ] **Indicateurs visuels améliorés**
  - Barre de progression pour la latence
  - Indicateur de niveau audio (VU meter plus précis)
  - Animation de chargement pendant la consolidation mémoire
- [ ] **Gestion d'erreurs robuste**
  - Messages d'erreur utilisateur-friendly
  - Retry automatique en cas de déconnexion
  - Fallback si l'API est indisponible
- [ ] **Accessibilité**
  - Support clavier complet
  - ARIA labels pour lecteurs d'écran

### 1.2 Performance & Optimisation
- [ ] **Optimisation audio**
  - Réduction de la latence (buffer adaptatif)
  - Détection de silence pour économiser la bande passante API
- [ ] **Optimisation 3D**
  - LOD (Level of Detail) dynamique selon le device
  - Réduction qualité sur appareils mobiles

### 1.3 Fonctionnalités Audio
- [ ] **Égaliseur audio**
  - Contrôles bass/treble
  - Presets audio (voix, musique, etc.)
- [ ] **Enregistrement de sessions**
  - Export MP3/WAV des conversations
  - Historique des sessions (texte)

## 🚀 Phase 2 : Fonctionnalités Avancées (Moyen Terme)

### 2.1 Personnalisation Avancée
- [ ] **Thèmes visuels**
  - Thèmes prédéfinis (Dark, Light, Neon, Cyberpunk)
  - Éditeur de couleurs personnalisé
- [ ] **Visualisations alternatives**
  - Mode particules
  - Mode waveform classique
  - Mode spectrogramme
- [ ] **Voix personnalisées**
  - Upload de voix personnalisées (si supporté par Gemini)

### 2.2 Intelligence & Mémoire
- [ ] **Mémoire structurée**
  - Catégorisation (préférences vs faits vs contexte)
  - Recherche sémantique dans la mémoire
  - Export/import de la mémoire (JSON)
- [ ] **Intégrations**
  - Connexion calendrier ou notes (Notion/Google Keep) via Function Calling

## 🌟 Phase 3 : Fonctionnalités Premium (Long Terme)

### 3.1 Collaboration & Partage
- [ ] **Sessions partagées**
  - Conversations multi-utilisateurs
- [ ] **Communauté**
  - Partage de thèmes et personnalités
  - Galerie de visualisations

### 3.2 Déploiement & Sécurité
- [ ] **Backend Proxy**
  - Sécurisation de la clé API via un serveur intermédiaire (Node.js/Go)
  - Authentification utilisateur réelle (OAuth)
- [ ] **Applications Natives**
  - Version Desktop (Electron/Tauri)
  - Version Mobile (React Native/Capacitor)

## 📅 Timeline Estimée

| Période | Phase | Focus |
|---------|-------|-------|
| **Q1 2025** | 1.x | UX, Stabilité, Optimisations |
| **Q2 2025** | 2.x | Personnalisation, Nouveaux Visuels |
| **Q3 2025** | 3.x | Backend, Auth, Apps Natives |

## 🤝 Contribution

Voir le fichier `README.md` pour les instructions de contribution.
