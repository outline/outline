// @flow
import { Attachment, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createAttachment", Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  return true;
});

allow(User, ["read", "delete"], Attachment, (actor, attachment) => {
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});
