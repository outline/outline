import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

/**
 * Validates a PostgreSQL database connection URL, including support for
 * multi-host connection strings as documented in:
 * https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS
 *
 * Supports:
 * - Single host: postgresql://user:pass@host:port/db
 * - Multi-host: postgresql://user:pass@host1:port1,host2:port2,host3:port3/db
 * - With query parameters: postgresql://user:pass@host1,host2/db?param=value
 *
 * @param url the database URL to validate.
 * @param protocols the protocols to allow (e.g., ["postgres", "postgresql"]).
 * @param requireTld whether to require top-level domain in hostnames.
 * @param allowUnderscores whether to allow underscores in hostnames.
 * @returns true if the URL is valid, false otherwise.
 */
export function isDatabaseUrl(
  url: string,
  options: {
    protocols?: string[];
    require_tld?: boolean;
    allow_underscores?: boolean;
  } = {}
): boolean {
  const {
    protocols = ["postgres", "postgresql"],
    require_tld = false,
    allow_underscores = true,
  } = options;

  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    // Check if protocol is valid
    const protocolMatch = url.match(/^(\w+):\/\//);
    if (!protocolMatch || !protocols.includes(protocolMatch[1])) {
      return false;
    }

    // Extract the URL components
    // Format: protocol://[user[:password]@]host1[:port1][,host2[:port2],...][/database][?params]
    const protocolEnd = url.indexOf("://") + 3;
    const urlWithoutProtocol = url.substring(protocolEnd);

    // Split by @ to separate auth from host/path
    const atIndex = urlWithoutProtocol.lastIndexOf("@");
    const hasAuth = atIndex !== -1;
    const hostAndPath = hasAuth
      ? urlWithoutProtocol.substring(atIndex + 1)
      : urlWithoutProtocol;

    // Split host section from path/query
    const pathStart = hostAndPath.search(/[/?]/);
    const hostSection =
      pathStart === -1 ? hostAndPath : hostAndPath.substring(0, pathStart);

    if (!hostSection) {
      return false;
    }

    // Split multiple hosts by comma
    const hosts = hostSection.split(",");

    // Validate each host
    for (const hostWithPort of hosts) {
      const host = hostWithPort.split(":")[0];

      if (!host) {
        return false;
      }

      // Check for invalid characters in hostname
      const hostnameRegex = allow_underscores
        ? /^[a-zA-Z0-9._-]+$/
        : /^[a-zA-Z0-9.-]+$/;

      if (!hostnameRegex.test(host)) {
        return false;
      }

      // Check TLD requirement if specified
      if (require_tld && !host.includes(".")) {
        return false;
      }

      // Validate port if present
      const colonIndex = hostWithPort.indexOf(":");
      if (colonIndex !== -1) {
        const portStr = hostWithPort.substring(colonIndex + 1);
        const port = parseInt(portStr, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function CannotUseWithout(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "cannotUseWithout",
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate<T>(value: T, args: ValidationArguments) {
          const obj = args.object as unknown as T;
          const required = args.constraints[0] as keyof T;
          return obj[required] !== undefined;
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} cannot be used without ${args.constraints[0]}.`;
        },
      },
    });
  };
}

export function CannotUseWith(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "cannotUseWith",
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate<T>(value: T, args: ValidationArguments) {
          if (value === undefined) {
            return true;
          }
          const obj = args.object as unknown as T;
          const forbidden = args.constraints[0] as keyof T;
          return obj[forbidden] === undefined;
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} cannot be used with ${args.constraints[0]}.`;
        },
      },
    });
  };
}

export function CannotUseWithAny(
  properties: string[],
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "cannotUseWithAny",
      target: object.constructor,
      propertyName,
      constraints: properties,
      options: validationOptions,
      validator: {
        validate<T>(value: T, args: ValidationArguments) {
          if (value === undefined) {
            return true;
          }
          const obj = args.object as unknown as T;
          const forbiddenProperties = args.constraints as (keyof T)[];
          return forbiddenProperties.every((prop) => obj[prop] === undefined);
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} cannot be used with any of: ${args.constraints.join(
            ", "
          )}.`;
        },
      },
    });
  };
}

export function IsInCaseInsensitive(
  allowedValues: string[],
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isInCaseInsensitive",
      target: object.constructor,
      propertyName,
      constraints: [allowedValues],
      options: validationOptions,
      validator: {
        validate<T>(value: T, args: ValidationArguments) {
          if (value === undefined || value === null) {
            return true;
          }
          if (typeof value !== "string") {
            return false;
          }
          const av = args.constraints[0] as string[];
          return av.some(
            (allowedValue) => allowedValue.toLowerCase() === value.toLowerCase()
          );
        },
        defaultMessage(args: ValidationArguments) {
          const av = args.constraints[0] as string[];
          return `${propertyName} must be one of: ${av.join(
            ", "
          )} (case insensitive).`;
        },
      },
    });
  };
}

/**
 * Decorator that validates PostgreSQL database connection URLs, including
 * multi-host connection strings for high-availability setups.
 *
 * @param options validation options including protocols, require_tld, and allow_underscores.
 * @param validationOptions additional validation options.
 * @returns decorator function.
 */
export function IsDatabaseUrl(
  options: {
    protocols?: string[];
    require_tld?: boolean;
    allow_underscores?: boolean;
  } = {},
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isDatabaseUrl",
      target: object.constructor,
      propertyName,
      constraints: [options],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) {
            return true;
          }
          if (typeof value !== "string") {
            return false;
          }
          const opts = args.constraints[0] as typeof options;
          return isDatabaseUrl(value, opts);
        },
        defaultMessage() {
          return `${propertyName} must be a URL address`;
        },
      },
    });
  };
}
