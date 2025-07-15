import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { hideScrollbars } from "@shared/styles";
import useWindowSize from "~/hooks/useWindowSize";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  shadow?: boolean;
  topShadow?: boolean;
  bottomShadow?: boolean;
  hiddenScrollbars?: boolean;
  flex?: boolean;
  overflow?: string;
  children: React.ReactNode;
};

function Scrollable(
  {
    shadow,
    topShadow,
    bottomShadow,
    hiddenScrollbars,
    flex,
    overflow,
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
    const tsv = !!((shadow || topShadow) && scrollTop > 0);

    if (tsv !== topShadowVisible) {
      setTopShadow(tsv);
    }

    const wrapperHeight = c.scrollHeight - c.clientHeight;
    const bsv = !!((shadow || bottomShadow) && wrapperHeight - scrollTop !== 0);

    if (bsv !== bottomShadowVisible) {
      setBottomShadow(bsv);
    }
  }, [
    shadow,
    topShadow,
    bottomShadow,
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
      $topShadowVisible={topShadowVisible}
      $bottomShadowVisible={bottomShadowVisible}
      $overflow={overflow}
      {...rest}
    />
  );
}

const Wrapper = styled.div<{
  $flex?: boolean;
  $topShadowVisible?: boolean;
  $bottomShadowVisible?: boolean;
  $hiddenScrollbars?: boolean;
  $overflow?: string;
}>`
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
