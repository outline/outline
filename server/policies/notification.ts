import { Notification, User } from "@server/models";
import { allow } from "./cancan";

allow(User, ["read", "update"], Notification, (user, notification) => {
  if (!notification) {
    return false;
  }
  return user?.id === notification.userId;
});
