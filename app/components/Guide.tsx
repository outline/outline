import * as Dialog from "@radix-ui/react-dialog";
import * as React from "react";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";

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
        <StyledContent
          onEscapeKeyDown={onRequestClose}
          aria-describedby={undefined}
        >
          <Scene {...rest}>
            <Content>
              {title && <Header>{title}</Header>}
              {children}
            </Content>
          </Scene>
        </StyledContent>
      </StyledOverlay>
    </Dialog.Portal>
  </Dialog.Root>
);

const Header = styled.h1`
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
  transition: opacity 200ms ease-in-out;
  opacity: 0;

  &[data-state="open"] {
    opacity: 1;
  }
`;

const StyledContent = styled(Dialog.Content)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: 12px;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 350px;
  background: ${s("background")};
  border-radius: 8px;
  outline: none;
  opacity: 0;
  transform: translateX(16px);
  transition: transform 250ms ease, opacity 250ms ease;

  &[data-state="open"] {
    opacity: 1;
    transform: translateX(0px);
  }
`;

const Scene = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const Content = styled(Scrollable)`
  width: 100%;
  padding: 16px;
`;

export default Guide;
