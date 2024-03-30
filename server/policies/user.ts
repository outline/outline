import { TeamPreference } from "@shared/types";
import { User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "read", User, isTeamModel);

allow(User, "listUsers", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    !actor.isGuest
  )
);

allow(User, "inviteUser", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isGuest,
    !actor.isViewer,
    actor.isAdmin || !!team?.getPreference(TeamPreference.MembersCanInvite)
  )
);

allow(User, ["update", "delete", "readDetails"], User, (actor, user) =>
  or(
    //
    isTeamAdmin(actor, user),
    actor.id === user?.id
  )
);

allow(User, ["activate", "suspend"], User, isTeamAdmin);

allow(User, "promote", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !user?.isAdmin,
    !user?.isSuspended
  )
);

allow(User, "demote", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !user?.isSuspended
  )
);

allow(User, "resendInvite", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !!user?.isInvited
  )
);
