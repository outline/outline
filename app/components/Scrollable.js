// @flow
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import useWindowSize from "hooks/useWindowSize";

type Props = {|
  shadow?: boolean,
  topShadow?: boolean,
  bottomShadow?: boolean,
|};

function Scrollable({ shadow, topShadow, bottomShadow, ...rest }: Props) {
  const ref = React.useRef<?HTMLDivElement>();
  const [topShadowVisible, setTopShadow] = React.useState(false);
  const [bottomShadowVisible, setBottomShadow] = React.useState(false);
  const { height } = useWindowSize();

  const updateShadows = React.useCallback(() => {
    const c = ref.current;
    if (!c) return;

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
  }, [shadow, topShadow, bottomShadow, topShadowVisible, bottomShadowVisible]);

  React.useEffect(() => {
    updateShadows();
  }, [height, updateShadows]);

  return (
    <Wrapper
      ref={ref}
      onScroll={updateShadows}
      $topShadowVisible={topShadowVisible}
      $bottomShadowVisible={bottomShadowVisible}
      {...rest}
    />
  );
}

const Wrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
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
  transition: all 100ms ease-in-out;
`;

export default observer(Scrollable);
