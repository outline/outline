import { User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import { allow } from "./cancan";

allow(
  User,
  "read",
  User,
  (actor, user) => user && user.teamId === actor.teamId
);

allow(User, "inviteUser", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "update", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (user.id === actor.id) {
    return true;
  }

  if (actor.isAdmin) {
    return true;
  }

  return false;
});

allow(User, "delete", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (user.id === actor.id) {
    return true;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, ["activate", "suspend"], User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "readDetails", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (user === actor) {
    return true;
  }
  return actor.isAdmin;
});

allow(User, "promote", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (user.isAdmin || user.isSuspended) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "resendInvite", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (!user.isInvited) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "demote", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) {
    return false;
  }
  if (user.isSuspended) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});
