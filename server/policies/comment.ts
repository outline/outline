import { Comment, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isCommentingEnabled, isTeamModel, or } from "./utils";

allow(User, "createComment", Team, isTeamModel);

allow(User, "listComments", Team, (actor, team) =>
  and(isTeamModel(actor, team), isCommentingEnabled(actor))
);

allow(User, "read", Comment, (actor, comment) =>
  and(isTeamModel(actor, comment?.createdBy), isCommentingEnabled(actor))
);

allow(User, "resolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    isCommentingEnabled(actor),
    comment?.parentCommentId === null,
    comment?.resolvedById === null
  )
);

allow(User, "unresolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    isCommentingEnabled(actor),
    comment?.parentCommentId === null,
    comment?.resolvedById !== null
  )
);

allow(User, ["update", "delete"], Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.createdBy),
    isCommentingEnabled(actor),
    or(actor.isAdmin, actor?.id === comment?.createdById)
  )
);

allow(
  User,
  ["readReaction", "addReaction", "removeReaction"],
  Comment,
  (actor, comment) =>
    and(isTeamModel(actor, comment?.createdBy), isCommentingEnabled(actor))
);
