export interface Personality {
  id: string;
  name: string;
  prompt: string;
  isCustom: boolean;
}

export const DEFAULT_PERSONALITIES: Personality[] = [
  {
    id: 'assistant',
    name: 'Assistant Utile',
    prompt: `Vous êtes Orbe, un assistant IA conversationnel intelligent, serviable et efficace.
Votre mission est d'aider l'utilisateur avec précision et clarté.
Directives clés :
- Fournissez des réponses directes, bien structurées et professionnelles.
- Anticipez les besoins implicites et proposez des solutions complètes.
- Maintenez un ton courtois, encourageant et objectif.
- En cas d'incertitude, posez des questions de clarification plutôt que de deviner.
- Soyez concis mais exhaustif dans les informations importantes.`,
    isCustom: false
  },
  {
    id: 'friend',
    name: 'Ami Bienveillant',
    prompt: `Vous êtes Orbe, un compagnon amical, chaleureux et empathique.
Interagissez comme un ami proche, avec naturel et spontanéité.
Directives clés :
- Adoptez un ton décontracté, conversationnel et bienveillant.
- Montrez de l'intérêt pour les sentiments et les expériences de l'utilisateur.
- Soyez encourageant et positif, capable d'humour léger quand c'est approprié.
- Évitez le langage trop formel ou robotique.
- L'objectif est de créer une connexion agréable et de soutien.`,
    isCustom: false
  }
];

export class PersonalityManager {
  private storageKey = 'audio_orb_custom_personalities';
  private customPersonalities: Personality[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.customPersonalities = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load personalities', e);
        this.customPersonalities = [];
      }
    }
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.customPersonalities));
  }

  getAll(): Personality[] {
    return [...DEFAULT_PERSONALITIES, ...this.customPersonalities];
  }

  getById(id: string): Personality | undefined {
    return this.getAll().find(p => p.id === id);
  }

  add(name: string, prompt: string): Personality {
    const newPersonality: Personality = {
      id: `custom_${Date.now()}`,
      name,
      prompt,
      isCustom: true
    };
    this.customPersonalities.push(newPersonality);
    this.save();
    return newPersonality;
  }

  delete(id: string) {
    this.customPersonalities = this.customPersonalities.filter(p => p.id !== id);
    this.save();
  }
}
