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
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { CARD_MARGIN } from "./Components";
import HoverPreviewDocument from "./HoverPreviewDocument";
import HoverPreviewLink from "./HoverPreviewLink";
import HoverPreviewMention from "./HoverPreviewMention";

const DELAY_OPEN = 500;
const DELAY_CLOSE = 600;

type Props = {
  /** The HTML element that is being hovered over */
  element: HTMLAnchorElement;
  /** A callback on close of the hover preview */
  onClose: () => void;
};

enum Direction {
  UP,
  DOWN,
}

const POINTER_HEIGHT = 22;
const POINTER_WIDTH = 22;

function HoverPreviewInternal({ element, onClose }: Props) {
  const url = element.href || element.dataset.url;
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const timerOpen = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const stores = useStores();
  const [cardLeft, setCardLeft] = React.useState(0);
  const [cardTop, setCardTop] = React.useState(0);
  const [pointerLeft, setPointerLeft] = React.useState(0);
  const [pointerTop, setPointerTop] = React.useState(0);
  const [pointerDir, setPointerDir] = React.useState(Direction.UP);

  React.useLayoutEffect(() => {
    if (isVisible && cardRef.current) {
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
  }, [isVisible, element]);

  const { data, request, loading } = useRequest(
    React.useCallback(
      () =>
        client.post("/urls.unfurl", {
          url,
          documentId: stores.ui.activeDocumentId,
        }),
      [url, stores.ui.activeDocumentId]
    )
  );

  React.useEffect(() => {
    if (url) {
      stopOpenTimer();
      setVisible(false);

      void request();
    }
  }, [url, request]);

  const stopOpenTimer = () => {
    if (timerOpen.current) {
      clearTimeout(timerOpen.current);
      timerOpen.current = undefined;
    }
  };

  const closePreview = React.useCallback(() => {
    if (isVisible) {
      stopOpenTimer();
      setVisible(false);
      onClose();
    }
  }, [isVisible, onClose]);

  useOnClickOutside(cardRef, closePreview);
  useKeyDown("Escape", closePreview);
  useEventListener("scroll", closePreview, window, { capture: true });

  const stopCloseTimer = React.useCallback(() => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
      timerClose.current = undefined;
    }
  }, []);

  const startOpenTimer = React.useCallback(() => {
    if (!timerOpen.current) {
      timerOpen.current = setTimeout(() => setVisible(true), DELAY_OPEN);
    }
  }, []);

  const startCloseTimer = React.useCallback(() => {
    stopOpenTimer();
    timerClose.current = setTimeout(closePreview, DELAY_CLOSE);
  }, [closePreview]);

  React.useEffect(() => {
    const card = cardRef.current;

    if (data) {
      startOpenTimer();

      if (card) {
        card.addEventListener("mouseenter", stopCloseTimer);
        card.addEventListener("mouseleave", startCloseTimer);
      }

      element.addEventListener("mouseout", startCloseTimer);
      element.addEventListener("mouseover", stopCloseTimer);
      element.addEventListener("mouseover", startOpenTimer);
    }

    return () => {
      element.removeEventListener("mouseout", startCloseTimer);
      element.removeEventListener("mouseover", stopCloseTimer);
      element.removeEventListener("mouseover", startOpenTimer);

      if (card) {
        card.removeEventListener("mouseenter", stopCloseTimer);
        card.removeEventListener("mouseleave", startCloseTimer);
      }

      stopCloseTimer();
    };
  }, [element, startCloseTimer, data, startOpenTimer, stopCloseTimer]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!data) {
    return null;
  }

  return (
    <Portal>
      <Position top={cardTop} left={cardLeft} aria-hidden>
        {isVisible ? (
          <Animate
            initial={{ opacity: 0, y: -20, pointerEvents: "none" }}
            animate={{ opacity: 1, y: 0, pointerEvents: "auto" }}
          >
            {data.type === UnfurlType.Mention ? (
              <HoverPreviewMention
                ref={cardRef}
                url={data.thumbnailUrl}
                title={data.title}
                info={data.meta.info}
                color={data.meta.color}
              />
            ) : data.type === UnfurlType.Document ? (
              <HoverPreviewDocument
                ref={cardRef}
                id={data.meta.id}
                url={data.url}
                title={data.title}
                description={data.description}
                info={data.meta.info}
              />
            ) : (
              <HoverPreviewLink
                ref={cardRef}
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
        ) : null}
      </Position>
    </Portal>
  );
}

function HoverPreview({ element, ...rest }: Props) {
  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  return <HoverPreviewInternal {...rest} element={element} />;
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
