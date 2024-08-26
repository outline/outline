import { differenceInMilliseconds } from "date-fns";
import random from "lodash/random";
import { Op } from "sequelize";
import { IntegrationService, IntegrationType, JSONObject } from "@shared/types";
import { Minute } from "@shared/utils/time";
import env from "@server/env";
import {
  Collection,
  Document,
  Integration,
  IntegrationAuthentication,
  Team,
} from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { sequelize } from "@server/storage/database";
import {
  DeleteIntegrationWebhook,
  DocumentEvent,
  Event,
  IntegrationEvent,
  RevisionEvent,
} from "@server/types";
import { encrypt } from "@server/utils/crypto";
import fetch from "@server/utils/fetch";
import { isIMIntegrationService } from "@server/utils/integrations";
import { sleep } from "@server/utils/timers";
import DeleteIntegrationWebhookTask from "../tasks/DeleteIntegrationWebhookTask";

export type MessageAttachmentProps = {
  document: Document;
  team: Team;
  collection?: Collection | null;
};

export type IntegrationDataProps = {
  accountIntegration: Integration<IntegrationType.LinkedAccount>;
  postIntegration: Integration<IntegrationType.Post>;
  authentication: IntegrationAuthentication;
};

/** Add the service in IMIntegrationServices (server/utils/integrations.ts) when a new subclass is implemented. */
export default abstract class IMIntegrationProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [];

  private service: IntegrationService;
  private deleteWebhookTaskDelayBound = (5 * Minute) / 1000;

  constructor(service: IntegrationService) {
    super();
    this.service = service;
  }

  public async perform(event: Event): Promise<void> {
    switch (event.name) {
      case "documents.publish":
      case "revisions.create":
        // wait a few seconds to give the document summary chance to be generated
        await sleep(5000);
        return this.documentUpdated(event);

      case "integrations.create":
        return this.integrationCreated(event);

      case "integrations.delete":
        return this.integrationDeleted(event);

      default:
    }
  }

  private async documentUpdated(
    event: DocumentEvent | RevisionEvent
  ): Promise<void> {
    // don't send notifications when batch importing documents.
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type 'DocumentEv... Remove this comment to see the full error message
    if (event.data && event.data.source === "import") {
      return;
    }

    const [document, team] = await Promise.all([
      Document.scope(["defaultScope", "withCollection"]).findOne({
        where: {
          id: event.documentId,
        },
      }),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !team) {
      return;
    }

    // don't send notifications for draft documents.
    if (!document.publishedAt) {
      return;
    }

    // if the document was published less than a minute ago,
    // don't send a separate notification.
    if (
      event.name === "revisions.create" &&
      differenceInMilliseconds(document.updatedAt, document.publishedAt) <
        Minute
    ) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        teamId: document.teamId,
        collectionId: document.collectionId,
        service: this.service,
        type: IntegrationType.Post,
        events: {
          [Op.contains]: [
            event.name === "revisions.create" ? "documents.update" : event.name,
          ],
        },
      },
    })) as Integration<IntegrationType.Post>;

    if (!integration) {
      return;
    }

    let text = `${document.updatedBy.name} updated "${document.title}"`;

    if (event.name === "documents.publish") {
      text = `${document.createdBy.name} published "${document.title}"`;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        username: env.APP_NAME,
        attachments: this.getMessageAttachments({
          document,
          team,
          collection: document.collection,
        }),
      }),
    });
  }

  private async integrationCreated(event: IntegrationEvent): Promise<void> {
    const integration = (await Integration.findOne({
      where: {
        id: event.modelId,
        service: this.service,
        type: IntegrationType.Post,
      },
      include: [
        {
          model: Team,
          required: true,
          as: "team",
        },
        {
          model: Collection,
          required: true,
          as: "collection",
        },
      ],
    })) as Integration<IntegrationType.Post>;

    if (!integration) {
      return;
    }

    const team = integration.team;
    const collection = integration.collection;

    if (!team || !collection) {
      return;
    }

    await fetch(integration.settings.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `👋 Hey there!\nWhen documents are published or updated in the *${collection.name}* collection on ${env.APP_NAME}, they will be posted to this channel.`,
        username: env.APP_NAME,
        attachments: [
          {
            color: collection.color,
            title: collection.name,
            title_link: `${team.url}${collection.path}`,
            text: collection.description,
          },
        ],
      }),
    });
  }

  private async integrationDeleted(event: IntegrationEvent): Promise<void> {
    const integration = await Integration.findOne({
      where: {
        id: event.modelId,
      },
      paranoid: false,
    });

    if (!integration || !isIMIntegrationService(integration.service)) {
      return;
    }

    switch (integration.type) {
      case IntegrationType.LinkedAccount: {
        return this.deleteLinkedAccountIntegration({
          accountIntegration: integration,
        });
      }

      case IntegrationType.Post: {
        return this.deletePostIntegration({ postIntegration: integration });
      }
      default:
    }
  }

  private async deleteLinkedAccountIntegration({
    accountIntegration,
  }: {
    accountIntegration: Integration<IntegrationType.LinkedAccount>;
  }) {
    const associatedIntegrations = await Integration.findAll({
      where: {
        service: this.service,
        type: {
          [Op.in]: [IntegrationType.Post, IntegrationType.Command],
        },
        userId: accountIntegration.userId,
        teamId: accountIntegration.teamId,
      },
    });

    const authentication = await accountIntegration.$get("authentication");

    if (authentication) {
      const postIntegrations = associatedIntegrations.filter(
        (assocIntegration) => assocIntegration.type === IntegrationType.Post
      );

      const deleteWebhookTasksProps = postIntegrations
        .map((postIntegration) =>
          this.getDeleteWebhookTaskProps({
            accountIntegration,
            postIntegration,
            authentication,
          })
        )
        .filter((props) => props !== undefined);

      await Promise.all(
        deleteWebhookTasksProps.map((props) =>
          DeleteIntegrationWebhookTask.schedule(props, {
            // Space out the tasks to avoid rate-limit errors from the external API.
            delay: random(this.deleteWebhookTaskDelayBound) * 1000,
          })
        )
      );
    }

    await sequelize.transaction(async (transaction) => {
      await Promise.all(
        associatedIntegrations.map((assocIntegration) =>
          assocIntegration.destroy({ force: true, transaction })
        )
      );
      await accountIntegration.destroy({ force: true, transaction });
    });
  }

  private async deletePostIntegration({
    postIntegration,
  }: {
    postIntegration: Integration<IntegrationType.Post>;
  }) {
    const accountIntegration = await Integration.scope(
      "withAuthentication"
    ).findOne({
      where: {
        service: this.service,
        type: IntegrationType.LinkedAccount,
        userId: postIntegration.userId,
        teamId: postIntegration.teamId,
      },
    });

    if (accountIntegration && accountIntegration.authentication) {
      const deleteWebhookTaskProps = this.getDeleteWebhookTaskProps({
        accountIntegration,
        postIntegration,
        authentication: accountIntegration.authentication,
      });
      if (deleteWebhookTaskProps) {
        await DeleteIntegrationWebhookTask.schedule(deleteWebhookTaskProps);
      }
    }

    await postIntegration.destroy({ force: true });
  }

  private getDeleteWebhookTaskProps(
    props: IntegrationDataProps
  ): DeleteIntegrationWebhook | undefined {
    const data = this.getDeleteWebhookTaskData(props);
    if (!data) {
      return;
    }
    return {
      method: data.method,
      url: encrypt(data.url),
      apiKey: encrypt(data.apiKey),
    };
  }

  protected abstract getMessageAttachments(
    props: MessageAttachmentProps
  ): Array<JSONObject>;

  protected abstract getDeleteWebhookTaskData(
    props: IntegrationDataProps
  ): DeleteIntegrationWebhook | undefined;
}
