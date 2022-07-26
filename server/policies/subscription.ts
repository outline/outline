import { Subscription, User, Document } from "@server/models";
import { allow, _cannot as cannot } from "./cancan";

// Is `user` allowed to list all subscriptions on `document`?
allow(User, "listSubscription", Document, (user, document) => {
  // Sanity check.
  if (!document) {
    return false;
  }

  // Admin should be able to list any subscriptions.
  if (user.isAdmin) {
    return true;
  }

  // If `user` isn't allowed to read `document`,
  // they shouldn't be able to list any
  // subscriptions on `document`.
  if (cannot(user, "read", document)) {
    return false;
  }

  // Otherwise `user` is free to list
  // their own subscriptions on `document`.
  return true;
});

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
