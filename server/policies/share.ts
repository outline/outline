import { Share, Team, User } from "@server/models";
import { allow, can } from "./cancan";
import { and, isOwner, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "createShare", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isGuest
  )
);

allow(User, "listShares", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    !actor.isGuest
  )
);

allow(User, "read", Share, (actor, share) =>
  and(
    //
    isTeamModel(actor, share),
    !actor.isGuest
  )
);

allow(User, "update", Share, (actor, share) =>
  and(
    isTeamModel(actor, share),
    !actor.isGuest,
    !actor.isViewer,
    can(actor, "share", share?.document)
  )
);

allow(User, "revoke", Share, (actor, share) =>
  and(
    isTeamModel(actor, share),
    !actor.isGuest,
    !actor.isViewer,
    or(actor.isAdmin, isOwner(actor, share))
  )
);
