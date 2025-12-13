import { AnimateSharedLayout } from "framer-motion";
import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import useWindowSize from "~/hooks/useWindowSize";

const Nav = styled.nav<{ $shadowVisible?: boolean }>`
  margin: -8px 0 28px;
  padding: 0 8px;
  overflow-y: auto;
  white-space: nowrap;

  ${breakpoint("tablet")`
    margin: -8px -32px 32px;
    padding: 0 32px;
  `};

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &:after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 50px;
    height: 100%;
    pointer-events: none;
    background: ${(props) =>
      props.$shadowVisible
        ? `linear-gradient(
      90deg,
      ${transparentize(1, props.theme.background)} 0%,
      ${props.theme.background} 100%
    )`
        : `transparent`};
  }

  &:before {
    content: "";
    position: absolute;
    bottom: -1.5em;
    height: 1.5em;
    left: 0;
    right: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      ${(props) => props.theme.background},
      ${(props) => transparentize(1, props.theme.background)}
    );
  }
`;

// When sticky we need extra background coverage around the sides otherwise
// items that scroll past can "stick out" the sides of the heading
const Sticky = styled.div`
  position: sticky;
  top: 64px;
  background: ${s("background")};
  z-index: 1;

  ${breakpoint("tablet")`
    margin: 0 -48px;
    padding: 0 48px;
  `};
`;

export const Separator = styled.span`
  border-left: 1px solid ${s("divider")};
  position: relative;
  top: 2px;
  margin-right: 24px;
  margin-top: 6px;
`;

type Props = {
  children?: React.ReactNode;
};

const Tabs: React.FC = ({ children }: Props) => {
  const ref = React.useRef<any>();
  const [shadowVisible, setShadow] = React.useState(false);
  const { width } = useWindowSize();

  const updateShadows = React.useCallback(() => {
    const c = ref.current;
    if (!c) {
      return;
    }
    const scrollLeft = c.scrollLeft;
    const wrapperWidth = c.scrollWidth - c.clientWidth;
    const fade = !!(wrapperWidth - scrollLeft !== 0);

    if (fade !== shadowVisible) {
      setShadow(fade);
    }
  }, [shadowVisible]);

  React.useEffect(() => {
    updateShadows();
  }, [width, updateShadows]);

  return (
    <AnimateSharedLayout>
      <Sticky>
        <Nav ref={ref} onScroll={updateShadows} $shadowVisible={shadowVisible}>
          {children}
        </Nav>
      </Sticky>
    </AnimateSharedLayout>
  );
};

export default Tabs;
