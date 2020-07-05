// @flow
import policy from "./policy";
import { NotificationSetting, User } from "../models";

const { allow } = policy;

allow(User, "create", NotificationSetting);

allow(
  User,
  ["read", "update", "delete"],
  NotificationSetting,
  (user, setting) => user && user.id === setting.userId
);
