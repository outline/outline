import invariant from "invariant";
import { some } from "lodash";
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

allow(User, ["read", "star", "unstar"], Collection, (user, collection) => {
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  if (!collection.permission) {
    invariant(
      collection.memberships,
      "membership should be preloaded, did you forget withMembership scope?"
    );
    const allMemberships = [
      ...collection.memberships,
      ...collection.collectionGroupMemberships,
    ];
    return some(allMemberships, (m) =>
      ["read", "read_write", "maintainer"].includes(m.permission)
    );
  }

  return true;
});

allow(User, "share", Collection, (user, collection) => {
  if (user.isViewer) {
    return false;
  }
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (!collection.sharing) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  if (collection.permission !== "read_write") {
    invariant(
      collection.memberships,
      "membership should be preloaded, did you forget withMembership scope?"
    );
    const allMemberships = [
      ...collection.memberships,
      ...collection.collectionGroupMemberships,
    ];
    return some(allMemberships, (m) =>
      ["read_write", "maintainer"].includes(m.permission)
    );
  }

  return true;
});

allow(User, ["publish", "update"], Collection, (user, collection) => {
  if (user.isViewer) {
    return false;
  }
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  if (collection.permission !== "read_write") {
    invariant(
      collection.memberships,
      "membership should be preloaded, did you forget withMembership scope?"
    );
    const allMemberships = [
      ...collection.memberships,
      ...collection.collectionGroupMemberships,
    ];
    return some(allMemberships, (m) =>
      ["read_write", "maintainer"].includes(m.permission)
    );
  }

  return true;
});

allow(User, "delete", Collection, (user, collection) => {
  if (user.isViewer) {
    return false;
  }
  if (!collection || user.teamId !== collection.teamId) {
    return false;
  }
  if (user.isAdmin) {
    return true;
  }

  if (collection.permission !== "read_write") {
    invariant(
      collection.memberships,
      "membership should be preloaded, did you forget withMembership scope?"
    );
    const allMemberships = [
      ...collection.memberships,
      ...collection.collectionGroupMemberships,
    ];
    return some(allMemberships, (m) =>
      ["read_write", "maintainer"].includes(m.permission)
    );
  }

  if (user.id === collection.createdById) {
    return true;
  }

  throw AdminRequiredError();
});
