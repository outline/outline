import { TeamPreference } from "@shared/types";
import { User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel } from "./utils";

allow(User, "read", User, isTeamModel);

allow(User, "inviteUser", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    !actor.isGuest,
    !actor.isViewer,
    actor.isAdmin || !!team?.getPreference(TeamPreference.MembersCanInvite)
  )
);

allow(User, ["update", "delete", "readDetails"], User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    actor.isAdmin || actor.id === user?.id
  )
);

allow(User, ["activate", "suspend"], User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    actor.isAdmin
  )
);

allow(User, "promote", User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    !user?.isAdmin,
    !user?.isSuspended,
    actor.isAdmin
  )
);

allow(User, "demote", User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    !user?.isSuspended,
    actor.isAdmin
  )
);

allow(User, "resendInvite", User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    !!user?.isInvited,
    actor.isAdmin
  )
);
