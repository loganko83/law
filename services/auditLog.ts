/**
 * Audit Log Service
 *
 * Tracks user actions and system events for security, compliance,
 * and debugging purposes. Logs are stored locally and synced to
 * the backend when available.
 */

export type AuditAction =
  | 'login'
  | 'logout'
  | 'contract_view'
  | 'contract_create'
  | 'contract_update'
  | 'contract_delete'
  | 'contract_share'
  | 'analysis_start'
  | 'analysis_complete'
  | 'document_upload'
  | 'document_download'
  | 'signature_request'
  | 'signature_complete'
  | 'profile_update'
  | 'settings_change'
  | 'export_data'
  | 'error';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  metadata: {
    userAgent: string;
    ip?: string;
    sessionId?: string;
    url: string;
  };
  synced: boolean;
}

const STORAGE_KEY = 'safecon_audit_logs';
const MAX_LOCAL_LOGS = 1000;
const SYNC_BATCH_SIZE = 50;

class AuditLogService {
  private logs: AuditLogEntry[] = [];
  private sessionId: string;
  private syncInProgress = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  /**
   * Log an action
   */
  log(
    action: AuditAction,
    options: {
      severity?: AuditSeverity;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
    } = {}
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      severity: options.severity || 'info',
      userId: options.userId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details,
      metadata: {
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        url: window.location.href,
      },
      synced: false,
    };

    this.logs.push(entry);
    this.trimLogs();
    this.saveToStorage();

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Audit]', action, entry);
    }

    // Attempt to sync
    this.syncToBackend();
  }

  /**
   * Log an error with stack trace
   */
  logError(
    error: Error,
    options: {
      userId?: string;
      context?: string;
      details?: Record<string, unknown>;
    } = {}
  ): void {
    this.log('error', {
      severity: 'error',
      userId: options.userId,
      details: {
        ...options.details,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context: options.context,
      },
    });
  }

  /**
   * Get logs for a specific resource
   */
  getLogsForResource(resourceType: string, resourceId: string): AuditLogEntry[] {
    return this.logs.filter(
      (log) => log.resourceType === resourceType && log.resourceId === resourceId
    );
  }

  /**
   * Get logs for current session
   */
  getSessionLogs(): AuditLogEntry[] {
    return this.logs.filter((log) => log.metadata.sessionId === this.sessionId);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): AuditLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by action type
   */
  getLogsByAction(action: AuditAction): AuditLogEntry[] {
    return this.logs.filter((log) => log.action === action);
  }

  /**
   * Get unsynced logs
   */
  getUnsyncedLogs(): AuditLogEntry[] {
    return this.logs.filter((log) => !log.synced);
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all local logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * Sync logs to backend
   */
  async syncToBackend(): Promise<void> {
    if (this.syncInProgress) return;

    const unsyncedLogs = this.getUnsyncedLogs();
    if (unsyncedLogs.length === 0) return;

    this.syncInProgress = true;

    try {
      const batch = unsyncedLogs.slice(0, SYNC_BATCH_SIZE);
      const apiUrl = import.meta.env.VITE_API_URL || 'https://trendy.storydot.kr/law/api';

      const response = await fetch(`${apiUrl}/audit/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ logs: batch }),
      });

      if (response.ok) {
        // Mark logs as synced
        const syncedIds = new Set(batch.map((log) => log.id));
        this.logs = this.logs.map((log) =>
          syncedIds.has(log.id) ? { ...log, synced: true } : log
        );
        this.saveToStorage();

        // Continue syncing if more logs remain
        if (unsyncedLogs.length > SYNC_BATCH_SIZE) {
          setTimeout(() => this.syncToBackend(), 1000);
        }
      }
    } catch (error) {
      // Silently fail - logs will be synced later
      if (import.meta.env.DEV) {
        console.warn('[Audit] Sync failed:', error);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    const existing = sessionStorage.getItem('safecon_session_id');
    if (existing) return existing;

    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('safecon_session_id', newId);
    return newId;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Audit] Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('[Audit] Failed to save logs to storage:', error);
      // If storage is full, remove oldest logs
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.logs = this.logs.slice(-MAX_LOCAL_LOGS / 2);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      }
    }
  }

  private trimLogs(): void {
    if (this.logs.length > MAX_LOCAL_LOGS) {
      // Keep synced logs longer, remove unsynced first
      const synced = this.logs.filter((log) => log.synced);
      const unsynced = this.logs.filter((log) => !log.synced);

      if (unsynced.length > MAX_LOCAL_LOGS / 2) {
        this.logs = [...synced.slice(-MAX_LOCAL_LOGS / 2), ...unsynced.slice(-MAX_LOCAL_LOGS / 2)];
      } else {
        this.logs = this.logs.slice(-MAX_LOCAL_LOGS);
      }
    }
  }
}

// Singleton instance
export const auditLog = new AuditLogService();

/**
 * React hook for audit logging
 */
export function useAuditLog() {
  return auditLog;
}

/**
 * Higher-order function to wrap async functions with audit logging
 */
export function withAuditLog<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  action: AuditAction,
  options: {
    userId?: string;
    resourceType?: string;
    getResourceId?: (...args: Parameters<T>) => string;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    const resourceId = options.getResourceId?.(...args);

    try {
      const result = await fn(...args);
      auditLog.log(action, {
        userId: options.userId,
        resourceType: options.resourceType,
        resourceId,
        details: { success: true },
      });
      return result;
    } catch (error) {
      auditLog.log(action, {
        severity: 'error',
        userId: options.userId,
        resourceType: options.resourceType,
        resourceId,
        details: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }) as T;
}
