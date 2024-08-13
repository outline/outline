import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import Logger from "@server/logging/Logger";
import vaults from "@server/storage/vaults";

const key = "sequelize:vault";

/**
 * A decorator that stores the encrypted vault for a particular database column
 * so that it can be used by getters and setters. Must be accompanied by a
 * @Column(DataType.BLOB) annotation and be the last decorator applied to the
 * property.
 */
export default function Encrypted(target: any, propertyKey: string) {
  Reflect.defineMetadata(key, vaults().vault(propertyKey), target, propertyKey);

  return {
    get() {
      if (!this.getDataValue(propertyKey)) {
        return "";
      }
      try {
        const value = Reflect.getMetadata(key, this, propertyKey).get.call(
          this
        );

        // `value` equals to `{}` instead of `null` if column value in db is `null`. Possibly explained by:
        // https://github.com/defunctzombie/sequelize-encrypted/blob/c3854e76ae4b80318c8f10f94e6c898c67659ca6/index.js#L30-L33
        return isEmpty(value) ? "" : value;
      } catch (err) {
        if (err.message.includes("Unexpected end of JSON input")) {
          return "";
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
    set(value: string) {
      if (isNil(value)) {
        this.setDataValue(propertyKey, value);
      } else {
        Reflect.getMetadata(key, this, propertyKey).set.call(this, value);
      }
    },
  } as any;
}
