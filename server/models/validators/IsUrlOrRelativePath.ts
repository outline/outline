import { isURL } from "class-validator";
import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates that a string is a url or relative path.
 */
export default function IsUrlOrRelativePath(target: any, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      validUrlOrPath(value: string) {
        if (
          value &&
          !isURL(value, {
            require_host: false,
            require_protocol: false,
          })
        ) {
          throw new Error("Must be a URL or relative path");
        }
      },
    },
  });
}
