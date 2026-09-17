import { Comment, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel, or } from "./utils";

allow(User, "createComment", Team, isTeamModel);

allow(User, "read", Comment, (actor, comment) =>
  isTeamModel(actor, comment?.document ?? comment?.createdBy)
);

allow(User, "resolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.document ?? comment?.createdBy),
    comment?.parentCommentId === null,
    comment?.resolvedById === null
  )
);

allow(User, "unresolve", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.document ?? comment?.createdBy),
    comment?.parentCommentId === null,
    comment?.resolvedById !== null
  )
);

allow(User, "update", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.document ?? comment?.createdBy),
    or(actor.isAdmin, actor?.id === comment?.createdById)
  )
);

// Guest (public visitor) comments have no author to defer to, so any team
// member able to comment on the document may remove them – this is the only
// way to moderate spam left by anonymous visitors without involving an admin.
allow(User, "delete", Comment, (actor, comment) =>
  and(
    isTeamModel(actor, comment?.document ?? comment?.createdBy),
    or(
      actor.isAdmin,
      actor?.id === comment?.createdById,
      comment?.createdById === null
    )
  )
);

allow(
  User,
  ["readReaction", "addReaction", "removeReaction"],
  Comment,
  (actor, comment) =>
    isTeamModel(actor, comment?.document ?? comment?.createdBy)
);
