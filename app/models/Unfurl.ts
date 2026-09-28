import { observable } from "mobx";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import Model from "./base/Model";

class Unfurl<UnfurlType extends UnfurlResourceType> extends Model {
  static modelName = "Unfurl";

  constructor(fields: Record<string, unknown>, store: Model["store"]) {
    super(fields, store);
    this.initialize(fields);
  }

  @observable
  type: UnfurlType;

  @observable
  data: UnfurlResponse[UnfurlType];

  @observable
  fetchedAt: string;
}

export default Unfurl;
