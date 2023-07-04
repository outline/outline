import { observable } from "mobx";
import type {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import BaseModel from "~/models/BaseModel";
import Field from "./decorators/Field";

class Integration<T = unknown> extends BaseModel {
  id: string;

  type: IntegrationType;

  service: IntegrationService;

  collectionId: string;

  @Field
  @observable
  events: string[];

  settings: IntegrationSettings<T>;
}

export default Integration;
