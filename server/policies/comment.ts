import { Comment, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel, or } from "./utils";

allow(User, "createComment", Team, isTeamModel);

allow(User, "read", Comment, (actor, comment) =>
  isTeamModel(actor, comment?.createdBy)
);

allow(User, "resolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    comment?.parentCommentId === null,
    comment?.resolvedById === null
  )
);

allow(User, "unresolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    comment?.parentCommentId === null,
    comment?.resolvedById !== null
  )
);

allow(User, ["update", "delete"], Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    or(actor.isAdmin, actor?.id === comment?.createdById)
  )
);

allow(
  User,
  ["readReaction", "addReaction", "removeReaction"],
  Comment,
  (actor, comment) => isTeamModel(actor, comment?.createdBy)
);
