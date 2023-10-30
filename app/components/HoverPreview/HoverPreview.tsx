import { m } from "framer-motion";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { UnfurlType } from "@shared/types";
import LoadingIndicator from "~/components/LoadingIndicator";
import useEventListener from "~/hooks/useEventListener";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePrevious from "~/hooks/usePrevious";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { CARD_MARGIN } from "./Components";
import HoverPreviewDocument from "./HoverPreviewDocument";
import HoverPreviewLink from "./HoverPreviewLink";
import HoverPreviewMention from "./HoverPreviewMention";

const DELAY_CLOSE = 600;
const POINTER_HEIGHT = 22;
const POINTER_WIDTH = 22;

type Props = {
  /** The HTML element that is being hovered over, or null if none. */
  element: HTMLElement | null;
  /** A callback on close of the hover preview. */
  onClose: () => void;
};

enum Direction {
  UP,
  DOWN,
}

function HoverPreviewDesktop({ element, onClose }: Props) {
  const url = element?.getAttribute("href") || element?.dataset.url;
  const previousUrl = usePrevious(url, true);
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const { cardLeft, cardTop, pointerLeft, pointerTop, pointerDir } =
    useHoverPosition({
      cardRef,
      element,
      isVisible,
    });

  const closePreview = React.useCallback(() => {
    setVisible(false);
    onClose();
  }, [onClose]);

  const stopCloseTimer = React.useCallback(() => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
      timerClose.current = undefined;
    }
  }, []);

  const startCloseTimer = React.useCallback(() => {
    timerClose.current = setTimeout(closePreview, DELAY_CLOSE);
  }, [closePreview]);

  // Open and close the preview when the element changes.
  React.useEffect(() => {
    if (element) {
      setVisible(true);
    } else {
      startCloseTimer();
    }
  }, [startCloseTimer, element]);

  // Close the preview on Escape, scroll, or click outside.
  useOnClickOutside(cardRef, closePreview);
  useKeyDown("Escape", closePreview);
  useEventListener("scroll", closePreview, window, { capture: true });

  // Ensure that the preview stays open while the user is hovering over the card.
  React.useEffect(() => {
    const card = cardRef.current;

    if (isVisible) {
      if (card) {
        card.addEventListener("mouseenter", stopCloseTimer);
        card.addEventListener("mouseleave", startCloseTimer);
      }
    }

    return () => {
      if (card) {
        card.removeEventListener("mouseenter", stopCloseTimer);
        card.removeEventListener("mouseleave", startCloseTimer);
      }

      stopCloseTimer();
    };
  }, [element, startCloseTimer, isVisible, stopCloseTimer]);

  const displayUrl = url ?? previousUrl;

  if (!isVisible || !displayUrl) {
    return null;
  }

  return (
    <Portal>
      <Position top={cardTop} left={cardLeft} ref={cardRef} aria-hidden>
        <DataLoader url={displayUrl}>
          {(data) => (
            <Animate
              initial={{ opacity: 0, y: -20, pointerEvents: "none" }}
              animate={{ opacity: 1, y: 0, pointerEvents: "auto" }}
            >
              {data.type === UnfurlType.Mention ? (
                <HoverPreviewMention
                  url={data.thumbnailUrl}
                  title={data.title}
                  info={data.meta.info}
                  color={data.meta.color}
                />
              ) : data.type === UnfurlType.Document ? (
                <HoverPreviewDocument
                  id={data.meta.id}
                  url={data.url}
                  title={data.title}
                  description={data.description}
                  info={data.meta.info}
                />
              ) : (
                <HoverPreviewLink
                  url={data.url}
                  thumbnailUrl={data.thumbnailUrl}
                  title={data.title}
                  description={data.description}
                />
              )}
              <Pointer
                top={pointerTop}
                left={pointerLeft}
                direction={pointerDir}
              />
            </Animate>
          )}
        </DataLoader>
      </Position>
    </Portal>
  );
}

function DataLoader({
  url,
  children,
}: {
  url: string;
  children: (data: any) => React.ReactNode;
}) {
  const { ui } = useStores();
  const { data, request, loading } = useRequest(
    React.useCallback(
      () =>
        client.post("/urls.unfurl", {
          url,
          documentId: ui.activeDocumentId,
        }),
      [url, ui.activeDocumentId]
    )
  );

  React.useEffect(() => {
    if (url) {
      void request();
    }
  }, [url, request]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!data) {
    return null;
  }

  return <>{children(data)}</>;
}

function HoverPreview({ element, ...rest }: Props) {
  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  return <HoverPreviewDesktop {...rest} element={element} />;
}

function useHoverPosition({
  cardRef,
  element,
  isVisible,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  element: HTMLElement | null;
  isVisible: boolean;
}) {
  const [cardLeft, setCardLeft] = React.useState(0);
  const [cardTop, setCardTop] = React.useState(0);
  const [pointerLeft, setPointerLeft] = React.useState(0);
  const [pointerTop, setPointerTop] = React.useState(0);
  const [pointerDir, setPointerDir] = React.useState(Direction.UP);

  React.useLayoutEffect(() => {
    if (isVisible && element && cardRef.current) {
      const elem = element.getBoundingClientRect();
      const card = cardRef.current.getBoundingClientRect();

      let cTop = elem.bottom + window.scrollY + CARD_MARGIN;
      let pTop = -POINTER_HEIGHT;
      let pDir = Direction.UP;
      if (cTop + card.height > window.innerHeight + window.scrollY) {
        // shift card upwards if it goes out of screen
        const bottom = elem.top + window.scrollY;
        cTop = bottom - card.height;
        // shift a little further to leave some margin between card and element boundary
        cTop -= CARD_MARGIN;
        // pointer should be shifted downwards to align with card's bottom
        pTop = card.height;
        pDir = Direction.DOWN;
      }
      setCardTop(cTop);
      setPointerTop(pTop);
      setPointerDir(pDir);

      let cLeft = elem.left;
      let pLeft = elem.width / 2;
      if (cLeft + card.width > window.innerWidth) {
        // shift card leftwards by the amount it went out of screen
        let shiftBy = cLeft + card.width - window.innerWidth;
        // shift a little further to leave some margin between card and window boundary
        shiftBy += CARD_MARGIN;
        cLeft -= shiftBy;

        // shift pointer rightwards by same amount so as to position it back correctly
        pLeft += shiftBy;
      }
      setCardLeft(cLeft);
      setPointerLeft(pLeft);
    }
  }, [isVisible, cardRef, element]);

  return { cardLeft, cardTop, pointerLeft, pointerTop, pointerDir };
}

const Animate = styled(m.div)`
  @media print {
    display: none;
  }
`;

const Position = styled.div<{ fixed?: boolean; top?: number; left?: number }>`
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  z-index: ${depths.hoverPreview};
  display: flex;
  max-height: 75%;

  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
`;

const Pointer = styled.div<{ top: number; left: number; direction: Direction }>`
  top: ${(props) => props.top}px;
  left: ${(props) => props.left}px;
  width: ${POINTER_WIDTH}px;
  height: ${POINTER_HEIGHT}px;
  position: absolute;
  transform: translateX(-50%);
  pointer-events: none;

  &:before,
  &:after {
    content: "";
    display: inline-block;
    position: absolute;
    ${({ direction }) => (direction === Direction.UP ? "bottom: 0" : "top: 0")};
    ${({ direction }) => (direction === Direction.UP ? "right: 0" : "left: 0")};
  }

  &:before {
    border: 8px solid transparent;
    ${({ direction, theme }) =>
      direction === Direction.UP
        ? `border-bottom-color: ${theme.menuBorder || "rgba(0, 0, 0, 0.1)"}`
        : `border-top-color: ${theme.menuBorder || "rgba(0, 0, 0, 0.1)"}`};
    ${({ direction }) =>
      direction === Direction.UP ? "right: -1px" : "left: -1px"};
  }

  &:after {
    border: 7px solid transparent;
    ${({ direction, theme }) =>
      direction === Direction.UP
        ? `border-bottom-color: ${theme.menuBackground}`
        : `border-top-color: ${theme.menuBackground}`};
  }
`;

export default HoverPreview;
