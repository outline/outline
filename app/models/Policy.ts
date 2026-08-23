import { isEqual } from "es-toolkit/compat";
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
  @computed({ keepAlive: true })
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
    const { notes, notebooks, policies } = model.store.rootStore;
    if (isEqual(model.abilities, previousAttributes.abilities)) {
      return;
    }
    const notebook = notebooks.get(model.id);
    if (notebook) {
      notes.inNotebook(notebook.id).forEach((i) => {
        policies.remove(i.id);
      });
      return;
    }
    const note = notes.get(model.id);
    if (note) {
      note.childNotes.forEach((i) => {
        policies.remove(i.id);
      });
      return;
    }
  }
}
export default Policy;
