import { Notification, User } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["read", "update"],
  Notification,
  (user, notification) => user?.id === notification?.userId
);
