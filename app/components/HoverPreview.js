// @flow
import * as React from "react";
import { inject } from "mobx-react";
import Editor from "components/Editor";
import styled from "styled-components";
import { Portal } from "react-portal";
import { fadeAndScaleIn } from "shared/styles/animations";
import isInternalUrl from "utils/isInternalUrl";
import DocumentsStore from "stores/DocumentsStore";

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

  // $FlowFixMe
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef(null);
  const timerOpen = React.useRef(null);

  // $FlowFixMe
  const cardRef = React.useRef(null);

  const startCloseTimer = () => {
    stopOpenTimer();

    timerClose.current = setTimeout(() => {
      if (isVisible) setVisible(false);
      onClose();
    }, 1000);
  };

  const stopCloseTimer = () => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
    }
  };

  const startOpenTimer = () => {
    timerOpen.current = setTimeout(() => setVisible(true), 500);
  };

  const stopOpenTimer = () => {
    if (timerOpen.current) {
      clearTimeout(timerOpen.current);
    }
  };

  // $FlowFixMe
  React.useEffect(
    () => {
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

  let parsed;
  try {
    parsed = new URL(node.href);
  } catch (err) {
    // TODO
  }
  console.log(parsed);
  const document = parsed ? documents.getByUrl(parsed.pathname) : undefined;

  return (
    <Portal>
      <Position
        top={bounds.bottom + window.scrollY}
        left={event.clientX}
        aria-hidden
      >
        <div ref={cardRef}>
          {document &&
            isVisible && (
              <Card>
                <Heading>{document.title}</Heading>
                <Editor defaultValue={document.getSummary()} readOnly />
              </Card>
            )}
        </div>
      </Position>
    </Portal>
  );
}

const Heading = styled.h2`
  margin-top: 0;
`;

const Card = styled.div`
  animation: ${fadeAndScaleIn} 100ms ease;
  backdrop-filter: blur(10px);
  background: ${props => props.theme.background};
  border: ${props =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  padding: 16px;
  min-width: 300px;
  max-width: 20vw;
  font-size: 15px;
  overflow: hidden;
`;

const Position = styled.div`
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  display: flex;
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
  ${({ right }) => (right !== undefined ? `right: ${right}px` : "")};
  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ bottom }) => (bottom !== undefined ? `bottom: ${bottom}px` : "")};
  max-height: 75%;
  z-index: 1000;
  transform: ${props =>
    props.position === "center" ? "translateX(-50%)" : "initial"};
`;

export default inject("documents")(HoverPreview);
