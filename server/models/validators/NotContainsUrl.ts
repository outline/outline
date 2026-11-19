import { addAttributeOptions } from "sequelize-typescript";
import { containsUrl } from "@shared/utils/urls";

/**
 * A decorator that validates that a string does not include something that
 * looks like a URL.
 */
export default function NotContainsUrl(target: object, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      notContainsUrl(value: unknown) {
        if (typeof value === "string" && containsUrl(value)) {
          throw new Error("Must not contain a URL");
        }
      },
    },
  });
}
