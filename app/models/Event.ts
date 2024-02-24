import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Event extends Model {
  static modelName = "Event";

  id: string;

  name: string;

  modelId: string | null | undefined;

  actorIpAddress: string | null | undefined;

  documentId: string;

  collectionId: string | null | undefined;

  @Relation(() => User)
  user: User;

  userId: string;

  @Relation(() => User)
  actor: User;

  actorId: string;

  data: {
    name: string;
    email: string;
    title: string;
    published: boolean;
    templateId: string;
  };
}

export default Event;
