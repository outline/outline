// @flow
import styled from 'styled-components';

const ClickablePadding = styled.div`
  min-height: 10em;
  cursor: ${({ onClick }) => (onClick ? 'text' : 'default')};
  ${({ grow }) => grow && `flex-grow: 100;`};
`;

export default ClickablePadding;
