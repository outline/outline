// @flow
import React from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';
import { color } from 'styles/constants';
import { fadeAndScaleIn } from 'styles/animations';
import Icon from 'components/Icon';
import Flex from 'components/Flex';

type Props = {
  children?: React$Element<any>,
  isOpen: boolean,
  title?: string,
  onRequestClose: () => void,
};

const Modal = ({
  children,
  isOpen,
  title = 'Untitled Modal',
  onRequestClose,
  ...rest
}: Props) => {
  if (!isOpen) return null;

  return (
    <StyledModal
      contentLabel={title}
      onRequestClose={onRequestClose}
      isOpen={isOpen}
      {...rest}
    >
      <Content column>
        {title && <h1>{title}</h1>}
        <Close onClick={onRequestClose}><Icon type="X" size={32} /></Close>
        {children}
      </Content>
    </StyledModal>
  );
};

const Content = styled(Flex)`
  width: 640px;
  max-width: 100%;
  position: relative;
`;

const StyledModal = styled(ReactModal)`
  animation: ${fadeAndScaleIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 100;
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
  color: ${color.text};

  &:hover {
    opacity: 1;
  }
`;

export default Modal;
