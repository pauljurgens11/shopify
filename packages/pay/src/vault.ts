/**
 * Card vault (SPEC §11). Owner: WS-D.
 *
 * The ONLY module permitted to decrypt a card blob. AES-256-GCM under a single
 * VAULT_MASTER_KEY — deliberately simple, with no rotation machinery.
 *
 * Two rules, and they are the whole security model here:
 *   1. A PAN never leaves this module except into a processor adapter.
 *   2. A PAN never reaches a log line, an error message, or an exception.
 */

// TODO(WS-D): tokenize(), detokenize(), Luhn validation, brand detection.
// Unit tests are mandatory and blocking (SPEC §14.2).
export {};
