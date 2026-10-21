import { addAttributeOptions } from "sequelize-typescript";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";

/**
 * A decorator that validates that every element of a string array is a
 * well-formed API scope.
 */
export default function IsScope(target: object, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      validScope(value: string[] | null) {
        if (!value) {
          return;
        }
        if (!Array.isArray(value)) {
          throw new Error("Scope must be an array");
        }
        for (const scope of value) {
          if (!AuthenticationHelper.isValidScope(scope)) {
            throw new Error("Scope must be a valid API scope");
          }
        }
      },
    },
  });
}
