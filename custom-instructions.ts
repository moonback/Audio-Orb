export interface CustomInstructions {
  id: string;
  title: string;
  instructions: string;
  enabled: boolean;
  createdAt: number;
}

export class CustomInstructionsManager {
  private storageKey = 'audio_orb_custom_instructions';
  private instructions: CustomInstructions[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.instructions = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load custom instructions', e);
        this.instructions = [];
      }
    }
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.instructions));
  }

  getAll(): CustomInstructions[] {
    return [...this.instructions].sort((a, b) => b.createdAt - a.createdAt);
  }

  getById(id: string): CustomInstructions | undefined {
    return this.instructions.find(i => i.id === id);
  }

  getEnabled(): CustomInstructions[] {
    return this.instructions.filter(i => i.enabled);
  }

  getAllAsText(): string {
    const enabled = this.getEnabled();
    if (enabled.length === 0) return '';
    
    return enabled
      .map(i => i.instructions.trim())
      .filter(text => text.length > 0)
      .join('\n\n');
  }

  add(title: string, instructions: string, enabled: boolean = true): CustomInstructions {
    const newInstructions: CustomInstructions = {
      id: `instruction_${Date.now()}`,
      title,
      instructions,
      enabled,
      createdAt: Date.now()
    };
    this.instructions.push(newInstructions);
    this.save();
    return newInstructions;
  }

  update(id: string, updates: Partial<Omit<CustomInstructions, 'id' | 'createdAt'>>) {
    const index = this.instructions.findIndex(i => i.id === id);
    if (index !== -1) {
      this.instructions[index] = { ...this.instructions[index], ...updates };
      this.save();
    }
  }

  toggleEnabled(id: string) {
    const instruction = this.instructions.find(i => i.id === id);
    if (instruction) {
      instruction.enabled = !instruction.enabled;
      this.save();
    }
  }

  delete(id: string) {
    this.instructions = this.instructions.filter(i => i.id !== id);
    this.save();
  }
}

