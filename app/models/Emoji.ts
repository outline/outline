import { observable } from "mobx";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Emoji extends Model {
  static modelName = "Emoji";

  /** The name of the emoji */
  @Field
  @observable
  private _name: string;

  /** The URL of the emoji image */
  @Field
  @observable
  url: string;

  /** The ID of the related attachment */
  @Field
  @observable
  attachmentId: string;

  /** The user who created this emoji */
  @Relation(() => User)
  @observable
  createdBy?: User;

  /** The ID of the user who created this emoji */
  @Field
  @observable
  createdById: string;

  get searchContent(): string {
    return this.name;
  }

  /**
   * emoji name
   */
  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }
}

export default Emoji;
