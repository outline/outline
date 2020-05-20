// @flow
import * as React from 'react';
import styled from 'styled-components';
import { darken } from 'polished';
import { fadeAndScaleIn } from 'shared/styles/animations';
import type { Toast as TToast } from '../../../types';

type Props = {
  onRequestClose: () => void,
  closeAfterMs: number,
  toast: TToast,
};

class Toast extends React.Component<Props> {
  timeout: TimeoutID;

  static defaultProps = {
    closeAfterMs: 3000,
  };

  componentDidMount() {
    this.timeout = setTimeout(
      this.props.onRequestClose,
      this.props.toast.timeout || this.props.closeAfterMs
    );
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    const { toast, onRequestClose } = this.props;
    const { action } = toast;
    const message =
      typeof toast.message === 'string'
        ? toast.message
        : toast.message.toString();

    return (
      <li>
        <Container
          onClick={action ? undefined : onRequestClose}
          type={toast.type || 'success'}
        >
          <Message>{message}</Message>
          {action && (
            <Action type={toast.type || 'success'} onClick={action.onClick}>
              {action.text}
            </Action>
          )}
        </Container>
      </li>
    );
  }
}

const Action = styled.span`
  display: inline-block;
  padding: 10px 12px;
  height: 100%;
  text-transform: uppercase;
  font-size: 12px;
  color: ${props => props.theme.toastText};
  background: ${props => darken(0.05, props.theme.toastBackground)};
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;

  &:hover {
    background: ${props => darken(0.1, props.theme.toastBackground)};
  }
`;

const Container = styled.div`
  display: inline-block;
  align-items: center;
  animation: ${fadeAndScaleIn} 100ms ease;
  margin: 8px 0;
  color: ${props => props.theme.toastText};
  background: ${props => props.theme.toastBackground};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  &:hover {
    background: ${props => darken(0.05, props.theme.toastBackground)};
  }
`;

const Message = styled.div`
  display: inline-block;
  padding: 10px 12px;
`;

export default Toast;
