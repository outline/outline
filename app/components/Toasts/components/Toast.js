// @flow
import { CheckboxIcon, InfoIcon, WarningIcon } from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import styled, { css } from "styled-components";
import { fadeAndScaleIn, pulse } from "shared/styles/animations";
import type { Toast as TToast } from "types";

type Props = {
  onRequestClose: () => void,
  closeAfterMs?: number,
  toast: TToast,
};

function Toast({ closeAfterMs = 3000, onRequestClose, toast }: Props) {
  const timeout = React.useRef();
  const [pulse, setPulse] = React.useState(false);
  const { action, type = "info", reoccurring } = toast;

  React.useEffect(() => {
    timeout.current = setTimeout(onRequestClose, toast.timeout || closeAfterMs);

    return () => clearTimeout(timeout.current);
  }, [onRequestClose, toast, closeAfterMs]);

  React.useEffect(() => {
    if (reoccurring) {
      setPulse(reoccurring);

      // must match animation time in css below vvv
      setTimeout(() => setPulse(false), 250);
    }
  }, [reoccurring]);

  const message =
    typeof toast.message === "string"
      ? toast.message
      : toast.message.toString();

  return (
    <ListItem $pulse={pulse}>
      <Container
        onClick={action ? undefined : onRequestClose}
        type={toast.type || "success"}
      >
        {type === "info" && <InfoIcon color="currentColor" />}
        {type === "success" && <CheckboxIcon checked color="currentColor" />}
        {type === "warning" ||
          (type === "error" && <WarningIcon color="currentColor" />)}
        <Message>{message}</Message>
        {action && (
          <Action type={toast.type || "success"} onClick={action.onClick}>
            {action.text}
          </Action>
        )}
      </Container>
    </ListItem>
  );
}

const Action = styled.span`
  display: inline-block;
  padding: 10px 12px;
  height: 100%;
  text-transform: uppercase;
  font-size: 12px;
  color: ${(props) => props.theme.toastText};
  background: ${(props) => darken(0.05, props.theme.toastBackground)};
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;

  &:hover {
    background: ${(props) => darken(0.1, props.theme.toastBackground)};
  }
`;

const ListItem = styled.li`
  ${(props) =>
    props.$pulse &&
    css`
      animation: ${pulse} 250ms;
    `}
`;

const Container = styled.div`
  display: inline-flex;
  align-items: center;
  animation: ${fadeAndScaleIn} 100ms ease;
  margin: 8px 0;
  padding: 0 12px;
  color: ${(props) => props.theme.toastText};
  background: ${(props) => props.theme.toastBackground};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  &:hover {
    background: ${(props) => darken(0.05, props.theme.toastBackground)};
  }
`;

const Message = styled.div`
  display: inline-block;
  font-weight: 500;
  padding: 10px 4px;
`;

export default Toast;
