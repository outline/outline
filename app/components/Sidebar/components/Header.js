// @flow
import Flex from 'shared/components/Flex';
import styled from 'styled-components';

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.slateDark};
  letter-spacing: 0.04em;
  margin-bottom: 4px;
`;

export default Header;
