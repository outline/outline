import * as React from "react";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import usePrevious from "~/hooks/usePrevious";

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
}: Props) => {
  const dialog = useDialogState({
    animated: 250,
  });
  const wasOpen = usePrevious(isOpen);

  React.useEffect(() => {
    if (!wasOpen && isOpen) {
      dialog.show();
    }

    if (wasOpen && !isOpen) {
      dialog.hide();
    }
  }, [dialog, wasOpen, isOpen]);

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            aria-label={title}
            preventBodyScroll
            hideOnEsc
            hide={onRequestClose}
          >
            {(props) => (
              <Scene {...props} {...rest}>
                <Content>
                  {title && <Header>{title}</Header>}
                  {children}
                </Content>
              </Scene>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
};

const Header = styled.h1`
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 1em;
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${s("backdrop")} !important;
  z-index: ${depths.modalOverlay};
  transition: opacity 200ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

const Scene = styled.div`
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

  &[data-enter] {
    opacity: 1;
    transform: translateX(0px);
  }
`;

const Content = styled(Scrollable)`
  width: 100%;
  padding: 16px;
`;

export default Guide;
