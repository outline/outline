import { computed, observable } from "mobx";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import { Searchable } from "./interfaces/Searchable";

class Share extends Model implements Searchable {
  static modelName = "Share";

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

  /** The collection ID that is shared. */
  @Field
  @observable
  collectionId: string;

  /** The collection that is shared. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection;

  @Field
  @observable
  urlId: string;

  @Field
  @observable
  domain: string;

  @observable
  documentTitle: string;

  @observable
  documentUrl: string;

  @observable
  lastAccessedAt: string | null | undefined;

  @observable
  url: string;

  @Field
  @observable
  allowIndexing: boolean;

  @observable
  views: number;

  /** The user that shared the document. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;

  @computed
  get searchContent(): string[] {
    return [this.document?.title ?? this.documentTitle];
  }
}

export default Share;
