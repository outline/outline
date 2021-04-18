// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";
import PaginatedList from "components/PaginatedList";
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
    <CenteredContent>
      <PageTitle title={t("Share Links")} />
      <h1>{t("Share Links")}</h1>
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
    </CenteredContent>
  );
}

export default observer(Shares);
