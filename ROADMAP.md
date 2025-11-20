# 🗺️ Roadmap – NeuroChat

Ce plan trace l’évolution du projet depuis le MVP actuel jusqu’aux releases V1/V2, puis les axes longs termes. Les échéances restent indicatives et seront ajustées en fonction du feedback terrain et des quotas Gemini.

## État actuel – MVP livrée ✅

- Streaming audio bidirectionnel WebSocket (Gemini 2.5 Flash Live).
- 7 voix + 7 styles, réglages playback/detune, égaliseur bass/treble + presets.
- Visualisation 3D audio-réactive (orbite + particules + bloom).
- Mémoire structurée persistée, import/export JSON, mise à jour auto post-session.
- UI complète (settings, control, status, focus mode, raccourcis clavier).
- Persistance locale via `debouncedStorage` & `MemoryManager`.

## Phase V1 – Stabilisation & Observabilité (court terme)

| Thème | Objectifs | Statut |
| --- | --- | --- |
| Résilience API | Fallback en cas d’indispo Gemini (message clair, tempo retry), monitoring latence, exposition d’un indicateur de quota | 🔄 À faire |
| UX & accessibilité | Mode clair, options de texte agrandi, aide contextuelle, onboarding rapide | 🚧 Planifié |
| Observabilité | Ajout de métriques (latence moyenne, taux d’erreur) et d’un logger télescopique (Sentry / console structurée) | 🕑 À faire |
| Audio | Choix du micro/sortie, visualisation spectrale additionnelle (mini waveform), calibration auto du gain | 🕑 À faire |
| Tooling | Scripts de tests basiques (lint/tsc), CI minimale (build + preview) | ✅ en partie (build) |

## Phase V2 – Personnalisation & Intelligence (moyen terme)

| Volet | Items | Notes |
| --- | --- | --- |
| Personnalisation visuelle | Thèmes (Dark/Lucid/Neon), sliders d’intensité FX, presets visuels partageables | dépend GPU |
| Mémoire intelligente | Recherche sémantique dans `StructuredMemory`, scoring de fraîcheur, suggestions d’archivage | nécessite quotas API supplémentaires |
| Automations | Webhooks ou Function Calling (Notion, Calendar, Slack) pour pousser des résumés ou rappels | impliquer un backend |
| Multilingue | Localisation de l’UI (FR/EN), mapping voix ↔ langue | nécessite mapping voix Gemini |

## Backlog long terme

- **Collaboration** : conversations multiparticipants avec relais de flux audio (WebRTC), salle partagée.
- **Proxy backend** : sécuriser `GEMINI_API_KEY`, gérer authentification OAuth, quotas multi-utilisateurs, stockage mémoire partagé (ex. Supabase).
- **Apps natives** : empaquetage Tauri/Electron (desktop), Capacitor (mobile) pour accéder à des APIs plus profondes (Bluetooth, audio bas niveau).
- **Marketplace** : galerie publique de personnalités/visuels, export/import via JSON signé.

## Timeline indicative

| Période | Livraison visée | Commentaires |
| --- | --- | --- |
| **Q4 2025** | V1 (stabilité + observabilité) | Finaliser fallback, UX onboarding, instrumentation. |
| **Q1 2026** | V2 (personnalisation & mémoire intelligente) | Déployer thèmes, LLM pour recherche mémoire, débuts d’intégration externe. |
| **Q2+ 2026** | Initiatives long terme | Proxy backend, collaboration, packaging apps. |

## Suivi & contribution

- Les PRs doivent mentionner la case roadmap ciblée.
- Chaque ajout de fonctionnalité doit mettre à jour ce fichier + `README`.
- Les changements impactant la persistance doivent également modifier `localstorage_DOCS.md`.
