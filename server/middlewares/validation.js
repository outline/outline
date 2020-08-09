// @flow
import { type Context } from "koa";
import validator from "validator";
import { validateColorHex } from "../../shared/utils/color";
import { ParamRequiredError, ValidationError } from "../errors";

export default function validation() {
  return function validationMiddleware(ctx: Context, next: () => Promise<*>) {
    ctx.assertPresent = (value, message) => {
      if (value === undefined || value === null || value === "") {
        throw new ParamRequiredError(message);
      }
    };

    ctx.assertIn = (value, options, message) => {
      if (!options.includes(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertNotEmpty = (value, message) => {
      if (value === "") {
        throw new ValidationError(message);
      }
    };

    ctx.assertEmail = (value = "", message) => {
      if (!validator.isEmail(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertUuid = (value = "", message) => {
      if (!validator.isUUID(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertPositiveInteger = (value, message) => {
      if (!validator.isInt(value, { min: 0 })) {
        throw new ValidationError(message);
      }
    };

    ctx.assertHexColor = (value, message) => {
      if (!validateColorHex(value)) {
        throw new ValidationError(message);
      }
    };

    return next();
  };
}
