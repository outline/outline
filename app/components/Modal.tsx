import * as Dialog from "@radix-ui/react-dialog";
import { observer } from "mobx-react";
import { CloseIcon, BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import { fadeAndScaleIn, fadeIn } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import ErrorBoundary from "./ErrorBoundary";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import Tooltip from "./Tooltip";

type Props = {
  children?: React.ReactNode;
  isOpen: boolean;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  onRequestClose: () => void;
};

const Modal: React.FC<Props> = ({
  children,
  isOpen,
  title = "Untitled",
  style,
  width,
  height,
  onRequestClose,
}: Props) => {
  const wasOpen = usePrevious(isOpen);
  const isMobile = useMobile();
  const { t } = useTranslation();

  if (!isOpen && !wasOpen) {
    return null;
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && onRequestClose()}
    >
      <Dialog.Portal>
        <StyledOverlay />
        <Dialog.Title asChild>
          <VisuallyHidden.Root>{title}</VisuallyHidden.Root>
        </Dialog.Title>
        <StyledContent
          onEscapeKeyDown={onRequestClose}
          onPointerDownOutside={onRequestClose}
          aria-describedby={undefined}
        >
          {isMobile ? (
            <Mobile>
              <MobileContent>
                <Centered onClick={(ev) => ev.stopPropagation()} column>
                  {title && (
                    <Text size="xlarge" weight="bold">
                      {title}
                    </Text>
                  )}
                  <ErrorBoundary>{children}</ErrorBoundary>
                </Centered>
              </MobileContent>
              <Close onClick={onRequestClose}>
                <CloseIcon size={32} />
              </Close>
              <Back onClick={onRequestClose}>
                <BackIcon size={32} />
                <Text>{t("Back")} </Text>
              </Back>
            </Mobile>
          ) : (
            <Wrapper $width={width} $height={height}>
              <Centered
                onClick={(ev) => ev.stopPropagation()}
                // maxHeight needed for proper overflow behavior in Safari
                style={{ maxHeight: "65vh" }}
                column
                reverse
              >
                <DesktopContent style={style} topShadow>
                  <ErrorBoundary component="div">{children}</ErrorBoundary>
                </DesktopContent>
                <Header>
                  {title && <Text size="large">{title}</Text>}
                  <Tooltip content={t("Close")} shortcut="Esc">
                    <NudeButton onClick={onRequestClose}>
                      <CloseIcon />
                    </NudeButton>
                  </Tooltip>
                </Header>
              </Centered>
            </Wrapper>
          )}
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const StyledOverlay = styled(Dialog.Overlay)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.modalBackdrop} !important;
  z-index: ${depths.overlay};
  animation: ${fadeIn} 200ms ease;
`;

const StyledContent = styled(Dialog.Content)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  outline: none;
`;

const Mobile = styled.div`
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
`;

const MobileContent = styled(Scrollable)`
  width: 100%;
  padding: 8vh 12px;

  ${breakpoint("tablet")`
    padding: 13vh 2rem 2rem;
  `};
`;

const DesktopContent = styled(Scrollable)`
  padding: 8px 24px 24px;
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
  padding: 24px 24px 12px;
  flex-shrink: 0;
`;

const Wrapper = styled.div<{
  $width?: number | string;
  $height?: number | string;
}>`
  animation: ${fadeAndScaleIn} 250ms ease;

  margin: 25vh auto auto auto;
  width: 75vw;
  min-width: 350px;
  max-width: ${(props) => props.$width || "450px"};
  max-height: ${(props) => props.$height || "70vh"};
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

export default observer(Modal);
