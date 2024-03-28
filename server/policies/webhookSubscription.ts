import { User, Team, WebhookSubscription } from "@server/models";
import { allow } from "./cancan";

allow(User, "listWebhookSubscription", Team, (user, team) => {
  if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
    return false;
  }

  return user.isAdmin;
});

allow(User, "createWebhookSubscription", Team, (user, team) => {
  if (!team || user.isGuest || user.isViewer || user.teamId !== team.id) {
    return false;
  }

  return user.isAdmin;
});

allow(
  User,
  ["read", "update", "delete"],
  WebhookSubscription,
  (user, webhook): boolean => {
    if (!user || !webhook || user.teamId !== webhook.teamId) {
      return false;
    }

    return user.isAdmin;
  }
);
