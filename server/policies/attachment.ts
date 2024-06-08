import { Attachment, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isOwner, isTeamModel, or } from "./utils";

allow(User, "createAttachment", Team, isTeamModel);

allow(User, ["read", "update", "delete"], Attachment, (actor, attachment) =>
  and(
    isTeamModel(actor, attachment),
    or(actor.isAdmin, isOwner(actor, attachment))
  )
);
