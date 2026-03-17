import { User, Tag, Team } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin, isTeamMember, isTeamModel, or } from "./utils";

allow(User, "read", Tag, isTeamModel);

allow(User, "update", Tag, (actor, tag) =>
  or(isTeamMember(actor, tag), isTeamAdmin(actor, tag))
);

allow(User, "delete", Tag, isTeamAdmin);

// tags.create policy is checked on Team (not Tag)
allow(User, "createTag", Team, (actor, team) =>
  or(isTeamMember(actor, team), isTeamAdmin(actor, team))
);
