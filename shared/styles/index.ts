import type { DefaultTheme } from "styled-components";
import { isTouchDevice } from "../utils/browser";

export { default as depths } from "./depths";

export { default as breakpoints } from "./breakpoints";

/**
 * Returns "hover" on a non-touch device and "active" on a touch device. To
 * avoid "sticky" hover on mobile. Use `&:${hover} {...}` instead of
 * using `&:hover {...}`.
 */
export const hover = isTouchDevice() ? "active" : "hover";

/**
 * Mixin to make text ellipse when it overflows.
 *
 * @returns string of CSS
 */
export const ellipsis = () => `
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

/**
 * Mixin to return a theme value.
 *
 * @returns a theme value
 */
export const s =
  (key: keyof DefaultTheme) => (props: { theme: DefaultTheme }) =>
    props.theme[key] as string;

/**
 * Mixin to hide scrollbars.
 *
 * @returns string of CSS
 */
export const hideScrollbars = () => `
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Mixin to give an element superellipse ("squircle") corners in browsers that
 * support `corner-shape`, with a standard border radius elsewhere.
 *
 * @param radius the border radius in pixels.
 * @param exponent the superellipse exponent, where 2 is a squircle.
 * @returns string of CSS
 */
export const borderRadius = (radius: number, exponent = 2) => `
  border-radius: ${radius}px;

  @supports (corner-shape: superellipse(2)) {
    /* A superellipse is tighter than a circular arc, so increase the radius to compensate. */
    border-radius: ${Math.round(radius * 1.8)}px;
    corner-shape: superellipse(${exponent});
  }
`;

/**
 * Mixin for a hairline border, drawn at half a pixel on displays with the
 * resolution to render one, and a whole pixel elsewhere.
 *
 * @param color the color of the border.
 * @returns string of CSS
 */
export const hairline = (color: string) => `
  border: 1px solid ${color};

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
    border-width: 0.5px;
  }
`;

/**
 * Mixin on any component with relative positioning to add additional hidden clickable/hoverable area
 *
 * @param pixels
 * @returns
 */
export const extraArea = (pixels: number): string => `
  &::before {
    position: absolute;
    content: "";
    top: -${pixels}px;
    right: -${pixels}px;
    left: -${pixels}px;
    bottom: -${pixels}px;
  }
`;

/**
 * Truncate multiline text.
 *
 * @returns string of CSS
 */
export const truncateMultiline = (lines: number) => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
  overflow-wrap: anywhere;
`;
