import { User, Pin } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["update", "delete"],
  Pin,
  (user, pin) => user.teamId === pin?.teamId && user.isAdmin
);
