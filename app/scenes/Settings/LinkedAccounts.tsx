import { observer } from "mobx-react";
import { PlusIcon, GroupIcon, LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Group from "~/models/Group";
import GroupNew from "~/scenes/GroupNew";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import GroupListItem from "~/components/GroupListItem";
import Heading from "~/components/Heading";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import GroupMenu from "~/menus/GroupMenu";

function Groups() {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const team = useCurrentTeam();
  // const can = usePolicy(team);

  React.useEffect(() => {
    void integrations.fetchPage();
  }, [integrations]);

  return (
    <Scene title={t("Linked Accounts")} icon={<LinkIcon />}>
      <Heading>{t("Linked Accounts")}</Heading>
      <Text type="secondary">Test</Text>

      <GoogleSection />
    </Scene>
  );
}

function GoogleSection() {
  const { t } = useTranslation();

  return (
    <>
      <Heading as="h2">Google</Heading>
      <Text type="secondary">
        <Trans>Connect your Google account to allow SignIn with Google.</Trans>
      </Text>
    </>
  );
}

export default observer(Groups);
