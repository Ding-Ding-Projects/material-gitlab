// RFC 6238 time-based one-time codes (HMAC-SHA-1, 30-second steps, 6 digits) with RFC 4648
// base32 secrets, using the browser's Web Crypto API. Used by element locks that include an
// authenticator code.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  bytes.forEach((byte) => {
    value = (value << 8) | byte; // eslint-disable-line no-bitwise
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]; // eslint-disable-line no-bitwise
      bits -= 5;
    }
  });
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]; // eslint-disable-line no-bitwise
  return out;
}

export function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Secret is not valid base32');
    value = (value << 5) | index; // eslint-disable-line no-bitwise
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255); // eslint-disable-line no-bitwise
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function generateSecret(
  random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n)),
) {
  return base32Encode(random(20));
}

export async function hotp(secretBytes, counter, digits = 6) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter % 2 ** 32);
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, buffer));
  const offset = mac[mac.length - 1] & 15; // eslint-disable-line no-bitwise
  /* eslint-disable no-bitwise */
  const code =
    ((mac[offset] & 127) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  /* eslint-enable no-bitwise */
  return String(code % 10 ** digits).padStart(digits, '0');
}

export const totp = (secret, seconds = Date.now() / 1000, digits = 6) =>
  hotp(base32Decode(secret), Math.floor(seconds / 30), digits);

// Accepts the current step and one step either side, to allow for clock drift.
export async function verifyTotp(secret, code, seconds = Date.now() / 1000) {
  const wanted = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(wanted)) return false;
  const results = await Promise.all([-30, 0, 30].map((drift) => totp(secret, seconds + drift)));
  return results.includes(wanted);
}

export const otpauthUri = ({ secret, label, issuer = 'Material GitLab' }) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
