import { User, Emoji, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isOwner, isTeamAdmin, isTeamModel, or } from "./utils";

allow(User, "createEmoji", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    !actor.isGuest
  )
);

allow(User, "read", Emoji, isTeamModel);

allow(User, ["update", "delete"], Emoji, (actor, emoji) =>
  and(
    isTeamModel(actor, emoji),
    or(isOwner(actor, emoji), isTeamAdmin(actor, emoji))
  )
);
