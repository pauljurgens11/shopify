/**
 * Processor credentials at rest (SPEC §11). Owner: WS-D.
 *
 * A merchant's Stripe secret key is stored AES-256-GCM encrypted in
 * `ProcessorConfig`, under the same `VAULT_MASTER_KEY` as the card vault. One
 * key for both is a deliberate simplification the SPEC calls for — separate
 * keys would buy nothing without rotation, and rotation is explicitly out of
 * scope.
 *
 * The rule these functions exist to enforce: credentials go in as a sealed
 * blob and come out only inside `packages/pay`, on their way to an adapter.
 * No API response ever contains them — `processorConfigSchema` has a
 * `connected` boolean and no credential field at all, which is what makes that
 * hard to get wrong.
 */
import { env } from '@merchant/config/env';
import type { ProcessorCredentials } from './adapter.ts';
import { decrypt, encrypt, keyFromHex, type SealedBlob } from './crypto.ts';

let cachedKey: Buffer | undefined;
function credentialsKey(): Buffer {
  cachedKey ??= keyFromHex(env().VAULT_MASTER_KEY);
  return cachedKey;
}

export function sealCredentials(credentials: ProcessorCredentials): SealedBlob {
  return encrypt(JSON.stringify(credentials), credentialsKey());
}

export function openCredentials(sealed: SealedBlob): ProcessorCredentials {
  return JSON.parse(decrypt(sealed, credentialsKey())) as ProcessorCredentials;
}

/** The three columns `ProcessorConfig` stores a sealed blob in. */
export interface SealedCredentialColumns {
  encryptedCredentials: string | null;
  credentialsIv: string | null;
  credentialsAuthTag: string | null;
}

/**
 * Credentials for a stored config, or `{}` when none were saved.
 *
 * `{}` is a real state, not an error: `mock` needs no credentials and
 * `maverick` runs simulated without them. An adapter that does need them
 * answers `hard_failure`, which is the outcome that lets the router move on.
 */
export function credentialsFor(config: SealedCredentialColumns): ProcessorCredentials {
  if (!config.encryptedCredentials || !config.credentialsIv || !config.credentialsAuthTag) {
    return {};
  }
  return openCredentials({
    ciphertext: config.encryptedCredentials,
    iv: config.credentialsIv,
    authTag: config.credentialsAuthTag,
  });
}

/** Spread straight into a `ProcessorConfig` create/update. */
export function credentialColumns(
  credentials: ProcessorCredentials | null,
): SealedCredentialColumns {
  if (!credentials || Object.keys(credentials).length === 0) {
    return { encryptedCredentials: null, credentialsIv: null, credentialsAuthTag: null };
  }
  const sealed = sealCredentials(credentials);
  return {
    encryptedCredentials: sealed.ciphertext,
    credentialsIv: sealed.iv,
    credentialsAuthTag: sealed.authTag,
  };
}
