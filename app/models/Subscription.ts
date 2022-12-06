import { observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

/**
 * A subscription represents a request for a user to receive notifications for
 * a document.
 */
class Subscription extends BaseModel {
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

  createdAt: string;
  updatedAt: string;
}

export default Subscription;
