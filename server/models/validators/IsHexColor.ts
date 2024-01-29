import { isHexColor } from "class-validator";
import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates that a string is a valid hex color code.
 */
export default function IsHexColor(target: any, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      validDomain(value: string) {
        if (!isHexColor(value)) {
          throw new Error("Must be a valid hex color code");
        }
      },
    },
  });
}
