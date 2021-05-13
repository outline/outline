// @flow
import { observer } from "mobx-react";
import { LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import Empty from "components/Empty";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import PaginatedList from "components/PaginatedList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import ShareListItem from "./components/ShareListItem";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

function Shares() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { shares, auth, policies } = useStores();
  const canShareDocuments = auth.team && auth.team.sharing;
  const can = policies.abilities(team.id);

  return (
    <Scene title={t("Share Links")} icon={<LinkIcon color="currentColor" />}>
      <Heading>{t("Share Links")}</Heading>
      <HelpText>
        <Trans>
          Documents that have been shared are listed below. Anyone that has the
          public link can access a read-only version of the document until the
          link has been revoked.
        </Trans>
      </HelpText>
      {can.manage && (
        <HelpText>
          {!canShareDocuments && (
            <strong>{t("Sharing is currently disabled.")}</strong>
          )}{" "}
          <Trans
            defaults="You can globally enable and disable public document sharing in the <em>security settings</em>."
            components={{ em: <Link to="/settings/security" /> }}
          />
        </HelpText>
      )}
      <Subheading>{t("Shared documents")}</Subheading>
      <PaginatedList
        items={shares.published}
        empty={<Empty>{t("No share links, yet.")}</Empty>}
        fetch={shares.fetchPage}
        renderItem={(item) => <ShareListItem key={item.id} share={item} />}
      />
    </Scene>
  );
}

export default observer(Shares);
