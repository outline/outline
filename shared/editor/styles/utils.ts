/**
 * Combines class names into a single string
 *
 * @param classNames An array of class names
 * @returns A single string of class names
 */
export function cn(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}
