import { errToString } from "@shared/utils/error";
import env from "@server/env";
import { encrypt, decrypt } from "./Encrypted";

describe("Encrypted", () => {
  it("should round-trip a simple string", () => {
    const value = JSON.stringify("hello world");
    expect(decrypt(encrypt(value))).toEqual(value);
  });

  it("should round-trip an object", () => {
    const value = JSON.stringify({
      token: "abc123",
      scopes: ["read", "write"],
    });
    expect(JSON.parse(decrypt(encrypt(value)))).toEqual({
      token: "abc123",
      scopes: ["read", "write"],
    });
  });

  it("should round-trip unicode and emoji", () => {
    const value = JSON.stringify("héllo 🌍 こんにちは");
    expect(decrypt(encrypt(value))).toEqual(value);
  });

  it("should round-trip an empty string", () => {
    const value = JSON.stringify("");
    expect(decrypt(encrypt(value))).toEqual(value);
  });

  it("should round-trip a long value across multiple cipher blocks", () => {
    // A value longer than a single AES block (16 bytes) to guard against
    // ciphertext truncation regressions.
    const value = JSON.stringify("a".repeat(1024));
    expect(decrypt(encrypt(value))).toEqual(value);
  });

  it("should produce a different IV (and ciphertext) each time", () => {
    const value = JSON.stringify("hello world");
    expect(encrypt(value).equals(encrypt(value))).toBe(false);
  });

  it("should not return the original value for tampered data", () => {
    const value = JSON.stringify("hello world");
    const encrypted = encrypt(value);
    encrypted[encrypted.length - 1] ^= 0xff;

    try {
      expect(decrypt(encrypted)).not.toEqual(value);
    } catch (err) {
      expect(errToString(err)).toMatch(/bad decrypt/);
    }
  });

  it("should fail to decrypt a truncated ciphertext", () => {
    const encrypted = encrypt(JSON.stringify("hello world"));
    expect(() =>
      decrypt(encrypted.subarray(0, encrypted.length - 1))
    ).toThrow();
  });

  it("should fail to decrypt with a different key", () => {
    const originalKey = env.SECRET_KEY;
    const value = JSON.stringify("hello world");
    const encrypted = encrypt(value);
    try {
      env.SECRET_KEY =
        "a593e7f567d01031d153b5af6d9a25766b95926cff91c6be3438c7f7ac37230f";
      // CBC is unauthenticated, so a wrong key only throws when the resulting
      // plaintext happens to have invalid padding.
      try {
        expect(decrypt(encrypted)).not.toEqual(value);
      } catch (err) {
        expect(errToString(err)).toMatch(/bad decrypt/);
      }
    } finally {
      env.SECRET_KEY = originalKey;
    }
  });

  it("should throw on an incorrectly sized key", () => {
    const originalKey = env.SECRET_KEY;
    try {
      env.SECRET_KEY = "abcd";
      expect(() => encrypt(JSON.stringify("hello world"))).toThrow(
        /Invalid key length/
      );
    } finally {
      env.SECRET_KEY = originalKey;
    }
  });
});
