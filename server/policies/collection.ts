import invariant from "invariant";
import some from "lodash/some";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import { Collection, User, Team } from "@server/models";
import { allow, _can as can } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "createCollection", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isGuest,
    !actor.isViewer,
    or(actor.isAdmin, !!team?.memberCollectionCreate)
  )
);

allow(User, "importCollection", Team, (actor, team) =>
  and(
    //
    isTeamAdmin(actor, team),
    isTeamMutable(actor)
  )
);

allow(User, "move", Collection, (actor, collection) =>
  and(
    //
    isTeamAdmin(actor, collection),
    isTeamMutable(actor),
    !collection?.deletedAt
  )
);

allow(User, "read", Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  if (collection.isPrivate || user.isGuest) {
    return includesMembership(collection, Object.values(CollectionPermission));
  }

  return true;
});

allow(
  User,
  ["readDocument", "star", "unstar"],
  Collection,
  (user, collection) => {
    if (!collection || user.teamId !== collection.teamId) {
      return false;
    }

    if (collection.isPrivate || user.isGuest) {
      return includesMembership(
        collection,
        Object.values(CollectionPermission)
      );
    }

    return true;
  }
);

allow(User, "export", Collection, (actor, collection) =>
  and(
    //
    can(actor, "read", collection),
    !actor.isViewer,
    !actor.isGuest
  )
);

allow(User, "share", Collection, (user, collection) => {
  if (
    !collection ||
    user.isGuest ||
    user.teamId !== collection.teamId ||
    !isTeamMutable(user)
  ) {
    return false;
  }
  if (!collection.sharing) {
    return false;
  }
  if (!collection.isPrivate && user.isAdmin) {
    return true;
  }

  if (
    collection.permission !== CollectionPermission.ReadWrite ||
    user.isViewer
  ) {
    return includesMembership(collection, [
      CollectionPermission.ReadWrite,
      CollectionPermission.Admin,
    ]);
  }

  return true;
});

allow(
  User,
  ["updateDocument", "createDocument", "deleteDocument"],
  Collection,
  (user, collection) => {
    if (
      !collection ||
      user.teamId !== collection.teamId ||
      !isTeamMutable(user)
    ) {
      return false;
    }

    if (!collection.isPrivate && user.isAdmin) {
      return true;
    }

    if (
      collection.permission !== CollectionPermission.ReadWrite ||
      user.isViewer ||
      user.isGuest
    ) {
      return includesMembership(collection, [
        CollectionPermission.ReadWrite,
        CollectionPermission.Admin,
      ]);
    }

    return true;
  }
);

allow(User, ["update", "delete"], Collection, (user, collection) => {
  if (!collection || user.isGuest || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  return includesMembership(collection, [CollectionPermission.Admin]);
});

function includesMembership(
  collection: Collection | null,
  permissions: (CollectionPermission | DocumentPermission)[]
) {
  if (!collection) {
    return false;
  }

  invariant(
    collection.memberships,
    "Development: collection memberships not preloaded, did you forget `withMembership` scope?"
  );
  return some(
    [...collection.memberships, ...collection.groupMemberships],
    (m) => permissions.includes(m.permission)
  );
}
