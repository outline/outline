import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Popover from "~/components/Popover";
import Notifications from "./Notifications";

const NotificationsButton: React.FC = ({ children }) => {
  const { t } = useTranslation();
  const focusRef = React.useRef<HTMLDivElement>(null);

  const popover = usePopoverState({
    gutter: 0,
    placement: "top-start",
    unstable_fixed: true,
  });

  return (
    <>
      <PopoverDisclosure {...popover}>{children}</PopoverDisclosure>
      <StyledPopover
        {...popover}
        scrollable={false}
        mobilePosition="bottom"
        aria-label={t("Notifications")}
        unstable_initialFocusRef={focusRef}
        shrink
        flex
      >
        <Notifications onRequestClose={popover.hide} ref={focusRef} />
      </StyledPopover>
    </>
  );
};

const StyledPopover = styled(Popover)`
  z-index: ${depths.menu};
`;

export default observer(NotificationsButton);
