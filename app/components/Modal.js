// @flow
import { observer } from "mobx-react";
import { CloseIcon, BackIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import ReactModal from "react-modal";
import styled, { createGlobalStyle } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { fadeAndScaleIn } from "shared/styles/animations";
import Flex from "components/Flex";
import NudeButton from "components/NudeButton";
import Scrollable from "components/Scrollable";

ReactModal.setAppElement("#root");

type Props = {
  children?: React.Node,
  isOpen: boolean,
  title?: string,
  onRequestClose: () => void,
};

const GlobalStyles = createGlobalStyle`
  .ReactModal__Overlay {
    background-color: ${(props) =>
      transparentize(0.25, props.theme.background)} !important;
    z-index: ${(props) => props.theme.depths.modalOverlay};
  }

  ${breakpoint("tablet")`
    .ReactModalPortal + .ReactModalPortal,
    .ReactModalPortal + [data-react-modal-body-trap] + .ReactModalPortal {
      .ReactModal__Overlay {
        margin-left: 12px;
        box-shadow: 0 -2px 10px ${(props) => props.theme.shadow};
        border-radius: 8px 0 0 8px;
        overflow: hidden;
      }
    }

    .ReactModalPortal + .ReactModalPortal + .ReactModalPortal,
    .ReactModalPortal + .ReactModalPortal + [data-react-modal-body-trap] + .ReactModalPortal {
      .ReactModal__Overlay {
        margin-left: 24px;
      }
    }

    .ReactModalPortal + .ReactModalPortal + .ReactModalPortal + .ReactModalPortal,
    .ReactModalPortal + .ReactModalPortal + .ReactModalPortal + [data-react-modal-body-trap] + .ReactModalPortal {
      .ReactModal__Overlay {
        margin-left: 36px;
      }
    }
  `};

  .ReactModal__Body--open {
    overflow: hidden;
  }
`;

const Modal = ({
  children,
  isOpen,
  title = "Untitled",
  onRequestClose,
  ...rest
}: Props) => {
  if (!isOpen) return null;

  return (
    <>
      <GlobalStyles />
      <StyledModal
        contentLabel={title}
        onRequestClose={onRequestClose}
        isOpen={isOpen}
        {...rest}
      >
        <Content>
          <Centered onClick={(ev) => ev.stopPropagation()} column>
            {title && <h1>{title}</h1>}
            {children}
          </Centered>
        </Content>
        <Back onClick={onRequestClose}>
          <BackIcon size={32} color="currentColor" />
          <Text>Back</Text>
        </Back>
        <Close onClick={onRequestClose}>
          <CloseIcon size={32} color="currentColor" />
        </Close>
      </StyledModal>
    </>
  );
};

const Content = styled(Scrollable)`
  width: 100%;
  padding: 8vh 2rem 2rem;

  ${breakpoint("tablet")`
    padding-top: 13vh;
  `};
`;

const Centered = styled(Flex)`
  width: 640px;
  max-width: 100%;
  position: relative;
  margin: 0 auto;
`;

const StyledModal = styled(ReactModal)`
  animation: ${fadeAndScaleIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: ${(props) => props.theme.depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  outline: none;
`;

const Text = styled.span`
  font-size: 16px;
  font-weight: 500;
  padding-right: 12px;
  user-select: none;
`;

const Close = styled(NudeButton)`
  position: absolute;
  display: block;
  top: 0;
  right: 0;
  margin: 12px;
  opacity: 0.75;
  color: ${(props) => props.theme.text};
  width: auto;
  height: auto;

  &:hover {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: none;
  `};
`;

const Back = styled(NudeButton)`
  position: absolute;
  display: none;
  align-items: center;
  top: 2rem;
  left: 2rem;
  opacity: 0.75;
  color: ${(props) => props.theme.text};
  width: auto;
  height: auto;

  &:hover {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

export default observer(Modal);
