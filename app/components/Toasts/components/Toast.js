// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import { darken } from 'polished';
import { color } from 'shared/styles/constants';
import { fadeAndScaleIn } from 'shared/styles/animations';

type Props = {
  onRequestClose: () => void,
  closeAfterMs: number,
  message: string,
  type: 'warning' | 'error' | 'info',
};

class Toast extends Component {
  timeout: number;
  props: Props;

  static defaultProps = {
    closeAfterMs: 3000,
    type: 'warning',
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
    const { type, onRequestClose, message } = this.props;

    return (
      <Container onClick={onRequestClose} type={type}>
        <Message>{message}</Message>
      </Container>
    );
  }
}

const Container = styled.li`
  display: flex;
  align-items: center;
  animation: ${fadeAndScaleIn} 100ms ease;
  margin: 8px 0;
  padding: 8px;
  color: ${color.white};
  background: ${props => color[props.type]};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  &:hover {
    background: ${props => darken(0.05, color[props.type])};
  }
`;

const Message = styled.div`
  padding-left: 5px;
`;

export default Toast;
