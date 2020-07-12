// @flow
import * as React from "react";
import { rgba } from "polished";
import { inject, observer } from "mobx-react";
import styled from "styled-components";
import { Portal } from "react-portal";
import DocumentsStore from "stores/DocumentsStore";

type Props = {
  node: HTMLAnchorElement,
  event: MouseEvent,
  documents: DocumentsStore,
  onClose: () => void,
};

function HoverPreview({ node, onClose, event }: Props) {
  const bounds = node.getBoundingClientRect();

  // $FlowFixMe
  const timer = React.useRef(null);

  // $FlowFixMe
  const cardRef = React.useRef(null);

  const startCloseTimer = () => {
    timer.current = setTimeout(onClose, 1000);
  };

  const stopCloseTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  };

  // $FlowFixMe
  React.useEffect(
    () => {
      node.addEventListener("mouseout", startCloseTimer, {
        passive: true,
        once: true,
      });

      cardRef.current.addEventListener("mouseover", stopCloseTimer);
      cardRef.current.addEventListener("mouseout", startCloseTimer);

      return () => {
        cardRef.current.removeEventListener("mouseover", stopCloseTimer);
        cardRef.current.removeEventListener("mouseout", startCloseTimer);

        if (timer.current) {
          clearTimeout(timer.current);
        }
      };
    },
    [node]
  );

  return (
    <Portal>
      <Position top={bounds.bottom + window.scrollY} left={event.clientX}>
        <Card ref={cardRef}>
          <p>{node.href}</p>
        </Card>
      </Position>
    </Portal>
  );
}

const Card = styled.div`
  backdrop-filter: blur(10px);
  background: red;
  border: ${props =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  border-radius: 4px;
  padding: 16px;
  width: 300px;
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

export default HoverPreview;
