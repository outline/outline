import { inject } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'reac... Remove this comment to see the full error message
import { Portal } from "react-portal";
import styled from "styled-components";
import parseDocumentSlug from "shared/utils/parseDocumentSlug";
import DocumentsStore from "stores/DocumentsStore";
import HoverPreviewDocument from "components/HoverPreviewDocument";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'styles/animations' or its corr... Remove this comment to see the full error message
import { fadeAndSlideDown } from "styles/animations";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/urls' or its correspondi... Remove this comment to see the full error message
import { isInternalUrl } from "utils/urls";

const DELAY_OPEN = 300;
const DELAY_CLOSE = 300;
type Props = {
  node: HTMLAnchorElement;
  event: MouseEvent;
  documents: DocumentsStore;
  onClose: () => void;
};

function HoverPreviewInternal({ node, documents, onClose, event }: Props) {
  const slug = parseDocumentSlug(node.href);
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef();
  const timerOpen = React.useRef();
  const cardRef = React.useRef<HTMLDivElement | null | undefined>();

  const startCloseTimer = () => {
    stopOpenTimer();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Timeout' is not assignable to type 'undefine... Remove this comment to see the full error message
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
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Timeout' is not assignable to type 'undefine... Remove this comment to see the full error message
    timerOpen.current = setTimeout(() => setVisible(true), DELAY_OPEN);
  };

  const stopOpenTimer = () => {
    if (timerOpen.current) {
      clearTimeout(timerOpen.current);
    }
  };

  React.useEffect(() => {
    if (slug) {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
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
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        top={anchorBounds.bottom + window.scrollY}
        left={left}
        aria-hidden
      >
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'MutableRefObject<HTMLDivElement | null | und... Remove this comment to see the full error message
        <div ref={cardRef}>
          <HoverPreviewDocument url={node.href}>
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'content' implicitly has an 'any' type.
            {(content) =>
              isVisible ? (
                <Animate>
                  <Card>
                    <Margin />
                    <CardContent>{content}</CardContent>
                  </Card>
                  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
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
  max-height: 350px;
  user-select: none;
`;
// &:after — gradient mask for overflow text
const Card = styled.div`
  backdrop-filter: blur(10px);
  background: ${(props) => props.theme.background};
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
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'fixed' does not exist on type 'Pick<Deta... Remove this comment to see the full error message
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  z-index: ${(props) => props.theme.depths.hoverPreview};
  display: flex;
  max-height: 75%;

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'top' does not exist on type 'Pick<Detail... Remove this comment to see the full error message
  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'left' does not exist on type 'Pick<Detai... Remove this comment to see the full error message
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
`;
const Pointer = styled.div`
  top: -22px;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'offset' does not exist on type 'ThemedSt... Remove this comment to see the full error message
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
