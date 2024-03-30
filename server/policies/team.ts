import env from "@server/env";
import { IncorrectEditionError } from "@server/errors";
import { Team, User } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel } from "./utils";

allow(User, "read", Team, isTeamModel);

allow(User, "share", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    !actor.isGuest,
    !actor.isViewer,
    !!team?.sharing
  )
);

allow(User, "createTeam", Team, (user) => {
  if (!env.isCloudHosted) {
    throw IncorrectEditionError(
      "Functionality is not available in this edition"
    );
  }
  return !user.isGuest;
});

allow(User, "update", Team, (actor, team) =>
  and(isTeamModel(actor, team), actor.isAdmin)
);

allow(User, ["delete", "audit"], Team, (actor, team) => {
  if (!env.isCloudHosted) {
    throw IncorrectEditionError(
      "Functionality is not available in this edition"
    );
  }

  return and(isTeamModel(actor, team), actor.isAdmin);
});
