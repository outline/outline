import { User, Revision } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamMutable, or } from "./utils";

allow(User, ["update"], Revision, (actor, revision) =>
  and(
    or(actor.id === revision?.userId, isTeamAdmin(actor, revision)),
    isTeamMutable(actor)
  )
);
