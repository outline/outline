import crypto from "crypto";
import CryptoJS from "crypto-js";
import env from "@server/env";

/**
 * Compare two strings in constant time to prevent timing attacks.
 *
 * @param a The first string to compare
 * @param b The second string to compare
 * @returns Whether the strings are equal
 */
export function safeEqual(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const formatter: CryptoJS.lib.CipherParams["formatter"] = {
  stringify: (cipherParams: CryptoJS.lib.CipherParams): string => {
    const obj = {} as Record<string, string>;

    obj.ct = cipherParams.ciphertext.toString(CryptoJS.enc.Base64);

    if (cipherParams.iv) {
      obj.iv = cipherParams.iv.toString();
    }

    if (cipherParams.salt) {
      obj.s = cipherParams.salt.toString();
    }

    return JSON.stringify(obj);
  },
  parse: (jsonStr: string): CryptoJS.lib.CipherParams => {
    const jsonObj = JSON.parse(jsonStr);

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct),
    });

    if (jsonObj.iv) {
      cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
    }

    if (jsonObj.s) {
      cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
    }

    return cipherParams;
  },
};

export const encrypt = (value: string): string => {
  const iv = crypto.randomBytes(12).toString("hex");
  const encrypted = CryptoJS.AES.encrypt(value, env.SECRET_KEY, {
    iv: CryptoJS.enc.Hex.parse(iv),
    format: formatter,
  });
  return encrypted.toString();
};

export const decrypt = (value: string): string => {
  const decrypted = CryptoJS.AES.decrypt(value, env.SECRET_KEY, {
    format: formatter,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
};
