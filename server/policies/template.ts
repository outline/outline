import { Template, User, Team } from "@server/models";
import { allow, can } from "./cancan";
import { and, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, ["createTemplate", "updateTemplate"], Team, (actor, team) =>
  and(
    //
    actor.isAdmin,
    isTeamModel(actor, team),
    isTeamMutable(actor)
  )
);

allow(User, "read", Template, (actor, template) =>
  and(
    isTeamModel(actor, template),
    or(
      and(!!template?.isWorkspaceTemplate, can(actor, "read", actor.team)),
      can(actor, "readDocument", template?.collection)
    )
  )
);

allow(User, "listRevisions", Template, (actor, template) =>
  or(
    and(can(actor, "read", template), !actor.isGuest),
    and(can(actor, "update", template), actor.isGuest)
  )
);

allow(User, ["update", "move", "duplicate"], Template, (actor, template) =>
  and(
    can(actor, "read", template),
    isTeamMutable(actor),
    or(
      and(
        !!template?.isWorkspaceTemplate,
        can(actor, "updateTemplate", actor.team)
      ),
      can(actor, "update", template?.collection)
    )
  )
);

allow(User, "delete", Template, (actor, template) =>
  and(
    //
    can(actor, "update", template),
    !template?.isDeleted
  )
);

allow(User, "restore", Template, (actor, template) =>
  and(
    //
    !!template?.isDeleted,
    isTeamModel(actor, template),
    isTeamMutable(actor),
    or(
      and(
        !!template?.isWorkspaceTemplate,
        can(actor, "updateTemplate", actor.team)
      ),
      can(actor, "update", template?.collection)
    )
  )
);
