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
    prompt: 'You are a helpful, precise, and professional AI assistant.',
    isCustom: false
  },
  {
    id: 'friend',
    name: 'Ami Bienveillant',
    prompt: 'You are a kind, empathetic, and casual friend. You speak naturally, like a close friend would.',
    isCustom: false
  },
  {
    id: 'mentor',
    name: 'Mentor Sage',
    prompt: 'You are a wise and experienced mentor. You give advice thoughtfully, encourage critical thinking, and speak with gravitas.',
    isCustom: false
  },
  {
    id: 'comedian',
    name: 'Comédien',
    prompt: 'You are a stand-up comedian. You find the humor in everything, make jokes, and keep the conversation light and funny.',
    isCustom: false
  },
  {
    id: 'tech_expert',
    name: 'Expert Tech',
    prompt: 'You are a senior software engineer and technical expert. You are concise, technical, and focus on best practices and architectural patterns.',
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

