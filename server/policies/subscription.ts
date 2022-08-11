import { Subscription, User } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["read", "update", "delete"],
  Subscription,
  (user, subscription) => {
    if (!subscription) {
      return false;
    }

    // If `user` is an admin, early exit with allow.
    if (user.isAdmin) {
      return true;
    }

    // User should be able to read their subscriptions.
    return user.id === subscription.userId;
  }
);
