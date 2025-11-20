# 💾 Données persistées (LocalStorage)

NeuroChat n’embarque pas de base de données serveur. Toutes les préférences utilisateur, la mémoire longue durée et les personnalisations sont stockées dans `window.localStorage`, via l’utilitaire `debouncedStorage` (temps de débounce de 300 ms pour limiter les écritures).

> ⚠️ Tous les éléments listés ci-dessous sont **propres au navigateur courant**. Un changement d’appareil, de profil ou un effacement du cache supprime définitivement les données.

## Vue d’ensemble

| Clé | Type | Exemple | Écrit par | Description |
| --- | --- | --- | --- | --- |
| `gdm-voice` | `string` | `"Orus"` | `settings-panel` | Nom de la voix pré-construite Gemini sélectionnée. |
| `gdm-style` | `string` | `"Accent français"` | `settings-panel` | Style/diction demandé dans `systemInstruction`. |
| `gdm-rate` | `string` num. | `"1.15"` | `settings-panel` | Vitesse de lecture (`AudioBufferSource.playbackRate`). |
| `gdm-detune` | `string` num. | `"-200"` | `settings-panel` | Décalage de pitch en cents. |
| `gdm-bass` | `string` num. | `"4"` | `settings-panel`, `audio-engine` | Gain EQ low-shelf (dB). |
| `gdm-treble` | `string` num. | `"2"` | `settings-panel`, `audio-engine` | Gain EQ high-shelf (dB). |
| `gdm-audio-preset` | `string` | `"Voix"` | `settings-panel` | Nom du preset appliqué (Voix, Musique, Neutre...). |
| `gdm-personality` | `string` | `"mentor"` | `settings-panel` | ID de la personnalité active. |
| `gdm-text-scale` | `string` num. | `"1.1"` | `settings-panel` | Facteur d’agrandissement du texte (1 = 100 %). |
| `gdm-input-device` | `string` | `"default"` | `settings-panel` | `deviceId` du micro choisi (fallback `default`). |
| `gdm-output-device` | `string` | `"default"` | `settings-panel` | `deviceId` de la sortie audio (`setSinkId`). |
| `gdm-onboarding-done` | `string` bool | `"true"` | `onboarding-modal` | Flag qui évite de réafficher le tutoriel. |
| `gdm-quota-state` | `string` JSON | `{"used":12,"resetAt":1732147200000}` | `GdmLiveAudio` | Cache local du quota Gemini (requests + timestamp reset). |
| `gdm-structured-memory` | `string` JSON | Voir format ci-dessous | `MemoryManager` | Mémoire catégorisée (préférences, faits, contexte). |
| `gdm-memory` | `string` texte | `"- L’utilisateur aime le jazz"` | `MemoryManager` | **Legacy** : ancienne mémoire brute (migrée au démarrage). |
| `audio_orb_custom_personalities` | `string` JSON | `[{"id":"custom_...","name":"Coach",...}]` | `PersonalityManager` | Personnalités créées par l’utilisateur (prompt complet). |

Tous les réglages « simples » sont stockés sous forme de chaînes ; ils sont convertis en nombres au chargement (ex. `parseFloat` dans `index.tsx`). Cela évite les soucis de `localStorage` qui n’accepte que des chaînes.

## Mémoire structurée (`gdm-structured-memory`)

```json
{
  "preferences": [
    {
      "id": "mem_171397....",
      "category": "preferences",
      "content": "Préférence utilisateur",
      "timestamp": 1732112500000
    }
  ],
  "facts": [],
  "context": []
}
```

- **Origine** : `MemoryManager.save()` sérialise l’objet `StructuredMemory`.
- **Migration** : si `gdm-structured-memory` est absent mais que `gdm-memory` existe, le texte legacy est converti en faits.
- **Usage** :
  - `MemoryManager.load()` → objet JS.
  - `MemoryManager.toText()` → string injectée dans `systemInstruction`.
  - `MemoryManager.updateFromTranscript()` → ajoute uniquement les nouveautés détectées par Gemini via un prompt JSON.
- **Import/export** : le panneau Settings permet d’importer un JSON conforme ou d’exporter l’état courant (boutons `Importer`/`Exporter`).

## Personnalités (`audio_orb_custom_personalities`)

Structure :

```json
[
  {
    "id": "custom_1732112",
    "name": "Coach énergie",
    "prompt": "Tu parles avec entrain...",
    "isCustom": true
  }
]
```

- `PersonalityManager.add()` génère `id = custom_${Date.now()}`.
- Suppression via `PersonalityManager.delete(id)` (ex: depuis Settings).
- Les personnalités par défaut (assistant, friend, mentor…) ne résident pas dans le stockage : elles sont codées en dur dans `DEFAULT_PERSONALITIES`.

## Quota Gemini (`gdm-quota-state`)

Structure :

```json
{
  "used": 14,
  "resetAt": 1732147200000
}
```

- `used` : incrément local (≈ nombre de requêtes, basé sur `usageMetadata.totalTokenCount` → 1 unité par ~1k tokens).
- `resetAt` : timestamp (ms) du prochain reset quotidien (minuit locale).
- Mécanisme : `registerQuotaUsage()` s’exécute à chaque `quota` event du `GeminiClient`, alimente l’indicateur HUD et prévoit un reset si `Date.now() > resetAt`.

## Stratégies de nettoyage

- **Réinitialisation rapide** : supprimer manuellement les clés dans l’onglet Application des DevTools ou executer `localStorage.clear()` (efface également la mémoire).
- **Purger la mémoire** : via l’UI (boutons par catégorie) ou `MemoryManager.clear()` (utilisé lors d’un reset complet).
- **Compatibilité versionnée** : toute nouvelle clé doit avoir une valeur par défaut robuste (ex. fallback sur `'assistant'` si la personnalité stockée n’existe plus). Documenter chaque ajout ici pour éviter les collisions.
