import { User, Team } from "@server/models";
import { allow } from "./cancan";

allow(User, "createWebhookSubscription", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }

  return true;
});
