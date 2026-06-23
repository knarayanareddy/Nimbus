/**
 * Production-grade Observability & Structured Logging
 * 
 * OWASP A09: Security Logging and Monitoring Failures
 * 
 * Implements:
 * - Structured JSON logging for all security-relevant events
 * - Metrics aggregation (counters, gauges)
 * - Alert routing based on severity
 * - Event retention and export
 */

import { NimbusAlerting } from './alerting';

export type SecurityEventType =
  | 'POLICY_PURCHASED'
  | 'POLICY_SETTLED'
  | 'POLICY_CANCELLED'
  | 'SETTLEMENT_TRIGGERED'
  | 'ORACLE_OBSERVATION'
  | 'ORACLE_FAILURE'
  | 'ORACLE_STALE'
  | 'POOL_UTILIZATION_HIGH'
  | 'POOL_INSOLVENCY'
  | 'ADMIN_OPERATION'
  | 'TIMELOCK_SCHEDULED'
  | 'TIMELOCK_EXECUTED'
  | 'PAUSED'
  | 'UNPAUSED'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CIRCUIT_BREAKER_TRIGGERED';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  data: Record<string, any>;
  correlationId?: string;
}

interface MetricsSnapshot {
  totalEvents: number;
  criticalCount: number;
  warningCount: number;
  eventsByType: Record<string, number>;
  lastEventTimestamp: string | null;
}

export class NimbusObservability {
  private events: SecurityEvent[] = [];
  private maxRetentionSize: number;
  private alerting: NimbusAlerting | null;
  private eventCountByType: Map<string, number> = new Map();

  constructor(options?: {
    maxRetentionSize?: number;
    slackWebhook?: string;
    pagerDutyKey?: string;
  }) {
    this.maxRetentionSize = options?.maxRetentionSize || 10_000;
    this.alerting = new NimbusAlerting(options?.slackWebhook, options?.pagerDutyKey);
  }

  /**
   * Log a security event with automatic routing to alerting channels
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Store in memory buffer (with eviction)
    this.events.push(fullEvent);
    if (this.events.length > this.maxRetentionSize) {
      this.events.shift(); // FIFO eviction
    }

    // Update counters
    const currentCount = this.eventCountByType.get(event.type) || 0;
    this.eventCountByType.set(event.type, currentCount + 1);

    // Structured JSON output (compatible with log aggregators: Datadog, Splunk, etc.)
    const logLine = JSON.stringify({
      level: event.severity === 'critical' ? 'error' : event.severity === 'warning' ? 'warn' : 'info',
      msg: `[${event.type}] ${this.summarize(event)}`,
      ...fullEvent,
      service: 'nimbus-protocol',
      environment: process.env.NODE_ENV || 'development',
    });

    // Route to appropriate output
    if (event.severity === 'critical') {
      console.error(logLine);
      // Alert routing for critical events
      if (this.alerting) {
        await this.alerting.sendAlert({
          type: 'CRITICAL_ERROR',
          severity: 'critical',
          message: `[${event.type}] ${this.summarize(event)}`,
          data: event.data,
        });
      }
    } else if (event.severity === 'warning') {
      console.warn(logLine);
      // Only alert for specific warning types
      if (this.alerting && this.shouldAlertOnWarning(event.type)) {
        await this.alerting.sendAlert({
          type: this.mapToAlertType(event.type),
          severity: 'warning',
          message: `[${event.type}] ${this.summarize(event)}`,
          data: event.data,
        });
      }
    } else {
      console.log(logLine);
    }
  }

  /**
   * Get metrics snapshot for health endpoints / dashboards
   */
  getMetrics(): MetricsSnapshot {
    return {
      totalEvents: this.events.length,
      criticalCount: this.events.filter(e => e.severity === 'critical').length,
      warningCount: this.events.filter(e => e.severity === 'warning').length,
      eventsByType: Object.fromEntries(this.eventCountByType),
      lastEventTimestamp: this.events.length > 0
        ? this.events[this.events.length - 1].timestamp
        : null,
    };
  }

  /**
   * Export events for external analysis (e.g., to S3 or SIEM)
   */
  exportEvents(since?: string): SecurityEvent[] {
    if (!since) return [...this.events];
    return this.events.filter(e => e.timestamp >= since);
  }

  /**
   * Query events by type and time range
   */
  queryEvents(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }

  private summarize(event: Omit<SecurityEvent, 'timestamp'>): string {
    const { type, data } = event;
    switch (type) {
      case 'POLICY_PURCHASED':
        return `Policy #${data.policyId} purchased by ${data.buyer} (premium: ${data.premium})`;
      case 'POLICY_SETTLED':
        return `Policy #${data.policyId} settled (triggered: ${data.triggered})`;
      case 'ORACLE_FAILURE':
        return `Oracle failure for region ${data.regionId}: ${data.reason}`;
      case 'POOL_UTILIZATION_HIGH':
        return `Pool #${data.poolId} utilization: ${data.utilization}%`;
      case 'UNAUTHORIZED_ACCESS':
        return `Unauthorized attempt: ${data.instruction} by ${data.signer}`;
      default:
        return JSON.stringify(data).slice(0, 100);
    }
  }

  private shouldAlertOnWarning(type: SecurityEventType): boolean {
    return ['ORACLE_FAILURE', 'ORACLE_STALE', 'POOL_UTILIZATION_HIGH', 'UNAUTHORIZED_ACCESS', 'CIRCUIT_BREAKER_TRIGGERED'].includes(type);
  }

  private mapToAlertType(type: SecurityEventType): any {
    const mapping: Record<string, string> = {
      'ORACLE_FAILURE': 'ORACLE_FAILURE',
      'ORACLE_STALE': 'ORACLE_FAILURE',
      'POOL_UTILIZATION_HIGH': 'HIGH_UTILIZATION',
      'POOL_INSOLVENCY': 'CRITICAL_ERROR',
      'UNAUTHORIZED_ACCESS': 'CRITICAL_ERROR',
    };
    return mapping[type] || 'CRITICAL_ERROR';
  }
}
