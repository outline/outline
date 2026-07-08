/**
 * Spacing scale for margin, padding, and gap values, in pixels.
 *
 * Use in styled-components template literals as `${spacing.md}px`, via the
 * `space()` helper for shorthands, or by token name on layout primitives,
 * e.g. `<Flex gap="sm" p="md">` and `<HStack spacing="lg">`.
 *
 * Note: this is unrelated to the sidebar width values that are spread into
 * the theme from an internal `spacing` object in shared/styles/theme.ts.
 */
const spacing = {
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 6px */
  sm: 6,
  /** 8px */
  md: 8,
  /** 12px */
  lg: 12,
  /** 16px */
  xl: 16,
  /** 24px */
  xxl: 24,
  /** 32px */
  xxxl: 32,
} as const;

/** A named step on the spacing scale. */
export type SpacingToken = keyof typeof spacing;

/** A named step on the spacing scale, or raw pixels for off-scale values. */
export type SpacingValue = SpacingToken | number;

/**
 * Resolves a spacing token or raw pixel number to pixels.
 *
 * @param value a spacing token name or raw pixel number.
 * @returns the resolved value in pixels.
 */
export const resolveSpacing = (value: SpacingValue): number =>
  typeof value === "number" ? value : spacing[value];

/**
 * Builds a CSS shorthand value from spacing tokens or raw pixel numbers,
 * e.g. `padding: ${space(0, "md")};` becomes `padding: 0 8px;`.
 *
 * @param values spacing token names or raw pixel numbers.
 * @returns a space-separated CSS value string.
 */
export const space = (...values: SpacingValue[]): string =>
  values
    .map((value) => {
      const resolved = resolveSpacing(value);
      return resolved === 0 ? "0" : `${resolved}px`;
    })
    .join(" ");

export default spacing;
