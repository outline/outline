import { observable } from "mobx";
import type { IntegrationSettings } from "@shared/types";
import BaseModel from "~/models/BaseModel";
import Field from "./decorators/Field";

class Integration<T = unknown> extends BaseModel {
  id: string;

  type: T;

  service: string;

  collectionId: string;

  @Field
  @observable
  events: string[];

  settings: IntegrationSettings<T>;
}

export default Integration;
