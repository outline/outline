// @flow
import { NotificationSetting, Team, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createNotificationSetting", Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  return true;
});

allow(
  User,
  ["read", "update", "delete"],
  NotificationSetting,
  (user, setting) => user && user.id === setting.userId
);
