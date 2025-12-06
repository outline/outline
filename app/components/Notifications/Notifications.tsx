import { observer } from "mobx-react";
import { MarkAsReadIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { NotificationEventType } from "@shared/types";
import { s, hover } from "@shared/styles";
import Notification from "~/models/Notification";
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

type Props = {
  /** Callback when the notification panel wants to close. */
  onRequestClose: () => void;
};

type NotificationFilter =
  | "all"
  | "mentions"
  | "comments"
  | "documents"
  | "collections"
  | "system";

const FILTER_CATEGORIES: Record<NotificationFilter, NotificationEventType[]> = {
  all: [],
  mentions: [
    NotificationEventType.MentionedInDocument,
    NotificationEventType.MentionedInComment,
    NotificationEventType.GroupMentionedInDocument,
    NotificationEventType.GroupMentionedInComment,
  ],
  comments: [
    NotificationEventType.CreateComment,
    NotificationEventType.ResolveComment,
    NotificationEventType.ReactionsCreate,
  ],
  documents: [
    NotificationEventType.PublishDocument,
    NotificationEventType.UpdateDocument,
    NotificationEventType.CreateRevision,
    NotificationEventType.AddUserToDocument,
  ],
  collections: [
    NotificationEventType.CreateCollection,
    NotificationEventType.AddUserToCollection,
  ],
  system: [
    NotificationEventType.InviteAccepted,
    NotificationEventType.Onboarding,
    NotificationEventType.Features,
    NotificationEventType.ExportCompleted,
  ],
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
      { type: "item", label: t("Comments"), value: "comments" },
      { type: "item", label: t("Documents"), value: "documents" },
      { type: "item", label: t("Collections"), value: "collections" },
      { type: "item", label: t("System"), value: "system" },
    ],
    [t]
  );

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") {
      return notifications.active;
    }

    const eventTypes = FILTER_CATEGORIES[filter];
    return notifications.active.filter((notification) =>
      eventTypes.includes(notification.event)
    );
  }, [notifications.active, filter]);

  const isEmpty = filteredNotifications.length === 0;

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
      <Flex style={{ width: "100%" }} column>
        <Header justify="space-between">
          <Text weight="bold" as="span">
            {t("Notifications")}
          </Text>
          <Flex gap={8}>
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
          </Flex>
        </Header>
        <FilterContainer>
          <InputSelect
            label={t("Filter")}
            hideLabel
            options={filterOptions}
            value={filter}
            onChange={(value) => setFilter(value as NotificationFilter)}
            short
          />
        </FilterContainer>
        <React.Suspense fallback={null}>
          <Scrollable ref={ref} flex topShadow>
            <PaginatedList<Notification>
              fetch={notifications.fetchPage}
              options={{ archived: false }}
              items={filteredNotifications}
              renderItem={(item) => (
                <NotificationListItem
                  key={item.id}
                  notification={item}
                  onNavigate={onRequestClose}
                />
              )}
            />
          </Scrollable>
        </React.Suspense>
        {isEmpty && (
          <EmptyNotifications>{t("You're all caught up")}.</EmptyNotifications>
        )}
      </Flex>
    </ErrorBoundary>
  );
}

const FilterContainer = styled.div`
  padding: 0 12px 12px;
`;

const EmptyNotifications = styled(Empty)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
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
