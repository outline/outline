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
    <Wrapper
      align="center"
      justify="space-between"
      isCompact={isScrolled}
      shrink={false}
    >
      {breadcrumb}
      {isScrolled ? (
        <Title
          align="center"
          justify={breadcrumb ? "center" : "flex-start"}
          onClick={handleClickTitle}
        >
          <Fade>
            <Flex align="center">{title}</Flex>
          </Fade>
        </Title>
      ) : (
        <div />
      )}
      {actions && <Actions>{actions}</Actions>}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  background: ${(props) => transparentize(0.2, props.theme.background)};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: ${(props) => (props.isCompact ? "12px" : `24px 24px 0`)};
  `};
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  width: 0;

  ${breakpoint("tablet")`	
    flex-grow: 1;
  `};
`;

const Actions = styled(Flex)`
  align-self: flex-end;
  height: 32px;
`;

export default observer(Header);
