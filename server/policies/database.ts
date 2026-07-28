import { TeamPreference } from "@shared/types";
import { Database, User } from "@server/models";
import { allow, can } from "./cancan";
import { and, isTeamModel, isTeamMutable } from "./utils";

/**
 * Databases inherit their authorization from the collection they live in, in
 * the same way documents do — reading a database means being able to read
 * documents in its collection, and editing one means being able to update the
 * collection. Every ability additionally requires the feature to be enabled
 * for the team.
 */

allow(User, "read", Database, (actor, database) =>
  and(
    isTeamModel(actor, database),
    !!actor.team?.getPreference(TeamPreference.DocumentDatabases),
    can(actor, "readDocument", database?.collection)
  )
);

allow(User, ["update", "delete", "createRow"], Database, (actor, database) =>
  and(
    isTeamModel(actor, database),
    isTeamMutable(actor),
    !actor.isGuest,
    !actor.isViewer,
    !!actor.team?.getPreference(TeamPreference.DocumentDatabases),
    can(actor, "updateDocument", database?.collection)
  )
);
