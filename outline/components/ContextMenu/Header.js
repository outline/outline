// @flow
import styled from "styled-components";

const Header = styled.h3`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props) => props.theme.sidebarText};
  letter-spacing: 0.04em;
  margin: 1em 12px 0.5em;
`;

export default Header;
