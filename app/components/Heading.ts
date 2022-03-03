import styled from "styled-components";

const Heading = styled.h1<{ centered?: boolean }>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (props.centered ? "text-align: center;" : "")}
`;

export default Heading;
