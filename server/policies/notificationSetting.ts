import { NotificationSetting, Team, User } from "@server/models";
import { allow } from "./cancan";

allow(User, "createNotificationSetting", Team, (user, team) => {
  if (!team || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(
  User,
  ["read", "update", "delete"],
  NotificationSetting,
  (user, setting) => user && user.id === setting?.userId
);
