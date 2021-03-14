// @flow
import { Attachment, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", Attachment, (user) => !user.isViewer);

allow(User, "read", Attachment, (actor, attachment) => {
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});

allow(User, "delete", Attachment, (actor, attachment) => {
  if (actor.isViewer) return false;
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});
