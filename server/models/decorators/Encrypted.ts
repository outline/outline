import vaults from "@server/database/vaults";

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
  return Reflect.getMetadata(key, target, propertyKey).get.call(target);
}

/**
 * Set the value of an encrypted column given the target and the property key.
 */
export function setEncryptedColumn(
  target: any,
  propertyKey: string,
  value: string
) {
  Reflect.getMetadata(key, target, propertyKey).set.call(target, value);
}
