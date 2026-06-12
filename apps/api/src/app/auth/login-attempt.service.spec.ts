import { LoginAttemptService } from './login-attempt.service';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;

  beforeEach(() => {
    service = new LoginAttemptService();
  });

  it('is not locked by default', () => {
    expect(service.isLocked('user1')).toBe(false);
  });

  it('is not locked after fewer than 5 failures', () => {
    service.recordFailure('user1');
    service.recordFailure('user1');
    service.recordFailure('user1');
    service.recordFailure('user1');
    expect(service.isLocked('user1')).toBe(false);
  });

  it('locks account after 5 failures', () => {
    for (let i = 0; i < 5; i++) {
      service.recordFailure('user1');
    }
    expect(service.isLocked('user1')).toBe(true);
  });

  it('remainingLockMs returns positive value when locked', () => {
    for (let i = 0; i < 5; i++) {
      service.recordFailure('user1');
    }
    expect(service.remainingLockMs('user1')).toBeGreaterThan(0);
  });

  it('remainingLockMs returns 0 when not locked', () => {
    expect(service.remainingLockMs('user1')).toBe(0);
  });

  it('clears lock on successful login', () => {
    for (let i = 0; i < 5; i++) {
      service.recordFailure('user1');
    }
    expect(service.isLocked('user1')).toBe(true);
    service.recordSuccess('user1');
    expect(service.isLocked('user1')).toBe(false);
  });

  it('tracks different users independently', () => {
    for (let i = 0; i < 5; i++) {
      service.recordFailure('userA');
    }
    expect(service.isLocked('userA')).toBe(true);
    expect(service.isLocked('userB')).toBe(false);
  });
});
