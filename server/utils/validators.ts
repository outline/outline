import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

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
