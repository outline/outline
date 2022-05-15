import { observer } from "mobx-react";
import { CloseIcon, BackIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled, { DefaultTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import useUnmount from "~/hooks/useUnmount";
import { fadeAndScaleIn } from "~/styles/animations";

let openModals = 0;
type Props = {
  isOpen: boolean;
  isCentered?: boolean;
  title?: React.ReactNode;
  onRequestClose: () => void;
};

const Modal: React.FC<Props> = ({
  children,
  isOpen,
  isCentered,
  title = "Untitled",
  onRequestClose,
}) => {
  const dialog = useDialogState({
    animated: 250,
  });
  const [depth, setDepth] = React.useState(0);
  const wasOpen = usePrevious(isOpen);
  const isMobile = useMobile();
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
        <Backdrop $isCentered={isCentered} {...props}>
          <Dialog
            {...dialog}
            aria-label={typeof title === "string" ? title : undefined}
            preventBodyScroll
            hideOnEsc
            hideOnClickOutside={!!isCentered}
            hide={onRequestClose}
          >
            {(props) =>
              isCentered && !isMobile ? (
                <Small {...props}>
                  <Centered
                    onClick={(ev) => ev.stopPropagation()}
                    column
                    reverse
                  >
                    <SmallContent shadow>{children}</SmallContent>
                    <Header>
                      {title && (
                        <Text as="span" size="large">
                          {title}
                        </Text>
                      )}
                      <Text as="span" size="large">
                        <NudeButton onClick={onRequestClose}>
                          <CloseIcon color="currentColor" />
                        </NudeButton>
                      </Text>
                    </Header>
                  </Centered>
                </Small>
              ) : (
                <Fullscreen
                  $nested={!!depth}
                  style={
                    isMobile
                      ? undefined
                      : {
                          marginLeft: `${depth * 12}px`,
                        }
                  }
                  {...props}
                >
                  <Content>
                    <Centered onClick={(ev) => ev.stopPropagation()} column>
                      {title && <h1>{title}</h1>}
                      {children}
                    </Centered>
                  </Content>
                  <Close onClick={onRequestClose}>
                    <CloseIcon size={32} color="currentColor" />
                  </Close>
                  <Back onClick={onRequestClose}>
                    <BackIcon size={32} color="currentColor" />
                    <Text as="span">{t("Back")} </Text>
                  </Back>
                </Fullscreen>
              )
            }
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
};

const Backdrop = styled(Flex)<{ $isCentered?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    props.$isCentered
      ? props.theme.modalBackdrop
      : transparentize(0.25, props.theme.background)} !important;
  z-index: ${depths.modalOverlay};
  transition: opacity 50ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

type FullscreenProps = {
  $nested: boolean;
  theme: DefaultTheme;
};

const Fullscreen = styled.div<FullscreenProps>`
  animation: ${fadeAndScaleIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  outline: none;

  ${breakpoint("tablet")`
  ${(props: FullscreenProps) =>
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
  padding: 8vh 32px;

  ${breakpoint("tablet")`
    padding: 13vh 2rem 2rem;
  `};
`;

const Centered = styled(Flex)`
  width: 640px;
  max-width: 100%;
  position: relative;
  margin: 0 auto;
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
  font-weight: 500;
  width: auto;
  height: auto;

  &:hover {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Header = styled(Flex)`
  color: ${(props) => props.theme.textSecondary};
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  padding: 24px 24px 4px;
`;

const Small = styled.div`
  animation: ${fadeAndScaleIn} 250ms ease;

  margin: auto auto;
  min-width: 350px;
  max-width: 30vw;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${(props) => props.theme.modalBackground};
  transition: ${(props) => props.theme.backgroundTransition};
  box-shadow: ${(props) => props.theme.modalShadow};
  border-radius: 8px;
  outline: none;

  ${NudeButton} {
    &:hover,
    &[aria-expanded="true"] {
      background: ${(props) => props.theme.sidebarControlHoverBackground};
    }
    vertical-align: middle;
  }

  ${Header} {
    align-items: start;
  }
`;

const SmallContent = styled(Scrollable)`
  padding: 12px 24px 24px;
`;

export default observer(Modal);
