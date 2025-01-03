import invariant from "invariant";
import filter from "lodash/filter";
import { CollectionPermission, UserRole } from "@shared/types";
import { Collection, User, Team } from "@server/models";
import { allow, can } from "./cancan";
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
    !!collection?.isActive
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
    return includesMembership(
      user,
      collection,
      Object.values(CollectionPermission)
    );
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
        user,
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
    return includesMembership(user, collection, [
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

  if (!collection.isPrivate && user.isAdmin) {
    return true;
  }

  if (
    collection.permission !== CollectionPermission.ReadWrite ||
    user.isViewer ||
    user.isGuest
  ) {
    return includesMembership(user, collection, [
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

    if (!collection.isPrivate && user.isAdmin) {
      return true;
    }

    if (
      collection.permission !== CollectionPermission.ReadWrite ||
      user.isViewer ||
      user.isGuest
    ) {
      return includesMembership(user, collection, [
        CollectionPermission.ReadWrite,
        CollectionPermission.Admin,
      ]);
    }

    return true;
  }
);

allow(User, ["update", "archive"], Collection, (user, collection) =>
  and(
    !!collection,
    !!collection?.isActive,
    or(
      isTeamAdmin(user, collection),
      includesMembership(user, collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "delete", Collection, (user, collection) =>
  and(
    !!collection,
    !collection?.deletedAt,
    or(
      isTeamAdmin(user, collection),
      includesMembership(user, collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "restore", Collection, (user, collection) =>
  and(
    !!collection,
    !collection?.isActive,
    or(
      isTeamAdmin(user, collection),
      includesMembership(user, collection, [CollectionPermission.Admin])
    )
  )
);

function includesMembership(
  user: User,
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

  const userMemberships = filter(collection.memberships, (m) =>
    permissions.includes(m.permission as CollectionPermission)
  );

  // Is a non-read permission included in the permissions list
  const isNonRead =
    permissions.filter((p) => p !== CollectionPermission.Read).length > 0;

  const groupMemberships = filter(collection.groupMemberships, (m) => {
    // If the user is a viewer and the permission is non-read provided through a group membership
    // they can't access. If the permission is provided through a user membership it is allowed
    // for backwards compatability.
    if (isNonRead && user.role === UserRole.Viewer) {
      return false;
    }

    return permissions.includes(m.permission as CollectionPermission);
  });

  const membershipIds = [...userMemberships, ...groupMemberships].map(
    (m) => m.id
  );

  return membershipIds.length > 0 ? membershipIds : false;
}
