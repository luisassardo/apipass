/*
 * ApiPass — vault cryptography.
 *
 * Self-contained, no network. Encryption is AES-256-GCM via the browser's
 * native Web Crypto API. The key is derived from the master password with
 * Argon2id (memory-hard) — vendored, pure-JS, in argon2.js (load it first).
 *
 * The envelope is versioned and records its KDF, so:
 *   - new vaults use Argon2id (version 2);
 *   - old PBKDF2 vaults (version 1) still open.
 *
 *   {
 *     "format": "api-pass-vault",
 *     "version": 2,
 *     "kdf":    { "algo": "argon2id", "t": 2, "m": 65536, "p": 1, "salt": "<b64>" },
 *     "cipher": { "algo": "AES-256-GCM", "iv": "<b64>" },
 *     "ciphertext": "<b64>"
 *   }
 */
(function (global) {
  'use strict';

  const FORMAT = 'api-pass-vault';
  const VERSION = 2;                 // vaults we write
  const CIPHER_ALGO = 'AES-256-GCM';
  const SALT_BYTES = 16;
  const IV_BYTES = 12;
  const KEY_BYTES = 32;              // AES-256

  // Argon2id parameters for new vaults. Stored per-vault, so these can change
  // later without breaking files written today.
  const ARGON2 = { algo: 'argon2id', m: 65536, t: 2, p: 1 }; // 64 MiB, 2 passes

  // Legacy (read-only) PBKDF2 support for vaults created before v0.2.
  const PBKDF2_ALGO = 'PBKDF2-SHA256';

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

  // Argon2id -> raw 32-byte key -> AES-GCM CryptoKey.
  async function deriveKeyArgon2(password, salt, p) {
    if (!global.ApiPassArgon2 || !global.ApiPassArgon2.argon2id) {
      throw new Error('ARGON2_UNAVAILABLE');
    }
    // argon2id is CPU-bound and synchronous; yield once so the UI can paint a
    // "working" state before the ~1s hash blocks the main thread.
    await new Promise(r => setTimeout(r, 0));
    const raw = global.ApiPassArgon2.argon2id(enc.encode(password), salt, {
      t: p.t, m: p.m, p: p.p, dkLen: KEY_BYTES
    });
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  // Legacy PBKDF2-HMAC-SHA256 -> AES-GCM CryptoKey (for reading old vaults only).
  async function deriveKeyPbkdf2(password, salt, iterations) {
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Pick the right KDF based on the envelope's kdf block.
  async function deriveKeyFor(kdf, password) {
    const salt = b64ToBytes(kdf.salt);
    if (kdf.algo === 'argon2id') {
      return deriveKeyArgon2(password, salt, { m: kdf.m, t: kdf.t, p: kdf.p });
    }
    if (kdf.algo === PBKDF2_ALGO) {
      return deriveKeyPbkdf2(password, salt, kdf.iterations || 600000);
    }
    throw new Error('UNSUPPORTED');
  }

  // ---------- encrypt / decrypt ----------

  // vaultObj -> envelope (always Argon2id).
  async function encryptVault(vaultObj, password) {
    if (!password) throw new Error('EMPTY_PASSWORD');
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const kdf = { algo: ARGON2.algo, m: ARGON2.m, t: ARGON2.t, p: ARGON2.p, salt: bytesToB64(salt) };
    const key = await deriveKeyArgon2(password, salt, ARGON2);
    const plaintext = enc.encode(JSON.stringify(vaultObj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
    return {
      format: FORMAT,
      version: VERSION,
      kdf: kdf,
      cipher: { algo: CIPHER_ALGO, iv: bytesToB64(iv) },
      ciphertext: bytesToB64(ct)
    };
  }

  // envelope -> vaultObj. Throws 'BAD_FORMAT', 'UNSUPPORTED',
  // 'ARGON2_UNAVAILABLE', or 'WRONG_PASSWORD_OR_CORRUPT'.
  async function decryptVault(envelope, password) {
    if (!envelope || envelope.format !== FORMAT) throw new Error('BAD_FORMAT');
    if (envelope.version > VERSION) throw new Error('UNSUPPORTED');
    if (!envelope.kdf) throw new Error('UNSUPPORTED');
    if (!envelope.cipher || envelope.cipher.algo !== CIPHER_ALGO) throw new Error('UNSUPPORTED');

    const key = await deriveKeyFor(envelope.kdf, password); // may throw UNSUPPORTED / ARGON2_UNAVAILABLE
    const iv = b64ToBytes(envelope.cipher.iv);
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
    ARGON2: ARGON2,
    encryptVault: encryptVault,
    decryptVault: decryptVault,
    randomBytes: randomBytes,
    bytesToB64: bytesToB64
  };
})(window);
