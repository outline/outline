import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

const Heading = styled.h1<{ as?: string; centered?: boolean }>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (props.as ? "" : "margin-top: 3vh; font-weight: 600;")}
  ${(props) => (props.centered ? "text-align: center;" : "")}

  ${breakpoint("tablet")`
    ${(props: { as?: string }) => (props.as ? "" : "margin-top: 6vh;")}
  `};
`;

export default Heading;
