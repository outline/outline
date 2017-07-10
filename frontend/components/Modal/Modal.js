// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';
import { modalFadeIn } from 'styles/animations';

import CloseIcon from '../Icon/CloseIcon';
import Flex from '../Flex';

class Modal extends Component {
  render() {
    const {
      children,
      title = 'Untitled Modal',
      onRequestClose,
      ...rest
    } = this.props;

    return (
      <StyledModal
        contentLabel={title}
        onRequestClose={onRequestClose}
        {...rest}
      >
        <Content column>
          <h1>{title}</h1>
          <Close onClick={onRequestClose}><CloseIcon /></Close>
          {children}
        </Content>
      </StyledModal>
    );
  }
}

const Content = styled(Flex)`
  width: 640px;
  max-width: 100%;
  position: relative;
`;

const StyledModal = styled(ReactModal)`
  animation: ${modalFadeIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-x: hidden;
  overflow-y: auto;
  background: white;
  padding: 15vh 2rem 2rem
`;

const Close = styled.a`
  position: fixed;
  top: 3rem;
  right: 3rem;
  opacity: .5;

  &:hover {
    opacity: 1;
  }
`;

export default Modal;
