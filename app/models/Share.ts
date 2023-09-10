import { observable } from "mobx";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Share extends Model {
  @Field
  @observable
  id: string;

  @Field
  @observable
  published: boolean;

  @Field
  @observable
  includeChildDocuments: boolean;

  @Field
  @observable
  documentId: string;

  @Field
  @observable
  urlId: string;

  documentTitle: string;

  documentUrl: string;

  lastAccessedAt: string | null | undefined;

  url: string;

  createdBy: User;
}

export default Share;
