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
    prompt: ``,
    isCustom: false
  },
  {
    id: 'friend',
    name: 'Ami Bienveillant',
    prompt: ``,
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
