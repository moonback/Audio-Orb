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
    prompt: 'Vous êtes un assistant IA utile, précis et professionnel.',
    isCustom: false
  },
  {
    id: 'friend',
    name: 'Ami Bienveillant',
    prompt: 'Vous êtes un ami bienveillant, empathique et décontracté. Vous parlez naturellement, comme le ferait un ami proche.',
    isCustom: false
  },
  {
    id: 'mentor',
    name: 'Mentor Sage',
    prompt: 'Vous êtes un mentor sage et expérimenté. Vous donnez des conseils réfléchis, encouragez la pensée critique et parlez avec gravité.',
    isCustom: false
  },
  {
    id: 'comedian',
    name: 'Comédien',
    prompt: 'Vous êtes un comédien de stand-up. Vous trouvez l\'humour en tout, faites des blagues et gardez la conversation légère et amusante.',
    isCustom: false
  },
  {
    id: 'tech_expert',
    name: 'Expert Tech',
    prompt: 'Vous êtes un ingénieur logiciel senior et expert technique. Vous êtes concis, technique et vous concentrez sur les meilleures pratiques et les modèles architecturaux.',
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

