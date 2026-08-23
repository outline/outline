import { observable } from "mobx";
import Notebook from "./Notebook";
import Note from "./Note";
import User from "./User";
import Model from "./base/Model";
import Field, { WireAlias } from "./decorators/Field";
import Relation from "./decorators/Relation";
/**
 * A subscription represents a request for a user to receive notifications for a note.
 */
class Subscription extends Model {
  static modelName = "Subscription";
  /** The user ID subscribing */
  userId: string;
  /** The user subscribing */
  @Relation(() => User, { onDelete: "cascade" })
  user?: User;
  /** The note ID being subscribed to */
  noteId: string;
  /** The note being subscribed to */
  @Relation(() => Note, { onDelete: "cascade" })
  note?: Note;
  /** The notebook ID being subscribed to */
  @WireAlias("collectionId")
  notebookId: string;
  /** The notebook being subscribed to */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook?: Notebook;
  /** The event being subscribed to */
  @Field
  @observable
  event: string;
}
export default Subscription;
