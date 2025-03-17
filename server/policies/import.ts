import { ImportState } from "@shared/types";
import { User, Team, Import } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamMutable } from "./utils";

allow(User, ["createImport", "readImport"], Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);

allow(User, ["read", "delete"], Import, (actor, importModel) =>
  and(
    isTeamAdmin(actor, importModel),
    isTeamMutable(actor),
    importModel?.state === ImportState.Completed
  )
);
