import BaseModel from "./BaseModel";
import User from "./User";

class Event extends BaseModel {
  id: string;

  name: string;

  modelId: string | null | undefined;

  actorId: string;

  actorIpAddress: string | null | undefined;

  documentId: string;

  collectionId: string | null | undefined;

  userId: string;

  createdAt: string;

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
