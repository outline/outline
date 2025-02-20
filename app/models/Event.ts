import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Event<T extends Model> extends Model {
  static modelName = "Event";

  name: string;

  modelId: string | undefined;

  actorIpAddress: string | null | undefined;

  @Relation(() => Document)
  document: Document;

  documentId: string | undefined;

  @Relation(() => Collection)
  collection: Collection;

  collectionId: string | undefined;

  @Relation(() => User)
  user: User;

  userId: string;

  @Relation(() => User)
  actor: User;

  actorId: string;

  data: Partial<T> | null;

  changes: {
    attributes: Partial<T>;
    previous: Partial<T>;
  } | null;
}

export default Event;
