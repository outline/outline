import { action } from "mobx";
import Policy from "~/models/Policy";
import Logger from "~/utils/Logger";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class PoliciesStore extends Store<Policy> {
  actions = [];

  constructor(rootStore: RootStore) {
    super(rootStore, Policy);
  }

  /**
   * Remove all abilities that are linked to a specific membership ID. This is used
   * when a user loses a membership due to being removed from eg a group, collection or
   * document. Once all membership IDs are removed, the ability is no longer valid and
   * is converted to false.
   *
   * @param id - The membership ID to remove from all policies.
   */
  @action
  removeForMembership(id: string) {
    this.data.forEach((policy) => {
      Object.keys(policy.abilities).forEach((key) => {
        let can = policy.abilities[key];
        if (can === true || can === false) {
          return;
        }
        if (can.includes(id)) {
          can = can.filter((i) => i !== id);

          if (can.length === 0) {
            policy.abilities[key] = false;
          } else {
            policy.abilities[key] = can;
          }

          Logger.debug("policies", "Removed membership from policy", {
            policy: policy.id,
            ability: key,
            membershipId: id,
          });
        }
      });
    });
  }

  /**
   * Get the abilities for a specific policy. If the policy does not exist, the default
   * abilities are returned. Note that a policy ID is the same as the ID of the model it
   * is related to, eg a collection, document or group.
   *
   * @param id - The ID of the policy to get abilities for.
   */
  abilities(id: string) {
    const policy = this.get(id);
    return policy ? policy.flattenedAbilities : this.defaultAbilities;
  }

  private defaultAbilities = Object.freeze({} as Record<string, boolean>);
}
