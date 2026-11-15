import { User, Team, Import } from "@server/models";
import { allow, can } from "./cancan";
import { and, isTeamAdmin, isTeamMutable } from "./utils";

allow(User, ["createImport", "listImports"], Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);

allow(User, "read", Import, (actor, importModel) =>
  and(isTeamAdmin(actor, importModel), isTeamMutable(actor))
);

allow(User, "delete", Import, (actor, importModel) =>
  and(
    can(actor, "read", importModel),
    !!importModel && Import.terminalStates.includes(importModel.state)
  )
);

allow(User, "cancel", Import, (actor, importModel) =>
  and(
    can(actor, "read", importModel),
    importModel?.createdById === actor.id,
    !!importModel && Import.activeStates.includes(importModel.state)
  )
);
