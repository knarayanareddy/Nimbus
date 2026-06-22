/**
 * Mutual Authentication between Off-Chain Services
 * Uses simple API key + HMAC for MVP (mTLS recommended in production)
 */

import crypto from 'crypto';

export class ServiceAuthenticator {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  generateSignature(payload: string): string {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string): boolean {
    const expected = this.generateSignature(payload);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}