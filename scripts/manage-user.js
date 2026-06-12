#!/usr/bin/env node
/**
 * User management script for code-95
 * Uses the same PostgreSQL DB as Django and Django-compatible PBKDF2 password hashing.
 *
 * Usage:
 *   node scripts/manage-user.js list
 *   node scripts/manage-user.js reset-password --code admin --password MyNewPass
 *   node scripts/manage-user.js create --code mycode --password MyPass [--staff] [--superuser]
 */

const crypto = require('crypto');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'code95',
  user: process.env.POSTGRES_USER || 'pdr',
  password: process.env.POSTGRES_PASSWORD,
};

// --- PBKDF2 helpers (mirrors apps/api/src/app/auth/crypto.util.ts) ---

function hashDjangoPassword(raw) {
  return new Promise((resolve, reject) => {
    const iterations = 600000;
    const salt = crypto.randomBytes(16).toString('base64url').slice(0, 22);
    crypto.pbkdf2(raw, salt, iterations, 32, 'sha256', (err, key) => {
      if (err) return reject(err);
      resolve(`pbkdf2_sha256$${iterations}$${salt}$${key.toString('base64')}`);
    });
  });
}

function verifyDjangoPassword(raw, encoded) {
  return new Promise((resolve, reject) => {
    const parts = encoded.split('$');
    if (parts.length !== 4) return resolve(false);
    const [algorithm, iterStr, salt, hash] = parts;
    const match = algorithm.match(/^pbkdf2_sha(\d+)$/);
    if (!match) return resolve(false);
    const digest = `sha${match[1]}`;
    const iterations = parseInt(iterStr, 10);
    crypto.pbkdf2(raw, salt, iterations, 32, digest, (err, key) => {
      if (err) return reject(err);
      resolve(key.toString('base64') === hash);
    });
  });
}

// --- Commands ---

async function listUsers(client) {
  const res = await client.query(
    `SELECT id, unique_code, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined
     FROM users_user ORDER BY id`,
  );
  console.log('\nUsers in database:');
  console.log('─'.repeat(90));
  res.rows.forEach((u) => {
    const flags = [
      u.is_superuser && 'superuser',
      u.is_staff && 'staff',
      !u.is_active && 'INACTIVE',
    ]
      .filter(Boolean)
      .join(', ');
    console.log(
      `  [${u.id}] ${u.unique_code.padEnd(20)} ${(u.email || '').padEnd(30)} ${flags || 'regular user'}`,
    );
  });
  console.log('─'.repeat(90));
  console.log(`Total: ${res.rows.length} user(s)\n`);
}

async function resetPassword(client, code, password) {
  const res = await client.query(
    'SELECT id FROM users_user WHERE unique_code = $1',
    [code],
  );
  if (res.rows.length === 0) {
    console.error(`Error: User with unique_code "${code}" not found.`);
    process.exit(1);
  }
  const hash = await hashDjangoPassword(password);
  await client.query(
    'UPDATE users_user SET password = $1 WHERE unique_code = $2',
    [hash, code],
  );
  console.log(`Password updated for user "${code}".`);
}

async function createUser(
  client,
  { code, password, email, firstName, lastName, isStaff, isSuperuser },
) {
  const exists = await client.query(
    'SELECT id FROM users_user WHERE unique_code = $1',
    [code],
  );
  if (exists.rows.length > 0) {
    console.error(`Error: User with unique_code "${code}" already exists.`);
    process.exit(1);
  }
  const hash = await hashDjangoPassword(password);
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO users_user
       (unique_code, password, email, first_name, last_name, middle_name,
        is_staff, is_superuser, is_active, date_joined, last_login, type)
     VALUES ($1, $2, $3, $4, $5, '', $6, $7, true, $8, null, NULL)`,
    [
      code,
      hash,
      email || '',
      firstName || '',
      lastName || '',
      isStaff,
      isSuperuser,
      now,
    ],
  );
  console.log(`User "${code}" created successfully.`);
  if (isSuperuser) console.log('  Role: superuser');
  else if (isStaff) console.log('  Role: staff');
  else console.log('  Role: regular user');
}

// --- CLI parsing ---

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args[key] = argv[++i];
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const args = parseArgs(rest);

  if (!command || command === '--help') {
    console.log(`
Usage:
  node scripts/manage-user.js list
  node scripts/manage-user.js reset-password --code <unique_code> --password <new_password>
  node scripts/manage-user.js create --code <unique_code> --password <password> [--staff] [--superuser] [--email <email>]
`);
    process.exit(0);
  }

  const client = new Client(dbConfig);
  try {
    await client.connect();

    if (command === 'list') {
      await listUsers(client);
    } else if (command === 'reset-password') {
      if (!args.code || !args.password) {
        console.error('Error: --code and --password are required.');
        process.exit(1);
      }
      await resetPassword(client, args.code, args.password);
    } else if (command === 'create') {
      if (!args.code || !args.password) {
        console.error('Error: --code and --password are required.');
        process.exit(1);
      }
      await createUser(client, {
        code: args.code,
        password: args.password,
        email: args.email,
        firstName: args['first-name'],
        lastName: args['last-name'],
        isStaff: !!args.staff,
        isSuperuser: !!args.superuser,
      });
    } else {
      console.error(
        `Unknown command: "${command}". Run with --help to see usage.`,
      );
      process.exit(1);
    }
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
