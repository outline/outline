// @flow
import * as React from "react";
import { inject } from "mobx-react";
import { transparentize } from "polished";
import Editor from "components/Editor";
import styled from "styled-components";
import { Portal } from "react-portal";
import { fadeAndSlideIn } from "shared/styles/animations";
import isInternalUrl from "utils/isInternalUrl";
import { parseDocumentSlugFromUrl } from "shared/utils/parseDocumentIds";
import DocumentsStore from "stores/DocumentsStore";
import DocumentMeta from "components/DocumentMeta";

const DELAY_OPEN = 500;
const DELAY_CLOSE = 500;

type Props = {
  node: HTMLAnchorElement,
  event: MouseEvent,
  documents: DocumentsStore,
  onClose: () => void,
};

function HoverPreview({ node, documents, onClose, event }: Props) {
  const bounds = node.getBoundingClientRect();

  // previews only work for internal doc links for now
  if (!isInternalUrl(node.href)) {
    return null;
  }

  const slug = parseDocumentSlugFromUrl(node.href);

  // $FlowFixMe
  const [isVisible, setVisible] = React.useState(false);

  // $FlowFixMe
  const timerClose = React.useRef(null);

  // $FlowFixMe
  const timerOpen = React.useRef(null);

  // $FlowFixMe
  const cardRef = React.useRef(null);

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

  // $FlowFixMe
  React.useEffect(
    () => {
      if (slug) {
        documents.prefetchDocument(slug, {
          prefetch: true,
        });
      }

      startOpenTimer();

      node.addEventListener("mouseout", startCloseTimer, {
        passive: true,
        once: true,
      });

      cardRef.current.addEventListener("mouseover", stopCloseTimer);
      cardRef.current.addEventListener("mouseout", startCloseTimer);

      return () => {
        cardRef.current.removeEventListener("mouseover", stopCloseTimer);
        cardRef.current.removeEventListener("mouseout", startCloseTimer);

        if (timerClose.current) {
          clearTimeout(timerClose.current);
        }
      };
    },
    [node]
  );

  const document = slug ? documents.getByUrl(slug) : undefined;

  return (
    <Portal>
      <Position
        top={bounds.bottom + window.scrollY}
        left={event.clientX - 16}
        aria-hidden
      >
        <div ref={cardRef}>
          {document &&
            isVisible && (
              <Animate>
                <Card>
                  <Heading>{document.title}</Heading>
                  <DocumentMeta
                    isDraft={document.isDraft}
                    document={document}
                  />

                  <Editor
                    key={document.id}
                    defaultValue={document.getSummary()}
                    disableEmbeds
                    readOnly
                  />
                </Card>
                <Pointer />
              </Animate>
            )}
        </div>
      </Position>
    </Portal>
  );
}

const Animate = styled.div`
  animation: ${fadeAndSlideIn} 150ms ease;
`;

const Heading = styled.h2`
  margin: 0 0 0.75em;
`;

const Card = styled.div`
  backdrop-filter: blur(10px);
  background: ${props => props.theme.background};
  border: ${props =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  padding: 16px;
  min-width: 300px;
  max-width: 350px;
  max-height: 350px;
  font-size: 0.9em;
  overflow: hidden;
  position: relative;

  .placeholder {
    display: none;
  }

  &:after {
    content: "";
    display: block;
    position: absolute;
    background: linear-gradient(
      180deg,
      ${props => transparentize(1, props.theme.background)} 0%,
      ${props => props.theme.background} 90%
    );
    bottom: 0;
    left: 0;
    right: 0;
    height: 4em;
    border-bottom: 16px solid ${props => props.theme.background};
  }
`;

const Position = styled.div`
  margin-top: 10px;
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  display: flex;
  max-height: 75%;

  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
  ${({ right }) => (right !== undefined ? `right: ${right}px` : "")};
  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ bottom }) => (bottom !== undefined ? `bottom: ${bottom}px` : "")};
`;

const Pointer = styled.div`
  top: -21px;
  width: 22px;
  height: 22px;
  position: absolute;

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
    border-bottom-color: ${props =>
      props.theme.menuBorder || "rgba(0, 0, 0, 0.1)"};
    right: -1px;
  }

  &:after {
    border: 7px solid transparent;
    border-bottom-color: ${props => props.theme.background};
  }
`;

export default inject("documents")(HoverPreview);
