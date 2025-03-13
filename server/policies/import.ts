import { User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamMutable } from "./utils";

allow(User, ["createImport", "readImport"], Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor, team))
);
