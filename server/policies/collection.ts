import invariant from "invariant";
import { CollectionPermission, TeamPreference } from "@shared/types";
import { Collection, User, Team } from "@server/models";
import { allow, can } from "./cancan";
import {
  and,
  isCollectionOwner,
  isCollectionWritable,
  isTeamAdmin,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

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

allow(User, "createPersonalCollection", Team, (actor, team) =>
  and(
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !!team?.getPreference(TeamPreference.PersonalDocs)
  )
);

allow(User, "move", Collection, (actor, collection) =>
  and(
    !!collection?.isActive,
    !collection?.isPersonal,
    isTeamAdmin(actor, collection),
    isTeamMutable(actor)
  )
);

allow(User, "read", Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (collection.isPersonal) {
    return isCollectionOwner(user, collection);
  }
  if (user.isAdmin) {
    return true;
  }

  if (collection.isPrivate || user.isGuest) {
    return includesMembership(collection, Object.values(CollectionPermission));
  }

  return true;
});

allow(User, "duplicate", Collection, (actor, collection) =>
  and(
    !!collection?.isActive,
    !collection?.isPersonal,
    can(actor, "read", collection),
    can(actor, "createCollection", actor.team)
  )
);

allow(User, "download", Collection, (actor, collection) =>
  and(
    can(actor, "read", collection),
    or(
      and(!actor.isGuest, !actor.isViewer),
      !!actor.team.getPreference(TeamPreference.ViewersCanExport)
    )
  )
);

// A personal collection cannot be starred, as it has no page to link to.
allow(User, ["star", "unstar"], Collection, (user, collection) =>
  and(
    //
    !collection?.isPersonal,
    can(user, "readDocument", collection)
  )
);

allow(
  User,
  ["readDocument", "subscribe", "unsubscribe"],
  Collection,
  (user, collection) => {
    if (!collection || user.teamId !== collection.teamId) {
      return false;
    }

    if (collection.isPersonal) {
      return isCollectionOwner(user, collection);
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

allow(User, "share", Collection, (user, collection) =>
  and(
    //
    !collection?.isPersonal,
    can(user, "shareDocument", collection)
  )
);

allow(User, "shareDocument", Collection, (user, collection) => {
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
  if (collection.isPersonal) {
    return isCollectionOwner(user, collection);
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
  if (
    !collection ||
    !isTeamModel(user, collection) ||
    !isTeamMutable(user) ||
    !isCollectionWritable(user, collection)
  ) {
    return false;
  }
  if (collection.isPersonal) {
    return isCollectionOwner(user, collection);
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
      !isTeamMutable(user) ||
      !isCollectionWritable(user, collection)
    ) {
      return false;
    }
    if (collection.isPersonal) {
      return isCollectionOwner(user, collection);
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

allow(
  User,
  ["createTemplate", "manageTemplate"],
  Collection,
  (user, collection) =>
    and(
      !!collection,
      !!collection?.isActive,
      isTeamModel(user, collection),
      isTeamMutable(user),
      // Templates in a personal collection would only be visible to its owner.
      !collection?.isPersonal,
      or(
        isTeamAdmin(user, collection),
        includesMembership(collection, [CollectionPermission.Admin]),
        and(
          collection?.templateManagement === CollectionPermission.ReadWrite,
          !user.isGuest,
          or(
            and(
              collection?.permission === CollectionPermission.ReadWrite,
              !user.isViewer
            ),
            includesMembership(collection, [
              CollectionPermission.ReadWrite,
              CollectionPermission.Admin,
            ])
          )
        )
      )
    )
);

allow(User, "update", Collection, (user, collection) =>
  and(
    !!collection,
    !!collection?.isActive,
    isOwnerIfPersonal(user, collection),
    or(
      isCollectionOwner(user, collection),
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

// A personal collection cannot be archived or deleted, so that its owner always
// has exactly one.
allow(User, "archive", Collection, (user, collection) =>
  and(
    //
    !collection?.isPersonal,
    can(user, "update", collection)
  )
);

// Pins are shown on the collection page, which a personal collection does not
// have.
allow(User, "pin", Collection, (user, collection) =>
  and(
    //
    !collection?.isPersonal,
    can(user, "update", collection)
  )
);

// Only the owner is a member of a personal collection, documents in it are
// shared through document memberships instead.
allow(User, "manageUsers", Collection, (user, collection) =>
  and(
    //
    !collection?.isPersonal,
    can(user, "update", collection)
  )
);

allow(User, "export", Collection, (user, collection) =>
  and(
    !!collection,
    !!collection?.isActive,
    can(user, "download", collection),
    isOwnerIfPersonal(user, collection),
    or(
      isCollectionOwner(user, collection),
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "delete", Collection, (user, collection) =>
  and(
    !!collection,
    !collection?.deletedAt,
    !collection?.isPersonal,
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
    isOwnerIfPersonal(user, collection),
    or(
      isCollectionOwner(user, collection),
      isTeamAdmin(user, collection),
      includesMembership(collection, [CollectionPermission.Admin])
    )
  )
);

allow(User, "updateDeprecatedReason", Collection, (actor, collection) =>
  and(
    !!collection?.archivedAt,
    !collection?.deletedAt,
    isTeamModel(actor, collection),
    isTeamMutable(actor),
    can(actor, "restore", collection)
  )
);

/**
 * Check that the actor owns the collection when it is a personal collection.
 * Admins have no access to the personal collections of other users.
 *
 * @param user The actor to check.
 * @param collection The collection to check.
 * @returns True if the collection is not personal or the actor owns it.
 */
function isOwnerIfPersonal(user: User, collection: Collection | null) {
  return !collection?.isPersonal || isCollectionOwner(user, collection);
}

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
