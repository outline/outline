import { Transaction } from "sequelize";
import {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import { User, Integration, IntegrationAuthentication } from "@server/models";
import { UserCreatableIntegrationService } from "@server/models/Integration";

type Props = {
  user: User;
  service: UserCreatableIntegrationService | IntegrationService;
  settings: IntegrationSettings<unknown>;
  type: IntegrationType;
  authScopes?: string[];
  token?: string | null;
  collectionId?: string;
  events?: string[];
  transaction: Transaction;
};

export default async function integrationCreator({
  user,
  service,
  settings,
  type,
  authScopes,
  token,
  collectionId,
  events,
  transaction,
}: Props) {
  let integration = await Integration.create(
    {
      userId: user.id,
      teamId: user.teamId,
      service,
      settings,
      collectionId,
      events,
      type,
    },
    { transaction }
  );

  let authentication: IntegrationAuthentication | undefined;
  if (token) {
    authentication = await IntegrationAuthentication.create(
      {
        userId: user.id,
        teamId: user.teamId,
        integrationId: integration.id,
        service,
        scopes: authScopes,
        token,
      },
      { transaction }
    );

    integration.authenticationId = authentication.id;
    await integration.save({ transaction });
  }

  integration = (await Integration.scope(
    "withAuthentication"
  ).findByPk(integration.id, { transaction })) as Integration<unknown>;

  return integration;
}
