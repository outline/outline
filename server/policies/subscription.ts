import { Subscription, User, Document } from "@server/models";
import { allow, _can as can } from "./cancan";

// Is `user` allowed to subscribe to `document`?
allow(User, "createSubscription", Document, (user, document) => {
  // Sanity check.
  if (!document) {
    return false;
  }

  // REVIEW: Are viewers allowed to subscribe?
  if (user.isViewer) {
    return false;
  }

  // REVIEW: Show admin be allowed to prescribe
  // a document to user?
  if (user.isAdmin) {
    return true;
  }

  // If `user` isn't allowed to read `document`,
  // they shouldn't be able to subscribe to its changes.
  if (can(user, "read", document)) {
    return false;
  }

  // Otherwise `user` is free to subscribe to any documents.
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

  // Otherwise `user` should be able
  // to read any subscriptions
  // REVIEW: Constrain?
  // return user.id === subscription.id;
  return true;
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
  return user.id === subscription.id;
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

  // Otherwise `user` should be able to update
  // only their own set subscriptions.
  return user.id === subscription.id;
});
