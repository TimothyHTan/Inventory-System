import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { scrypt } from "lucia/dist/scrypt/index.js";
import { encodeHexLowerCase, decodeHex } from "@oslojs/encoding";
import { constantTimeEqual } from "@oslojs/crypto/subtle";

async function scryptKey(
  password: string,
  salt: string,
  N: number,
): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(password.normalize("NFKC"));
  const encodedSalt = new TextEncoder().encode(salt);
  return new Uint8Array(
    await scrypt(encoded, encodedSalt, { N, r: 16, p: 1, dkLen: 64 }),
  );
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      crypto: {
        async hashSecret(password: string) {
          const salt = encodeHexLowerCase(
            crypto.getRandomValues(new Uint8Array(16)),
          );
          const key = await scryptKey(password, salt, 8192);
          return `${salt}:${encodeHexLowerCase(key)}`;
        },
        async verifySecret(password: string, hash: string) {
          const parts = hash.split(":");
          if (parts.length !== 2) return false;
          const [salt, keyHex] = parts;
          const expected = decodeHex(keyHex);
          // Try N=8192 first, fall back to N=16384 for legacy hashes
          for (const N of [8192, 16384]) {
            const key = await scryptKey(password, salt, N);
            if (constantTimeEqual(key, expected)) {
              return true;
            }
          }
          return false;
        },
      },
    }),
  ],
});
