import { size } from "lodash";
import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that calculates size of the string based on lodash's size function.
 * particularly useful for strings with unicode characters of variable lengths.
 */
export function Length({ msg, min, max }: { msg?: string; min: number; max: number }): Function {
    return (target: any, propertyName: string) =>
        addAttributeOptions(target, propertyName, {
            validate: {
                validLength(value: string) {
                    if (size(value) > max || size(value) < min) {
                        throw new Error(msg);
                    }
                }
            },
        });
}
