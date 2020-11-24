// @flow
import { NotificationSetting, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", NotificationSetting);

allow(
  User,
  ["read", "update", "delete"],
  NotificationSetting,
  (user, setting) => user && user.id === setting.userId
);
