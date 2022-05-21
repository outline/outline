import { observer } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import APITokenNew from "~/scenes/APITokenNew";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TokenListItem from "./components/TokenListItem";

function Webhooks() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { apiKeys } = useStores();
  const [newModalOpen, handleNewModalOpen, handleNewModalClose] = useBoolean();
  const can = usePolicy(team.id);

  return (
    <Scene
      title={t("Webhook Subscriptions")}
      icon={<CodeIcon color="currentColor" />}
      actions={
        <>
          {can.createWebhookSubscription && (
            <Action>
              <Button
                type="submit"
                value={`${t("New token")}…`}
                onClick={handleNewModalOpen}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Webhook Subscriptions")}</Heading>
      <Text type="secondary">
        <Trans defaults="WEBHOOKS are really cool" />
      </Text>
      <PaginatedList
        fetch={apiKeys.fetchPage}
        items={apiKeys.orderedData}
        heading={<Subheading sticky>{t("Tokens")}</Subheading>}
        renderItem={(token: ApiKey) => (
          <TokenListItem key={token.id} token={token} />
        )}
      />
      <Modal
        title={t("Create a token")}
        onRequestClose={handleNewModalClose}
        isOpen={newModalOpen}
      >
        <APITokenNew onSubmit={handleNewModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(Webhooks);
