import { Share, Team, User } from "@server/models";
import { allow, _can as can } from "./cancan";
import { and, isTeamModel, or } from "./utils";

allow(User, "createShare", Team, (user, team) =>
  and(
    //
    isTeamModel(user, team),
    !user.isGuest
  )
);

allow(User, "read", Share, (user, share) =>
  and(
    //
    isTeamModel(user, share),
    !user.isGuest
  )
);

allow(User, "update", Share, (user, share) =>
  and(
    isTeamModel(user, share),
    !user.isGuest,
    !user.isViewer,
    can(user, "share", share?.document)
  )
);

allow(User, "revoke", Share, (user, share) =>
  and(
    isTeamModel(user, share),
    !user.isGuest,
    !user.isViewer,
    or(user.isAdmin, user.id === share?.userId)
  )
);
