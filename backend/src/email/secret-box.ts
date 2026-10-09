import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * Encryption for the one secret the application stores: the SMTP password.
 *
 * AES-256-GCM, so a tampered value fails to decrypt rather than decrypting to
 * something else. The key comes from EMAIL_ENCRYPTION_KEY and nowhere else -
 * not the database, not the JWT secret. A database dump on its own then holds
 * nothing usable, and rotating the session secret does not silently make the
 * stored password unreadable.
 *
 * Stored as `v1:<iv>:<tag>:<ciphertext>`, base64. The version is there so the
 * scheme can change later without guessing what an old value was.
 */

const VERSION = 'v1';

export class SecretKeyMissingError extends Error {
  constructor() {
    super(
      'EMAIL_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` ' +
        'and add it to the backend environment.',
    );
  }
}

/**
 * The key, normalised to 32 bytes.
 *
 * Hashed rather than required to be exactly 32 bytes of base64: an operator
 * pasting any long random string should get a working key, not a cryptic
 * "invalid key length" from deep inside node:crypto.
 */
function key(): Buffer {
  const raw = process.env.EMAIL_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) throw new SecretKeyMissingError();
  return createHash('sha256').update(raw).digest();
}

export function hasEncryptionKey(): boolean {
  const raw = process.env.EMAIL_ENCRYPTION_KEY?.trim();
  return Boolean(raw && raw.length >= 16);
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    body.toString('base64'),
  ].join(':');
}

export function open(sealed: string): string {
  const [version, iv, tag, body] = sealed.split(':');
  if (version !== VERSION || !iv || !tag || !body) {
    throw new Error('Stored secret is not in a recognised format');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(body, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * An error message with anything secret-shaped taken out.
 *
 * Provider errors quote what they were given. Some echo the AUTH exchange,
 * which is the username and password base64-encoded; some print a connection
 * string with the password in it. Every error that reaches the database, a log
 * or an API response goes through here first.
 */
export function redact(
  message: string,
  secrets: Array<string | null | undefined> = [],
): string {
  let clean = message;

  for (const secret of secrets) {
    if (!secret || secret.length < 3) continue;
    clean = clean.split(secret).join('[redacted]');
    // The AUTH PLAIN / LOGIN exchange sends credentials base64-encoded.
    clean = clean
      .split(Buffer.from(secret).toString('base64'))
      .join('[redacted]');
  }

  return (
    clean
      // smtp://user:password@host
      .replace(/(\w+:\/\/[^:\s/]+:)[^@\s]+@/g, '$1[redacted]@')
      // AUTH PLAIN <base64>, AUTH LOGIN <base64>
      .replace(/(AUTH\s+(?:PLAIN|LOGIN|XOAUTH2)\s+)\S+/gi, '$1[redacted]')
      // password=..., pass: ...
      .replace(
        /((?:pass(?:word)?|secret|token)\s*[:=]\s*)\S+/gi,
        '$1[redacted]',
      )
      // Errors can be long; the history is not a place for a stack trace.
      .slice(0, 500)
  );
}
