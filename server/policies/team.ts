import env from "@server/env";
import { IncorrectEditionError } from "@server/errors";
import { Team, User } from "@server/models";
import { allow } from "./cancan";

allow(User, "read", Team, (user, team) => user.teamId === team?.id);

allow(User, "share", Team, (user, team) => {
  if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return team.sharing;
});

allow(
  User,
  ["listGroups", "listUsers", "listShares", "listTemplates"],
  Team,
  (user, team) => {
    if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
      return false;
    }
    return true;
  }
);

allow(User, "createTeam", Team, (user) => {
  if (!env.isCloudHosted) {
    throw IncorrectEditionError(
      "Functionality is not available in this edition"
    );
  }
  return !user.isGuest;
});

allow(User, "update", Team, (user, team) => {
  if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return user.isAdmin;
});

allow(User, ["delete", "audit"], Team, (user, team) => {
  if (!env.isCloudHosted) {
    throw IncorrectEditionError(
      "Functionality is not available in this edition"
    );
  }
  if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return user.isAdmin;
});
