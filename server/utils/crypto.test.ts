import { decrypt, encrypt } from "./crypto";

describe("encryption", () => {
  it("should encrypt data", () => {
    const encrypted = encrypt("test value");
    const json = JSON.parse(encrypted);
    expect(json.ct).toBeTruthy();
    expect(json.iv).toBeTruthy();
    expect(json.s).toBeTruthy();
  });

  it("should decrypt data", () => {
    const value = "test value";
    const encrypted = encrypt(value);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(value);
  });
});
