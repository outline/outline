import { uniq } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Checkbox from "~/components/Checkbox";
import CollectionIcon from "~/components/CollectionIcon";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import useToasts from "~/hooks/useToasts";

type Props = {
  integration: Integration;
  collection: Collection;
};

function SlackListItem({ integration, collection }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const handleChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.checked) {
      integration.events = uniq([...integration.events, ev.target.name]);
    } else {
      integration.events = integration.events.filter(
        (n) => n !== ev.target.name
      );
    }

    await integration.save();

    showToast(t("Settings saved"), {
      type: "success",
    });
  };

  return (
    <ListItem
      key={integration.id}
      title={
        <Flex align="center" gap={6}>
          <CollectionIcon collection={collection} /> {collection.name}
        </Flex>
      }
      subtitle={
        <>
          <Trans
            defaults={`Connected to the <em>{{ channelName }}</em> channel, posting when:`}
            values={{
              channelName: integration.settings.channel,
            }}
            components={{
              em: <strong />,
            }}
          />
          <IntegrationDetails justify="space-between" align="flex-end">
            <div>
              <Checkbox
                label={t("New document published")}
                name="documents.publish"
                checked={integration.events.includes("documents.publish")}
                onChange={handleChange}
              />
              <Checkbox
                label={t("Document updated")}
                name="documents.update"
                checked={integration.events.includes("documents.update")}
                onChange={handleChange}
              />
            </div>
            <Button onClick={integration.delete} neutral>
              {t("Disconnect")}
            </Button>
          </IntegrationDetails>
        </>
      }
    />
  );
}

const IntegrationDetails = styled(Flex)`
  margin-top: 16px;
`;

export default observer(SlackListItem);
