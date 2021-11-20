import { Share, User } from "@server/models";
import { AdminRequiredError } from "../errors";
import policy from "./policy";

const { allow, cannot } = policy;

allow(User, "read", Share, (user, share) => {
  return user.teamId === share.teamId;
});

allow(User, "update", Share, (user, share) => {
  if (user.isViewer) return false;
  // only the user who can share the document publicly can update the share.
  if (cannot(user, "share", share.document)) return false;
  return user.teamId === share.teamId;
});

allow(User, "revoke", Share, (user, share) => {
  if (user.isViewer) return false;
  if (!share || user.teamId !== share.teamId) return false;
  if (user.id === share.userId) return true;
  if (user.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
