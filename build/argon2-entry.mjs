// Bundle entry for the vendored Argon2id used by the ApiPass frontend.
// esbuild compiles this to frontend/argon2.js as an IIFE exposing
// window.ApiPassArgon2.argon2id. See package.json -> scripts.build:argon2.
export { argon2id } from '@noble/hashes/argon2.js';
