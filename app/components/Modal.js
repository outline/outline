// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import styled, { createGlobalStyle } from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import ReactModal from 'react-modal';
import { transparentize } from 'polished';
import { CloseIcon } from 'outline-icons';
import { fadeAndScaleIn } from 'shared/styles/animations';
import Flex from 'shared/components/Flex';

ReactModal.setAppElement('#root');

type Props = {
  children?: React.Node,
  isOpen: boolean,
  title?: string,
  onRequestClose: () => *,
};

const GlobalStyles = createGlobalStyle`
  .ReactModal__Overlay {
    background-color: ${props =>
      transparentize(0.25, props.theme.background)} !important;
    z-index: 100;
  }

  .ReactModal__Body--open {
    overflow: hidden;
  }
`;

const Modal = ({
  children,
  isOpen,
  title = 'Untitled',
  onRequestClose,
  ...rest
}: Props) => {
  if (!isOpen) return null;

  return (
    <React.Fragment>
      <GlobalStyles />
      <StyledModal
        contentLabel={title}
        onRequestClose={onRequestClose}
        isOpen={isOpen}
        {...rest}
      >
        <Content column>
          {title && <h1>{title}</h1>}
          <Close onClick={onRequestClose}>
            <CloseIcon size={40} />
            <Esc>esc</Esc>
          </Close>
          {children}
        </Content>
      </StyledModal>
    </React.Fragment>
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
  background: ${props => props.theme.background};
  transition: ${props => props.theme.backgroundTransition};
  padding: 13vh 2rem 2rem;
  outline: none;
`;

const Esc = styled.span`
  display: block;
  text-align: center;
  margin-top: -10px;
  font-size: 13px;
`;

const Close = styled.a`
  position: fixed;
  top: 16px;
  right: 16px;
  opacity: 0.5;
  color: ${props => props.theme.textSecondary};

  &:hover {
    opacity: 1;
  }

  ${breakpoint('tablet')`
    top: 3rem;
    right: 3rem;
  `};
`;

export default observer(Modal);
