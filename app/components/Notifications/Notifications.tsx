import { observer } from "mobx-react";
import { MarkAsReadIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import Notification, { type NotificationFilter } from "~/models/Notification";
import { markNotificationsAsRead } from "~/actions/definitions/notifications";
import useStores from "~/hooks/useStores";
import NotificationMenu from "~/menus/NotificationMenu";
import Desktop from "~/utils/Desktop";
import Empty from "../Empty";
import ErrorBoundary from "../ErrorBoundary";
import Flex from "../Flex";
import { InputSelect, type Option } from "../InputSelect";
import NudeButton from "../NudeButton";
import PaginatedList from "../PaginatedList";
import Scrollable from "../Scrollable";
import Text from "../Text";
import Tooltip from "../Tooltip";
import NotificationListItem from "./NotificationListItem";
import { HStack } from "../primitives/HStack";

type Props = {
  /** Callback when the notification panel wants to close. */
  onRequestClose: () => void;
};

/**
 * A panel containing a list of notifications and controls to manage them.
 */
function Notifications(
  { onRequestClose }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { notifications } = useStores();
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<NotificationFilter>("all");

  const filterOptions = React.useMemo<Option[]>(
    () => [
      { type: "item", label: t("All"), value: "all" },
      { type: "item", label: t("Mentions"), value: "mentions" },
      { type: "item", label: t("Comments and replies"), value: "comments" },
      { type: "item", label: t("Reactions"), value: "reactions" },
      { type: "item", label: t("Document events"), value: "documents" },
      { type: "item", label: t("Collection events"), value: "collections" },
      { type: "item", label: t("System"), value: "system" },
    ],
    [t]
  );

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") {
      return notifications.active;
    }

    const eventTypes = Notification.filterCategories[filter];
    return notifications.active.filter((notification) =>
      eventTypes.includes(notification.event)
    );
  }, [notifications.active, filter]);

  // Update the notification count in the dock icon, if possible.
  React.useEffect(() => {
    // Account for old versions of the desktop app that don't have the
    // setNotificationCount method on the bridge.
    if (Desktop.bridge && "setNotificationCount" in Desktop.bridge) {
      void Desktop.bridge.setNotificationCount(
        notifications.approximateUnreadCount
      );
    }

    // PWA badging
    if ("setAppBadge" in navigator) {
      if (notifications.approximateUnreadCount) {
        void navigator.setAppBadge(notifications.approximateUnreadCount);
      } else {
        void navigator.clearAppBadge();
      }
    }
  }, [notifications.approximateUnreadCount]);

  return (
    <ErrorBoundary>
      <Flex
        style={{
          width: "100%",
          height:
            "min(300px, calc(var(--radix-popover-content-available-height) - 44px))",
        }}
        column
      >
        <Header justify="space-between">
          <Text weight="bold" as="span">
            {t("Notifications")}
          </Text>
          <HStack>
            <StyledInputSelect
              label={t("Filter")}
              hideLabel
              options={filterOptions}
              value={filter}
              onChange={(value) => setFilter(value as NotificationFilter)}
              short
              nude
            />
            {notifications.approximateUnreadCount > 0 && (
              <Tooltip content={t("Mark all as read")}>
                <Button
                  action={markNotificationsAsRead}
                  aria-label={t("Mark all as read")}
                >
                  <MarkAsReadIcon />
                </Button>
              </Tooltip>
            )}
            <NotificationMenu />
          </HStack>
        </Header>
        <Scrollable ref={ref} flex topShadow hiddenScrollbars>
          <React.Suspense fallback={null}>
            <PaginatedList<Notification>
              fetch={notifications.fetchPage}
              options={{ archived: false }}
              items={filteredNotifications}
              empty={
                <EmptyNotifications>
                  {t("You're all caught up")}.
                </EmptyNotifications>
              }
              renderItem={(item) => (
                <NotificationListItem
                  key={item.id}
                  notification={item}
                  onNavigate={onRequestClose}
                />
              )}
            />
          </React.Suspense>
        </Scrollable>
      </Flex>
    </ErrorBoundary>
  );
}

const StyledInputSelect = styled(InputSelect)`
  color: ${s("textSecondary")};
  font-weight: 500;
  font-size: 14px;
  height: 24px;

  & > * {
    min-height: 24px;
    line-height: 24px !important;
  }
`;

const EmptyNotifications = styled(Empty)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:${hover},
  &:active {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const Header = styled(Flex)`
  padding: 8px 12px 12px;
  min-height: 44px;

  ${Button} {
    opacity: 0.75;
    transition: opacity 250ms ease-in-out;
  }

  &:${hover},
  &:focus-within {
    ${Button} {
      opacity: 1;
    }
  }
`;

export default observer(React.forwardRef(Notifications));
