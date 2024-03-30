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
export function isTeamModel(actor: User, model: Team | Model | null) {
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
