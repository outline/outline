import { observer } from "mobx-react";
import { MarkAsReadIcon, SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Notification from "~/models/Notification";
import { navigateToNotificationSettings } from "~/actions/definitions/navigation";
import useActionContext from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";
import Flex from "../Flex";
import NudeButton from "../NudeButton";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Text from "../Text";
import Tooltip from "../Tooltip";
import NotificationListItem from "./NotificationListItem";

type Props = {
  onRequestClose: () => void;
};

function Notifications(
  { onRequestClose }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const context = useActionContext();
  const { notifications } = useStores();
  const { t } = useTranslation();

  return (
    <Flex style={{ width: "100%" }} ref={ref} column>
      <Header justify="space-between">
        <Text weight="bold" as="span">
          {t("Notifications")}
        </Text>
        <Text color="textSecondary" as={Flex} gap={8}>
          {notifications.approximateUnreadCount > 0 && (
            <Tooltip delay={500} tooltip={t("Mark all as read")}>
              <Button onClick={notifications.markAllAsRead}>
                <MarkAsReadIcon />
              </Button>
            </Tooltip>
          )}
          <Tooltip delay={500} tooltip={t("Settings")}>
            <Button action={navigateToNotificationSettings} context={context}>
              <SettingsIcon />
            </Button>
          </Tooltip>
        </Text>
      </Header>
      <Scrollable flex topShadow>
        <PaginatedList
          fetch={notifications.fetchPage}
          items={notifications.orderedData}
          renderItem={(item: Notification) => (
            <NotificationListItem
              key={item.id}
              notification={item}
              onNavigate={onRequestClose}
            />
          )}
        />
      </Scrollable>
    </Flex>
  );
}

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:hover,
  &:active {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const Header = styled(Flex)`
  padding: 8px 12px 12px;
  height: 44px;

  ${Button} {
    opacity: 0.8;
    transition: opacity 250ms ease-in-out;
  }

  &:hover,
  &:focus-within {
    ${Button} {
      opacity: 1;
    }
  }
`;

export default observer(React.forwardRef(Notifications));
