import { Context } from "koa";

import { isArrayLike } from "lodash";
import validator from "validator";
import { validateColorHex } from "../../shared/utils/color";
import { validateIndexCharacters } from "../../shared/utils/indexCharacters";
import { ParamRequiredError, ValidationError } from "../errors";

export default function validation() {
  return function validationMiddleware(ctx: Context, next: () => Promise<any>) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertPresent = (value, message) => {
      if (value === undefined || value === null || value === "") {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ParamRequiredError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertArray = (value, message) => {
      if (!isArrayLike(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertIn = (value, options, message) => {
      if (!options.includes(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertSort = (value, model, message = "Invalid sort parameter") => {
      if (!Object.keys(model.rawAttributes).includes(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertNotEmpty = (value, message) => {
      if (value === "") {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
    ctx.assertEmail = (value = "", message) => {
      if (!validator.isEmail(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
    ctx.assertUuid = (value = "", message) => {
      if (!validator.isUUID(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertPositiveInteger = (value, message) => {
      if (
        !validator.isInt(String(value), {
          min: 0,
        })
      ) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertHexColor = (value, message) => {
      if (!validateColorHex(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertValueInArray = (value, values, message) => {
      if (!values.includes(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    ctx.assertIndexCharacters = (value, message) => {
      if (!validateIndexCharacters(value)) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new ValidationError(message);
      }
    };

    return next();
  };
}
