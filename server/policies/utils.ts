import env from "@server/env";
import type { User } from "@server/models";
import { Team, type Group } from "@server/models";
import type Model from "@server/models/base/Model";
import { GroupPermission } from "@shared/types";
import invariant from "invariant";

type Args = boolean | string | Args[];

export function and(...args: Args[]) {
  for (const arg of args) {
    if (!arg) {
      return false;
    }
  }
  return args;
}

export function or(...args: Args[]) {
  return args.find(Boolean) || false;
}

/**
 * Check if the actor is present in the same team as the model.
 *
 * @param actor The actor to check
 * @param model The model to check
 * @returns True if the actor is in the same team as the model
 */
export function isTeamModel(
  actor: User,
  model: Model | null | undefined
): model is Model {
  if (!model) {
    return false;
  }
  if (model instanceof Team) {
    return actor.teamId === model.id;
  }
  if ("teamId" in model) {
    return actor.teamId === model.teamId;
  }
  return false;
}

/**
 * Check if the actor is the owner of the model.
 *
 * @param actor The actor to check
 * @param model The model to check
 * @returns True if the actor is the owner of the model
 */
export function isOwner(
  actor: User,
  model: Model | null | undefined
): model is Model {
  if (!model) {
    return false;
  }
  if ("userId" in model) {
    return actor.id === model.userId;
  }
  if ("createdById" in model) {
    return actor.id === model.createdById;
  }
  return false;
}

/**
 * Check if the actor is an admin of the team.
 *
 * @param actor The actor to check
 * @param mode The model to check
 * @returns True if the actor is an admin of the team the model belongs to
 */
export function isTeamAdmin(
  actor: User,
  model: Model | null | undefined
): model is Model {
  return !!and(isTeamModel(actor, model), actor.isAdmin);
}

/**
 * Check if the actor is a member of the team.
 *
 * @param actor The actor to check
 * @param model The model to check
 * @returns True if the actor is a member of the team the model belongs to
 */
export function isTeamMember(actor: User, model: Model | null | undefined) {
  return !!and(isTeamModel(actor, model), actor.isMember);
}

/**
 * Check the actors team is mutable, meaning the team models can be modified.
 *
 * @param actor The actor to check
 * @returns True if the actor's team is mutable
 */
export function isTeamMutable(_actor: User, _model?: Model | null) {
  return true;
}

/**
 * Check if this instance is running in the cloud-hosted environment.
 */
export function isCloudHosted() {
  if (!env.isCloudHosted) {
    return false;
  }
  return true;
}

/**
 * Check if the actor is an admin of the group.
 *
 * @param actor The actor to check
 * @param model The group model to check
 * @returns True if the actor is an admin of the group
 */
export function isGroupAdmin(actor: User, model: Group | null): boolean {
  if (!model || !("id" in model)) {
    return false;
  }

  invariant(
    model.groupUsers,
    "Group users relationship not loaded, ensure to include groupUsers when fetching the group"
  );

  // Check if the user is a group admin
  const membership = model.groupUsers.find(
    (gu) => gu.userId === actor.id && gu.permission === GroupPermission.Admin
  );
  if (membership) {
    return true;
  }

  // Team admins are always group admins
  if (isTeamAdmin(actor, model)) {
    return true;
  }

  return false;
}
