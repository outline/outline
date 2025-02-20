import { observable } from "mobx";
import type {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import User from "~/models/User";
import Model from "~/models/base/Model";
import Field from "~/models/decorators/Field";
import Relation from "~/models/decorators/Relation";

class Integration<T = unknown> extends Model {
  static modelName = "Integration";

  type: IntegrationType;

  service: IntegrationService;

  collectionId: string;

  userId: string;

  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  @Field
  @observable
  events: string[];

  @observable
  settings: IntegrationSettings<T>;
}

export default Integration;
