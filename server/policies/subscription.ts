import { Subscription, User } from "@server/models";
import { allow } from "./cancan";
import { or } from "./utils";

allow(User, ["read", "update", "delete"], Subscription, (actor, subscription) =>
  or(
    //
    actor.isAdmin,
    actor.id === subscription?.userId
  )
);
