import { observable } from "mobx";
import type StarsStore from "~/stores/StarsStore";
import Notebook from "./Notebook";
import Note from "./Note";
import Model from "./base/Model";
import Field, { WireAlias } from "./decorators/Field";
import Relation from "./decorators/Relation";
class Star extends Model {
  static modelName = "Star";
  /** The sort order of the star */
  @Field
  @observable
  index: string;
  /** The note ID that is starred. */
  @WireAlias("documentId")
  noteId?: string;
  /** The note that is starred. */
  @Relation(() => Note, { onDelete: "cascade" })
  note?: Note;
  /** The notebook ID that is starred. */
  @WireAlias("collectionId")
  notebookId?: string;
  /** The notebook that is starred. */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook: Notebook;
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
