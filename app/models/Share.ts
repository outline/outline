import { observable } from "mobx";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Share extends Model {
  @Field
  @observable
  published: boolean;

  @Field
  @observable
  includeChildDocuments: boolean;

  /** The document ID that is shared. */
  @Field
  @observable
  documentId: string;

  /** The document that is shared. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  @Field
  @observable
  urlId: string;

  @observable
  documentTitle: string;

  @observable
  documentUrl: string;

  @observable
  lastAccessedAt: string | null | undefined;

  @observable
  url: string;

  /** The user that shared the document. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;
}

export default Share;
