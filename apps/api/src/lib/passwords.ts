/**
 * argon2id password hashing (SPEC §8, §15). Owner: WS-A.
 *
 * `@node-rs/argon2` defaults to argon2id with the OWASP-recommended cost
 * parameters, and the seed hashes with the same defaults — do not pass options
 * here without changing the seed too, or `owner@demo.dev` stops logging in.
 */
import { hash, verify } from '@node-rs/argon2';

export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext);
}

/**
 * A real argon2id digest of a value nobody knows. Verifying against it when the
 * email is unknown keeps the "no such user" and "wrong password" paths the same
 * shape and roughly the same cost, so login does not become a user directory.
 */
let decoyHash: Promise<string> | undefined;

export async function verifyPassword(
  storedHash: string | null | undefined,
  plaintext: string,
): Promise<boolean> {
  try {
    // A corrupt or foreign-format hash must fail closed, not throw a 500 —
    // hence the try around the real path too.
    if (storedHash) return await verify(storedHash, plaintext);

    decoyHash ??= hash(`decoy:${crypto.randomUUID()}`);
    await verify(await decoyHash, plaintext);
    return false;
  } catch {
    // Drop a rejected decoy promise: memoizing one would turn a single argon2
    // failure into a permanent 500 on every unknown-email login.
    if (!storedHash) decoyHash = undefined;
    return false;
  }
}
