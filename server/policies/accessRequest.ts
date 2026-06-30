import { AccessRequest, User } from "@server/models";
import { allow } from "./cancan";
import { isOwner, isTeamModel, or, and } from "./utils";

allow(
  User,
  ["read", "update", "delete"],
  AccessRequest,
  (actor, accessRequest) =>
    and(
      isTeamModel(actor, accessRequest),
      or(actor.isAdmin, isOwner(actor, accessRequest))
    )
);
