/**
 * Combines class names into a single string
 *
 * @param classNames An array of class names
 * @returns A single string of class names
 */
export function cn(
  ...classNames: (string | number | Record<string, boolean> | undefined)[]
) {
  return classNames
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "object") {
        return Object.entries(item)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(" ");
      }
      return item;
    })
    .join(" ");
}
