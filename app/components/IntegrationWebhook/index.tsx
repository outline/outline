import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { IntegrationService, IntegrationType } from "@shared/types";
import Collection from "~/models/Collection";
import Integration from "~/models/Integration";
import Team from "~/models/Team";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import ConnectedCollection from "./ConnectedCollection";

export type RenderConnectProps = {
  collection: Collection;
  team: Team;
};

type Props = {
  service: IntegrationService;
  renderConnect: (props: RenderConnectProps) => React.ReactElement;
};

const IntegrationWebhook = ({ service, renderConnect }: Props) => {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, integrations } = useStores();

  const appName = env.APP_NAME;

  const groupedCollections = collections.orderedData
    .map<[Collection, Integration | undefined]>((collection) => {
      const integration = integrations.find({
        service,
        collectionId: collection.id,
      });

      return [collection, integration];
    })
    .sort((a) => (a[1] ? -1 : 1));

  return (
    <>
      <Heading as="h2">{t("Collections")}</Heading>
      <Text as="p" type="secondary">
        <Trans
          defaults="Connect {{ appName }} collections to {{ integrationName }} channels.<br>Messages will be automatically posted to {{ integrationName }} when documents are published or updated."
          values={{ appName, integrationName: capitalize(service) }}
        />
      </Text>

      <List>
        {groupedCollections.map(([collection, integration]) => {
          if (integration) {
            return (
              <ConnectedCollection
                key={integration.id}
                collection={collection}
                integration={integration as Integration<IntegrationType.Post>}
              />
            );
          }

          return (
            <ListItem
              key={collection.id}
              title={collection.name}
              image={<CollectionIcon collection={collection} />}
              actions={renderConnect({ collection, team })}
            />
          );
        })}
      </List>
    </>
  );
};

export default observer(IntegrationWebhook);
