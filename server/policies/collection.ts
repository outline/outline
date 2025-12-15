import invariant from "invariant";
import { CollectionPermission } from "@shared/types";
import { Collection, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "createCollection", Team, (actor, team) =>
  and(
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, team),
    isTeamMutable(actor),
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
    !!collection?.isActive,
    isTeamAdmin(actor, collection),
    isTeamMutable(actor)
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
  ["readDocument", "star", "unstar", "subscribe", "unsubscribe"],
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

allow(User, "updateDocument", Collection, (user, collection) => {
  if (!collection || !isTeamModel(user, collection) || !isTeamMutable(user)) {
    return false;
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
});

allow(
  User,
  ["createDocument", "deleteDocument"],
  Collection,
  (user, collection) => {
    if (
      !collection ||
      !collection.isActive ||
      !isTeamModel(user, collection) ||
      !isTeamMutable(user)
    ) {
      return false;
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

allow(User, ["update", "export", "archive"], Collection, (user, collection) =>
  and(
    !!collection,
    !!collection?.isActive,
    or(
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "delete", Collection, (user, collection) =>
  and(
    !!collection,
    !collection?.deletedAt,
    or(
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "restore", Collection, (user, collection) =>
  and(
    !!collection,
    !collection?.isActive,
    or(
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

function includesMembership(
  collection: Collection | null,
  permissions: CollectionPermission[]
) {
  if (!collection) {
    return false;
  }

  invariant(
    collection.memberships,
    "Development: collection memberships not preloaded, did you forget `withMembership` scope?"
  );
  invariant(
    collection.groupMemberships,
    "Development: collection groupMemberships not preloaded, did you forget `withMembership` scope?"
  );

  const permissionSet = new Set(permissions);
  const membershipIds: string[] = [];

  for (const membership of collection.memberships) {
    if (permissionSet.has(membership.permission as CollectionPermission)) {
      membershipIds.push(membership.id);
    }
  }

  for (const membership of collection.groupMemberships) {
    if (permissionSet.has(membership.permission as CollectionPermission)) {
      membershipIds.push(membership.id);
    }
  }

  return membershipIds.length > 0 ? membershipIds : false;
}
