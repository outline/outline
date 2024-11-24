import { observer } from "mobx-react";
import { CloseIcon, BackIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled, { DefaultTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import useUnmount from "~/hooks/useUnmount";
import { fadeAndScaleIn } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import ErrorBoundary from "./ErrorBoundary";

let openModals = 0;

type Props = {
  children?: React.ReactNode;
  isOpen: boolean;
  fullscreen?: boolean;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  onRequestClose: () => void;
};

const Modal: React.FC<Props> = ({
  children,
  isOpen,
  fullscreen = true,
  title = "Untitled",
  style,
  onRequestClose,
}: Props) => {
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
        <Backdrop $fullscreen={fullscreen} {...props}>
          <Dialog
            {...dialog}
            aria-label={typeof title === "string" ? title : undefined}
            preventBodyScroll
            hideOnEsc
            hideOnClickOutside={!fullscreen}
            hide={onRequestClose}
          >
            {(props) =>
              fullscreen || isMobile ? (
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
                      {title && (
                        <Text size="xlarge" weight="bold">
                          {title}
                        </Text>
                      )}
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </Centered>
                  </Content>
                  <Close onClick={onRequestClose}>
                    <CloseIcon size={32} />
                  </Close>
                  <Back onClick={onRequestClose}>
                    <BackIcon size={32} />
                    <Text>{t("Back")} </Text>
                  </Back>
                </Fullscreen>
              ) : (
                <Small {...props}>
                  <Centered
                    onClick={(ev) => ev.stopPropagation()}
                    column
                    reverse
                  >
                    <SmallContent style={style} shadow>
                      <ErrorBoundary component="div">{children}</ErrorBoundary>
                    </SmallContent>
                    <Header>
                      {title && <Text size="large">{title}</Text>}
                      <NudeButton onClick={onRequestClose}>
                        <CloseIcon />
                      </NudeButton>
                    </Header>
                  </Centered>
                </Small>
              )
            }
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
};

const Backdrop = styled(Flex)<{ $fullscreen?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    props.$fullscreen
      ? transparentize(0.25, props.theme.background)
      : props.theme.modalBackdrop} !important;
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
  background: ${s("background")};
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
  padding: 8vh 12px;

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
  color: ${s("text")};
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
  top: ${Desktop.hasInsetTitlebar() ? "3rem" : "2rem"};
  left: 2rem;
  opacity: 0.75;
  color: ${s("text")};
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
  color: ${s("textSecondary")};
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  padding: 24px 24px 4px;
`;

const Small = styled.div`
  animation: ${fadeAndScaleIn} 250ms ease;

  margin: 25vh auto auto auto;
  width: 75vw;
  min-width: 350px;
  max-width: 450px;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${s("modalBackground")};
  box-shadow: ${s("modalShadow")};
  border-radius: 8px;
  outline: none;

  ${NudeButton} {
    &:hover,
    &[aria-expanded="true"] {
      background: ${s("sidebarControlHoverBackground")};
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
