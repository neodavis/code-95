import * as crypto from 'crypto';

const HASH_BYTES = 32;

/**
 * Verifies a raw password against a Django PBKDF2-encoded password.
 * Django format: pbkdf2_sha256$<iterations>$<salt>$<base64_hash>
 */
export function verifyDjangoPassword(
  raw: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 4) return Promise.resolve(false);

  const [algorithm, iterStr, salt, hash] = parts;
  const match = /^pbkdf2_sha(\d+)$/.exec(algorithm);
  if (!match) return Promise.resolve(false);

  const digest = `sha${match[1]}`;
  const iterations = parseInt(iterStr, 10);

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(raw, salt, iterations, HASH_BYTES, digest, (err, key) => {
      if (err) return reject(err);
      resolve(key.toString('base64') === hash);
    });
  });
}

/**
 * Creates a Django-compatible PBKDF2 password hash.
 * Uses pbkdf2_sha256 with 600000 iterations (Django 5.x default).
 */
export function hashDjangoPassword(raw: string): Promise<string> {
  const iterations = 600000;
  const salt = crypto.randomBytes(16).toString('base64url').slice(0, 22);

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(raw, salt, iterations, HASH_BYTES, 'sha256', (err, key) => {
      if (err) return reject(err);
      resolve(`pbkdf2_sha256$${iterations}$${salt}$${key.toString('base64')}`);
    });
  });
}
