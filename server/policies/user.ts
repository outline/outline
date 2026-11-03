import { TeamPreference, EmailDisplay, PlanFeature } from "@shared/types";
import { User, Team } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isTeamAdmin,
  isTeamModel,
  isTeamMutable,
  or,
  teamHasEntitlement,
} from "./utils";

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

allow(User, "addGuest", Team, (actor, team) =>
  and(
    //
    isTeamModel(actor, team),
    teamHasEntitlement(team, PlanFeature.Guests)
  )
);

allow(User, ["update", "readDetails", "listApiKeys"], User, (actor, user) =>
  or(
    //
    isTeamAdmin(actor, user),
    actor.id === user?.id
  )
);

allow(User, "readEmail", [User, Team], (actor, model) => {
  if (model instanceof User && actor.id === model.id) {
    return true;
  }
  if (!isTeamModel(actor, model)) {
    return false;
  }

  // A team target asks whether the actor may read the emails of its users.
  const team = model instanceof Team ? model : actor.team;
  const emailDisplay =
    team?.getPreference(TeamPreference.EmailDisplay) ?? EmailDisplay.Members;

  switch (emailDisplay) {
    case EmailDisplay.None:
      return actor.isAdmin;
    case EmailDisplay.Members:
      return actor.isAdmin || actor.isMember;
    default:
      return true;
  }
});

allow(User, "delete", User, (actor, user) =>
  or(
    isTeamAdmin(actor, user),
    and(
      actor.id === user?.id,
      !!actor.team.getPreference(TeamPreference.MembersCanDeleteAccount)
    )
  )
);

allow(User, ["activate", "suspend"], User, (actor, user) =>
  and(isTeamAdmin(actor, user), user?.id !== actor.id)
);

allow(User, "promote", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !user?.isAdmin,
    !user?.isSuspended,
    user?.id !== actor.id
  )
);

allow(User, "demote", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !user?.isSuspended,
    user?.id !== actor.id
  )
);

allow(User, "resendInvite", User, (actor, user) =>
  and(
    //
    isTeamAdmin(actor, user),
    !!user?.isInvited
  )
);
