// @flow
import { type Context } from "koa";
import { isArrayLike } from "lodash";
import validator from "validator";
import { validateColorHex } from "../../shared/utils/color";
import { validateIndexCharacters } from "../../shared/utils/indexCharacters";
import { ParamRequiredError, ValidationError } from "../errors";

export default function validation() {
  return function validationMiddleware(ctx: Context, next: () => Promise<*>) {
    ctx.assertPresent = (value, message) => {
      if (value === undefined || value === null || value === "") {
        throw new ParamRequiredError(message);
      }
    };

    ctx.assertArray = (value, message) => {
      if (!isArrayLike(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertIn = (value, options, message) => {
      if (!options.includes(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertSort = (value, model, message = "Invalid sort parameter") => {
      if (!Object.keys(model.rawAttributes).includes(value)) {
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
      if (!validator.isInt(String(value), { min: 0 })) {
        throw new ValidationError(message);
      }
    };

    ctx.assertHexColor = (value, message) => {
      if (!validateColorHex(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertValueInArray = (value, values, message) => {
      if (!values.includes(value)) {
        throw new ValidationError(message);
      }
    };

    ctx.assertIndexCharacters = (value, message) => {
      if (!validateIndexCharacters(value)) {
        throw new ValidationError(message);
      }
    };
    return next();
  };
}
