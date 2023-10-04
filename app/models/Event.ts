import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Event extends Model {
  id: string;

  name: string;

  modelId: string | null | undefined;

  actorId: string;

  actorIpAddress: string | null | undefined;

  documentId: string;

  collectionId: string | null | undefined;

  userId: string;

  @Relation(() => User)
  actor: User;

  data: {
    name: string;
    email: string;
    title: string;
    published: boolean;
    templateId: string;
  };
}

export default Event;
