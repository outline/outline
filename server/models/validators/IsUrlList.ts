import { addAttributeOptions } from "sequelize-typescript";
import isURL from "validator/lib/isURL";
import { isPrivateUseSchemeUrl } from "@shared/utils/urls";

/**
 * A decorator that validates that a value is an array of unique, well-formed
 * URLs with a length within the given bounds. A top-level domain is not
 * required, allowing local and internal hostnames. Private-use schemes such
 * as `com.example.app:/callback` are allowed for native apps (RFC 8252).
 */
export default function IsUrlList({
  min = 1,
  max,
}: {
  min?: number;
  max: number;
}): (target: object, propertyName: string) => void {
  return (target: object, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        validUrlList(value: string[] | null) {
          if (!Array.isArray(value)) {
            throw new Error("Must be an array of urls");
          }
          if (value.length < min || value.length > max) {
            throw new Error(`Must contain between ${min} and ${max} urls`);
          }
          if (new Set(value).size !== value.length) {
            throw new Error("Must not contain duplicate urls");
          }
          for (const url of value) {
            if (
              typeof url !== "string" ||
              !(
                isURL(url, {
                  require_tld: false,
                  require_protocol: true,
                  allow_underscores: true,
                }) || isPrivateUseSchemeUrl(url)
              )
            ) {
              throw new Error("Must be a valid url");
            }
          }
        },
      },
    });
}
