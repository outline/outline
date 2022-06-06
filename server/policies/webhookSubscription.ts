import { User, Team, WebhookSubscription } from "@server/models";
import { allow } from "./cancan";

allow(User, "listWebhookSubscription", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }

  return user.isAdmin;
});

allow(User, "createWebhookSubscription", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }

  return user.isAdmin;
});

allow(
  User,
  ["read", "update", "delete"],
  WebhookSubscription,
  (user, webhook): boolean => {
    if (!user || !webhook) {
      return false;
    }

    if (!user.isAdmin) {
      return false;
    }

    return user.teamId === webhook.teamId;
  }
);
