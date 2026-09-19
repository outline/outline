import crypto from "node:crypto";
import { isEmpty, isNil } from "es-toolkit/compat";
import { getAttributes } from "sequelize-typescript";
import { toError, errToString } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";

const algorithm = "aes-256-cbc";
const ivLength = 16;

/**
 * Encrypt a string value for storage in a database column. The returned buffer
 * is the initialization vector followed by the ciphertext (`iv || ciphertext`)
 * using AES-256-CBC, matching the on-disk format of previously encrypted data.
 *
 * @param value The plaintext value to encrypt.
 * @returns A buffer containing the IV concatenated with the ciphertext.
 */
export function encrypt(value: string): Buffer {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(env.SECRET_KEY, "hex"),
    iv
  );
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf-8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, ciphertext]);
}

/**
 * Decrypt a buffer produced by `encrypt` back into its original string value.
 *
 * @param value A buffer containing the IV concatenated with the ciphertext.
 * @returns The decrypted plaintext value.
 */
export function decrypt(value: Buffer): string {
  const iv = value.subarray(0, ivLength);
  const ciphertext = value.subarray(ivLength);
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(env.SECRET_KEY, "hex"),
    iv
  );
  return (
    decipher.update(ciphertext, undefined, "utf-8") + decipher.final("utf-8")
  );
}

/**
 * A decorator that transparently encrypts and decrypts the value of a database
 * column. Must be accompanied by a @Column(DataType.BLOB) annotation.
 */
export default function Encrypted(target: object, propertyKey: string) {
  // Ensure that the Encrypted decorator is the first decorator applied to the property, we can check
  // this by looking at the attributes of the target and checking if the propertyKey is already defined.
  if (getAttributes(target)[propertyKey]) {
    Logger.fatal(
      `The Encrypted decorator must be the first decorator applied to the property ${propertyKey} in ${target.constructor.name}`,
      new Error()
    );
  }

  return {
    configurable: true,
    enumerable: true,
    get() {
      const attributeOptions = getAttributes(target);
      const defaultValue = attributeOptions[propertyKey].allowNull ? null : "";

      const previous = this.getDataValue(propertyKey);
      if (!previous) {
        return defaultValue;
      }
      try {
        const value = JSON.parse(decrypt(previous));

        // An empty object can be the result of a `null` column value, in which
        // case we return the default value instead.
        return isEmpty(value) && typeof value === "object"
          ? defaultValue
          : value;
      } catch (err) {
        const message = errToString(err);
        if (message.includes("Unexpected end of JSON input")) {
          return defaultValue;
        }
        if (message.includes("bad decrypt")) {
          Logger.fatal(
            `Failed to decrypt database column (${propertyKey}). The SECRET_KEY environment variable may have changed since installation.`,
            toError(err)
          );
        }
        throw err;
      }
    },
    set(value: string | null) {
      try {
        if (isNil(value)) {
          this.setDataValue(propertyKey, value);
        } else {
          this.setDataValue(propertyKey, encrypt(JSON.stringify(value)));
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Invalid key length")
        ) {
          Logger.fatal(
            `Failed to encrypt database column (${propertyKey}). The SECRET_KEY environment variable is not the correct length.`,
            err
          );
        }
        throw err;
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TS rejects PropertyDescriptor return for legacy decorator; descriptor is consumed by Sequelize at runtime.
  } as any;
}
