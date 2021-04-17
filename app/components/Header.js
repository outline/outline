// @flow
import { throttle } from "lodash";
import { observer } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "components/Fade";
import Flex from "components/Flex";

type Props = {|
  breadcrumb?: React.Node,
  title: React.Node,
  actions?: React.Node,
|};

function Header({ breadcrumb, title, actions }: Props) {
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
    <Wrapper align="center" isCompact={isScrolled} shrink={false}>
      {breadcrumb ? <Breadcrumbs>{breadcrumb}</Breadcrumbs> : null}
      {isScrolled ? (
        <Title align="center" justify="flex-start" onClick={handleClickTitle}>
          <Fade>{title}</Fade>
        </Title>
      ) : (
        <div />
      )}
      {actions && (
        <Actions align="center" justify="flex-end">
          {actions}
        </Actions>
      )}
    </Wrapper>
  );
}

const Breadcrumbs = styled("div")`
  flex-grow: 1;
  flex-basis: 0;
  align-items: center;
  padding-right: 8px;

  /* Don't show breadcrumbs on mobile */
  display: none;
  ${breakpoint("tablet")`	
  display: flex;
`};
`;

const Actions = styled(Flex)`
  flex-grow: 1;
  flex-basis: 0;
  min-width: auto;
  padding-left: 8px;
`;

const Wrapper = styled(Flex)`
  position: sticky;
  top: 0;
  z-index: ${(props) => props.theme.depths.header};
  background: ${(props) => transparentize(0.2, props.theme.background)};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  backdrop-filter: blur(20px);
  min-height: 56px;

  @media print {
    display: none;
  }

  justify-content: flex-start;
  ${breakpoint("tablet")`
    padding: ${(props) => (props.isCompact ? "12px" : `24px 24px 0`)};
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

export default observer(Header);
