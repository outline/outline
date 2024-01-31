import { User, UserMembership } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["update", "delete"],
  UserMembership,
  (user, membership) => user.id === membership?.userId || user.isAdmin
);
