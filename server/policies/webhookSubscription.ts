import { User, Team, WebhookSubscription } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamMutable } from "./utils";

allow(User, "createWebhookSubscription", Team, (actor, team) =>
  and(
    //
    isTeamAdmin(actor, team),
    isTeamMutable(actor),
    !actor.isSuspended
  )
);

allow(User, "listWebhookSubscription", Team, isTeamAdmin);

allow(User, ["read", "update", "delete"], WebhookSubscription, isTeamAdmin);
