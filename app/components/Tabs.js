// @flow
import styled from "styled-components";

const Tabs = styled.nav`
  position: relative;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  margin-top: 22px;
  margin-bottom: 12px;
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
