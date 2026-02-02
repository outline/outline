import { TeamPreference, EmailDisplay } from "@shared/types";
import { User, Team } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isTeamAdmin,
  isTeamMember,
  isTeamModel,
  isTeamMutable,
  or,
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
  and(isTeamModel(actor, team), isTeamMutable(actor), actor.isAdmin)
);

allow(User, ["update", "listApiKeys"], User, (actor, user) =>
  or(
    //
    isTeamAdmin(actor, user),
    actor.id === user?.id
  )
);

allow(User, "readDetails", User, (actor, user) =>
  or(
    //
    isTeamAdmin(actor, user),
    isTeamMember(actor, user),
    actor.id === user?.id
  )
);

allow(User, "readEmail", User, (actor, user) => {
  const emailDisplay =
    actor.team?.getPreference(TeamPreference.EmailDisplay) ??
    EmailDisplay.Members;

  if (emailDisplay === EmailDisplay.None) {
    return or(isTeamAdmin(actor, user), actor.id === user?.id);
  }

  if (emailDisplay === EmailDisplay.Members) {
    return or(
      isTeamAdmin(actor, user),
      isTeamMember(actor, user),
      actor.id === user?.id
    );
  }

  // EmailDisplay.Everyone
  return or(
    //
    isTeamModel(actor, user),
    actor.id === user?.id
  );
});

// Only team administrators can delete user accounts.
// Members can no longer delete their own accounts, regardless of team preferences.
allow(User, "delete", User, (actor, user) => isTeamAdmin(actor, user));

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
