import { isArrayLike } from "lodash";
import validator from "validator";
import { validateColorHex } from "../shared/utils/color";
import { validateIndexCharacters } from "../shared/utils/indexCharacters";
import { ParamRequiredError, ValidationError } from "./errors";

export const assertPresent = (value: any, message: string) => {
  if (value === undefined || value === null || value === "") {
    throw ParamRequiredError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertArray = (value, message) => {
  if (!isArrayLike(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertIn = (value, options, message) => {
  if (!options.includes(value)) {
    throw ValidationError(message);
  }
};

export const assertSort = (
  value: string,
  model: any,
  message = "Invalid sort parameter"
) => {
  if (!Object.keys(model.rawAttributes).includes(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertNotEmpty = (value, message) => {
  if (value === "") {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
export const assertEmail = (value = "", message) => {
  if (!validator.isEmail(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
export const assertUuid = (value, message) => {
  if (typeof value !== "string") {
    throw ValidationError(message);
  }
  if (!validator.isUUID(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertPositiveInteger = (value, message) => {
  if (
    !validator.isInt(String(value), {
      min: 0,
    })
  ) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertHexColor = (value, message) => {
  if (!validateColorHex(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertValueInArray = (value, values, message) => {
  if (!values.includes(value)) {
    throw ValidationError(message);
  }
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
export const assertIndexCharacters = (value, message) => {
  if (!validateIndexCharacters(value)) {
    throw ValidationError(message);
  }
};
