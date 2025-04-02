import { observable } from "mobx";
import {
  IntegrationService,
  MentionType,
  type IntegrationSettings,
  type IntegrationType,
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

  isMentionable(url: URL) {
    const { hostname, pathname } = url;
    const pathParts = pathname.split("/");

    switch (this.service) {
      case IntegrationService.GitHub: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.Embed>;

        return (
          hostname === "github.com" &&
          settings.github?.installation.account.name === pathParts[1] // ensure installed org/account name matches with the provided url.
        );
      }

      default:
        return false;
    }
  }

  getMentionType(url: URL): MentionType | undefined {
    const { pathname } = url;
    const pathParts = pathname.split("/");

    switch (this.service) {
      case IntegrationService.GitHub: {
        const type = pathParts[3];
        return type === "pull"
          ? MentionType.PullRequest
          : type === "issues"
          ? MentionType.Issue
          : undefined;
      }

      default:
        return;
    }
  }
}

export default Integration;
