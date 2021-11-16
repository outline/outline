import { AdminRequiredError } from "../errors";
import { Share, User } from "../models";
import policy from "./policy";

const { allow, cannot } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "read", Share, (user, share) => {
  return user.teamId === share.teamId;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "update", Share, (user, share) => {
  if (user.isViewer) return false;
  // only the user who can share the document publicly can update the share.
  if (cannot(user, "share", share.document)) return false;
  return user.teamId === share.teamId;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "revoke", Share, (user, share) => {
  if (user.isViewer) return false;
  if (!share || user.teamId !== share.teamId) return false;
  if (user.id === share.userId) return true;
  if (user.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
