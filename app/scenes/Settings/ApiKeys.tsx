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
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import ApiKeyListItem from "./components/ApiKeyListItem";

function ApiKeys() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { apiKeys } = useStores();
  const [newModalOpen, handleNewModalOpen, handleNewModalClose] = useBoolean();
  const can = usePolicy(team);

  return (
    <Scene
      title={t("API Tokens")}
      icon={<CodeIcon />}
      actions={
        <>
          {can.createApiKey && (
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
      <Heading>{t("API Tokens")}</Heading>
      <Text type="secondary">
        <Trans
          defaults="You can create an unlimited amount of personal tokens to authenticate
          with the API. Tokens have the same permissions as your user account.
          For more details see the <em>developer documentation</em>."
          components={{
            em: (
              <a
                href="https://www.getoutline.com/developers"
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        />
      </Text>
      <PaginatedList
        fetch={apiKeys.fetchPage}
        items={apiKeys.orderedData}
        heading={<h2>{t("Active")}</h2>}
        renderItem={(apiKey: ApiKey) => (
          <ApiKeyListItem key={apiKey.id} apiKey={apiKey} />
        )}
      />
      <Modal
        title={t("Create a token")}
        onRequestClose={handleNewModalClose}
        isOpen={newModalOpen}
        isCentered
      >
        <APITokenNew onSubmit={handleNewModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(ApiKeys);
