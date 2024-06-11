import { User, Team, DataAttribute } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable } from "./utils";

allow(User, "createDataAttribute", Team, (actor, team) =>
  and(
    //
    isTeamAdmin(actor, team),
    isTeamMutable(actor),
    !actor.isSuspended
  )
);

allow(User, "listDataAttribute", Team, isTeamModel);

allow(User, "read", DataAttribute, isTeamModel);

allow(User, ["update", "delete"], DataAttribute, isTeamAdmin);
