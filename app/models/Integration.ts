import { observable } from "mobx";
import BaseModel from "~/models/BaseModel";
import Field from "./decorators/Field";

type Settings = {
  url: string;
  channel: string;
  channelId: string;
};

class Integration extends BaseModel {
  id: string;

  type: string;

  service: string;

  collectionId: string;

  @Field
  @observable
  events: string[];

  settings: Settings;
}

export default Integration;
