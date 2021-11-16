import { Attachment, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "createAttachment", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return true;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "read", Attachment, (actor, attachment) => {
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "delete", Attachment, (actor, attachment) => {
  if (actor.isViewer) return false;
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});
