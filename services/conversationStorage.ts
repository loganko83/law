// Conversation storage service using localStorage

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'safecon-conversations';
const MAX_CONVERSATIONS = 20;

export const conversationStorage = {
  getAll(): Conversation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const conversations = JSON.parse(data) as Conversation[];
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e) {
      console.error('Failed to load conversations:', e);
      return [];
    }
  },

  getById(id: string): Conversation | null {
    const conversations = this.getAll();
    return conversations.find(c => c.id === id) || null;
  },

  save(conversation: Conversation): void {
    try {
      let conversations = this.getAll();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.unshift(conversation);
      }

      // Limit stored conversations
      if (conversations.length > MAX_CONVERSATIONS) {
        conversations = conversations.slice(0, MAX_CONVERSATIONS);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversation:', e);
    }
  },

  delete(id: string): void {
    try {
      const conversations = this.getAll().filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  },

  createNew(initialMessage?: StoredMessage): Conversation {
    return {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      messages: initialMessage ? [initialMessage] : [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  },

  generateTitle(messages: StoredMessage[]): string {
    const userMessage = messages.find(m => m.role === 'user');
    if (userMessage) {
      const text = userMessage.text.trim();
      return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    return 'New Conversation';
  }
};
