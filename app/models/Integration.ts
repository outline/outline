import { observable } from "mobx";
import {
  IntegrationService,
  type IntegrationSettings,
  type IntegrationType,
} from "@shared/types";
import User from "~/models/User";
import Model from "~/models/base/Model";
import Field from "~/models/decorators/Field";
import Relation from "~/models/decorators/Relation";

class Integration<T = unknown> extends Model {
  static modelName = "Integration";

  @observable
  type: IntegrationType;

  @observable
  service: IntegrationService;

  collectionId: string;

  userId: string;

  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  @Field
  @observable
  events: string[] = [];

  @observable
  settings: IntegrationSettings<T>;

  /**
   * Whether the embed option should be hidden in paste menu for this integration.
   * Currently only applies to Linear integration.
   *
   * @returns True if embed option should be hidden for this integration, false otherwise.
   */
  get shouldHideEmbed(): boolean {
    if (this.service !== IntegrationService.Linear) {
      return false;
    }
    const settings = this.settings as IntegrationSettings<IntegrationType.Embed>;
    return !!settings?.linear?.hideEmbedOption;
  }
}

export default Integration;
