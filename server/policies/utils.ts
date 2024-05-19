import env from "@server/env";
import { IncorrectEditionError } from "@server/errors";
import { User, Team } from "@server/models";
import Model from "@server/models/base/Model";

export function and(...args: boolean[]) {
  return args.every(Boolean);
}

export function or(...args: boolean[]) {
  return args.some(Boolean);
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
  return and(isTeamModel(actor, model), actor.isAdmin);
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
    throw IncorrectEditionError(
      "Functionality is not available in this edition"
    );
  }
  return true;
}
