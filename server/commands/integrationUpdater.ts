import { isNull } from "lodash";
import { Transaction } from "sequelize";
import { IntegrationSettings, IntegrationType } from "@shared/types";
import { Integration, IntegrationAuthentication } from "@server/models";

type Props = {
  /** Integration which is to be updated */
  integration: Integration;

  /** Integration events */
  events?: string[];

  /** Integration settings/config */
  settings?: IntegrationSettings<unknown>;

  /** Integration token */
  token?: string | null;

  /** The database transaction to run within */
  transaction: Transaction;
};

export default async function integrationUpdator({
  integration,
  events = [],
  settings,
  token,
  transaction,
}: Props) {
  integration.events = events;

  if (integration.type === IntegrationType.Post) {
    integration.events = events.filter((event: string) =>
      ["documents.update", "documents.publish"].includes(event)
    );
  }

  if (token) {
    let authentication: IntegrationAuthentication | undefined;
    if (integration.authenticationId) {
      const authentication = await IntegrationAuthentication.findByPk(
        integration.authenticationId,
        { transaction }
      );

      if (authentication) {
        authentication.token = token;
        await authentication.save({ transaction });
      }
    } else {
      authentication = await IntegrationAuthentication.create(
        {
          userId: integration.userId,
          teamId: integration.teamId,
          integrationId: integration.id,
          service: integration.service,
          token,
        },
        { transaction }
      );
      integration.authenticationId = authentication.id;
    }
  } else if (isNull(token)) {
    if (integration.authenticationId) {
      const authentication = await IntegrationAuthentication.findByPk(
        integration.authenticationId,
        { transaction }
      );

      if (authentication) {
        await authentication.destroy({ transaction });
      }
    }
  }

  integration.settings = settings;

  await integration.save({ transaction });

  integration = (await Integration.scope(
    "withAuthentication"
  ).findByPk(integration.id, { transaction })) as Integration<unknown>;

  return integration;
}
