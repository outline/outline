import { computed, observable } from "mobx";
import Model from "./Model";

export default abstract class ParanoidModel extends Model {
  @observable
  deletedAt: string | undefined;

  @computed
  get isDeleted(): boolean {
    return !!this.deletedAt;
  }
}
