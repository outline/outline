/**
 * Joins conditional class names into a single string, dropping any falsy
 * values. Shared by the Tailwind UI components in this directory, which
 * upstream each declare their own copy of this helper.
 *
 * @param classes the class names to join.
 * @returns the joined class name string.
 */
export function classNames(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
