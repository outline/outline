import { css } from "styled-components";
import type { Interpolation, RuleSet } from "styled-components";

/** Viewport widths in pixels at which the layout changes. */
export const breakpoints = {
  mobile: 0,
  mobileLarge: 460,
  // targeting all devices
  tablet: 737,
  // targeting devices that are larger than the iPhone 6 Plus (which is 736px in landscape mode)
  desktop: 1025,
  // targeting devices that are larger than the iPad (which is 1024px in landscape mode)
  desktopLarge: 1600,
};

type BreakpointName = keyof typeof breakpoints;

/**
 * Creates a tagged template that wraps styles in a media query for the given
 * breakpoint range.
 *
 * @param gte the name of the breakpoint the viewport must be at least as wide as.
 * @param lt the optional name of the breakpoint the viewport must be narrower than.
 * @returns a tagged template that returns the wrapped styles.
 */
export function breakpoint(gte: BreakpointName, lt?: BreakpointName) {
  return <Props extends object>(
    strings: TemplateStringsArray,
    ...interpolations: Interpolation<NoInfer<Props>>[]
  ): RuleSet<Props> => {
    const styles = css<Props>(strings, ...interpolations);
    const min = breakpoints[gte];

    if (lt === undefined) {
      // Do not wrap the styles in a media query when the minimum is zero.
      if (min === 0) {
        return styles;
      }
      return css<Props>`
        @media (min-width: ${toEm(min)}em) {
          ${styles}
        }
      `;
    }

    return css<Props>`
      @media (min-width: ${toEm(min)}em) and (max-width: ${toEm(
        breakpoints[lt] - 1
      )}em) {
        ${styles}
      }
    `;
  };
}

/**
 * Media queries always use a 16px base, regardless of the root font size.
 *
 * @param pixels the value in pixels.
 * @returns the value in em.
 */
function toEm(pixels: number) {
  return pixels / 16;
}
