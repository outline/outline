import { Transaction } from "sequelize";
import { IntegrationSettings, IntegrationType } from "@shared/types";
import { User, Integration, IntegrationAuthentication } from "@server/models";
import { UserCreatableIntegrationService } from "@server/models/Integration";

type Props = {
  user: User;
  service: UserCreatableIntegrationService;
  settings: IntegrationSettings<unknown>;
  type: IntegrationType;
  token?: string | null;
  transaction: Transaction;
};

export default async function integrationCreator({
  user,
  service,
  settings,
  type,
  token,
  transaction,
}: Props) {
  let integration = await Integration.create(
    {
      userId: user.id,
      teamId: user.teamId,
      service,
      settings,
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
