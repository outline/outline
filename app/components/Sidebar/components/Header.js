// @flow
import Flex from 'shared/components/Flex';
import styled from 'styled-components';
import { color, fontWeight } from 'shared/styles/constants';

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: ${fontWeight.semiBold};
  text-transform: uppercase;
  color: ${color.slateDark};
  letter-spacing: 0.04em;
  margin-bottom: 4px;
`;

export default Header;
