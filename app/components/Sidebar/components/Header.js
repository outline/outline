// @flow
import styled from "styled-components";
import Flex from "components/Flex";

const Header = styled(Flex)`
  position: relative;
  left: 24px;
  font-size: 15px;
  color: ${(props) => props.theme.sidebarText};
  margin: 0 16px;
`;

export default Header;
