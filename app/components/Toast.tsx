import { CheckboxIcon, InfoIcon, WarningIcon } from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { fadeAndScaleIn, pulse } from "~/styles/animations";
import { Toast as TToast } from "~/types";
import Spinner from "./Spinner";

type Props = {
  onRequestClose: () => void;
  closeAfterMs?: number;
  toast: TToast;
};

function Toast({ closeAfterMs = 3000, onRequestClose, toast }: Props) {
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const [pulse, setPulse] = React.useState(false);
  const { action, type = "info", reoccurring } = toast;

  React.useEffect(() => {
    if (toast.timeout !== 0) {
      timeout.current = setTimeout(
        onRequestClose,
        toast.timeout || closeAfterMs
      );
    }
    return () => timeout.current && clearTimeout(timeout.current);
  }, [onRequestClose, toast, closeAfterMs]);

  React.useEffect(() => {
    if (reoccurring) {
      setPulse(!!reoccurring);
      // must match animation time in css below vvv
      setTimeout(() => setPulse(false), 250);
    }
  }, [reoccurring]);

  const handlePause = React.useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }, []);

  const handleResume = React.useCallback(() => {
    if (timeout.current && toast.timeout !== 0) {
      timeout.current = setTimeout(
        onRequestClose,
        toast.timeout || closeAfterMs
      );
    }
  }, [onRequestClose, toast, closeAfterMs]);

  return (
    <ListItem
      $pulse={pulse}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <Container onClick={action ? undefined : onRequestClose}>
        {type === "loading" && <Spinner />}
        {type === "info" && <InfoIcon />}
        {type === "success" && <CheckboxIcon checked />}
        {(type === "warning" || type === "error") && <WarningIcon />}
        <Message>{toast.message}</Message>
        {action && <Action onClick={action.onClick}>{action.text}</Action>}
      </Container>
    </ListItem>
  );
}

const Action = styled.span`
  display: inline-block;
  padding: 4px 8px;
  color: ${s("toastText")};
  background: ${(props) => darken(0.05, props.theme.toastBackground)};
  border-radius: 4px;
  margin-left: 8px;
  margin-right: -4px;
  font-weight: 500;
  user-select: none;

  &:hover {
    background: ${(props) => darken(0.1, props.theme.toastBackground)};
  }
`;

const ListItem = styled.li<{ $pulse?: boolean }>`
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
  color: ${s("toastText")};
  background: ${s("toastBackground")};
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
  user-select: none;
`;

export default Toast;
