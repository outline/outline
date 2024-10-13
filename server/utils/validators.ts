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
