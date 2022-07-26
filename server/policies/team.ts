import { Team, User } from "@server/models";
import { allow } from "./cancan";

allow(User, "read", Team, (user, team) => user.teamId === team?.id);

allow(User, "share", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return team.sharing;
});

allow(User, ["update", "manage"], Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return user.isAdmin;
});
