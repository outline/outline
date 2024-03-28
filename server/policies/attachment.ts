import { Attachment, User, Team } from "@server/models";
import { allow } from "./cancan";

allow(User, "createAttachment", Team, (user, team) => {
  if (!team || user.isGuest || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, "read", Attachment, (actor, attachment) => {
  if (!attachment || !actor || attachment.teamId !== actor.teamId) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }
  if (actor.id === attachment.userId) {
    return true;
  }
  return false;
});

allow(User, "delete", Attachment, (actor, attachment) => {
  if (
    !attachment ||
    actor.isViewer ||
    actor.isGuest ||
    attachment.teamId !== actor.teamId
  ) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }
  if (actor.id === attachment.userId) {
    return true;
  }
  return false;
});
