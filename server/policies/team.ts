import env from "@server/env";
import { IncorrectEditionError } from "@server/errors";
import { Team, User } from "@server/models";
import { allow } from "./cancan";

allow(User, "read", Team, (user, team) => user.teamId === team?.id);

allow(User, "share", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return team.sharing;
});

allow(User, "createTeam", Team, () => {
  if (!env.isCloudHosted()) {
    throw IncorrectEditionError("Workspace creation only available on cloud");
  }
});

allow(User, "update", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return user.isAdmin;
});

allow(User, "delete", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  if (!env.isCloudHosted()) {
    throw IncorrectEditionError("Workspace deletion only available on cloud");
  }
  return user.isAdmin;
});
