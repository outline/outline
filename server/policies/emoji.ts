import { User, Emoji, Team } from "@server/models";
import { allow } from "./cancan";
import { isOwner, isTeamAdmin, isTeamModel, or } from "./utils";

allow(User, "createEmoji", Team, isTeamModel);

allow(User, "read", Emoji, isTeamModel);

allow(User, "delete", Emoji, (actor, emoji) =>
  or(isOwner(actor, emoji), isTeamAdmin(actor, emoji))
);
