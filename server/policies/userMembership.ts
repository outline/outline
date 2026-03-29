import { User, UserMembership } from "@server/models";
import { allow } from "./cancan";
import { and, isOwner, isTeamModel, or } from "./utils";

allow(User, ["update", "delete"], UserMembership, (actor, membership) =>
  and(
    isTeamModel(actor, membership?.user),
    or(isOwner(actor, membership), actor.isAdmin)
  )
);
