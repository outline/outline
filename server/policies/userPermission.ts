import { User, UserPermission } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["update", "delete"],
  UserPermission,
  (user, userPermission) => user.id === userPermission?.userId || user.isAdmin
);
