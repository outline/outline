import { User, Tag, Team } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin, isTeamMember, isTeamModel, or } from "./utils";

allow(User, "read", Tag, isTeamModel);

allow(User, ["update", "delete", "merge"], Tag, isTeamAdmin);

// tags.create policy is checked on Team (not Tag)
allow(User, "createTag", Team, (actor, team) =>
  or(isTeamMember(actor, team), isTeamAdmin(actor, team))
);
