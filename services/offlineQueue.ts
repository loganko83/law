/**
 * Offline Queue Service
 * Queues actions when offline and syncs them when back online
 */

export interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

interface ActionHandler {
  (payload: unknown): Promise<void>;
}

const STORAGE_KEY = 'safecon-offline-queue';
const MAX_RETRIES = 3;

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private handlers: Map<string, ActionHandler> = new Map();
  private isProcessing = false;
  private listeners: Set<(queue: QueuedAction[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupOnlineListener();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Reset processing status on load
        this.queue = this.queue.map(action => ({
          ...action,
          status: action.status === 'processing' ? 'pending' : action.status,
        }));
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupOnlineListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Back online - processing offline queue');
        this.processQueue();
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register a handler for a specific action type
   */
  registerHandler(type: string, handler: ActionHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Add an action to the queue
   */
  add(type: string, payload: unknown, maxRetries = MAX_RETRIES): QueuedAction {
    const action: QueuedAction = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
      status: 'pending',
    };

    this.queue.push(action);
    this.saveToStorage();
    this.notifyListeners();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return action;
  }

  /**
   * Remove an action from the queue
   */
  remove(id: string): void {
    this.queue = this.queue.filter(action => action.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all actions from the queue
   */
  clear(): void {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all queued actions
   */
  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  /**
   * Get pending actions count
   */
  getPendingCount(): number {
    return this.queue.filter(action => action.status === 'pending').length;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedAction[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Process all pending actions in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    const pendingActions = this.queue.filter(action => action.status === 'pending');

    for (const action of pendingActions) {
      const handler = this.handlers.get(action.type);
      if (!handler) {
        console.warn(`No handler registered for action type: ${action.type}`);
        continue;
      }

      // Update status to processing
      action.status = 'processing';
      this.saveToStorage();
      this.notifyListeners();

      try {
        await handler(action.payload);
        action.status = 'completed';
        // Remove completed actions
        this.queue = this.queue.filter(a => a.id !== action.id);
      } catch (error) {
        action.retries++;
        if (action.retries >= action.maxRetries) {
          action.status = 'failed';
          action.error = error instanceof Error ? error.message : 'Unknown error';
        } else {
          action.status = 'pending';
        }
      }

      this.saveToStorage();
      this.notifyListeners();
    }

    this.isProcessing = false;
  }

  /**
   * Retry failed actions
   */
  async retryFailed(): Promise<void> {
    // Reset failed actions to pending
    this.queue = this.queue.map(action => {
      if (action.status === 'failed') {
        return { ...action, status: 'pending' as const, retries: 0, error: undefined };
      }
      return action;
    });
    this.saveToStorage();
    this.notifyListeners();

    await this.processQueue();
  }

  /**
   * Check if there are any pending or failed actions
   */
  hasPendingActions(): boolean {
    return this.queue.some(action => action.status === 'pending' || action.status === 'failed');
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Action types for type safety
export const ActionTypes = {
  CREATE_CONTRACT: 'CREATE_CONTRACT',
  UPDATE_CONTRACT: 'UPDATE_CONTRACT',
  ADD_PARTY: 'ADD_PARTY',
  ADD_EVENT: 'ADD_EVENT',
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
} as const;

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes];

export default offlineQueue;
