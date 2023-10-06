import { observable } from "mobx";
import Collection from "./Collection";
import Document from "./Document";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Pin extends Model {
  /** The collection ID that the document is pinned to. If empty the document is pinned to home. */
  collectionId: string;

  /** The collection that the document is pinned to. If empty the document is pinned to home. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  /** The document ID that is pinned. */
  documentId: string;

  /** The document that is pinned. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /** The sort order of the pin on screen. */
  @observable
  @Field
  index: string;
}

export default Pin;
