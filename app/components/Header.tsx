import { throttle } from "lodash";
import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";

type Props = {
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
  hasSidebar?: boolean;
};

function Header({ breadcrumb, title, actions, hasSidebar }: Props) {
  const { ui } = useStores();

  const passThrough = !actions && !breadcrumb && !title;

  const [isScrolled, setScrolled] = React.useState(false);
  const handleScroll = React.useCallback(
    throttle(() => setScrolled(window.scrollY > 75), 50),
    []
  );

  React.useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleClickTitle = React.useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  return (
    <Wrapper align="center" shrink={false} $passThrough={passThrough}>
      {breadcrumb || hasSidebar ? (
        <Breadcrumbs>
          {hasSidebar && (
            <MobileMenuButton
              onClick={ui.toggleMobileSidebar}
              icon={<MenuIcon />}
              iconColor="currentColor"
              neutral
            />
          )}
          {breadcrumb}
        </Breadcrumbs>
      ) : null}

      {isScrolled ? (
        <Title onClick={handleClickTitle}>
          <Fade>{title}</Fade>
        </Title>
      ) : (
        <div />
      )}
      <Actions align="center" justify="flex-end">
        {actions}
      </Actions>
    </Wrapper>
  );
}

const Breadcrumbs = styled("div")`
  flex-grow: 1;
  flex-basis: 0;
  align-items: center;
  padding-right: 8px;
  display: flex;
`;

const Actions = styled(Flex)`
  flex-grow: 1;
  flex-basis: 0;
  min-width: auto;
  padding-left: 8px;

  ${breakpoint("tablet")`
    position: unset;
  `};
`;

const Wrapper = styled(Flex)<{ $passThrough?: boolean }>`
  top: 0;
  z-index: ${(props) => props.theme.depths.header};
  position: sticky;

  ${(props) =>
    props.$passThrough
      ? `
      background: transparent;
      pointer-events: none;
      `
      : `
      background: ${transparentize(0.2, props.theme.background)};
      backdrop-filter: blur(20px);
      `};

  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  min-height: 56px;
  justify-content: flex-start;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: 16px 16px 0;
    justify-content: "center";
  `};
`;

const Title = styled("div")`
  display: none;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  min-width: 0;

  ${breakpoint("tablet")`
    padding-left: 0;
    display: block;
  `};

  svg {
    vertical-align: bottom;
  }

  @media (display-mode: standalone) {
    overflow: hidden;
    flex-grow: 0 !important;
  }
`;

const MobileMenuButton = styled(Button)`
  margin-right: 8px;
  pointer-events: auto;

  ${breakpoint("tablet")`
    display: none;
  `};

  @media print {
    display: none;
  }
`;

export default observer(Header);
