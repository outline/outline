import { observer } from "mobx-react";
import { SubscribeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Popover from "~/components/Popover";
import useStores from "~/hooks/useStores";
import SidebarLink from "../Sidebar/components/SidebarLink";
import Notifications from "./Notifications";

function NotificationsButton() {
  const { ui } = useStores();
  const { t } = useTranslation();

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-start",
    unstable_fixed: true,
    unstable_offset: [ui.sidebarWidth - 16, -32],
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <SidebarLink
            icon={<SubscribeIcon />}
            label={t("Notifications")}
            {...props}
          />
        )}
      </PopoverDisclosure>

      <StyledPopover
        {...popover}
        scrollable={false}
        aria-label={t("Notifications")}
        shrink
        flex
      >
        <Notifications onRequestClose={popover.hide} />
      </StyledPopover>
    </>
  );
}

const StyledPopover = styled(Popover)`
  z-index: ${depths.menu};
`;

export default observer(NotificationsButton);
