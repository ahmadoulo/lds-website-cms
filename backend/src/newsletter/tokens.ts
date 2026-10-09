import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** How long a confirmation link stays valid. */
export const CONFIRM_TTL_MS = 48 * 60 * 60_000;

/**
 * A confirmation token: random, single use, and stored only as its hash.
 *
 * The raw value exists in one place, the email. A copy of the database can
 * therefore not be used to confirm anyone's subscription.
 */
export function newConfirmToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The key unsubscribe links are signed with.
 *
 * Derived from EMAIL_ENCRYPTION_KEY with its own label, so the two uses never
 * share a key. That key is the one the deployment already keeps stable for
 * the SMTP password - which matters here as much: a changed key would break
 * the unsubscribe link in every newsletter already sent.
 */
function unsubscribeKey(): Buffer | null {
  const raw = process.env.EMAIL_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) return null;
  return createHash('sha256')
    .update(`lds:newsletter-unsubscribe:${raw}`)
    .digest();
}

export function canSignUnsubscribe(): boolean {
  return unsubscribeKey() !== null;
}

/**
 * An unsubscribe token for one subscriber.
 *
 * Signed rather than stored: every email needs a working link, the raw value
 * cannot be recovered from a stored hash to put in the next campaign, and a
 * stored raw value would let a database leak unsubscribe anyone. Its only
 * power is unsubscribing that one address.
 */
export function unsubscribeToken(subscriberId: string): string {
  const key = unsubscribeKey();
  if (!key)
    throw new Error(
      'EMAIL_ENCRYPTION_KEY is required to sign unsubscribe links',
    );
  return createHmac('sha256', key)
    .update(`unsubscribe:${subscriberId}`)
    .digest('base64url');
}

export function verifyUnsubscribeToken(
  subscriberId: string,
  token: string,
): boolean {
  if (!subscriberId || !token || !unsubscribeKey()) return false;
  const expected = Buffer.from(unsubscribeToken(subscriberId));
  const given = Buffer.from(token);
  // Constant time: comparing byte by byte and stopping early would leak, a
  // character at a time, how much of a guessed token is right.
  return expected.length === given.length && timingSafeEqual(expected, given);
}
