/* eslint-disable @typescript-eslint/ban-types */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export function CannotUseWithout(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
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
  return function (object: Object, propertyName: string) {
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
