import { observable } from "mobx";
import type TagsStore from "~/stores/TagsStore";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Tag extends Model {
  static modelName = "Tag";

  /** The display name of the tag. */
  @Field
  @observable
  name: string;

  /** The number of documents this tag is applied to. */
  @observable
  documentCount: number;

  /** The team this tag belongs to. */
  teamId: string;

  store: TagsStore;
}

export default Tag;
