import { AccessRequest, User } from "@server/models";
import { allow } from "./cancan";
import { isOwner, isTeamAdmin, or } from "./utils";

allow(User, "read", AccessRequest, (actor, accessRequest) =>
  or(isTeamAdmin(actor, accessRequest?.user), isOwner(actor, accessRequest))
);
