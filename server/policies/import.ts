import { ImportState } from "@shared/types";
import { User, Team, Import } from "@server/models";
import { allow, can } from "./cancan";
import { and, isTeamAdmin, isTeamMutable, or } from "./utils";

allow(User, ["createImport", "listImports"], Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);

allow(User, "read", Import, (actor, importModel) =>
  and(isTeamAdmin(actor, importModel), isTeamMutable(actor))
);

allow(User, "delete", Import, (actor, importModel) =>
  and(
    can(actor, "read", importModel),
    importModel?.state === ImportState.Completed
  )
);

allow(User, "cancel", Import, (actor, importModel) =>
  and(
    can(actor, "read", importModel),
    importModel?.createdById === actor.id,
    or(
      importModel?.state === ImportState.Created,
      importModel?.state === ImportState.InProgress,
      importModel?.state === ImportState.Processed
    )
  )
);
