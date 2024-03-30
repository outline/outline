import { Subscription, User } from "@server/models";
import { allow } from "./cancan";
import { isOwner, or } from "./utils";

allow(User, ["read", "update", "delete"], Subscription, (actor, subscription) =>
  or(
    //
    actor.isAdmin,
    isOwner(actor, subscription)
  )
);
