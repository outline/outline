import env from "@server/env";
import { User, Team, DataAttribute } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable } from "./utils";

const isEnabled = !env.isCloudHosted;

allow(User, "createDataAttribute", Team, (actor, team) =>
  and(
    //
    isTeamAdmin(actor, team),
    isTeamMutable(actor),
    !actor.isSuspended,
    !env.isCloudHosted
  )
);

allow(User, "listDataAttribute", Team, (actor, team) =>
  and(isTeamModel(actor, team), isEnabled)
);

allow(User, "read", DataAttribute, (actor, team) =>
  and(isTeamModel(actor, team), isEnabled)
);

allow(User, ["update", "delete"], DataAttribute, (actor, team) =>
  and(isTeamAdmin(actor, team), isEnabled)
);
