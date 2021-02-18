// @flow
import * as React from "react";
import styled from "styled-components";

const Nav = styled.nav`
  border-bottom: 1px solid ${(props) => props.theme.divider};
  margin: 12px 0;
  overflow-y: auto;
  white-space: nowrap;
  transition: opacity 250ms ease-out;
`;

// When sticky we need extra background coverage around the sides otherwise
// items that scroll past can "stick out" the sides of the heading
const Sticky = styled.div`
  position: sticky;
  top: 54px;
  margin: 0 -8px;
  padding: 0 8px;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  z-index: 1;
`;

export const Separator = styled.span`
  border-left: 1px solid ${(props) => props.theme.divider};
  position: relative;
  top: 2px;
  margin-right: 24px;
  margin-top: 6px;
`;

const Tabs = (props: {}) => {
  return (
    <Sticky>
      <Nav {...props}></Nav>
    </Sticky>
  );
};

export default Tabs;
