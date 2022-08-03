import { Comment, User, Team } from "@server/models";
import { allow } from "./cancan";

allow(User, "createComment", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, ["read", "update", "delete"], Comment, (user, comment) => {
  if (!comment) {
    return false;
  }
  if (user.isViewer) {
    return false;
  }
  return user?.id === comment.createdById;
});
