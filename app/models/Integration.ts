import { observable } from "mobx";
import type {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import Model from "~/models/base/Model";
import Field from "./decorators/Field";

class Integration<T = unknown> extends Model {
  id: string;

  type: IntegrationType;

  service: IntegrationService;

  collectionId: string;

  @Field
  @observable
  events: string[];

  @observable
  settings: IntegrationSettings<T>;
}

export default Integration;
