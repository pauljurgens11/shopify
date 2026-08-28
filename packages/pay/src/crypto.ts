/**
 * AES-256-GCM under a single static key (SPEC §11). Owner: WS-D.
 *
 * Deliberately small: one algorithm, one key, no envelope encryption and no
 * rotation machinery — SPEC says so explicitly, and every extra moving part
 * here is a way for a demo to fail at the checkout step.
 *
 * GCM is authenticated, so a tampered ciphertext, IV, or tag fails to decrypt
 * rather than yielding garbage. Nothing in this file ever puts plaintext into
 * an error message.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
/** 96 bits — the IV length GCM is defined for; anything else is slower and weaker. */
const IV_BYTES = 12;

/**
 * The three parts of a sealed value, base64. None is a secret on its own, which
 * is why the schema stores them in three plain columns next to each other.
 */
export interface SealedBlob {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/** Parse `VAULT_MASTER_KEY` (64 hex chars). Throws on anything else. */
export function keyFromHex(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Encryption key must be 64 hex characters (${KEY_BYTES} bytes).`);
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string, key: Buffer): SealedBlob {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decrypt(sealed: SealedBlob, key: Buffer): string {
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(sealed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Swallow the original: node's message is harmless today, but this is the
    // one code path where a leak would be a plaintext card number.
    throw new Error('Encrypted blob failed authentication — wrong key or tampered data.');
  }
}
