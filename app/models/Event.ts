import type { AuthenticationType } from "@shared/types";
import Notebook from "./Notebook";
import Note from "./Note";
import User from "./User";
import Model from "./base/Model";
import { WireAlias } from "./decorators/Field";
import Relation from "./decorators/Relation";
class Event<T extends Model> extends Model {
  static modelName = "Event";
  name: string;
  modelId: string | undefined;
  actorIpAddress: string | null | undefined;
  @Relation(() => Note)
  note: Note;
  noteId: string | undefined;
  @Relation(() => Notebook)
  notebook: Notebook;
  @WireAlias("collectionId")
  notebookId: string | undefined;
  @Relation(() => User)
  user: User;
  userId: string;
  @Relation(() => User)
  actor: User;
  actorId: string;
  authType: AuthenticationType | null;
  data: Partial<T> | null;
  changes: {
    attributes: Partial<T>;
    previous: Partial<T>;
  } | null;
}
export default Event;
