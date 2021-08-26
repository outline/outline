// @flow
import styled from "styled-components";
import Flex from "components/Flex";

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: 600;
  user-select: none;
  text-transform: uppercase;
  color: ${(props) => props.theme.sidebarText};
  letter-spacing: 0.04em;
  margin: 4px 12px;
`;

export default Header;
