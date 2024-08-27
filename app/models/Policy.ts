import { computed, observable } from "mobx";
import Model from "./base/Model";

class Policy extends Model {
  static modelName = "Policy";

  id: string;

  @observable
  abilities: Record<string, boolean | string[]>;

  /**
   * Abilities flattened to an object with boolean values.
   */
  @computed
  get flattenedAbilities() {
    const abilities: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(this.abilities)) {
      if (Array.isArray(value)) {
        abilities[key] = value.length > 0;
      } else {
        abilities[key] = value as boolean;
      }
    }
    return abilities;
  }
}

export default Policy;
