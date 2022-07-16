import { observer } from "mobx-react";
import { WebhooksIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import WebhookSubscription from "~/models/WebhookSubscription";
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
import WebhookSubscriptionListItem from "./components/WebhookSubscriptionListItem";
import WebhookSubscriptionNew from "./components/WebhookSubscriptionNew";

function Webhooks() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { webhookSubscriptions } = useStores();
  const [newModalOpen, handleNewModalOpen, handleNewModalClose] = useBoolean();
  const can = usePolicy(team.id);

  return (
    <Scene
      title={t("Webhooks")}
      icon={<WebhooksIcon color="currentColor" />}
      actions={
        <>
          {can.createWebhookSubscription && (
            <Action>
              <Button
                type="submit"
                value={`${t("New webhook")}…`}
                onClick={handleNewModalOpen}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Webhooks")}</Heading>
      <Text type="secondary">
        <Trans defaults="Webhooks can be used to notify your application when events happen in Outline. Events are sent as a https request with a JSON payload in near real-time." />
      </Text>
      <PaginatedList
        fetch={webhookSubscriptions.fetchPage}
        items={webhookSubscriptions.orderedData}
        heading={<Subheading sticky>{t("Webhooks")}</Subheading>}
        renderItem={(webhook: WebhookSubscription) => (
          <WebhookSubscriptionListItem key={webhook.id} webhook={webhook} />
        )}
      />
      <Modal
        title={t("Create a webhook")}
        onRequestClose={handleNewModalClose}
        isOpen={newModalOpen}
      >
        <WebhookSubscriptionNew onSubmit={handleNewModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(Webhooks);
