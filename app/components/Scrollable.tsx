import { observer } from "mobx-react";
import * as React from "react";
import styled, { css } from "styled-components";
import { hideScrollbars } from "@shared/styles";
import useWindowSize from "~/hooks/useWindowSize";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** Whether to show shadows at top and bottom when scrolled */
  shadow?: boolean;
  /** Whether to show shadow at the top when scrolled */
  topShadow?: boolean;
  /** Whether to show shadow at the bottom when scrolled */
  bottomShadow?: boolean;
  /** Whether to hide the scrollbars */
  hiddenScrollbars?: boolean;
  /** Color to fade to (enables fade effect) */
  fadeTo?: string;
  /** Whether to use flexbox layout */
  flex?: boolean;
  /** Custom overflow style */
  overflow?: string;
};

/**
 * A scrollable container component with optional shadow indicators and custom scrollbar styling.
 *
 * @param props - component properties.
 * @param ref - forwarded ref to the scrollable div element.
 * @returns the scrollable container element.
 */
function Scrollable(
  {
    shadow,
    topShadow,
    bottomShadow,
    hiddenScrollbars,
    fadeTo,
    flex,
    overflow,
    children,
    ...rest
  }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const fallbackRef = React.useRef<HTMLDivElement>();
  const [topShadowVisible, setTopShadow] = React.useState(false);
  const [bottomShadowVisible, setBottomShadow] = React.useState(false);
  const { height } = useWindowSize();
  const updateShadows = React.useCallback(() => {
    const c = (ref || fallbackRef).current;
    if (!c) {
      return;
    }
    const scrollTop = c.scrollTop;
    const tsv = !!((shadow || topShadow || fadeTo) && scrollTop > 0);

    if (tsv !== topShadowVisible) {
      setTopShadow(tsv);
    }

    const wrapperHeight = c.scrollHeight - c.clientHeight;
    const bsv = !!(
      (shadow || bottomShadow || fadeTo) &&
      wrapperHeight - scrollTop !== 0
    );

    if (bsv !== bottomShadowVisible) {
      setBottomShadow(bsv);
    }
  }, [
    shadow,
    topShadow,
    bottomShadow,
    fadeTo,
    ref,
    topShadowVisible,
    bottomShadowVisible,
  ]);

  React.useEffect(() => {
    updateShadows();
  }, [height, updateShadows]);

  return (
    <Wrapper
      ref={ref || fallbackRef}
      onScroll={updateShadows}
      $flex={flex}
      $hiddenScrollbars={hiddenScrollbars}
      $topShadowVisible={topShadowVisible && !fadeTo}
      $bottomShadowVisible={bottomShadowVisible && !fadeTo}
      $overflow={overflow}
      {...rest}
    >
      {fadeTo && <Fade to={fadeTo} visible={topShadowVisible} top />}
      {children}
      {fadeTo && <Fade to={fadeTo} visible={bottomShadowVisible} bottom />}
    </Wrapper>
  );
}

const Fade = styled.div<{
  to: string;
  top?: boolean;
  bottom?: boolean;
  visible: boolean;
}>`
  --height: 1.5em;
  position: sticky;
  ${(props) =>
    props.top &&
    css`
      top: 0;
      background: linear-gradient(to bottom, ${props.to}, transparent);
      margin-bottom: calc(-1 * var(--height));
    `}
  ${(props) =>
    props.bottom &&
    css`
      bottom: 0;
      background: linear-gradient(to top, ${props.to}, transparent);
      margin-top: calc(-1 * var(--height));
    `}

  flex-shrink: 0;
  height: var(--height);
  width: calc(100% - var(--scrollbar-width, 0px));
  pointer-events: none;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 100ms ease-in-out;
  z-index: 1;
`;

const Wrapper = styled.div<{
  $flex?: boolean;
  $fadeTo?: string;
  $topShadowVisible?: boolean;
  $bottomShadowVisible?: boolean;
  $hiddenScrollbars?: boolean;
  $overflow?: string;
}>`
  position: relative;
  display: ${(props) => (props.$flex ? "flex" : "block")};
  flex-direction: column;
  height: 100%;
  overflow-y: ${(props) => (props.$overflow ? props.$overflow : "auto")};
  overflow-x: ${(props) => (props.$overflow ? props.$overflow : "hidden")};
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  box-shadow: ${(props) => {
    if (props.$topShadowVisible && props.$bottomShadowVisible) {
      return "0 1px inset rgba(0,0,0,.1), 0 -1px inset rgba(0,0,0,.1)";
    }

    if (props.$topShadowVisible) {
      return "0 1px inset rgba(0,0,0,.1)";
    }

    if (props.$bottomShadowVisible) {
      return "0 -1px inset rgba(0,0,0,.1)";
    }

    return "none";
  }};
  transition: box-shadow 100ms ease-in-out;

  ${(props) => props.$hiddenScrollbars && hideScrollbars()}
`;

export default observer(React.forwardRef(Scrollable));
