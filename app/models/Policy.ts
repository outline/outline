import { observable } from "mobx";
import Model from "./base/Model";

class Policy extends Model {
  static modelName = "Policy";

  id: string;

  @observable
  abilities: Record<string, boolean>;
}

export default Policy;
