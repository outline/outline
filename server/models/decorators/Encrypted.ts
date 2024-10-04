import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import { getAttributes } from "sequelize-typescript";
import Logger from "@server/logging/Logger";
import vaults from "@server/storage/vaults";

const key = "sequelize:vault";

/**
 * A decorator that stores the encrypted vault for a particular database column
 * so that it can be used by getters and setters. Must be accompanied by a
 * @Column(DataType.BLOB) annotation.
 */
export default function Encrypted(target: any, propertyKey: string) {
  // Ensure that the Encrypted decorator is the first decorator applied to the property, we can check
  // this by looking at the attributes of the target and checking if the propertyKey is already defined.
  if (getAttributes(target)[propertyKey]) {
    Logger.fatal(
      `The Encrypted decorator must be the first decorator applied to the property ${propertyKey} in ${target.constructor.name}`,
      new Error()
    );
  }

  Reflect.defineMetadata(key, vaults().vault(propertyKey), target, propertyKey);

  return {
    get() {
      const attributeOptions = getAttributes(target);
      const defaultValue = attributeOptions[propertyKey].allowNull ? null : "";

      if (!this.getDataValue(propertyKey)) {
        return defaultValue;
      }
      try {
        const value = Reflect.getMetadata(key, this, propertyKey).get.call(
          this
        );

        // `value` equals to `{}` instead of `null` if column value in db is `null`. Possibly explained by:
        // https://github.com/defunctzombie/sequelize-encrypted/blob/c3854e76ae4b80318c8f10f94e6c898c67659ca6/index.js#L30-L33
        return isEmpty(value) && typeof value === "object"
          ? defaultValue
          : value;
      } catch (err) {
        if (err.message.includes("Unexpected end of JSON input")) {
          return defaultValue;
        }
        if (err.message.includes("bad decrypt")) {
          Logger.fatal(
            `Failed to decrypt database column (${propertyKey}). The SECRET_KEY environment variable may have changed since installation.`,
            err
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
          Reflect.getMetadata(key, this, propertyKey).set.call(this, value);
        }
      } catch (err) {
        if (err.message.includes("Invalid key length")) {
          Logger.fatal(
            `Failed to encrypt database column (${propertyKey}). The SECRET_KEY environment variable is not the correct length.`,
            err
          );
        }
        throw err;
      }
    },
  } as any;
}
