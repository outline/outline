import { observable } from "mobx";
import type StarsStore from "~/stores/StarsStore";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Star extends Model {
  id: string;

  @Field
  @observable
  index: string;

  documentId: string;

  collectionId: string;

  store: StarsStore;

  next(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  previous(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default Star;
