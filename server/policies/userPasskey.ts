import { UserPasskey, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel, isTeamMutable } from "./utils";

allow(User, "createUserPasskey", Team, (actor, team) =>
  and(isTeamModel(actor, team), isTeamMutable(actor), !!team?.passkeysEnabled)
);

allow(
  User,
  ["read", "update", "delete"],
  UserPasskey,
  (actor, passkey) => passkey?.userId === actor.id
);
