/**
 * Generate a random integer within a given range.
 *
 * @param min - The minimum value of the range.
 * @param max - The maximum value of the range.
 * @returns A random integer within the range.
 */
export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Choose a random element from an array.
 *
 * @param arr - The array to choose from.
 * @returns A random element from the array.
 */
export const randomElement = <T>(arr: T[]): T =>
  arr[randomInteger(0, arr.length - 1)];

/**
 * Generate a random string of a given length and charset.
 *
 * @param options - The length of the string or an object with length and charset properties.
 * @returns A random string.
 */
export const randomString = (
  options:
    | number
    | {
        length: number;
        charset: "lowercase" | "uppercase" | "numeric" | "alphanumeric";
      }
) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeric = "0123456789";
  const alphanumeric = lowercase + uppercase + numeric;

  const chars =
    typeof options === "number"
      ? alphanumeric
      : options.charset === "lowercase"
        ? lowercase
        : options.charset === "uppercase"
          ? uppercase
          : options.charset === "numeric"
            ? numeric
            : alphanumeric;
  const array = new Uint8Array(
    typeof options === "number" ? options : options.length
  );
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
};
