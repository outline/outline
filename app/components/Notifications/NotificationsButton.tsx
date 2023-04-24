import { SubscribeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import { useTheme } from "styled-components";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import Notifications from "./Notifications";

function NotificationsButton() {
  const theme = useTheme();
  const { t } = useTranslation();

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Button
            neutral
            borderOnHover
            icon={<SubscribeIcon color={theme.textTertiary} />}
            iconOnly
            {...props}
          />
        )}
      </PopoverDisclosure>

      <Popover {...popover} scrollable={false} aria-label={t("Notifications")}>
        <Notifications />
      </Popover>
    </>
  );
}

export default NotificationsButton;
