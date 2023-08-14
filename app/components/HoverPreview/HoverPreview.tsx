import { m } from "framer-motion";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
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

const DELAY_OPEN = 300;
const DELAY_CLOSE = 600;

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
  const [cardLeft, setCardLeft] = React.useState(0);
  const [cardTop, setCardTop] = React.useState(0);
  const [pointerOffset, setPointerOffset] = React.useState(0);

  React.useLayoutEffect(() => {
    if (isVisible && cardRef.current) {
      const elem = element.getBoundingClientRect();
      const card = cardRef.current.getBoundingClientRect();

      const top = elem.bottom + window.scrollY;
      setCardTop(top);

      let left = elem.left;
      let pointerOffset = elem.width / 2;
      if (left + card.width > window.innerWidth) {
        // shift card leftwards by the amount it went out of screen
        let shiftBy = left + card.width - window.innerWidth;
        // shift a littler further to leave some margin between card and window boundary
        shiftBy += CARD_MARGIN;
        left -= shiftBy;

        // shift pointer rightwards by same amount so as to position it back correctly
        pointerOffset += shiftBy;
      }
      setCardLeft(left);

      setPointerOffset(pointerOffset);
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
            <Pointer offset={pointerOffset} />
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
