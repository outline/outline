import { observable } from "mobx";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Emoji extends Model {
  static modelName = "Emoji";

  /** The name of the emoji */
  @Field
  @observable
  name: string;

  /** The URL of the emoji image */
  @Field
  @observable
  url: string;

  /** The team ID this emoji belongs to */
  @Field
  @observable
  teamId: string;

  /** The user who created this emoji */
  @observable
  createdBy?: User;

  /** The ID of the user who created this emoji */
  @Field
  @observable
  createdById: string;
}

export default Emoji;
