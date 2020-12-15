// @flow
import { observer } from "mobx-react";
import { CloseIcon, MenuIcon } from "outline-icons";
import * as React from "react";
import { withRouter } from "react-router-dom";
import type { Location } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "components/Fade";
import Flex from "components/Flex";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";

let firstRender = true;

type Props = {
  children: React.Node,
  location: Location,
};

function Sidebar({ location, children }: Props) {
  const { ui } = useStores();
  const previousLocation = usePrevious(location);

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const content = (
    <Container
      mobileSidebarVisible={ui.mobileSidebarVisible}
      collapsed={ui.editMode || ui.sidebarCollapsed}
      column
    >
      <CollapseToggle onClick={ui.toggleCollapsedSidebar}>
        {ui.sidebarCollapsed ? "+" : "-"}
      </CollapseToggle>
      <Toggle
        onClick={ui.toggleMobileSidebar}
        mobileSidebarVisible={ui.mobileSidebarVisible}
      >
        {ui.mobileSidebarVisible ? (
          <CloseIcon size={32} />
        ) : (
          <MenuIcon size={32} />
        )}
      </Toggle>
      {children}
    </Container>
  );

  // Fade in the sidebar on first render after page load
  if (firstRender) {
    firstRender = false;
    return <Fade>{content}</Fade>;
  }

  return content;
}

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  background: ${(props) => props.theme.sidebarBackground};
  transition: left 100ms ease-out,
    ${(props) => props.theme.backgroundTransition};
  margin-left: ${(props) => (props.mobileSidebarVisible ? 0 : "-100%")};
  z-index: ${(props) => props.theme.depths.sidebar};

  @media print {
    display: none;
    left: 0;
  }

  &:before,
  &:after {
    content: "";
    background: ${(props) => props.theme.sidebarBackground};
    position: absolute;
    top: -50vh;
    left: 0;
    width: 100%;
    height: 50vh;
  }

  &:after {
    top: auto;
    bottom: -50vh;
  }

  ${breakpoint("tablet")`
    left: ${(props) =>
      props.collapsed ? `calc(-${props.theme.sidebarWidth} + 16px)` : 0};
    width: ${(props) => props.theme.sidebarWidth};
    margin: 0;
    z-index: 3;

    &:hover {
      left: 0;
    }
  `};
`;

const CollapseToggle = styled.a`
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  z-index: 1;
  color: ${(props) => props.theme.sidebarText};

  &:hover {
    background: ${(props) => props.theme.sidebarItemBackground};
  }
`;

const Toggle = styled.a`
  display: flex;
  align-items: center;
  position: fixed;
  top: 0;
  left: ${(props) => (props.mobileSidebarVisible ? "auto" : 0)};
  right: ${(props) => (props.mobileSidebarVisible ? 0 : "auto")};
  z-index: 1;
  margin: 12px;

  ${breakpoint("tablet")`
    display: none;
  `};
`;

export default withRouter(observer(Sidebar));
