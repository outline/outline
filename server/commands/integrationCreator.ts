import { Transaction } from "sequelize";
import {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import { User, Integration } from "@server/models";
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
  return Integration.create(
    {
      userId: user.id,
      teamId: user.teamId,
      service,
      settings,
      collectionId,
      events,
      type,
      authentication: token
        ? {
            userId: user.id,
            teamId: user.teamId,
            service,
            scopes: authScopes,
            token,
          }
        : undefined,
    },
    {
      include: token
        ? [
            {
              association: "authentication",
            },
          ]
        : undefined,
      transaction,
    }
  );
}
