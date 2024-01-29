import { DefaultTheme } from "styled-components";

export { default as depths } from "./depths";

export { default as breakpoints } from "./breakpoints";

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
    String(props.theme[key]);

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
