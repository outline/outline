import styled, { css } from "styled-components";
import { ellipsis } from "../styles";
import { breakpoint } from "../styles/breakpoint";

type TextSize = "xlarge" | "large" | "medium" | "small" | "xsmall";

const fontSizes: Record<TextSize, number> = {
  xlarge: 26,
  large: 18,
  medium: 16,
  small: 14,
  xsmall: 13,
};

const mobileSizes: Partial<Record<TextSize, TextSize>> = {
  medium: "large",
  small: "medium",
  xsmall: "small",
};

/**
 * Returns the font-size styles for a text size variant. Smaller variants are
 * bumped up to the next size on mobile.
 *
 * @param size the size variant, or undefined to inherit.
 * @returns the font-size styles.
 */
export const textSizeStyles = (size?: TextSize) => {
  if (!size) {
    return css`
      font-size: inherit;
    `;
  }

  const mobileSize = mobileSizes[size];

  return css`
    font-size: ${fontSizes[size]}px;

    ${
      mobileSize &&
      breakpoint("mobile", "tablet")`
      font-size: ${fontSizes[mobileSize]}px;
    `
    }
  `;
};

type Props = {
  /** The type of text to render */
  type?: "secondary" | "tertiary" | "danger";
  /** The size of the text */
  size?: TextSize;
  /** The direction of the text (defaults to ltr) */
  dir?: "ltr" | "rtl" | "auto";
  /** Whether the text should be selectable (defaults to false) */
  selectable?: boolean;
  /** The font weight of the text */
  weight?: "xbold" | "bold" | "normal";
  /** Whether the text should be italic */
  italic?: boolean;
  /** Whether the text should be truncated with an ellipsis */
  ellipsis?: boolean;
  /** Whether the text should be monospaced */
  monospace?: boolean;
};

/**
 * Use this component for all interface text that should not be selectable
 * by the user, this is the majority of UI text explainers, notes, headings.
 */
const Text = styled.span<Props>`
  margin-top: 0;
  text-align: ${(props) => (props.dir ? props.dir : "inherit")};
  color: ${(props) =>
    props.type === "secondary"
      ? props.theme.textSecondary
      : props.type === "tertiary"
        ? props.theme.textTertiary
        : props.type === "danger"
          ? props.theme.brand.red
          : props.theme.text};
  ${(props) => textSizeStyles(props.size)}

  ${(props) =>
    props.weight &&
    css`
      font-weight: ${
        props.weight === "xbold"
          ? 600
          : props.weight === "bold"
            ? 500
            : props.weight === "normal"
              ? 400
              : "inherit"
      };
    `}

  font-style: ${(props) => (props.italic ? "italic" : "normal")};
  font-family: ${(props) =>
    props.monospace ? props.theme.fontFamilyMono : "inherit"};

  white-space: normal;
  user-select: ${(props) => (props.selectable ? "text" : "none")};

  ${(props) => props.ellipsis && ellipsis()}
`;

export default Text;
