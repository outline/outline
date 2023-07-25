import { m } from "framer-motion";
import { transparentize } from "polished";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { UnfurlType } from "@shared/types";
import LoadingIndicator from "~/components/LoadingIndicator";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import HoverPreviewDocument from "./HoverPreviewDocument";
import HoverPreviewMention from "./HoverPreviewMention";

const DELAY_OPEN = 300;
const DELAY_CLOSE = 600;
const CARD_PADDING = 16;
const CARD_MAX_WIDTH = 375;

type Props = {
  /* The HTML element that is being hovered over */
  element: HTMLAnchorElement;
  /* A callback on close of the hover preview */
  onClose: () => void;
};

function HoverPreviewInternal({ element, onClose }: Props) {
  const url = element.href || element.dataset.url;
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const timerOpen = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const stores = useStores();

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

  const stopCloseTimer = () => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
      timerClose.current = undefined;
    }
  };

  const startOpenTimer = () => {
    if (!timerOpen.current) {
      timerOpen.current = setTimeout(() => setVisible(true), DELAY_OPEN);
    }
  };

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
  }, [element, startCloseTimer, data]);

  const elemBounds = element.getBoundingClientRect();
  const cardBounds = cardRef.current?.getBoundingClientRect();
  const left = cardBounds
    ? Math.min(
        elemBounds.left,
        window.innerWidth - CARD_PADDING - CARD_MAX_WIDTH
      )
    : elemBounds.left;
  const leftOffset = elemBounds.left - left;

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!data) {
    return null;
  }

  return (
    <Portal>
      <Position
        top={elemBounds.bottom + window.scrollY}
        left={left}
        aria-hidden
      >
        <div ref={cardRef}>
          {isVisible ? (
            <Animate
              initial={{ opacity: 0, y: -20, pointerEvents: "none" }}
              animate={{ opacity: 1, y: 0, pointerEvents: "auto" }}
            >
              <Card fadeOut={data.type !== UnfurlType.Mention}>
                <CardContent>
                  {data.type === UnfurlType.Mention ? (
                    <HoverPreviewMention
                      url={data.thumbnailUrl}
                      title={data.title}
                      description={data.description}
                      color={data.meta.color}
                    />
                  ) : data.type === UnfurlType.Document ? (
                    <HoverPreviewDocument
                      id={data.meta.id}
                      url={data.url}
                      title={data.title}
                      description={data.description}
                      summary={data.meta.summary}
                    />
                  ) : null}
                </CardContent>
              </Card>
              <Pointer offset={leftOffset + elemBounds.width / 2} />
            </Animate>
          ) : null}
        </div>
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

const CardContent = styled.div`
  overflow: hidden;
  max-height: 20em;
  user-select: none;
`;

// &:after — gradient mask for overflow text
const Card = styled.div<{ fadeOut?: boolean }>`
  backdrop-filter: blur(10px);
  background: ${(props) => props.theme.menuBackground};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  padding: ${CARD_PADDING}px;
  min-width: 350px;
  max-width: ${CARD_MAX_WIDTH}px;
  font-size: 0.9em;
  position: relative;

  .placeholder,
  .heading-anchor {
    display: none;
  }

  // fills the gap between the card and pointer to avoid a dead zone
  &::before {
    content: "";
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 10px;
  }

  ${(props) =>
    props.fadeOut !== false
      ? `&:after {
          content: "";
          display: block;
          position: absolute;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            ${transparentize(1, props.theme.menuBackground)} 0%,
            ${transparentize(1, props.theme.menuBackground)} 75%,
            ${props.theme.menuBackground} 90%
          );
          bottom: 0;
          left: 0;
          right: 0;
          height: 1.7em;
          border-bottom: 16px solid ${props.theme.menuBackground};
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }`
      : ""}
`;

const Position = styled.div<{ fixed?: boolean; top?: number; left?: number }>`
  margin-top: 10px;
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  z-index: ${depths.hoverPreview};
  display: flex;
  max-height: 75%;

  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
`;

const Pointer = styled.div<{ offset: number }>`
  top: -22px;
  left: ${(props) => props.offset}px;
  width: 22px;
  height: 22px;
  position: absolute;
  transform: translateX(-50%);
  pointer-events: none;

  &:before,
  &:after {
    content: "";
    display: inline-block;
    position: absolute;
    bottom: 0;
    right: 0;
  }

  &:before {
    border: 8px solid transparent;
    border-bottom-color: ${(props) =>
      props.theme.menuBorder || "rgba(0, 0, 0, 0.1)"};
    right: -1px;
  }

  &:after {
    border: 7px solid transparent;
    border-bottom-color: ${s("menuBackground")};
  }
`;

export default HoverPreview;
