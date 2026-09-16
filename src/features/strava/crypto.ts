export type EncryptedToken = {
  ciphertext: string;
  iv: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function decodeEncryptionKey(value: string) {
  const bytes = base64ToBytes(value);
  if (bytes.byteLength !== 32) {
    throw new Error("STRAVA_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return bytes;
}

async function importEncryptionKey(keyBytes: Uint8Array) {
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptToken(
  plaintext: string,
  keyBytes: Uint8Array,
  context: string,
): Promise<EncryptedToken> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importEncryptionKey(keyBytes);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(context),
    },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptToken(
  encrypted: EncryptedToken,
  keyBytes: Uint8Array,
  context: string,
) {
  const key = await importEncryptionKey(keyBytes);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(encrypted.iv),
      additionalData: new TextEncoder().encode(context),
    },
    key,
    base64ToBytes(encrypted.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

export function tokenEncryptionContext(athleteId: string, tokenType: "access" | "refresh") {
  return `prograce:strava:${athleteId}:${tokenType}`;
}
