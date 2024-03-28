import { ApiKey, User, Team } from "@server/models";
import { allow } from "./cancan";

allow(User, "createApiKey", Team, (user, team) => {
  if (!team || user.teamId !== team.id) {
    return false;
  }
  if (user.isViewer || user.isGuest) {
    return false;
  }
  return true;
});

allow(User, ["read", "update", "delete"], ApiKey, (user, apiKey) => {
  if (!apiKey || user.isViewer || user.isGuest) {
    return false;
  }
  return user && user.id === apiKey.userId;
});
