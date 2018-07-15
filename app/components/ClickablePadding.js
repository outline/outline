// @flow
import styled from 'styled-components';

const ClickablePadding = styled.div`
  min-height: 50vh;
  cursor: ${({ onClick }) => (onClick ? 'text' : 'default')};
  ${({ grow }) => grow && `flex-grow: 1;`};
`;

export default ClickablePadding;
