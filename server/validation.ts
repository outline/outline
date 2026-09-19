import sanitize from "sanitize-filename";
import type { Primitive } from "utility-types";
import isIn from "validator/lib/isIn";
import isUUID from "validator/lib/isUUID";
import { MentionType } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { isUrl } from "@shared/utils/urls";
import { ParamRequiredError, ValidationError } from "./errors";
import { Buckets } from "./models/helpers/AttachmentHelper";

export { isISO8601Duration } from "@shared/utils/date";

type IncomingValue = Primitive | string[];

export const assertPresent = (value: IncomingValue, message: string) => {
  if (value === undefined || value === null || value === "") {
    throw ParamRequiredError(message);
  }
};

export const assertIn = (
  value: string,
  options: Primitive[],
  message?: string
) => {
  if (!options.includes(value)) {
    throw ValidationError(message ?? `Must be one of ${options.join(", ")}`);
  }
};

export class ValidateKey {
  /**
   * Checks if key is valid. A valid key is of the form
   * <bucket>/<uuid>/<uuid>/<name>?
   *
   * @param key
   * @returns true if key is valid, false otherwise
   */
  public static isValid = (key: string) => {
    let parts = key.split("/");

    return (
      parts.length >= 3 &&
      parts.length <= 4 &&
      isIn(parts[0], Object.values(Buckets)) &&
      isUUID(parts[1]) &&
      isUUID(parts[2])
    );
  };

  /**
   * Sanitizes a key by removing any invalid characters
   *
   * @param key
   * @returns sanitized key
   */
  public static sanitize = (key: string) => {
    const [filename] = key.split("/").slice(-1);
    return key
      .split("/")
      .slice(0, -1)
      .filter((part) => part !== "" && part !== ".." && part !== ".")
      .join("/")
      .concat(`/${sanitize(filename.replace(/#/g, ""))}`);
  };

  /**
   * Sanitizes a string for use as a single segment of a key, removing any
   * characters that would allow it to change the location the key points to.
   *
   * @param name the string to sanitize.
   * @returns the sanitized segment.
   */
  public static sanitizeSegment = (name: string) =>
    sanitize(name.replace(/#/g, ""));

  public static message = "Must be of the form <bucket>/<uuid>/<uuid>/<name>?";
}

export class ValidateDocumentId {
  /**
   * Checks if documentId is valid. A valid documentId is either
   * a UUID or a url slug matching a particular regex.
   *
   * @param documentId
   * @returns true if documentId is valid, false otherwise
   */
  public static isValid = (documentId: string) =>
    isUUID(documentId) || UrlHelper.SLUG_URL_REGEX.test(documentId);

  public static message = "Must be uuid or url slug";
}

export class ValidateIndex {
  public static regex = new RegExp("^[\x20-\x7E]+$");
  public static message = "Must be between x20 to x7E ASCII";
  public static maxLength = 256;
}

export class ValidateURL {
  public static isValidMentionUrl = (url: string) => {
    if (!isUrl(url)) {
      return false;
    }
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== "mention:") {
        return false;
      }

      const { id, mentionType, modelId } = parseMentionUrl(url);
      return (
        (!id || isUUID(id)) &&
        !!mentionType &&
        Object.values(MentionType).includes(mentionType as MentionType) &&
        !!modelId &&
        isUUID(modelId)
      );
    } catch (_err) {
      return false;
    }
  };

  public static message = "Must be a valid url";
}

export class ValidateColor {
  public static regex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
  public static message = "Must be a hex value (please use format #FFFFFF)";
}
