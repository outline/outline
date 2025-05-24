import { User, Emoji } from "@server/models";
import { allow } from "./cancan";
import { isOwner, isTeamAdmin, isTeamMember } from "./utils";

// Team members can create emojis
allow(User, "create", Emoji, isTeamMember);

// Team members can read emojis
allow(User, "read", Emoji, isTeamMember);

// Emoji creators and team admins can delete emojis
allow(User, "delete", Emoji, isOwner);
allow(User, "delete", Emoji, isTeamAdmin);
