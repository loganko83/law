/**
 * Health Check Service
 * Monitors API and service availability
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  latency?: number;
  lastChecked: Date;
  message?: string;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceStatus[];
  lastChecked: Date;
}

type HealthCheckListener = (result: HealthCheckResult) => void;

class HealthCheckService {
  private listeners: Set<HealthCheckListener> = new Set();
  private lastResult: HealthCheckResult | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Check API health
   */
  async checkApi(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          name: 'API Server',
          status: latency > 2000 ? 'degraded' : 'online',
          latency,
          lastChecked: new Date(),
          message: latency > 2000 ? 'Slow response time' : undefined,
        };
      } else {
        return {
          name: 'API Server',
          status: 'degraded',
          latency,
          lastChecked: new Date(),
          message: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        name: 'API Server',
        status: 'offline',
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Check AI service (Gemini)
   */
  async checkAiService(): Promise<ServiceStatus> {
    // AI service check is done through the API
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'AI Service',
          status: data.available ? 'online' : 'degraded',
          latency,
          lastChecked: new Date(),
          message: data.message,
        };
      } else if (response.status === 429) {
        return {
          name: 'AI Service',
          status: 'degraded',
          lastChecked: new Date(),
          message: 'Rate limited',
        };
      } else {
        return {
          name: 'AI Service',
          status: 'unknown',
          lastChecked: new Date(),
        };
      }
    } catch {
      return {
        name: 'AI Service',
        status: 'unknown',
        lastChecked: new Date(),
        message: 'Check failed',
      };
    }
  }

  /**
   * Check blockchain service
   */
  async checkBlockchain(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/blockchain/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          name: 'Blockchain',
          status: data.connected ? 'online' : 'offline',
          latency,
          lastChecked: new Date(),
          message: data.network,
        };
      } else {
        return {
          name: 'Blockchain',
          status: 'unknown',
          lastChecked: new Date(),
        };
      }
    } catch {
      return {
        name: 'Blockchain',
        status: 'unknown',
        lastChecked: new Date(),
        message: 'Check failed',
      };
    }
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<HealthCheckResult> {
    const [apiStatus, aiStatus, blockchainStatus] = await Promise.all([
      this.checkApi(),
      this.checkAiService(),
      this.checkBlockchain(),
    ]);

    const services = [apiStatus, aiStatus, blockchainStatus];

    // Determine overall status
    const offlineCount = services.filter(s => s.status === 'offline').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (offlineCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const result: HealthCheckResult = {
      overall,
      services,
      lastChecked: new Date(),
    };

    this.lastResult = result;
    this.notifyListeners(result);

    return result;
  }

  /**
   * Get last check result
   */
  getLastResult(): HealthCheckResult | null {
    return this.lastResult;
  }

  /**
   * Subscribe to health check updates
   */
  subscribe(listener: HealthCheckListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with last result if available
    if (this.lastResult) {
      listener(this.lastResult);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(result: HealthCheckResult): void {
    this.listeners.forEach(listener => listener(result));
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs = 60000): void {
    if (this.checkInterval) {
      return;
    }

    // Run initial check
    this.checkAll();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAll();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();

export default healthCheckService;
