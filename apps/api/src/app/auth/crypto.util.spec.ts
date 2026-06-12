import { hashDjangoPassword, verifyDjangoPassword } from './crypto.util';

describe('crypto.util', () => {
  describe('hashDjangoPassword', () => {
    it('produces a Django-compatible PBKDF2 hash string', async () => {
      const hash = await hashDjangoPassword('testpassword');
      // eslint-disable-next-line sonarjs/slow-regex
      expect(hash).toMatch(/^pbkdf2_sha256\$600000\$.+\$.+$/);
    });

    it('produces different hashes for the same password (random salt)', async () => {
      const hash1 = await hashDjangoPassword('testpassword');
      const hash2 = await hashDjangoPassword('testpassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyDjangoPassword', () => {
    it('verifies a password against its own hash', async () => {
      const hash = await hashDjangoPassword('myPassword123');
      const result = await verifyDjangoPassword('myPassword123', hash);
      expect(result).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await hashDjangoPassword('myPassword123');
      const result = await verifyDjangoPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('returns false for malformed encoded string (not 4 parts)', async () => {
      const result = await verifyDjangoPassword('pwd', 'only$three$parts');
      expect(result).toBe(false);
    });

    it('returns false for unknown algorithm', async () => {
      const result = await verifyDjangoPassword(
        'pwd',
        'bcrypt$10000$salt$hash',
      );
      expect(result).toBe(false);
    });
  });

  describe('hash + verify round-trip', () => {
    it('verifies correctly with different passwords', async () => {
      const passwords = ['short', 'A-Longer-Password!', '日本語パスワード'];
      for (const pwd of passwords) {
        const hash = await hashDjangoPassword(pwd);
        expect(await verifyDjangoPassword(pwd, hash)).toBe(true);
        expect(await verifyDjangoPassword(pwd + 'x', hash)).toBe(false);
      }
    });
  });
});
