# 💾 Documentation des Données (LocalStorage)

Cette application fonctionne **sans base de données backend traditionnelle**. Toutes les données utilisateur sont stockées localement dans le navigateur via l'API `window.localStorage`.

> ⚠️ **Note** : Si l'utilisateur vide le cache de son navigateur ou change d'appareil, ces données seront perdues.

## 🔑 Clés de Stockage

Voici la liste exhaustive des clés utilisées par Audio Orb :

| Clé | Type | Exemple de valeur | Description |
|-----|------|-------------------|-------------|
| `gdm-voice` | String | `"Orus"` | Le nom de la voix TTS sélectionnée pour l'IA. |
| `gdm-style` | String | `"Naturel"` | Le style d'expression ou accent demandé. |
| `gdm-rate` | Number | `"1.2"` | Vitesse de lecture audio (Playback Rate). |
| `gdm-detune` | Number | `"0"` | Modification du pitch audio. |
| `gdm-personality`| String | `"assistant"` | ID de la personnalité active. |
| `gdm-memory` | String | `"- L'utilisateur s'appelle Marc.\n- Il aime le jazz."` | La "Mémoire Long Terme". Un texte brut contenant les faits appris par l'IA. |

## 🧠 Format de la Mémoire (`gdm-memory`)

La mémoire est stockée sous forme de texte brut (souvent formaté comme une liste à puces Markdown). 
Elle est injectée dans le `systemInstruction` de l'IA au début de chaque connexion sous la forme :

```text
INFORMATIONS SUR L'UTILISATEUR (MÉMOIRE) :
[Contenu de gdm-memory]
```

Cela permet à l'IA de maintenir une continuité contextuelle entre les rechargements de page.

## 🎭 Format des Personnalités

Les personnalités sont gérées par le `PersonalityManager` (`personality.ts`). Bien que les personnalités par défaut soient codées en dur, les personnalités personnalisées créées par l'utilisateur sont sauvegardées (si implémenté dans le futur, actuellement géré en mémoire volatile ou via extension du code).

*Note : Dans la version actuelle, seul l'ID de la personnalité active est persisté.*
