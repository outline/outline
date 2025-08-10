import { t } from "i18next";
import { MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import NudeButton from "~/components/NudeButton";
import { navigateToNotificationSettings } from "~/actions/definitions/navigation";
import { markNotificationsAsArchived } from "~/actions/definitions/notifications";
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";

const NotificationMenu: React.FC = () => {
  const actions = useMemo(
    () => [markNotificationsAsArchived, navigateToNotificationSettings],
    []
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Notifications")}>
      <Button>
        <MoreIcon />
      </Button>
    </DropdownMenu>
  );
};

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:${hover},
  &:active,
  &[data-state="open"] {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

export default NotificationMenu;
