import { ApiKey, User, Team } from "@server/models";
import { allow } from "./cancan";

allow(User, "createApiKey", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, ["read", "update", "delete"], ApiKey, (user, apiKey) => {
  if (!apiKey) {
    return false;
  }
  if (user.isViewer) {
    return false;
  }
  return user && user.id === apiKey.userId;
});
