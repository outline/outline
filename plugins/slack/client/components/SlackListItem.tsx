import uniq from "lodash/uniq";
import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { IntegrationType } from "@shared/types";
import type Collection from "~/models/Collection";
import type Integration from "~/models/Integration";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import ButtonLink from "~/components/ButtonLink";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import ListItem from "~/components/List/Item";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";

type Props = {
  integration: Integration<IntegrationType.Post>;
  collection: Collection;
};

function SlackListItem({ integration, collection }: Props) {
  const { t } = useTranslation();

  const handleChange = (eventName: string) => async (checked: boolean) => {
    if (checked) {
      integration.events = uniq([...integration.events, eventName]);
    } else {
      integration.events = integration.events.filter((n) => n !== eventName);
    }

    await integration.save();

    toast.success(t("Settings saved"));
  };

  const mapping: Record<string, string> = {
    "documents.publish": t("document published"),
    "documents.update": t("document updated"),
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
            defaults={`Posting to the <em>{{ channelName }}</em> channel on`}
            values={{
              channelName: integration.settings.channel,
              events: integration.events.map((ev) => mapping[ev]).join(", "),
            }}
            components={{
              em: <strong />,
            }}
          />{" "}
          <Popover>
            <PopoverTrigger>
              <ButtonLink>
                {integration.events.map((ev) => mapping[ev]).join(", ")}
              </ButtonLink>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start">
              <Events>
                <h3>{t("Notifications")}</h3>
                <Text as="p" type="secondary">
                  {t("These events should be posted to Slack")}
                </Text>
                <Switch
                  label={t("Document published")}
                  name="documents.publish"
                  checked={integration.events.includes("documents.publish")}
                  onChange={handleChange("documents.publish")}
                />
                <Switch
                  label={t("Document updated")}
                  name="documents.update"
                  checked={integration.events.includes("documents.update")}
                  onChange={handleChange("documents.update")}
                />
              </Events>
            </PopoverContent>
          </Popover>
        </>
      }
      actions={
        <ConnectedButton
          onClick={integration.delete}
          confirmationMessage={t(
            "This will prevent any future updates from being posted to this Slack channel. Are you sure?"
          )}
        />
      }
    />
  );
}

const Events = styled.div`
  color: ${s("text")};
  margin-top: -12px;
`;

export default observer(SlackListItem);
