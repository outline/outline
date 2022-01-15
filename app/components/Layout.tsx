import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { Helmet } from "react-helmet";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { LoadingIndicatorBar } from "~/components/LoadingIndicator";
import SkipNavContent from "~/components/SkipNavContent";
import SkipNavLink from "~/components/SkipNavLink";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { isModKey } from "~/utils/keyboard";

type Props = {
  title?: string;
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  rightRail?: React.ReactNode;
};

function Layout({ title, children, sidebar, rightRail }: Props) {
  const { ui } = useStores();
  const sidebarCollapsed = !sidebar || ui.isEditing || ui.sidebarCollapsed;

  useKeyDown(".", (event) => {
    if (isModKey(event)) {
      ui.toggleCollapsedSidebar();
    }
  });

  return (
    <Container column auto>
      <Helmet>
        <title>{title ? title : "Outline"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <SkipNavLink />

      {ui.progressBarVisible && <LoadingIndicatorBar />}

      {sidebar && (
        <MobileMenuButton
          onClick={ui.toggleMobileSidebar}
          icon={<MenuIcon />}
          iconColor="currentColor"
          neutral
        />
      )}

      <Container auto>
        {sidebar}

        <SkipNavContent />
        <Content
          auto
          justify="center"
          $isResizing={ui.sidebarIsResizing}
          $sidebarCollapsed={sidebarCollapsed}
          $hasSidebar={!!sidebar}
          style={
            sidebarCollapsed
              ? undefined
              : {
                  marginLeft: `${ui.sidebarWidth}px`,
                }
          }
        >
          {children}
        </Content>

        {rightRail}
      </Container>
    </Container>
  );
}

const Container = styled(Flex)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  position: relative;
  width: 100%;
  min-height: 100%;
`;

const MobileMenuButton = styled(Button)`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: ${(props) => props.theme.depths.sidebar - 1};

  ${breakpoint("tablet")`
    display: none;
  `};

  @media print {
    display: none;
  }
`;

const Content = styled(Flex)<{
  $isResizing?: boolean;
  $sidebarCollapsed?: boolean;
  $hasSidebar?: boolean;
}>`
  margin: 0;
  transition: ${(props) =>
    props.$isResizing ? "none" : `margin-left 100ms ease-out`};

  @media print {
    margin: 0 !important;
  }

  ${breakpoint("mobile", "tablet")`
    margin-left: 0 !important;
  `}

  ${breakpoint("tablet")`
    ${(props: any) =>
      props.$hasSidebar &&
      props.$sidebarCollapsed &&
      `margin-left: ${props.theme.sidebarCollapsedWidth}px;`}
  `};
`;

export default observer(Layout);
