# 📚 Documentation APIs & localStorage - Audio Orb

Ce document détaille toutes les APIs externes utilisées, les endpoints, et la gestion du localStorage dans Audio Orb.

## 🔌 APIs Externes

### Google Gemini Live API

**Service** : Google Generative AI (Gemini)  
**Type** : WebSocket (Live API)  
**Documentation** : [Google AI Studio](https://ai.google.dev/docs)

#### Configuration

```typescript
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
```

#### Connexion à la Session Live

**Endpoint** : WebSocket (géré par le SDK)  
**Méthode** : `client.live.connect()`

```typescript
const session = await client.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  callbacks: {
    onopen: () => void,
    onmessage: (message: LiveServerMessage) => void,
    onerror: (e: ErrorEvent) => void,
    onclose: (e: CloseEvent) => void
  },
  config: SessionConfig
});
```

#### Configuration de Session

| Paramètre | Type | Description | Valeurs Possibles |
|-----------|------|-------------|-------------------|
| `model` | `string` | Modèle Gemini à utiliser | `'gemini-2.5-flash-native-audio-preview-09-2025'` |
| `responseModalities` | `Modality[]` | Modalités de réponse | `[Modality.AUDIO]` |
| `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` | `string` | Voix prédéfinie | Voir tableau des voix |
| `systemInstruction` | `string` | Instructions système pour l'IA | Texte personnalisé |
| `inputAudioTranscription` | `object` | Configuration transcription entrée | `{}` (vide) |
| `outputAudioTranscription` | `object` | Configuration transcription sortie | `{}` (vide) |
| `thinkingConfig.thinkingBudget` | `number` | Budget pour mode Thinking | `24576` (si activé) |

#### Voix Disponibles

| Nom | Description | Caractéristiques |
|-----|-------------|-----------------|
| `Orus` | Voix masculine profonde | Par défaut |
| `Puck` | Voix masculine claire | - |
| `Charon` | Voix masculine grave | - |
| `Kore` | Voix féminine douce | - |
| `Fenrir` | Voix masculine puissante | - |
| `Zephyr` | Voix neutre légère | - |
| `Aoede` | Voix féminine expressive | - |

#### Styles d'Expression

| Style | Description | Effet sur l'IA |
|------|-------------|----------------|
| `Natural` | Conversation naturelle | Par défaut, ton équilibré |
| `Professional` | Ton professionnel | Formel, structuré |
| `Cheerful` | Ton joyeux | Enthousiaste, positif |
| `British Accent` | Accent britannique | Prononciation UK |
| `French Accent` | Accent français | Prononciation FR |
| `Whispering` | Chuchotement | Voix douce, intime |
| `Enthusiastic` | Ton enthousiaste | Énergique, passionné |

#### Envoi d'Audio (Input)

**Méthode** : `session.sendRealtimeInput()`

```typescript
session.sendRealtimeInput({
  media: {
    data: string,      // Base64 encoded PCM
    mimeType: 'audio/pcm;rate=16000'
  }
});
```

**Format Audio Entrée** :
- **Type** : PCM 16-bit, mono
- **Sample Rate** : 16000 Hz
- **Buffer Size** : 256 samples
- **Encodage** : Base64

#### Réception d'Audio (Output)

**Callback** : `onmessage`

```typescript
onmessage: async (message: LiveServerMessage) => {
  // Audio de réponse
  const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
  if (audio) {
    // audio.data = Base64 encoded PCM
    // audio.mimeType = 'audio/pcm;rate=24000'
  }
  
  // Transcription entrée
  const inputTrans = message.serverContent?.inputTranscription?.text;
  
  // Transcription sortie
  const outputTrans = message.serverContent?.outputTranscription?.text;
  
  // Interruption
  const interrupted = message.serverContent?.interrupted;
}
```

**Format Audio Sortie** :
- **Type** : PCM 16-bit, mono
- **Sample Rate** : 24000 Hz
- **Décodage** : Base64 → Int16Array → Float32Array → AudioBuffer

#### API de Génération de Contenu (pour Mémoire)

**Endpoint** : REST API (via SDK)  
**Méthode** : `client.models.generateContent()`

```typescript
const response = await this.client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: string  // Prompt pour consolidation mémoire
});

const updatedMemory = response.text;
```

**Utilisation** : Mise à jour de la mémoire long terme après chaque session.

### Web Audio API

**Service** : API native du navigateur  
**Documentation** : [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

#### AudioContext

```typescript
// Contexte pour entrée (microphone)
const inputAudioContext = new AudioContext({
  sampleRate: 16000
});

// Contexte pour sortie (haut-parleurs)
const outputAudioContext = new AudioContext({
  sampleRate: 24000
});
```

#### Nodes Utilisés

| Node | Usage | Description |
|------|-------|-------------|
| `MediaStreamSourceNode` | Entrée | Source depuis `getUserMedia()` |
| `ScriptProcessorNode` | Traitement | Capture chunks audio (256 samples) |
| `GainNode` | Contrôle | Volume entrée/sortie |
| `AnalyserNode` | Analyse | FFT pour visualisation |
| `BufferSourceNode` | Sortie | Lecture audio depuis Gemini |

#### getUserMedia()

**API** : MediaDevices API  
**Permission** : Microphone

```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: false
});
```

**Contraintes** :
- Nécessite HTTPS en production
- Permission utilisateur requise
- Peut être bloqué par le navigateur

## 💾 localStorage API

Audio Orb utilise le `localStorage` du navigateur pour persister les préférences utilisateur et la mémoire long terme.

### Structure des Données

Toutes les clés sont préfixées par `gdm-` (Google Dialog Model).

### Clés Stockées

#### `gdm-voice`

**Type** : `string`  
**Description** : Voix sélectionnée pour l'assistant  
**Valeurs** : `'Orus'`, `'Puck'`, `'Charon'`, `'Kore'`, `'Fenrir'`, `'Zephyr'`, `'Aoede'`  
**Défaut** : `'Orus'`  
**Taille** : ~10-20 bytes

**Lecture** :
```typescript
const voice = localStorage.getItem('gdm-voice') || 'Orus';
```

**Écriture** :
```typescript
localStorage.setItem('gdm-voice', selectedVoice);
```

**Déclencheur** : Changement de voix dans les paramètres → Réinitialise la session

---

#### `gdm-style`

**Type** : `string`  
**Description** : Style d'expression de l'assistant  
**Valeurs** : `'Natural'`, `'Professional'`, `'Cheerful'`, `'British Accent'`, `'French Accent'`, `'Whispering'`, `'Enthusiastic'`  
**Défaut** : `'Natural'`  
**Taille** : ~10-30 bytes

**Lecture** :
```typescript
const style = localStorage.getItem('gdm-style') || 'Natural';
```

**Écriture** :
```typescript
localStorage.setItem('gdm-style', selectedStyle);
```

**Déclencheur** : Changement de style → Réinitialise la session

---

#### `gdm-rate`

**Type** : `string` (nombre sérialisé)  
**Description** : Vitesse de lecture audio (playback rate)  
**Valeurs** : `'0.5'` à `'2.0'` (par pas de 0.1)  
**Défaut** : `'1.0'`  
**Taille** : ~3-4 bytes

**Lecture** :
```typescript
const rate = parseFloat(localStorage.getItem('gdm-rate') || '1.0');
```

**Écriture** :
```typescript
localStorage.setItem('gdm-rate', String(playbackRate));
```

**Déclencheur** : Changement de vitesse → Met à jour les sources audio en cours

---

#### `gdm-detune`

**Type** : `string` (nombre sérialisé)  
**Description** : Pitch de la voix en cents (demi-tons × 100)  
**Valeurs** : `'-1200'` à `'1200'` (par pas de 100)  
**Défaut** : `'0'`  
**Taille** : ~4-5 bytes

**Lecture** :
```typescript
const detune = parseFloat(localStorage.getItem('gdm-detune') || '0');
```

**Écriture** :
```typescript
localStorage.setItem('gdm-detune', String(detune));
```

**Déclencheur** : Changement de pitch → Met à jour les sources audio en cours

---

#### `gdm-thinking`

**Type** : `string` (`'true'` ou `'false'`)  
**Description** : Activation du mode "Thinking" de Gemini  
**Valeurs** : `'true'`, `'false'`  
**Défaut** : `'false'`  
**Taille** : ~4-5 bytes

**Lecture** :
```typescript
const isThinking = localStorage.getItem('gdm-thinking') === 'true';
```

**Écriture** :
```typescript
localStorage.setItem('gdm-thinking', String(isThinkingMode));
```

**Déclencheur** : Activation/désactivation → Réinitialise la session

**Note** : Le mode Thinking augmente la latence mais améliore la qualité des réponses.

---

#### `gdm-memory`

**Type** : `string` (texte multiligne)  
**Description** : Mémoire long terme de l'utilisateur (consolidée par l'IA)  
**Valeurs** : Texte libre généré par Gemini  
**Défaut** : `''` (chaîne vide)  
**Taille** : Variable (typiquement 100-2000 bytes)

**Lecture** :
```typescript
const memory = localStorage.getItem('gdm-memory') || '';
```

**Écriture** :
```typescript
localStorage.setItem('gdm-memory', updatedMemory);
```

**Suppression** :
```typescript
localStorage.removeItem('gdm-memory');
```

**Déclencheur** : 
- Mise à jour automatique après chaque session (via `updateMemoryFromSession()`)
- Suppression manuelle via bouton "Clear Memory"

**Format** : Texte structuré généré par Gemini, typiquement en format bullet points.

**Exemple** :
```
- Utilisateur préfère les réponses courtes et directes
- Travaille dans le domaine de la technologie
- Aime les explications techniques détaillées
- Préfère le style "Professional"
```

### Cycle de Vie localStorage

```
1. Chargement Application
   │
   ▼
2. constructor() → Lit les valeurs depuis localStorage
   ├─► selectedVoice = localStorage.getItem('gdm-voice') || 'Orus'
   ├─► selectedStyle = localStorage.getItem('gdm-style') || 'Natural'
   ├─► playbackRate = parseFloat(localStorage.getItem('gdm-rate') || '1.0')
   ├─► detune = parseFloat(localStorage.getItem('gdm-detune') || '0')
   ├─► isThinkingMode = localStorage.getItem('gdm-thinking') === 'true'
   └─► memory = localStorage.getItem('gdm-memory') || ''
   │
   ▼
3. Utilisateur modifie un paramètre
   │
   ▼
4. updated() (Lit lifecycle hook)
   ├─► Si playbackRate/detune changent
   │   └─► localStorage.setItem() + Met à jour sources audio
   │
   ├─► Si voice/style/thinking changent
   │   ├─► localStorage.setItem()
   │   └─► reset() → Nouvelle session avec nouveaux paramètres
   │
   └─► Si memory change
       └─► localStorage.setItem()
   │
   ▼
5. Fin de session (stopRecording())
   │
   ▼
6. updateMemoryFromSession()
   ├─► Génère résumé avec Gemini
   ├─► Met à jour memory
   └─► localStorage.setItem('gdm-memory', updatedMemory)
```

### Gestion des Erreurs

#### localStorage Quota Exceeded

**Erreur** : `QuotaExceededError`  
**Cause** : Limite de ~5-10MB dépassée (peu probable pour cette app)  
**Gestion** : Try-catch autour de `setItem()`

```typescript
try {
  localStorage.setItem('gdm-memory', memory);
} catch (e) {
  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
    console.error('localStorage quota exceeded');
    // Option: Tronquer la mémoire ou utiliser IndexedDB
  }
}
```

#### localStorage Disabled

**Détection** :
```typescript
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
```

**Fallback** : Utiliser des valeurs par défaut si localStorage n'est pas disponible.

### Migration & Compatibilité

#### Anciennes Versions

Si vous changez la structure des données, prévoyez une migration :

```typescript
// Exemple: Migration d'une ancienne clé
const oldVoice = localStorage.getItem('voice'); // Ancienne clé
if (oldVoice && !localStorage.getItem('gdm-voice')) {
  localStorage.setItem('gdm-voice', oldVoice);
  localStorage.removeItem('voice');
}
```

#### Nettoyage

Pour réinitialiser toutes les préférences :

```typescript
function clearAllSettings() {
  localStorage.removeItem('gdm-voice');
  localStorage.removeItem('gdm-style');
  localStorage.removeItem('gdm-rate');
  localStorage.removeItem('gdm-detune');
  localStorage.removeItem('gdm-thinking');
  localStorage.removeItem('gdm-memory');
}
```

## 🔐 Sécurité & Confidentialité

### Données Stockées

- **localStorage** : Données locales uniquement (pas de synchronisation cloud)
- **Mémoire** : Contient des informations personnelles → Stockée localement uniquement
- **Clé API** : Stockée dans `.env`, injectée au build (visible côté client)

### Recommandations

1. **Ne pas stocker de données sensibles** dans localStorage
2. **Informer l'utilisateur** que la mémoire est stockée localement
3. **Option de suppression** : Bouton "Clear Memory" disponible
4. **HTTPS requis** : Pour `getUserMedia()` et sécurité générale

## 📊 Limites & Contraintes

### localStorage

- **Quota** : ~5-10MB par origine (suffisant pour cette app)
- **Synchronisation** : Aucune (données locales uniquement)
- **Expiration** : Aucune (persiste jusqu'à suppression manuelle)
- **Portée** : Par origine (protocole + domaine + port)

### APIs Externes

- **Quotas Gemini** : Selon votre plan Google Cloud
- **Rate Limiting** : Géré par Google
- **Coûts** : Facturés selon l'usage (consultez Google Cloud Pricing)

---

**Note** : Cette documentation est à jour pour la version actuelle d'Audio Orb. Les APIs peuvent évoluer, consultez la documentation officielle pour les dernières mises à jour.

