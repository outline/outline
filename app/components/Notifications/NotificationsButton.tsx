import { observer } from "mobx-react";
import { SubscribeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import Popover from "~/components/Popover";
import useStores from "~/hooks/useStores";
import Flex from "../Flex";
import SidebarLink from "../Sidebar/components/SidebarLink";
import Text from "../Text";
import Notifications from "./Notifications";

function NotificationsButton() {
  const { ui, notifications } = useStores();
  const { t } = useTranslation();
  const { approximateUnreadCount } = notifications;

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
            active={popover.visible}
            icon={<SubscribeIcon />}
            label={
              <Flex align="center" justify="space-between">
                {t("Notifications")}
                {approximateUnreadCount > 0 ? (
                  <Count size="xsmall" type="tertiary">
                    {approximateUnreadCount === DEFAULT_PAGINATION_LIMIT
                      ? DEFAULT_PAGINATION_LIMIT + "+"
                      : approximateUnreadCount}
                  </Count>
                ) : null}
              </Flex>
            }
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

const Count = styled(Text)`
  margin: 0 4px;
`;

const StyledPopover = styled(Popover)`
  z-index: ${depths.menu};
`;

export default observer(NotificationsButton);
