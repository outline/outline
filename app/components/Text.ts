import styled from "styled-components";

type Props = {
  type?: "secondary" | "tertiary";
  size?: "small" | "xsmall";
};

/**
 * Use this component for all interface text that should not be selectable
 * by the user, this is the majority of UI text explainers, notes, headings.
 */
const Text = styled.p<Props>`
  margin-top: 0;
  color: ${(props) =>
    props.type === "secondary"
      ? props.theme.textSecondary
      : props.type === "tertiary"
      ? props.theme.textTertiary
      : props.theme.text};
  font-size: ${(props) =>
    props.size === "small"
      ? "14px"
      : props.size === "xsmall"
      ? "13px"
      : "inherit"};
  white-space: normal;
  user-select: none;
`;

export default Text;
