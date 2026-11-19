import { isArray, isObject } from "es-toolkit/compat";

/**
 * Removes sensitive fields from data attached to logs and errors, and limits
 * the depth of nested data.
 *
 * @param input the data to sanitize.
 * @param level the current nesting level.
 * @returns the sanitized data.
 */
export function sanitize<T>(input: T, level = 0): T {
  // Errors have non-enumerable message/stack which are dropped by spreads
  // and JSON serialization, so convert them to a plain object up-front.
  if (input instanceof Error) {
    return {
      name: input.name,
      message: input.message,
      stack: input.stack,
    } as unknown as T;
  }

  // Sanitize the serialized form of values such as dates, URLs and models,
  // as this is what appears in the log output.
  if (hasToJSON(input)) {
    const json: unknown = input.toJSON();
    return (json === input ? json : sanitize(json, level)) as T;
  }

  if (!isObject(input)) {
    return input;
  }

  if (level > 3) {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    return "[…]" as any as T;
  }

  if (isArray(input)) {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    return input.map((item) => sanitize(item, level + 1)) as any as T;
  }

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  const output: Record<string, any> = { ...input };

  for (const key of Object.keys(output)) {
    output[key] = isSensitiveField(key)
      ? "[Filtered]"
      : sanitize(output[key], level + 1);
  }

  return output as T;
}

/**
 * Field names that are filtered, in lowercase without separators.
 */
const sensitiveFields = new Set([
  "accesstoken",
  "refreshtoken",
  "token",
  "password",
  "content",
  "verificationcode",
  "deleteconfirmationcode",
  "apikey",
  "secret",
  "authorization",
]);

/**
 * Checks if a field name is sensitive, ignoring case, underscores and hyphens.
 *
 * @param key the field name to check.
 * @returns true if the field should be filtered.
 */
function isSensitiveField(key: string): boolean {
  return sensitiveFields.has(key.toLowerCase().replace(/[_-]/g, ""));
}

/**
 * Checks if a value has a toJSON method.
 *
 * @param value the value to check.
 * @returns true if the value has a toJSON method.
 */
function hasToJSON(value: unknown): value is { toJSON: () => unknown } {
  return (
    isObject(value) && "toJSON" in value && typeof value.toJSON === "function"
  );
}
