import { transparentize } from "polished";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isExternalUrl } from "@shared/utils/urls";
import HoverPreviewDocument from "~/components/HoverPreviewDocument";
import useMobile from "~/hooks/useMobile";
import { fadeAndSlideDown } from "~/styles/animations";

const DELAY_OPEN = 300;
const DELAY_CLOSE = 300;

type Props = {
  /* The document associated with the editor, if any */
  id?: string;
  /* The HTML element that is being hovered over */
  element: HTMLAnchorElement;
  /* A callback on close of the hover preview */
  onClose: () => void;
};

function HoverPreviewInternal({ element, id, onClose }: Props) {
  const slug = parseDocumentSlug(element.href);
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const timerOpen = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement>(null);

  const startCloseTimer = () => {
    stopOpenTimer();
    timerClose.current = setTimeout(() => {
      if (isVisible) {
        setVisible(false);
      }
      onClose();
    }, DELAY_CLOSE);
  };

  const stopCloseTimer = () => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
    }
  };

  const startOpenTimer = () => {
    timerOpen.current = setTimeout(() => setVisible(true), DELAY_OPEN);
  };

  const stopOpenTimer = () => {
    if (timerOpen.current) {
      clearTimeout(timerOpen.current);
    }
  };

  React.useEffect(() => {
    startOpenTimer();

    if (cardRef.current) {
      cardRef.current.addEventListener("mouseenter", stopCloseTimer);
    }

    if (cardRef.current) {
      cardRef.current.addEventListener("mouseleave", startCloseTimer);
    }

    element.addEventListener("mouseout", startCloseTimer);
    element.addEventListener("mouseover", stopCloseTimer);
    element.addEventListener("mouseover", startOpenTimer);
    return () => {
      element.removeEventListener("mouseout", startCloseTimer);
      element.removeEventListener("mouseover", stopCloseTimer);
      element.removeEventListener("mouseover", startOpenTimer);

      if (cardRef.current) {
        cardRef.current.removeEventListener("mouseenter", stopCloseTimer);
      }

      if (cardRef.current) {
        cardRef.current.removeEventListener("mouseleave", startCloseTimer);
      }

      if (timerClose.current) {
        clearTimeout(timerClose.current);
      }
    };
  }, [element, slug]);

  const anchorBounds = element.getBoundingClientRect();
  const cardBounds = cardRef.current?.getBoundingClientRect();
  const left = cardBounds
    ? Math.min(anchorBounds.left, window.innerWidth - 16 - 350)
    : anchorBounds.left;
  const leftOffset = anchorBounds.left - left;

  return (
    <Portal>
      <Position
        top={anchorBounds.bottom + window.scrollY}
        left={left}
        aria-hidden
      >
        <div ref={cardRef}>
          <HoverPreviewDocument url={element.href} id={id}>
            {(content: React.ReactNode) =>
              isVisible ? (
                <Animate>
                  <Card>
                    <Margin />
                    <CardContent>{content}</CardContent>
                  </Card>
                  <Pointer offset={leftOffset + anchorBounds.width / 2} />
                </Animate>
              ) : null
            }
          </HoverPreviewDocument>
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

  // previews only work for internal doc links for now
  if (isExternalUrl(element.href)) {
    return null;
  }

  return <HoverPreviewInternal {...rest} element={element} />;
}

const Animate = styled.div`
  animation: ${fadeAndSlideDown} 150ms ease;

  @media print {
    display: none;
  }
`;

// fills the gap between the card and pointer to avoid a dead zone
const Margin = styled.div`
  position: absolute;
  top: -11px;
  left: 0;
  right: 0;
  height: 11px;
`;

const CardContent = styled.div`
  overflow: hidden;
  max-height: 20em;
  user-select: none;
`;

// &:after — gradient mask for overflow text
const Card = styled.div`
  backdrop-filter: blur(10px);
  background: ${s("background")};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  padding: 16px;
  width: 350px;
  font-size: 0.9em;
  position: relative;

  .placeholder,
  .heading-anchor {
    display: none;
  }

  &:after {
    content: "";
    display: block;
    position: absolute;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      ${(props) => transparentize(1, props.theme.background)} 0%,
      ${(props) => transparentize(1, props.theme.background)} 75%,
      ${s("background")} 90%
    );
    bottom: 0;
    left: 0;
    right: 0;
    height: 1.7em;
    border-bottom: 16px solid ${s("background")};
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
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
    border-bottom-color: ${s("background")};
  }
`;

export default HoverPreview;
