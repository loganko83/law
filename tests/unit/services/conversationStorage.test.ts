import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationStorage, Conversation, StoredMessage } from '../../../services/conversationStorage';

describe('conversationStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns empty array when no conversations exist', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      const result = conversationStorage.getAll();
      expect(result).toEqual([]);
    });

    it('returns parsed conversations sorted by updatedAt', () => {
      const mockConversations: Conversation[] = [
        { id: '1', title: 'Old', messages: [], createdAt: 1000, updatedAt: 1000 },
        { id: '2', title: 'New', messages: [], createdAt: 2000, updatedAt: 2000 }
      ];
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockConversations));

      const result = conversationStorage.getAll();
      expect(result[0].title).toBe('New');
      expect(result[1].title).toBe('Old');
    });
  });

  describe('getById', () => {
    it('returns null when conversation not found', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      const result = conversationStorage.getById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns conversation when found', () => {
      const mockConversation: Conversation = {
        id: 'test-id',
        title: 'Test',
        messages: [],
        createdAt: 1000,
        updatedAt: 1000
      };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([mockConversation]));

      const result = conversationStorage.getById('test-id');
      expect(result?.title).toBe('Test');
    });
  });

  describe('save', () => {
    it('adds new conversation to storage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('[]');
      const newConversation: Conversation = {
        id: 'new-id',
        title: 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      conversationStorage.save(newConversation);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('updates existing conversation', () => {
      const existing: Conversation = {
        id: 'existing-id',
        title: 'Old Title',
        messages: [],
        createdAt: 1000,
        updatedAt: 1000
      };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([existing]));

      const updated = { ...existing, title: 'Updated Title', updatedAt: 2000 };
      conversationStorage.save(updated);

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes conversation from storage', () => {
      const conversations: Conversation[] = [
        { id: '1', title: 'Keep', messages: [], createdAt: 1000, updatedAt: 1000 },
        { id: '2', title: 'Delete', messages: [], createdAt: 2000, updatedAt: 2000 }
      ];
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(conversations));

      conversationStorage.delete('2');

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('createNew', () => {
    it('creates conversation with unique id', async () => {
      const conv1 = conversationStorage.createNew();
      // Wait a few ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      const conv2 = conversationStorage.createNew();

      expect(conv1.id).toBeTruthy();
      expect(conv2.id).toBeTruthy();
      expect(conv1.id).not.toBe(conv2.id);
    });

    it('creates conversation with initial message', () => {
      const message: StoredMessage = {
        id: 'msg-1',
        role: 'user',
        text: 'Hello',
        timestamp: Date.now()
      };

      const conv = conversationStorage.createNew(message);
      expect(conv.messages).toHaveLength(1);
      expect(conv.messages[0].text).toBe('Hello');
    });
  });

  describe('generateTitle', () => {
    it('returns user message as title', () => {
      const messages: StoredMessage[] = [
        { id: '1', role: 'assistant', text: 'Hello', timestamp: 1000 },
        { id: '2', role: 'user', text: 'My question', timestamp: 2000 }
      ];

      const title = conversationStorage.generateTitle(messages);
      expect(title).toBe('My question');
    });

    it('truncates long messages', () => {
      const messages: StoredMessage[] = [
        { id: '1', role: 'user', text: 'This is a very long message that should be truncated', timestamp: 1000 }
      ];

      const title = conversationStorage.generateTitle(messages);
      expect(title.length).toBeLessThanOrEqual(33); // 30 chars + ...
    });

    it('returns default title when no user message', () => {
      const messages: StoredMessage[] = [
        { id: '1', role: 'assistant', text: 'Hello', timestamp: 1000 }
      ];

      const title = conversationStorage.generateTitle(messages);
      expect(title).toBe('New Conversation');
    });
  });
});
