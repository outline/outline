import { observable } from "mobx";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

/**
 * A subscription represents a request for a user to receive notifications for a document.
 */
class Subscription extends Model {
  static modelName = "Subscription";

  constructor(fields: Record<string, unknown>, store: Model["store"]) {
    super(fields, store);
    this.initialize(fields);
  }

  /** The user ID subscribing */
  userId: string;

  /** The user subscribing */
  @Relation(() => User, { onDelete: "cascade" })
  user?: User;

  /** The document ID being subscribed to */
  documentId: string;

  /** The document being subscribed to */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /** The collection ID being subscribed to */
  collectionId: string;

  /** The collection being subscribed to */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  /** The event being subscribed to */
  @Field
  @observable
  event: string;
}

export default Subscription;
