import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { IntegrationService, IntegrationType } from "@shared/types";
import type Collection from "~/models/Collection";
import type Integration from "~/models/Integration";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import { AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import Bitrix24Icon from "./Icon";
import Bitrix24ConfigurationForm from "./components/Bitrix24ConfigurationForm";
import Bitrix24Button from "./components/Bitrix24Button";
import { Bitrix24Utils } from "../shared/Bitrix24Utils";

function Bitrix24() {
  const team = useCurrentTeam();
  const { collections, integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const can = usePolicy(team);
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void collections.fetchAll();
    void integrations.fetchAll({
      service: IntegrationService.Bitrix24,
      withRelations: true,
    });
  }, [collections, integrations]);

  const commandIntegration = integrations.find({
    type: IntegrationType.Command,
    service: IntegrationService.Bitrix24,
  });

  const linkedAccountIntegration = integrations.find({
    type: IntegrationType.LinkedAccount,
    service: IntegrationService.Bitrix24,
  });

  const groupedCollections = collections.orderedData
    .map<[Collection, Integration | undefined]>((collection) => {
      const integration = integrations.find({
        service: IntegrationService.Bitrix24,
        collectionId: collection.id,
      });

      return [collection, integration];
    })
    .sort((a) => (a[1] ? -1 : 1));

  return (
    <IntegrationScene title="Bitrix24" icon={<Bitrix24Icon />}>
      <Heading>Bitrix24</Heading>

      <Bitrix24ConfigurationForm />

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Bitrix24 to connect{" "}
            {{ appName }} to your workspace. Try again?
          </Trans>
        </Notice>
      )}
      {error === "unauthenticated" && (
        <Notice>
          <Trans>
            Something went wrong while authenticating your request. Please try
            logging in again.
          </Trans>
        </Notice>
      )}
      {error === "no_code" && (
        <Notice>
          <Trans>
            No authorization code was received from Bitrix24. Please try again.
          </Trans>
        </Notice>
      )}
      {error === "not_configured" && (
        <Notice>
          <Trans>
            Bitrix24 integration is not configured for this team. Please fill in
            the Bitrix24 settings above and try again.
          </Trans>
        </Notice>
      )}

      <SettingRow
        name="link"
        label={t("Personal account")}
        description={
          <Trans>
            Link your {{ appName }} account to Bitrix24 to enable searching and
            previewing the documents you have access to, directly within chat.
          </Trans>
        }
      >
        <Flex align="flex-end" column>
          {linkedAccountIntegration ? (
            <ConnectedButton
              onClick={linkedAccountIntegration.delete}
              confirmationMessage={t(
                "Disconnecting your personal account will prevent searching for documents from Bitrix24. Are you sure?"
              )}
            />
          ) : (
            <Bitrix24Button
              redirectUri={Bitrix24Utils.connectUrl()}
              state={Bitrix24Utils.createState(
                team.id,
                IntegrationType.LinkedAccount
              )}
              label={t("Connect")}
            />
          )}
        </Flex>
      </SettingRow>

      {can.update && (
        <>
          <SettingRow
            name="slash"
            border={false}
            label={t("Slash command")}
            description={
              <Trans
                defaults="Get rich previews of {{ appName }} links shared in Bitrix24 and use the <em>{{ command }}</em> slash command to search for documents without leaving your chat."
                values={{
                  command: "/outline",
                  appName,
                }}
                components={{
                  em: <Code />,
                }}
              />
            }
          >
            <Flex align="flex-end" column>
              {commandIntegration ? (
                <ConnectedButton
                  onClick={commandIntegration.delete}
                  confirmationMessage={t(
                    "This will remove the Outline slash command from your Bitrix24 workspace. Are you sure?"
                  )}
                />
              ) : (
                <Bitrix24Button
                  scopes={["tasks", "im"]}
                  redirectUri={Bitrix24Utils.connectUrl()}
                  state={Bitrix24Utils.createState(
                    team.id,
                    IntegrationType.Command
                  )}
                  icon={<Bitrix24Icon />}
                  label={t("Add to Bitrix24")}
                />
              )}
            </Flex>
          </SettingRow>

          <Heading as="h2">{t("Collections")}</Heading>
          <Text as="p" type="secondary">
            <Trans>
              Connect {{ appName }} collections to Bitrix24 channels. Messages will
              be automatically posted to Bitrix24 when documents are published or
              updated.
            </Trans>
          </Text>

          <List>
            {groupedCollections.map(([collection, integration]) => {
              if (integration) {
                return (
                  <ListItem
                    key={integration.id}
                    title={collection.name}
                    image={<CollectionIcon collection={collection} />}
                    actions={
                      <ConnectedButton
                        integration={integration}
                        service={IntegrationService.Bitrix24}
                      />
                    }
                  />
                );
              }

              return (
                <ListItem
                  key={collection.id}
                  title={collection.name}
                  image={<CollectionIcon collection={collection} />}
                  actions={
                    <Bitrix24Button
                      scopes={["tasks", "im"]}
                      redirectUri={Bitrix24Utils.connectUrl()}
                      state={Bitrix24Utils.createState(
                        team.id,
                        IntegrationType.Post,
                        { collectionId: collection.id }
                      )}
                      label={t("Connect")}
                    />
                  }
                />
              );
            })}
          </List>
        </>
      )}
    </IntegrationScene>
  );
}

const Code = styled.code`
  padding: 4px 6px;
  margin: 0 2px;
  background: ${(props) => props.theme.codeBackground};
  border-radius: 4px;
  font-size: 80%;
`;

export default observer(Bitrix24);
