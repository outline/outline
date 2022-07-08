import { size } from "lodash";
import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates the size of a string based on lodash's size.
 * function. Useful for strings with unicode characters of variable lengths.
 */
export default function Length({
  msg,
  min = 0,
  max,
}: {
  msg?: string;
  min?: number;
  max: number;
}): (target: any, propertyName: string) => void {
  return (target: any, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        validLength(value: string) {
          if (size(value) > max || size(value) < min) {
            throw new Error(msg);
          }
        },
      },
    });
}
