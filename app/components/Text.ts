import styled from "styled-components";

type Props = {
  type?: "secondary" | "tertiary" | "danger";
  size?: "large" | "small" | "xsmall";
  dir?: "ltr" | "rtl" | "auto";
  selectable?: boolean;
  weight?: "bold" | "normal";
};

/**
 * Use this component for all interface text that should not be selectable
 * by the user, this is the majority of UI text explainers, notes, headings.
 */
const Text = styled.p<Props>`
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
    props.size === "large"
      ? "18px"
      : props.size === "small"
      ? "14px"
      : props.size === "xsmall"
      ? "13px"
      : "inherit"};
  font-weight: ${(props) =>
    props.weight === "bold"
      ? 500
      : props.weight === "normal"
      ? "normal"
      : "inherit"};
  white-space: normal;
  user-select: ${(props) => (props.selectable ? "text" : "none")};
`;

export default Text;
