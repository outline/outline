import { Share, Team, User } from "@server/models";
import { AdminRequiredError } from "../errors";
import { allow, _cannot as cannot } from "./cancan";

allow(User, "createShare", Team, (user, team) => {
  if (!team || user.isGuest || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, "read", Share, (user, share) => {
  if (!share || user.isGuest) {
    return false;
  }
  return user.teamId === share.teamId;
});

allow(User, "update", Share, (user, share) => {
  if (!share || user.isGuest || user.isViewer) {
    return false;
  }

  // only the user who can share the document publicly can update the share.
  if (cannot(user, "share", share.document)) {
    return false;
  }

  return user.teamId === share.teamId;
});

allow(User, "revoke", Share, (user, share) => {
  if (!share || user.isGuest || user.isViewer || user.teamId !== share.teamId) {
    return false;
  }
  if (user.id === share.userId) {
    return true;
  }
  if (user.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});
