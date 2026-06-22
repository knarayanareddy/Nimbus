/**
 * Tamper-Proof Logging with HMAC Signatures
 * OWASP A09 Mitigation
 */

import crypto from 'crypto';

export class TamperProofLogger {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  signLog(entry: object): string {
    const payload = JSON.stringify(entry);
    return crypto.createHmac('sha256', this.key).update(payload).digest('hex');
  }

  verifyLog(entry: object, signature: string): boolean {
    const expected = this.signLog(entry);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}