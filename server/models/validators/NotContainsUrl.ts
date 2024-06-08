import { addAttributeOptions } from "sequelize-typescript";

/**
 * A decorator that validates that a string does not include something that
 * looks like a URL.
 */
export default function NotContainsUrl(target: any, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      not: {
        args: /(www\.|file:|http:|https:)[^\s]+[\w]/,
        msg: "Must not contain a URL",
      },
    },
  });
}
