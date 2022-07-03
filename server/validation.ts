import { isArrayLike } from "lodash";
import validator from "validator";
import { validateColorHex } from "../shared/utils/color";
import { validateIndexCharacters } from "../shared/utils/indexCharacters";
import { ParamRequiredError, ValidationError } from "./errors";

export const assertPresent = (value: unknown, message: string) => {
  if (value === undefined || value === null || value === "") {
    throw ParamRequiredError(message);
  }
};

export const assertArray = (value: unknown, message?: string) => {
  if (!isArrayLike(value)) {
    throw ValidationError(message);
  }
};

export const assertIn = (
  value: string,
  options: (string | undefined | null)[],
  message?: string
) => {
  if (!options.includes(value)) {
    throw ValidationError(message ?? `Must be one of ${options.join(", ")}`);
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

export const assertNotEmpty = (value: unknown, message: string) => {
  assertPresent(value, message);

  if (typeof value === "string" && value.trim() === "") {
    throw ValidationError(message);
  }
};

export const assertEmail = (value = "", message?: string) => {
  if (!validator.isEmail(value)) {
    throw ValidationError(message);
  }
};

export const assertUuid = (value: unknown, message?: string) => {
  if (typeof value !== "string") {
    throw ValidationError(message);
  }
  if (!validator.isUUID(value)) {
    throw ValidationError(message);
  }
};

export const assertPositiveInteger = (value: unknown, message?: string) => {
  if (
    !validator.isInt(String(value), {
      min: 0,
    })
  ) {
    throw ValidationError(message);
  }
};

export const assertHexColor = (value: string, message?: string) => {
  if (!validateColorHex(value)) {
    throw ValidationError(message);
  }
};

export const assertValueInArray = (
  value: string,
  values: string[],
  message?: string
) => {
  if (!values.includes(value)) {
    throw ValidationError(message);
  }
};

export const assertIndexCharacters = (
  value: string,
  message = "index must be between x20 to x7E ASCII"
) => {
  if (!validateIndexCharacters(value)) {
    throw ValidationError(message);
  }
};
