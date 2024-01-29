import isNil from "lodash/isNil";
import Logger from "@server/logging/Logger";
import vaults from "@server/storage/vaults";

const key = "sequelize:vault";

/**
 * A decorator that stores the encrypted vault for a particular database column
 * so that it can be used by getters and setters. Must be accompanied by a
 * @Column(DataType.BLOB) annotation.
 */
export default function Encrypted(target: any, propertyKey: string) {
  Reflect.defineMetadata(key, vaults().vault(propertyKey), target, propertyKey);
}

/**
 * Get the value of an encrypted column given the target and the property key.
 */
export function getEncryptedColumn(target: any, propertyKey: string): string {
  if (!target.getDataValue(propertyKey)) {
    return "";
  }
  try {
    return Reflect.getMetadata(key, target, propertyKey).get.call(target);
  } catch (err) {
    if (err.message.includes("Unexpected end of JSON input")) {
      return "";
    }
    if (err.message.includes("bad decrypt")) {
      Logger.error(
        `Failed to decrypt database column (${propertyKey}). The SECRET_KEY environment variable may have changed since installation.`,
        err
      );
      process.exit(1);
    }

    throw err;
  }
}

/**
 * Set the value of an encrypted column given the target and the property key.
 */
export function setEncryptedColumn(
  target: any,
  propertyKey: string,
  value: string
) {
  if (isNil(value)) {
    target.setDataValue(propertyKey, value);
  } else {
    Reflect.getMetadata(key, target, propertyKey).set.call(target, value);
  }
}
