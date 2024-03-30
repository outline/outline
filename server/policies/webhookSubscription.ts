import { User, Team, WebhookSubscription } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel } from "./utils";

allow(
  User,
  ["listWebhookSubscription", "createWebhookSubscription"],
  Team,
  (actor, team) =>
    and(
      //
      isTeamModel(actor, team),
      actor.isAdmin
    )
);

allow(
  User,
  ["read", "update", "delete"],
  WebhookSubscription,
  (actor, webhook) =>
    and(
      //
      isTeamModel(actor, webhook),
      actor.isAdmin
    )
);
