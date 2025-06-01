import * as Popover from "@radix-ui/react-popover";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { fadeAndScaleIn } from "~/styles/animations";
import Notifications from "./Notifications";

type Props = {
  children?: React.ReactNode;
};

const NotificationsPopover: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const scrollableRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  // Reset scroll position to the top when popover is opened
  React.useEffect(() => {
    if (open && scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  const handleRequestClose = () => {
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <StyledContent
          side="top"
          align="start"
          sideOffset={0}
          avoidCollisions={true}
          aria-label={t("Notifications")}
          onEscapeKeyDown={handleRequestClose}
          onPointerDownOutside={handleRequestClose}
        >
          <Notifications
            onRequestClose={handleRequestClose}
            isOpen={open}
            ref={scrollableRef}
          />
        </StyledContent>
      </Popover.Portal>
    </Popover.Root>
  );
};

const StyledContent = styled(Popover.Content)`
  z-index: ${depths.menu};
  display: flex;
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: 6px 0;
  max-height: 75vh;
  box-shadow: ${s("menuShadow")};
  width: 380px;
  overflow: hidden;

  @media (max-width: 768px) {
    position: fixed;
    z-index: ${depths.menu};
    top: 50px;
    left: 8px;
    right: 8px;
    width: auto;
  }
`;

export default observer(NotificationsPopover);
