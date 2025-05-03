import { observable } from "mobx";
import type StarsStore from "~/stores/StarsStore";
import Collection from "./Collection";
import Document from "./Document";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Star extends Model {
  static modelName = "Star";

  /** The sort order of the star */
  @Field
  @observable
  index: string;

  /** The document ID that is starred. */
  documentId?: string;

  /** The document that is starred. */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /** The collection ID that is starred. */
  collectionId?: string;

  /** The collection that is starred. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection;

  store: StarsStore;

  /**
   * Returns the next star in the list, or undefined if this is the last star.
   */
  next(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  /**
   * Returns the previous star in the list, or undefined if this is the first star.
   */
  previous(): Star | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default Star;
