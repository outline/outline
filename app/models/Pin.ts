import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Pin extends Model {
  id: string;
  collectionId: string;
  documentId: string;

  @observable
  @Field
  index: string;
}

export default Pin;
