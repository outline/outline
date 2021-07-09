import styled from "styled-components";

type Props = {
  grow: boolean;
};

const ClickablePadding = styled.div<Props>`
  min-height: 10em;
  cursor: ${({ onClick }) => (onClick ? "text" : "default")};
  ${({ grow }) => grow && `flex-grow: 100;`};
`;

export default ClickablePadding;
