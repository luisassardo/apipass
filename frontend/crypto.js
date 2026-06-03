/*
 * api-pass — vault cryptography.
 *
 * Self-contained, no dependencies, no network. Uses the browser's native
 * Web Crypto API only. Source is auditable.
 *
 * Vault file = a JSON envelope (see PLAN.md). The envelope is versioned so the
 * KDF can be upgraded (PBKDF2 -> Argon2id) without breaking existing vaults.
 *
 *   {
 *     "format": "api-pass-vault",
 *     "version": 1,
 *     "kdf":    { "algo": "PBKDF2-SHA256", "iterations": 600000, "salt": "<b64>" },
 *     "cipher": { "algo": "AES-256-GCM", "iv": "<b64>" },
 *     "ciphertext": "<b64>"
 *   }
 */
(function (global) {
  'use strict';

  const FORMAT = 'api-pass-vault';
  const VERSION = 1;
  const KDF_ALGO = 'PBKDF2-SHA256';
  const KDF_ITERATIONS = 600000; // OWASP-acceptable for PBKDF2-HMAC-SHA256
  const CIPHER_ALGO = 'AES-256-GCM';
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  // ---------- base64 <-> bytes ----------
  function bytesToB64(bytes) {
    let bin = '';
    const arr = new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function randomBytes(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }

  // ---------- key derivation ----------
  // Derives an AES-GCM key from the master password using PBKDF2-HMAC-SHA256.
  async function deriveKey(password, salt, iterations) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ---------- encrypt / decrypt ----------

  // vaultObj -> envelope (plain JS object ready to JSON.stringify and download).
  async function encryptVault(vaultObj, password) {
    if (!password) throw new Error('EMPTY_PASSWORD');
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const key = await deriveKey(password, salt, KDF_ITERATIONS);
    const plaintext = enc.encode(JSON.stringify(vaultObj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
    return {
      format: FORMAT,
      version: VERSION,
      kdf: { algo: KDF_ALGO, iterations: KDF_ITERATIONS, salt: bytesToB64(salt) },
      cipher: { algo: CIPHER_ALGO, iv: bytesToB64(iv) },
      ciphertext: bytesToB64(ct)
    };
  }

  // envelope -> vaultObj. Throws 'BAD_FORMAT', 'UNSUPPORTED', or 'WRONG_PASSWORD_OR_CORRUPT'.
  async function decryptVault(envelope, password) {
    if (!envelope || envelope.format !== FORMAT) throw new Error('BAD_FORMAT');
    if (envelope.version > VERSION) throw new Error('UNSUPPORTED');
    if (!envelope.kdf || envelope.kdf.algo !== KDF_ALGO) throw new Error('UNSUPPORTED');
    if (!envelope.cipher || envelope.cipher.algo !== CIPHER_ALGO) throw new Error('UNSUPPORTED');

    const salt = b64ToBytes(envelope.kdf.salt);
    const iv = b64ToBytes(envelope.cipher.iv);
    const iterations = envelope.kdf.iterations || KDF_ITERATIONS;
    const key = await deriveKey(password, salt, iterations);
    try {
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        b64ToBytes(envelope.ciphertext)
      );
      return JSON.parse(dec.decode(pt));
    } catch (e) {
      // GCM auth failure (wrong password or tampered file) lands here.
      throw new Error('WRONG_PASSWORD_OR_CORRUPT');
    }
  }

  global.ApiPassCrypto = {
    FORMAT: FORMAT,
    VERSION: VERSION,
    KDF_ITERATIONS: KDF_ITERATIONS,
    encryptVault: encryptVault,
    decryptVault: decryptVault,
    randomBytes: randomBytes,
    bytesToB64: bytesToB64
  };
})(window);
