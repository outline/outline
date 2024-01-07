import styled from "styled-components";

const Heading = styled.h1<{ as?: string; centered?: boolean }>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (props.as ? "" : "margin-top: 6vh; font-weight: 600;")}
  ${(props) => (props.centered ? "text-align: center;" : "")}
`;

export default Heading;
