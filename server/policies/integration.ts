import { IntegrationType } from "@shared/types";
import { Integration, User, Team } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isOwner,
  isTeamAdmin,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

allow(User, "createIntegration", Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);

allow(User, "read", Integration, isTeamModel);

allow(User, ["update", "delete"], Integration, (actor, integration) =>
  and(
    isTeamModel(actor, integration),
    isTeamMutable(actor),
    !actor.isGuest,
    !actor.isViewer,
    or(
      actor.isAdmin,
      isOwner(actor, integration) &&
        integration.type === IntegrationType.LinkedAccount
    )
  )
);
