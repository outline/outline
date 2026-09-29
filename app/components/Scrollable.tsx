import { observer } from "mobx-react";
import * as React from "react";
import { useMergeRefs } from "react-merge-refs";
import styled, { css } from "styled-components";
import { hideScrollbars } from "@shared/styles";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** Whether to show shadows at top and bottom when scrolled */
  shadow?: boolean;
  /** Whether to show shadow at the top when scrolled */
  topShadow?: boolean;
  /** Whether to show shadow at the bottom when scrolled */
  bottomShadow?: boolean;
  /** Whether to hide the scrollbars */
  hiddenScrollbars?: boolean;
  /** Color to fade to (enables fade effect), applied to both edges unless topShadow or bottomShadow narrows it to one */
  fadeTo?: string;
  /** Whether to use flexbox layout */
  flex?: boolean;
  /** Custom overflow style */
  overflow?: string;
  /** Ref to the scrollable div element */
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * A scrollable container component with optional shadow indicators and custom scrollbar styling.
 *
 * @param props - component properties.
 * @returns the scrollable container element.
 */
function Scrollable({
  shadow,
  topShadow,
  bottomShadow,
  hiddenScrollbars,
  fadeTo,
  flex,
  overflow,
  children,
  ref,
  ...rest
}: Props) {
  const [topShadowVisible, setTopShadow] = React.useState(false);
  const [bottomShadowVisible, setBottomShadow] = React.useState(false);

  // When an edge is named alongside fadeTo the fade is limited to that edge,
  // otherwise both edges fade.
  const singleEdge = topShadow !== undefined || bottomShadow !== undefined;
  const fadeTop = !!fadeTo && (!singleEdge || !!topShadow);
  const fadeBottom = !!fadeTo && (!singleEdge || !!bottomShadow);
  const trackTop = !!(shadow || topShadow || fadeTop);
  const trackBottom = !!(shadow || bottomShadow || fadeBottom);

  const updateShadows = React.useCallback(
    (c: HTMLDivElement) => {
      const scrollTop = c.scrollTop;
      setTopShadow(trackTop && scrollTop > 0);

      const wrapperHeight = c.scrollHeight - c.clientHeight;
      setBottomShadow(trackBottom && wrapperHeight - scrollTop > 1);
    },
    [trackTop, trackBottom]
  );

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      updateShadows(event.currentTarget);
    },
    [updateShadows]
  );

  // Observe the container and its children for size changes.
  const observeRef = React.useCallback(
    (c: HTMLDivElement | null) => {
      if (!c) {
        return;
      }

      updateShadows(c);

      const observer = new ResizeObserver(() => updateShadows(c));
      observer.observe(c);

      for (const child of Array.from(c.children)) {
        observer.observe(child);
      }

      return () => observer.disconnect();
    },
    [updateShadows]
  );

  const mergedRef = useMergeRefs([observeRef, ref]);

  return (
    <Wrapper
      ref={mergedRef}
      onScroll={handleScroll}
      $flex={flex}
      $hiddenScrollbars={hiddenScrollbars}
      $topShadowVisible={topShadowVisible && !fadeTop}
      $bottomShadowVisible={bottomShadowVisible && !fadeBottom}
      $overflow={overflow}
      {...rest}
    >
      {fadeTo && fadeTop && <Fade to={fadeTo} visible={topShadowVisible} top />}
      {children}
      {fadeTo && fadeBottom && (
        <Fade to={fadeTo} visible={bottomShadowVisible} bottom />
      )}
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

export default observer(Scrollable);
