/**
 * Production-Grade Alerting System
 * Supports PagerDuty + Slack with structured security events
 * 
 * OWASP A09: Security Logging and Monitoring Failures
 */

import axios from 'axios';

export interface AlertPayload {
  type: 'POLICY_SETTLED' | 'ORACLE_FAILURE' | 'HIGH_UTILIZATION' | 'PAUSED' | 'CRITICAL_ERROR';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp?: string;
}

export class ClimaFiAlerting {
  private slackWebhook: string | null;
  private pagerDutyKey: string | null;

  constructor(slackWebhook?: string, pagerDutyKey?: string) {
    this.slackWebhook = slackWebhook || process.env.SLACK_WEBHOOK_URL || null;
    this.pagerDutyKey = pagerDutyKey || process.env.PAGERDUTY_ROUTING_KEY || null;
  }

  async sendAlert(payload: AlertPayload) {
    const fullPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Send to Slack
    if (this.slackWebhook) {
      await this.sendToSlack(fullPayload);
    }

    // Send to PagerDuty (critical only)
    if (this.pagerDutyKey && payload.severity === 'critical') {
      await this.sendToPagerDuty(fullPayload);
    }

    console.log(`[ALERT] ${payload.severity.toUpperCase()}: ${payload.message}`);
  }

  private async sendToSlack(payload: AlertPayload) {
    const color = payload.severity === 'critical' ? 'danger' : 
                  payload.severity === 'warning' ? 'warning' : 'good';

    const slackMessage = {
      text: `ClimaFi Alert: ${payload.type}`,
      attachments: [{
        color,
        fields: [
          { title: 'Severity', value: payload.severity, short: true },
          { title: 'Message', value: payload.message, short: false },
          { title: 'Data', value: JSON.stringify(payload.data, null, 2), short: false },
        ],
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    try {
      await axios.post(this.slackWebhook!, slackMessage);
    } catch (err) {
      console.error('Failed to send Slack alert:', err);
    }
  }

  private async sendToPagerDuty(payload: AlertPayload) {
    const event = {
      routing_key: this.pagerDutyKey,
      event_action: 'trigger',
      payload: {
        summary: payload.message,
        severity: payload.severity === 'critical' ? 'critical' : 'warning',
        source: 'climafi-protocol',
        custom_details: payload.data,
      },
    };

    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', event);
    } catch (err) {
      console.error('Failed to send PagerDuty alert:', err);
    }
  }
}

// Example usage in policy monitor:
// const alerting = new ClimaFiAlerting();
// await alerting.sendAlert({
//   type: 'POLICY_SETTLED',
//   severity: 'info',
//   message: `Policy #${policyId} settled. Triggered: ${triggered}`,
//   data: { policyId, triggered, observedValue }
// });