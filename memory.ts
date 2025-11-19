/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MemoryCategory = 'preferences' | 'facts' | 'context';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  timestamp: number;
}

export interface StructuredMemory {
  preferences: MemoryItem[];
  facts: MemoryItem[];
  context: MemoryItem[];
}

export class MemoryManager {
  private storageKey = 'gdm-structured-memory';
  private legacyKey = 'gdm-memory'; // Pour migration depuis l'ancien système

  /**
   * Charge la mémoire structurée depuis localStorage
   */
  load(): StructuredMemory {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration depuis l'ancien format si nécessaire
        if (this.isLegacyFormat(parsed)) {
          return this.migrateFromLegacy(parsed);
        }
        return this.validateMemory(parsed);
      }
      
      // Essayer de migrer depuis l'ancien format
      const legacyMemory = localStorage.getItem(this.legacyKey);
      if (legacyMemory && legacyMemory.trim().length > 0) {
        return this.migrateFromLegacy(legacyMemory);
      }
      
      return this.createEmpty();
    } catch (e) {
      console.error('Erreur chargement mémoire:', e);
      return this.createEmpty();
    }
  }

  /**
   * Sauvegarde la mémoire structurée dans localStorage
   */
  save(memory: StructuredMemory): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(memory));
      // Supprimer l'ancien format après migration
      localStorage.removeItem(this.legacyKey);
    } catch (e) {
      console.error('Erreur sauvegarde mémoire:', e);
    }
  }

  /**
   * Ajoute un élément à la mémoire
   */
  addItem(category: MemoryCategory, content: string): MemoryItem {
    const memory = this.load();
    const item: MemoryItem = {
      id: this.generateId(),
      category,
      content: content.trim(),
      timestamp: Date.now(),
    };
    
    memory[category].push(item);
    this.save(memory);
    return item;
  }

  /**
   * Supprime un élément de la mémoire
   */
  removeItem(category: MemoryCategory, id: string): void {
    const memory = this.load();
    memory[category] = memory[category].filter(item => item.id !== id);
    this.save(memory);
  }

  /**
   * Met à jour un élément de la mémoire
   */
  updateItem(category: MemoryCategory, id: string, content: string): void {
    const memory = this.load();
    const item = memory[category].find(i => i.id === id);
    if (item) {
      item.content = content.trim();
      item.timestamp = Date.now();
      this.save(memory);
    }
  }

  /**
   * Efface toute la mémoire
   */
  clear(): void {
    this.save(this.createEmpty());
    localStorage.removeItem(this.legacyKey);
  }

  /**
   * Convertit la mémoire structurée en texte formaté pour l'IA
   */
  toText(): string {
    const memory = this.load();
    const sections: string[] = [];
    
    if (memory.preferences.length > 0) {
      sections.push('PRÉFÉRENCES:');
      memory.preferences.forEach(item => {
        sections.push(`- ${item.content}`);
      });
    }
    
    if (memory.facts.length > 0) {
      sections.push('\nFAITS IMPORTANTS:');
      memory.facts.forEach(item => {
        sections.push(`- ${item.content}`);
      });
    }
    
    if (memory.context.length > 0) {
      sections.push('\nCONTEXTE:');
      memory.context.forEach(item => {
        sections.push(`- ${item.content}`);
      });
    }
    
    return sections.join('\n') || '';
  }

  /**
   * Exporte la mémoire en JSON
   */
  export(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  /**
   * Importe la mémoire depuis JSON
   */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      const validated = this.validateMemory(parsed);
      this.save(validated);
      return true;
    } catch (e) {
      console.error('Erreur import mémoire:', e);
      return false;
    }
  }

  /**
   * Recherche dans la mémoire (simple recherche textuelle)
   */
  search(query: string): MemoryItem[] {
    const memory = this.load();
    const lowerQuery = query.toLowerCase();
    const results: MemoryItem[] = [];
    
    ['preferences', 'facts', 'context'].forEach(category => {
      memory[category as MemoryCategory].forEach(item => {
        if (item.content.toLowerCase().includes(lowerQuery)) {
          results.push(item);
        }
      });
    });
    
    return results;
  }

  /**
   * Catégorise automatiquement du texte en utilisant l'IA
   */
  async categorizeWithAI(text: string, client: any): Promise<{category: MemoryCategory, items: string[]}> {
    const prompt = `
Analyse le texte suivant et extrais les informations importantes en les catégorisant en trois types :
- PRÉFÉRENCES : Goûts, préférences personnelles, opinions, choix
- FAITS : Informations factuelles sur la personne (nom, âge, profession, etc.)
- CONTEXTE : Situation, environnement, contexte de vie, projets en cours

Texte à analyser :
${text}

Réponds UNIQUEMENT au format JSON suivant (sans texte avant ou après) :
{
  "preferences": ["préférence 1", "préférence 2"],
  "facts": ["fait 1", "fait 2"],
  "context": ["contexte 1", "contexte 2"]
}

Si une catégorie est vide, utilise un tableau vide [].
`;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const jsonText = response.text.trim();
      // Nettoyer le JSON (enlever les markdown code blocks si présents)
      const cleaned = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        category: 'preferences', // Pas utilisé dans ce cas
        items: [
          ...(parsed.preferences || []),
          ...(parsed.facts || []),
          ...(parsed.context || [])
        ]
      };
    } catch (e) {
      console.error('Erreur catégorisation IA:', e);
      // Fallback : tout mettre dans "facts"
      return {
        category: 'facts',
        items: [text]
      };
    }
  }

  /**
   * Met à jour la mémoire depuis une transcription en utilisant l'IA
   */
  async updateFromTranscript(transcript: string, client: any): Promise<void> {
    const memory = this.load();
    const existingText = this.toText();
    
    const prompt = `
J'ai une mémoire structurée d'un utilisateur et une nouvelle transcription de conversation.
Analyse la transcription et extrais UNIQUEMENT les nouvelles informations importantes (pas celles déjà dans la mémoire).
Catégorise-les en :
- PRÉFÉRENCES : Goûts, préférences, opinions
- FAITS : Informations factuelles (nom, âge, profession, etc.)
- CONTEXTE : Situation, environnement, projets

MÉMOIRE EXISTANTE :
${existingText || "(Vide)"}

NOUVELLE TRANSCRIPTION :
${transcript}

Réponds UNIQUEMENT au format JSON suivant (sans texte avant ou après) :
{
  "preferences": ["nouvelle préférence 1", "nouvelle préférence 2"],
  "facts": ["nouveau fait 1"],
  "context": ["nouveau contexte 1"]
}

Si une catégorie n'a pas de nouvelles informations, utilise un tableau vide [].
`;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const jsonText = response.text.trim();
      const cleaned = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      // Ajouter les nouvelles informations
      if (parsed.preferences && Array.isArray(parsed.preferences)) {
        parsed.preferences.forEach((item: string) => {
          if (item && item.trim()) {
            this.addItem('preferences', item);
          }
        });
      }
      
      if (parsed.facts && Array.isArray(parsed.facts)) {
        parsed.facts.forEach((item: string) => {
          if (item && item.trim()) {
            this.addItem('facts', item);
          }
        });
      }
      
      if (parsed.context && Array.isArray(parsed.context)) {
        parsed.context.forEach((item: string) => {
          if (item && item.trim()) {
            this.addItem('context', item);
          }
        });
      }
    } catch (e) {
      console.error('Erreur mise à jour mémoire:', e);
      throw e;
    }
  }

  private createEmpty(): StructuredMemory {
    return {
      preferences: [],
      facts: [],
      context: [],
    };
  }

  private validateMemory(data: any): StructuredMemory {
    const memory = this.createEmpty();
    
    if (data.preferences && Array.isArray(data.preferences)) {
      memory.preferences = data.preferences.filter((item: any) => 
        item && item.content && item.id
      ).map((item: any) => ({
        id: item.id || this.generateId(),
        category: 'preferences' as MemoryCategory,
        content: String(item.content),
        timestamp: item.timestamp || Date.now(),
      }));
    }
    
    if (data.facts && Array.isArray(data.facts)) {
      memory.facts = data.facts.filter((item: any) => 
        item && item.content && item.id
      ).map((item: any) => ({
        id: item.id || this.generateId(),
        category: 'facts' as MemoryCategory,
        content: String(item.content),
        timestamp: item.timestamp || Date.now(),
      }));
    }
    
    if (data.context && Array.isArray(data.context)) {
      memory.context = data.context.filter((item: any) => 
        item && item.content && item.id
      ).map((item: any) => ({
        id: item.id || this.generateId(),
        category: 'context' as MemoryCategory,
        content: String(item.content),
        timestamp: item.timestamp || Date.now(),
      }));
    }
    
    return memory;
  }

  private isLegacyFormat(data: any): boolean {
    return typeof data === 'string' || (data && !data.preferences && !data.facts && !data.context);
  }

  private migrateFromLegacy(legacyData: string): StructuredMemory {
    // Tenter de catégoriser l'ancienne mémoire en "facts" par défaut
    const memory = this.createEmpty();
    const lines = legacyData.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned) {
        memory.facts.push({
          id: this.generateId(),
          category: 'facts',
          content: cleaned,
          timestamp: Date.now(),
        });
      }
    });
    
    return memory;
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

