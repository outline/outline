import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet-async";
import type { DefaultTheme } from "styled-components";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import { LoadingIndicatorBar } from "~/components/LoadingIndicator";
import { useRightSidebarContent } from "~/components/RightSidebarContext";
import SkipNavContent from "~/components/SkipNavContent";
import SkipNavLink from "~/components/SkipNavLink";
import env from "~/env";
import useStores from "~/hooks/useStores";

type Props = {
  /** Main content to render in the layout. */
  children?: React.ReactNode;
  /** Page title to display in the browser tab. Defaults to app name if not provided. */
  title?: string;
  /** Left sidebar content. */
  sidebar?: React.ReactNode;
  /** Whether the sidebar can be collapsed, defaults to true. */
  sidebarCanCollapse?: boolean;
};

const Layout = React.forwardRef(function Layout_(
  { title, children, sidebar, sidebarCanCollapse = true }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { ui } = useStores();
  const showSidebar = !!sidebar && !ui.sidebarHidden;
  const sidebarCollapsed =
    !showSidebar || (ui.sidebarIsClosed && sidebarCanCollapse);
  const sidebarRight = useRightSidebarContent();

  return (
    <Container column auto ref={ref}>
      <Helmet>
        <title>{title ? title : env.APP_NAME}</title>
      </Helmet>

      <SkipNavLink />

      {ui.progressBarVisible && <LoadingIndicatorBar />}

      <Container auto>
        {showSidebar && sidebar}

        <SkipNavContent />
        <Content
          auto
          justify="center"
          role="main"
          $isResizing={ui.sidebarIsResizing}
          $sidebarCollapsed={sidebarCollapsed}
          $hasSidebar={showSidebar}
          style={
            sidebarCollapsed
              ? undefined
              : {
                  marginInlineStart: `${ui.sidebarWidth}px`,
                }
          }
        >
          {children}
        </Content>

        <AnimatePresence initial={false}>{sidebarRight}</AnimatePresence>
      </Container>
    </Container>
  );
});

const Container = styled(Flex)`
  background: ${s("background")};
  position: relative;
  width: 100%;
  min-height: 100%;
`;

type ContentProps = {
  $isResizing?: boolean;
  $sidebarCollapsed?: boolean;
  $hasSidebar?: boolean;
  theme: DefaultTheme;
};

const Content = styled(Flex)<ContentProps>`
  margin: 0;
  transition: ${(props) =>
    props.$isResizing ? "none" : `margin-inline-start 100ms ease-out`};

  @media print {
    margin: 0 !important;
  }

  ${breakpoint("mobile", "tablet")`
    margin-inline-start: 0 !important;
  `}

  ${breakpoint("tablet")`
    ${(props: ContentProps) =>
      props.$hasSidebar &&
      props.$sidebarCollapsed &&
      `margin-inline-start: ${props.theme.sidebarCollapsedWidth}px;`}
  `};
`;

export default observer(Layout);
