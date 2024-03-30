import { User, Team, WebhookSubscription } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin } from "./utils";

allow(
  User,
  ["listWebhookSubscription", "createWebhookSubscription"],
  Team,
  isTeamAdmin
);

allow(User, ["read", "update", "delete"], WebhookSubscription, isTeamAdmin);
