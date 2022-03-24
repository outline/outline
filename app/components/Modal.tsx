import { observer } from "mobx-react";
import { CloseIcon, BackIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import usePrevious from "~/hooks/usePrevious";
import useUnmount from "~/hooks/useUnmount";
import { fadeAndScaleIn } from "~/styles/animations";

let openModals = 0;
type Props = {
  isOpen: boolean;
  title?: React.ReactNode;
  onRequestClose: () => void;
};

const Modal: React.FC<Props> = ({
  children,
  isOpen,
  title = "Untitled",
  onRequestClose,
}) => {
  const dialog = useDialogState({
    animated: 250,
  });
  const [depth, setDepth] = React.useState(0);
  const wasOpen = usePrevious(isOpen);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!wasOpen && isOpen) {
      setDepth(openModals++);
      dialog.show();
    }

    if (wasOpen && !isOpen) {
      setDepth(openModals--);
      dialog.hide();
    }
  }, [dialog, wasOpen, isOpen]);

  useUnmount(() => {
    if (isOpen) {
      openModals--;
    }
  });

  if (!isOpen && !wasOpen) {
    return null;
  }

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            preventBodyScroll
            hideOnEsc
            hideOnClickOutside={false}
            hide={onRequestClose}
          >
            {(props) => (
              <Scene
                $nested={!!depth}
                style={{
                  marginLeft: `${depth * 12}px`,
                }}
                {...props}
              >
                <Content>
                  <Centered onClick={(ev) => ev.stopPropagation()} column>
                    {title && <h1>{title}</h1>}
                    {children}
                  </Centered>
                </Content>
                <Back onClick={onRequestClose}>
                  <BackIcon size={32} color="currentColor" />
                  <Text>{t("Back")}</Text>
                </Back>
                <Close onClick={onRequestClose}>
                  <CloseIcon size={32} color="currentColor" />
                </Close>
              </Scene>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
};

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    transparentize(0.25, props.theme.background)} !important;
  z-index: ${(props) => props.theme.depths.modalOverlay};
  transition: opacity 50ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

const Scene = styled.div<{ $nested: boolean }>`
  animation: ${fadeAndScaleIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${(props) => props.theme.depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  outline: none;

  ${breakpoint("tablet")`
  ${(props: any) =>
    props.$nested &&
    `
      box-shadow: 0 -2px 10px ${props.theme.shadow};
      border-radius: 8px 0 0 8px;
      overflow: hidden;
  `}
`}
`;

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
