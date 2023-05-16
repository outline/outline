import invariant from "invariant";
import { some } from "lodash";
import { CollectionPermission } from "@shared/types";
import { Collection, User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import { allow } from "./cancan";

allow(User, "createCollection", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  if (user.isAdmin || team.memberCollectionCreate) {
    return true;
  }
  return false;
});

allow(User, "importCollection", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "move", Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (collection.deletedAt) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(User, "read", Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  if (collection.isPrivate) {
    return includesMembership(collection, Object.values(CollectionPermission));
  }

  return true;
});

allow(User, ["star", "unstar"], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }

  if (collection.isPrivate) {
    return includesMembership(collection, Object.values(CollectionPermission));
  }

  return true;
});

allow(User, "share", Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
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

allow(User, ["readDocument", "export"], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }

  if (collection.isPrivate) {
    return includesMembership(collection, Object.values(CollectionPermission));
  }

  return true;
});

allow(
  User,
  ["updateDocument", "createDocument", "deleteDocument"],
  Collection,
  (user, collection) => {
    if (!collection || user.teamId !== collection.teamId) {
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
  }
);

allow(User, ["update", "delete"], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  return includesMembership(collection, [CollectionPermission.Admin]);
});

function includesMembership(
  collection: Collection,
  memberships: CollectionPermission[]
) {
  invariant(
    collection.memberships,
    "memberships should be preloaded, did you forget withMembership scope?"
  );
  return some(
    [...collection.memberships, ...collection.collectionGroupMemberships],
    (m) => memberships.includes(m.permission)
  );
}
