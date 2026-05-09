import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates the length of a string by counting Unicode
 * code points. Useful for strings with unicode characters of variable lengths.
 */
export default function Length({
  msg,
  min = 0,
  max,
}: {
  msg?: string;
  min?: number;
  max: number;
}): (target: object, propertyName: string) => void {
  return (target: object, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        validLength(value: string | null | undefined) {
          const length = value ? [...value].length : 0;
          if (length > max || length < min) {
            throw new Error(msg);
          }
        },
      },
    });
}
