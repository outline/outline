import styled from "styled-components";

const ClickablePadding = styled.div<{ grow?: boolean }>`
  min-height: 50vh;
  cursor: ${({ onClick }) => (onClick ? "text" : "default")};
  ${({ grow }) => grow && `flex-grow: 100;`};
`;

export default ClickablePadding;
