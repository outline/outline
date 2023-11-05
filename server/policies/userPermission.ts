import { User, UserPermission } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["update"],
  UserPermission,
  (user, userPermission) => user.id === userPermission?.userId
);
