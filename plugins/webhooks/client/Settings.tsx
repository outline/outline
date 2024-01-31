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
import Text from "~/components/Text";
import env from "~/env";
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
  const can = usePolicy(team);
  const appName = env.APP_NAME;

  return (
    <Scene
      title={t("Webhooks")}
      icon={<WebhooksIcon />}
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
      <Text as="p" type="secondary">
        <Trans>
          Webhooks can be used to notify your application when events happen in{" "}
          {{ appName }}. Events are sent as a https request with a JSON payload
          in near real-time.
        </Trans>
      </Text>
      <PaginatedList
        fetch={webhookSubscriptions.fetchPage}
        items={webhookSubscriptions.enabled}
        heading={<h2>{t("Active")}</h2>}
        renderItem={(webhook: WebhookSubscription) => (
          <WebhookSubscriptionListItem key={webhook.id} webhook={webhook} />
        )}
      />
      <PaginatedList
        items={webhookSubscriptions.disabled}
        heading={<h2>{t("Inactive")}</h2>}
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
