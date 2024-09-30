import isEqual from "lodash/isEqual";
import { computed, observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterChange } from "./decorators/Lifecycle";

class Policy extends Model {
  static modelName = "Policy";

  /**
   * An object containing keys representing abilities and values that are either
   * a boolean or an array of membership IDs that have provided access to the ability.
   */
  @Field
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
        // Array should never be empty, but we check as a safety measure.
        abilities[key] = value.length > 0;
      } else {
        abilities[key] = value as boolean;
      }
    }
    return abilities;
  }

  @AfterChange
  public static removeChildPolicies(
    model: Policy,
    previousAttributes: Partial<Policy>
  ) {
    const { documents, collections, policies } = model.store.rootStore;

    if (isEqual(model.abilities, previousAttributes.abilities)) {
      return;
    }

    const collection = collections.get(model.id);
    if (collection) {
      documents.inCollection(collection.id).forEach((i) => {
        policies.remove(i.id);
      });
      return;
    }

    const document = documents.get(model.id);
    if (document) {
      document.childDocuments.forEach((i) => {
        policies.remove(i.id);
      });
      return;
    }
  }
}

export default Policy;
