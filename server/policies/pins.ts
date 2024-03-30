import { User, Pin } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel } from "./utils";

allow(User, ["update", "delete"], Pin, (actor, pin) =>
  and(isTeamModel(actor, pin), actor.isAdmin)
);
