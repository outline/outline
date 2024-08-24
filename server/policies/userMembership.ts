import { User, UserMembership } from "@server/models";
import { allow } from "./cancan";
import { isOwner, or } from "./utils";

allow(User, ["update", "delete"], UserMembership, (actor, membership) =>
  or(
    //
    isOwner(actor, membership),
    actor.isAdmin
  )
);
