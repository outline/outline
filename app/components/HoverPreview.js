// @flow
import { inject } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import { Portal } from "react-portal";
import styled from "styled-components";
import { fadeAndSlideIn } from "shared/styles/animations";
import parseDocumentSlug from "shared/utils/parseDocumentSlug";
import DocumentsStore from "stores/DocumentsStore";
import HoverPreviewDocument from "components/HoverPreviewDocument";
import { isInternalUrl } from "utils/urls";

const DELAY_OPEN = 300;
const DELAY_CLOSE = 300;

type Props = {
  node: HTMLAnchorElement,
  event: MouseEvent,
  documents: DocumentsStore,
  onClose: () => void,
};

function HoverPreviewInternal({ node, documents, onClose, event }: Props) {
  const slug = parseDocumentSlug(node.href);

  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef();
  const timerOpen = React.useRef();
  const cardRef = React.useRef<?HTMLDivElement>();

  const startCloseTimer = () => {
    stopOpenTimer();
    timerClose.current = setTimeout(() => {
      if (isVisible) setVisible(false);
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
    if (slug) {
      documents.prefetchDocument(slug, {
        prefetch: true,
      });
    }

    startOpenTimer();

    if (cardRef.current) {
      cardRef.current.addEventListener("mouseenter", stopCloseTimer);
    }
    if (cardRef.current) {
      cardRef.current.addEventListener("mouseleave", startCloseTimer);
    }

    node.addEventListener("mouseout", startCloseTimer);
    node.addEventListener("mouseover", stopCloseTimer);
    node.addEventListener("mouseover", startOpenTimer);

    return () => {
      node.removeEventListener("mouseout", startCloseTimer);
      node.removeEventListener("mouseover", stopCloseTimer);
      node.removeEventListener("mouseover", startOpenTimer);

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
  }, [node]);

  const anchorBounds = node.getBoundingClientRect();
  const cardBounds = cardRef.current
    ? cardRef.current.getBoundingClientRect()
    : undefined;
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
          <HoverPreviewDocument url={node.href}>
            {(content) =>
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

function HoverPreview({ node, ...rest }: Props) {
  // previews only work for internal doc links for now
  if (!isInternalUrl(node.href)) {
    return null;
  }

  return <HoverPreviewInternal {...rest} node={node} />;
}

const Animate = styled.div`
  animation: ${fadeAndSlideIn} 150ms ease;

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
  max-height: 350px;
  user-select: none;
`;

// &:after — gradient mask for overflow text
const Card = styled.div`
  backdrop-filter: blur(10px);
  background: ${(props) => props.theme.background};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
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
      ${(props) => props.theme.background} 90%
    );
    bottom: 0;
    left: 0;
    right: 0;
    height: 1.7em;
    border-bottom: 16px solid ${(props) => props.theme.background};
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const Position = styled.div`
  margin-top: 10px;
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  z-index: ${(props) => props.theme.depths.hoverPreview};
  display: flex;
  max-height: 75%;

  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
`;

const Pointer = styled.div`
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
    border-bottom-color: ${(props) => props.theme.background};
  }
`;

export default inject("documents")(HoverPreview);
