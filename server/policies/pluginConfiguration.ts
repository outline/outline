import { PluginConfiguration, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel } from "./utils";

allow(User, "createPluginConfiguration", Team, (actor, team) =>
  isTeamAdmin(actor, team)
);

allow(User, ["read", "update", "delete"], PluginConfiguration, (actor, config) =>
  and(isTeamModel(actor, config?.team), isTeamAdmin(actor, config?.team))
);
