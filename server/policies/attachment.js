// @flow
import { Attachment, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", Attachment);

allow(User, "delete", Attachment, (actor, attachment) => {
  if (!attachment || attachment.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  if (actor.id === attachment.userId) return true;
  return false;
});
