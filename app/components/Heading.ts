import styled from "styled-components";

interface HeadingProps {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  centered?: boolean;
  "data-numbered"?: string;
  "data-number"?: string;
  "data-level"?: number;
}

const Heading = styled.h1.attrs<HeadingProps>((props) => ({
  as: props.as,
}))<HeadingProps>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (!props.as ? "margin-top: 6vh; font-weight: 600;" : "")}
  ${(props) => (props.centered ? "text-align: center;" : "")}

  ${(props) =>
    props["data-numbered"] &&
    props["data-number"] &&
    `
    &::before {
      content: "${props["data-number"]} ";
      margin-right: 8px;
      color: var(--text-tertiary);
      font-weight: normal;
    }
  `}
`;

export default Heading;
