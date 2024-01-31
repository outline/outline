import styled, { css } from "styled-components";

type Props = {
  type?: "secondary" | "tertiary" | "danger";
  size?: "xlarge" | "large" | "medium" | "small" | "xsmall";
  dir?: "ltr" | "rtl" | "auto";
  selectable?: boolean;
  weight?: "bold" | "normal";
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
  font-size: ${(props) =>
    props.size === "xlarge"
      ? "26px"
      : props.size === "large"
      ? "18px"
      : props.size === "medium"
      ? "16px"
      : props.size === "small"
      ? "14px"
      : props.size === "xsmall"
      ? "13px"
      : "inherit"};

  ${(props) =>
    props.weight &&
    css`
      font-weight: ${props.weight === "bold"
        ? 500
        : props.weight === "normal"
        ? 400
        : "inherit"};
    `}

  white-space: normal;
  user-select: ${(props) => (props.selectable ? "text" : "none")};
`;

export default Text;
