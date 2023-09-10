import { observable } from "mobx";
import Model from "./base/Model";

class Policy extends Model {
  id: string;

  @observable
  abilities: Record<string, boolean>;
}

export default Policy;
