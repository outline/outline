// @flow
import policy from "./policy";
import { Share, User } from "../models";
import { AdminRequiredError } from "../errors";

const { allow } = policy;

allow(User, ["read"], Share, (user, share) => user.teamId === share.teamId);
allow(User, ["update"], Share, (user, share) => false);
allow(User, ["revoke"], Share, (user, share) => {
  if (!share || user.teamId !== share.teamId) return false;
  if (user.id === share.userId) return true;
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});
