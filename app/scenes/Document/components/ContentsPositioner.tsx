import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { transparentize } from "polished";
import React, { PropsWithChildren } from "react";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { depths, s } from "@shared/styles";
import { useDocumentContext } from "~/components/DocumentContext";
import useIsMounted from "~/hooks/useIsMounted";

const HeaderHeight = 64;
const StickyTopPosition = 90;

const InitialMarginTop = "calc(44px + 6vh)";

type SpaceBound = {
  idx: number;
  top: number;
  bottom: number;
};

const ContentsPositioner = ({ children }: PropsWithChildren<unknown>) => {
  const theme = useTheme();
  const isMounted = useIsMounted();
  const { headings, fullWidthElements } = useDocumentContext();

  const positionerRef = React.useRef<HTMLDivElement>(null);
  const contentsObserverRef = React.useRef<IntersectionObserver>();
  const fullWidthElementsRef = React.useRef<HTMLElement[]>([]); // needed for async observer callbacks.

  const handlePositioning = React.useCallback(() => {
    if (!positionerRef.current) {
      return;
    }

    const positionerRect = positionerRef.current.getBoundingClientRect();

    const scroll = window.scrollY;

    const sortedElemsBound = sortBy(
      fullWidthElementsRef.current.map<SpaceBound>((elem, idx) => {
        const rect = elem.getBoundingClientRect();
        return {
          idx,
          top: Math.ceil(rect.top + scroll), // adjust scroll position to prevent position jumps on scroll
          bottom: Math.ceil(rect.bottom + scroll),
        };
      }),
      (rect) => rect.top
    );

    const spacesBound = sortedElemsBound.map<SpaceBound>((elemBound, idx) => {
      const bottom =
        idx !== sortedElemsBound.length - 1
          ? sortedElemsBound[idx + 1].top - 1
          : window.innerHeight + scroll;
      return {
        idx: idx + 1,
        top: elemBound.bottom + 1,
        bottom,
      };
    });

    // insert the initial position in case no full-width elems are present (or)
    // the first full-width elem is below StickyTopPosition.
    if (!spacesBound.length || sortedElemsBound[0]?.top > StickyTopPosition) {
      const bottom = sortedElemsBound[0]
        ? sortedElemsBound[0].top - 1
        : window.innerHeight + scroll;
      spacesBound.unshift({
        idx: 0,
        top: StickyTopPosition,
        bottom,
      });
    }

    const visibleSpacesBound = spacesBound.filter((spaceBound) => {
      const actualBottom = spaceBound.bottom - scroll;
      return actualBottom >= 0 && actualBottom <= window.innerHeight;
    });

    if (!visibleSpacesBound.length) {
      // keep using the previously set marginTop.
      return;
    }

    let spaceToUse = visibleSpacesBound.find((space) => {
      const top =
        space.top - scroll >= StickyTopPosition
          ? space.top - scroll
          : StickyTopPosition;
      const bottom =
        space.bottom - scroll <= window.innerHeight
          ? space.bottom - scroll
          : window.innerHeight;
      return bottom - top + 1 >= positionerRect.height;
    });

    // use the biggest space available to ensure
    // minimum overlap with the following content.
    if (!spaceToUse) {
      // descending sort based on size
      const sortedSpacesBound = spacesBound.sort((a, b) =>
        a.bottom - a.top + 1 >= b.bottom - b.top + 1 ? -1 : 1
      );

      // If last space, the additional height of contents will be hidden.
      // so, use the next best space if available.
      if (
        sortedSpacesBound[0].bottom - scroll === window.innerHeight &&
        sortedSpacesBound.length > 1
      ) {
        spaceToUse = sortedSpacesBound[1];
      } else {
        spaceToUse = sortedSpacesBound[0];
      }
    }

    let marginTop;

    if (spaceToUse.idx === 0) {
      // In the initial position, if the contents box overlaps with a full-width elem,
      // push it up to use the available space.
      if (sortedElemsBound[0]) {
        const spaceHeight = spaceToUse.bottom - spaceToUse.top + 1;
        const diff =
          spaceHeight - positionerRect.height > 0
            ? spaceHeight - positionerRect.height
            : 0;
        marginTop = `min(${InitialMarginTop}, ${diff}px)`;
      } else {
        marginTop = InitialMarginTop;
      }
    } else {
      marginTop = `${spaceToUse.top - HeaderHeight}px`;
    }
    positionerRef.current.style.marginTop = marginTop;

    if (isMounted()) {
      positionerRef.current.style.transition = `${theme["backgroundTransition"]}, margin-top 100ms ease-out`;
    }
  }, [theme, isMounted]);

  // prevent first render flicker.
  React.useLayoutEffect(() => {
    fullWidthElementsRef.current = fullWidthElements;
    handlePositioning();
  }, [fullWidthElements, handlePositioning]);

  // setup the observers.
  React.useEffect(() => {
    if (!positionerRef.current) {
      return;
    }

    fullWidthElementsRef.current = fullWidthElements;

    const positionerRect = positionerRef.current.getBoundingClientRect();

    // Box for the contents position when it becomes sticky.
    // Whenever a full-width element enters/leaves the box, re-position the contents.
    const rootMargin = `-${StickyTopPosition}px 0px -${
      window.innerHeight - (StickyTopPosition + positionerRect.height)
    }px 0px`;

    const fullWidthElemsObserver = new IntersectionObserver(
      () => handlePositioning(),
      {
        rootMargin,
      }
    );

    // observe contents in case it goes out of viewport in the bottom.
    if (!contentsObserverRef.current) {
      contentsObserverRef.current = new IntersectionObserver(
        () => handlePositioning(),
        { rootMargin: "-101% 0px 0px" }
      );
      contentsObserverRef.current.observe(positionerRef.current);
    }

    if (!fullWidthElements.length) {
      positionerRef.current.style.marginTop = InitialMarginTop;
    } else {
      fullWidthElements.forEach((elem) => fullWidthElemsObserver.observe(elem));
    }

    return () => fullWidthElemsObserver.disconnect();
  }, [headings, fullWidthElements, handlePositioning]); // when headings change, contents box size changes.

  return <Positioner ref={positionerRef}>{children}</Positioner>;
};

const Positioner = styled.div`
  display: none;

  position: sticky;
  top: ${StickyTopPosition}px;
  max-height: calc(100vh - ${StickyTopPosition}px);
  width: ${EditorStyleHelper.tocWidth}px;

  padding: 0 16px;
  overflow-y: auto;
  border-radius: 8px;

  background: ${s("background")};
  transition: ${s("backgroundTransition")};

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }

  ${breakpoint("tablet")`
    display: block;
    z-index: ${depths.toc};
  `};
`;

export default observer(ContentsPositioner);
