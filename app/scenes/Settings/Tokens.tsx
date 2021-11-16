import { observer } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import APITokenNew from "scenes/APITokenNew";
import { Action } from "components/Actions";
import Button from "components/Button";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import TokenListItem from "./components/TokenListItem";
import useBoolean from "hooks/useBoolean";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

function Tokens() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { apiKeys, policies } = useStores();
  const [newModalOpen, handleNewModalOpen, handleNewModalClose] = useBoolean();
  const can = policies.abilities(team.id);
  return (
    <Scene
      title={t("API Tokens")}
      icon={<CodeIcon color="currentColor" />}
      actions={
        <>
          {can.createApiKey && (
            <Action>
              <Button
                type="submit"
                value={`${t("New token")}…`}
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ type: string; value: string; onClick: bool... Remove this comment to see the full error message
                onClick={handleNewModalOpen}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("API Tokens")}</Heading>
      <HelpText>
        <Trans
          defaults="You can create an unlimited amount of personal tokens to authenticate
          with the API. Tokens have the same permissions as your user account.
          For more details see the <em>developer documentation</em>."
          components={{
            em: (
              <a href="https://www.getoutline.com/developers" target="_blank" />
            ),
          }}
        />
      </HelpText>

      <PaginatedList
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ fetch: any; items: any; heading: Element; ... Remove this comment to see the full error message
        fetch={apiKeys.fetchPage}
        items={apiKeys.orderedData}
        heading={<Subheading sticky>{t("Tokens")}</Subheading>}
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'token' implicitly has an 'any' type.
        renderItem={(token) => (
          <TokenListItem key={token.id} token={token} onDelete={token.delete} />
        )}
      />

      <Modal
        title={t("Create a token")}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        onRequestClose={handleNewModalClose}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        isOpen={newModalOpen}
      >
        <APITokenNew onSubmit={handleNewModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(Tokens);
