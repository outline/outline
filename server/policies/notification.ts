import { Notification, User } from "@server/models";
import { allow } from "./cancan";
import { and, isOwner, isTeamModel } from "./utils";

allow(User, ["read", "update"], Notification, (actor, notification) =>
  and(isTeamModel(actor, notification), isOwner(actor, notification))
);
