import { isFQDN } from "class-validator";
import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates that a string does not include something that
 * looks like a URL.
 */
export default function IsFQDN(target: any, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      validDomain(value: string) {
        if (!isFQDN(value)) {
          throw new Error("Must be a fully qualified domain name");
        }
      },
    },
  });
}
