import { m } from "framer-motion";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { UnfurlResourceType } from "@shared/types";
import useEventListener from "~/hooks/useEventListener";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import LoadingIndicator from "../LoadingIndicator";
import { CARD_MARGIN } from "./Components";
import HoverPreviewDocument from "./HoverPreviewDocument";
import HoverPreviewIssue from "./HoverPreviewIssue";
import HoverPreviewLink from "./HoverPreviewLink";
import HoverPreviewMention from "./HoverPreviewMention";
import HoverPreviewPullRequest from "./HoverPreviewPullRequest";

const DELAY_CLOSE = 500;
const POINTER_HEIGHT = 22;
const POINTER_WIDTH = 22;

type Props = {
  /** The HTML element that is being hovered over, or null if none. */
  element: HTMLElement | null;
  /** Data to be previewed */
  data: Record<string, any> | null;
  /** Whether the preview data is being loaded */
  dataLoading: boolean;
  /** A callback on close of the hover preview. */
  onClose: () => void;
};

enum Direction {
  UP,
  DOWN,
}

function HoverPreviewDesktop({ element, data, dataLoading, onClose }: Props) {
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement | null>(null);
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
    if (element && data && !dataLoading) {
      setVisible(true);
    } else {
      startCloseTimer();
    }
  }, [startCloseTimer, element, data, dataLoading]);

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

  if (dataLoading) {
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
            animate={{
              opacity: 1,
              y: 0,
              transitionEnd: { pointerEvents: "auto" },
            }}
          >
            {data.type === UnfurlResourceType.Mention ? (
              <HoverPreviewMention
                ref={cardRef}
                name={data.name}
                avatarUrl={data.avatarUrl}
                color={data.color}
                lastActive={data.lastActive}
                email={data.email}
              />
            ) : data.type === UnfurlResourceType.Document ? (
              <HoverPreviewDocument
                ref={cardRef}
                url={data.url}
                id={data.id}
                title={data.title}
                summary={data.summary}
                lastActivityByViewer={data.lastActivityByViewer}
              />
            ) : data.type === UnfurlResourceType.Issue ? (
              <HoverPreviewIssue
                ref={cardRef}
                url={data.url}
                id={data.id}
                title={data.title}
                description={data.description}
                author={data.author}
                labels={data.labels}
                state={data.state}
                createdAt={data.createdAt}
              />
            ) : data.type === UnfurlResourceType.PR ? (
              <HoverPreviewPullRequest
                ref={cardRef}
                url={data.url}
                id={data.id}
                title={data.title}
                description={data.description}
                author={data.author}
                createdAt={data.createdAt}
                state={data.state}
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

function HoverPreview({ element, data, dataLoading, ...rest }: Props) {
  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  return (
    <HoverPreviewDesktop
      {...rest}
      element={element}
      data={data}
      dataLoading={dataLoading}
    />
  );
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
