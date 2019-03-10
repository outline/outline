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
      this.props.closeAfterMs
    );
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    const { toast, onRequestClose } = this.props;
    const message =
      typeof toast.message === 'string'
        ? toast.message
        : toast.message.toString();

    return (
      <li>
        <Container onClick={onRequestClose} type={toast.type}>
          <Message>{message}</Message>
        </Container>
      </li>
    );
  }
}

const Container = styled.div`
  display: inline-block;
  align-items: center;
  animation: ${fadeAndScaleIn} 100ms ease;
  margin: 8px 0;
  padding: 10px 12px;
  color: ${props => props.theme.white};
  background: ${props => props.theme[props.type]};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  &:hover {
    background: ${props => darken(0.05, props.theme[props.type])};
  }
`;

const Message = styled.div`
  padding-left: 5px;
`;

export default Toast;
