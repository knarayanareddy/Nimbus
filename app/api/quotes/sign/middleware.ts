/**
 * Rate limiting middleware for /quotes/sign
 * OWASP A05 + A09 protection
 */
import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT = 10; // requests per minute per IP
const WINDOW_MS = 60_000;

const requestLog = new Map<string, number[]>();

export function rateLimit(req: NextRequest) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  
  // Clean old entries
  const recent = timestamps.filter(t => now - t < WINDOW_MS);
  
  if (recent.length >= RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  recent.push(now);
  requestLog.set(ip, recent);
  
  return null; // proceed
}