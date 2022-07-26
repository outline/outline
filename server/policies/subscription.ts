import { Subscription, User } from "@server/models";
import { allow } from "./cancan";

// Is `user` allowed to `read`
// subscription statuses on `document`?
allow(User, "read", Subscription, (user, subscription) => {
  // Sanity check.
  if (!subscription) {
    return false;
  }

  // If `user` is an admin, early exit with allow.
  if (user.isAdmin) {
    return true;
  }

  // Otherwise user should be able to read their subscriptions.
  return user.id === subscription.userId;
});

// Is `user` allowed to `update` subscription on `document`?
allow(User, "update", Subscription, (user, subscription) => {
  // Sanity check.
  if (!subscription) {
    return false;
  }

  // Admin should be able to modify any subscriptions.
  if (user.isAdmin) {
    return true;
  }

  // Otherwise `user` should be able to update
  // only their own set subscriptions.
  return user.id === subscription.userId;
});

// Is `user` allowed to `delete` subscription on `document`?
allow(User, "delete", Subscription, (user, subscription) => {
  // Sanity check.
  if (!subscription) {
    return false;
  }

  // Admin should be able to modify any subscriptions.
  if (user.isAdmin) {
    return true;
  }

  // Otherwise `user` should be able to delete
  // only their own set subscriptions.
  return user.id === subscription.userId;
});
