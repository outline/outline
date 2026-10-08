/**
 * Coerce an unknown value, such as a value caught in a try/catch, to an Error.
 *
 * @param value the value to coerce, typically a caught error.
 * @returns the value itself when it is already an Error, otherwise a new Error wrapping its string representation.
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Extract a human-readable message from an unknown value, such as a value caught in a try/catch.
 *
 * @param value the value to read a message from, typically a caught error.
 * @returns the Error's message when it is an Error, otherwise its string representation.
 */
export function errToString(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

/**
 * Extract the identifier from an unknown value, such as a value caught in a try/catch. Errors
 * thrown by the application carry an `id` describing the type of failure, however they may not
 * always be instances of Error.
 *
 * @param value the value to read an identifier from, typically a caught error.
 * @returns the identifier when the value has a string `id` property, otherwise undefined.
 */
export function errToId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return undefined;
  }
  return typeof value.id === "string" ? value.id : undefined;
}
