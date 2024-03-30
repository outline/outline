import { IntegrationType } from "@shared/types";
import { Integration, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel, or } from "./utils";

allow(User, "createIntegration", Team, (actor, team) =>
  and(isTeamModel(actor, team), actor.isAdmin)
);

allow(User, "read", Integration, isTeamModel);

allow(User, ["update", "delete"], Integration, (user, integration) =>
  and(
    isTeamModel(user, integration),
    !user.isGuest,
    !user.isViewer,
    or(
      user.isAdmin,
      user.id === integration?.userId &&
        integration.type === IntegrationType.LinkedAccount
    )
  )
);
