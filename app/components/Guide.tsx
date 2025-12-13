import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import {
  fadeIn,
  fadeOut,
  fadeInAndSlideLeft,
  fadeOutAndSlideRight,
} from "~/styles/animations";

type Props = {
  children?: React.ReactNode;
  isOpen: boolean;
  title?: string;
  onRequestClose: () => void;
};

const Guide: React.FC<Props> = ({
  children,
  isOpen,
  title = "Untitled",
  onRequestClose,
  ...rest
}: Props) => (
  <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onRequestClose()}>
    <Dialog.Portal>
      <StyledOverlay>
        <Scene
          onEscapeKeyDown={onRequestClose}
          onPointerDownOutside={onRequestClose}
          aria-describedby={undefined}
          {...rest}
        >
          <Content>
            {title && <Header>{title}</Header>}
            {children}
          </Content>
        </Scene>
      </StyledOverlay>
    </Dialog.Portal>
  </Dialog.Root>
);

const Header = styled(Dialog.Title)`
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 1em;
`;

const StyledOverlay = styled(Dialog.Overlay)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${s("backdrop")} !important;
  z-index: ${depths.overlay};

  &[data-state="open"] {
    animation: ${fadeIn} 200ms ease;
  }

  &[data-state="closed"] {
    animation: ${fadeOut} 200ms ease;
  }
`;

const Scene = styled(Dialog.Content)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: 12px;
  display: flex;
  z-index: ${depths.modal};
  justify-content: center;
  align-items: flex-start;
  width: 350px;
  background: ${s("background")};
  border-radius: 8px;
  outline: none;

  &[data-state="open"] {
    animation: ${fadeInAndSlideLeft} 200ms ease;
  }

  &[data-state="closed"] {
    animation: ${fadeOutAndSlideRight} 200ms ease;
  }
`;

const Content = styled(Scrollable)`
  width: 100%;
  padding: 16px;
`;

export default Guide;
