import { observer } from "mobx-react";
import * as React from "react";
import { NotificationBadgeType, UserPreference } from "@shared/types";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import Desktop from "~/utils/Desktop";

/**
 * Component that keeps the app icon notification badge in sync with unread
 * notification count. Renders nothing visible — mount near the app root so it
 * stays alive as long as the user is authenticated.
 */
function NotificationBadge() {
  const { notifications } = useStores();
  const user = useCurrentUser();

  const badgeType = user.getPreference(UserPreference.NotificationBadge);
  const unreadCount = notifications.approximateUnreadCount;

  React.useEffect(() => {
    // Desktop app badge
    if (Desktop.bridge && "setNotificationCount" in Desktop.bridge) {
      if (badgeType === NotificationBadgeType.Disabled || unreadCount === 0) {
        void Desktop.bridge.setNotificationCount(0);
      } else if (badgeType === NotificationBadgeType.Count) {
        void Desktop.bridge.setNotificationCount(unreadCount);
      } else {
        void Desktop.bridge.setNotificationCount("・");
      }
    }

    // PWA badge
    if ("setAppBadge" in navigator) {
      if (unreadCount > 0 && badgeType !== NotificationBadgeType.Disabled) {
        void navigator.setAppBadge(
          badgeType === NotificationBadgeType.Count ? unreadCount : undefined
        );
      } else {
        void navigator.clearAppBadge();
      }
    }
  }, [unreadCount, badgeType]);

  return null;
}

export default observer(NotificationBadge);
