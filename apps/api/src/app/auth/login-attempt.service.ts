import { Injectable } from '@nestjs/common';

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  failures: number;
  lockedUntil: number | null;
}

/**
 * In-memory brute-force protection.
 * Tracks failed login attempts per uniqueCode.
 * After MAX_FAILURES the account is locked for LOCKOUT_MS milliseconds.
 *
 * Note: In a multi-instance deployment, replace with Redis-backed storage.
 */
@Injectable()
export class LoginAttemptService {
  private readonly store = new Map<string, AttemptRecord>();

  isLocked(uniqueCode: string): boolean {
    const record = this.store.get(uniqueCode);
    if (!record?.lockedUntil) return false;
    if (Date.now() < record.lockedUntil) return true;
    // Lock expired — reset
    this.store.delete(uniqueCode);
    return false;
  }

  recordFailure(uniqueCode: string): void {
    const record = this.store.get(uniqueCode) ?? {
      failures: 0,
      lockedUntil: null,
    };
    record.failures += 1;
    if (record.failures >= MAX_FAILURES) {
      record.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    this.store.set(uniqueCode, record);
  }

  recordSuccess(uniqueCode: string): void {
    this.store.delete(uniqueCode);
  }

  remainingLockMs(uniqueCode: string): number {
    const record = this.store.get(uniqueCode);
    if (!record?.lockedUntil) return 0;
    return Math.max(0, record.lockedUntil - Date.now());
  }
}
