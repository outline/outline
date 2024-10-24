import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Popover from "~/components/Popover";
import Notifications from "./Notifications";

type Props = {
  children?: React.ReactNode;
};

const NotificationsPopover: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const popover = usePopoverState({
    gutter: 0,
    placement: "top-start",
    unstable_fixed: true,
  });

  // Reset scroll position to the top when popover is opened
  React.useEffect(() => {
    if (popover.visible && scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
    }
  }, [popover.visible]);

  return (
    <>
      <PopoverDisclosure {...popover}>{children}</PopoverDisclosure>
      <StyledPopover
        {...popover}
        scrollable={false}
        mobilePosition="bottom"
        aria-label={t("Notifications")}
        unstable_initialFocusRef={scrollableRef}
        shrink
        flex
      >
        <Notifications
          onRequestClose={popover.hide}
          isOpen={popover.visible}
          ref={scrollableRef}
        />
      </StyledPopover>
    </>
  );
};

const StyledPopover = styled(Popover)`
  z-index: ${depths.menu};
`;

export default observer(NotificationsPopover);
