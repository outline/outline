import { isURL } from "class-validator";
import { addAttributeOptions } from "sequelize-typescript";
import env from "@server/env";

/**
 * A decorator that validates that a string is a valid HTTP(S) url. A top-level
 * domain is only required when cloud hosted, allowing self-hosted installations
 * to use internal hostnames.
 */
export default function IsUrl(target: object, propertyName: string) {
  return addAttributeOptions(target, propertyName, {
    validate: {
      validUrl(value: string) {
        if (
          !isURL(value, {
            protocols: ["http", "https"],
            require_protocol: true,
            require_tld: env.isCloudHosted,
          })
        ) {
          throw new Error("Must be a valid url");
        }
      },
    },
  });
}
