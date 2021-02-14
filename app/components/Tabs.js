// @flow
import styled from "styled-components";

const Tabs = styled.nav`
  position: sticky;
  top: 54px;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  border-bottom: 1px solid ${(props) => props.theme.divider};
  margin: 12px 0;
  overflow-y: auto;
  white-space: nowrap;
  transition: opacity 250ms ease-out;
`;

export const Separator = styled.span`
  border-left: 1px solid ${(props) => props.theme.divider};
  position: relative;
  top: 2px;
  margin-right: 24px;
  margin-top: 6px;
`;

export default Tabs;
