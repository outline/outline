import { t } from "i18next";
import { MoreIcon } from "outline-icons";
import React from "react";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import NudeButton from "~/components/NudeButton";
import { actionToMenuItem, performAction } from "~/actions";
import { navigateToNotificationSettings } from "~/actions/definitions/navigation";
import { markNotificationsAsArchived } from "~/actions/definitions/notifications";
import useActionContext from "~/hooks/useActionContext";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { MenuItem } from "~/types";

const NotificationMenu: React.FC = () => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menu = useMenuState();
  const context = useActionContext();
  const items: MenuItem[] = React.useMemo(
    () => [
      actionToMenuItem(markNotificationsAsArchived, context),
      {
        type: "button",
        title: t("Notification settings"),
        onClick: () => performAction(navigateToNotificationSettings, context),
      },
    ],
    [context]
  );

  useOnClickOutside(
    menuRef,
    (event) => {
      if (menu.visible) {
        event.stopPropagation();
        event.preventDefault();
        menu.hide();
      }
    },
    { capture: true }
  );

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button {...props}>
            <MoreIcon />
          </Button>
        )}
      </MenuButton>
      <ContextMenu {...menu} menuRef={menuRef} aria-label={t("Notification")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
};

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:${hover},
  &:active {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

export default NotificationMenu;
