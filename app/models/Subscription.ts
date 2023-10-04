import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

/**
 * A subscription represents a request for a user to receive notifications for
 * a document.
 */
class Subscription extends Model {
  @Field
  @observable
  id: string;

  /** The user subscribing */
  userId: string;

  /** The document being subscribed to */
  documentId: string;

  /** The event being subscribed to */
  @Field
  @observable
  event: string;
}

export default Subscription;
