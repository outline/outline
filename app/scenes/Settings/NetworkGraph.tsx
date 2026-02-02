import { observer } from "mobx-react";
import { GraphIcon, CloseIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import NetworkGraph, { type Node } from "~/components/NetworkGraph/NetworkGraph";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

function NetworkGraphPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { groups, collections } = useStores();
  const can = usePolicy(team);

  // Load groups if user can see them
  React.useEffect(() => {
    if (can.listGroups) {
      void groups.fetchPage({});
    }
  }, [can.listGroups, groups]);

  // Load collections for filter
  React.useEffect(() => {
    if (!collections.isLoaded) {
      void collections.fetchPage({ limit: 100 });
    }
  }, [collections]);

  const handleNodeClick = (node: Node) => {
    if (node.type === "collection" && node.data.path) {
      history.push(node.data.path);
    }
  };

  const handleClose = React.useCallback(() => {
    history.push("/settings");
  }, [history]);

  return (
    <Scene
      title={t("Network Graph")}
      icon={<GraphIcon />}
      wide
      actions={
        <Button onClick={handleClose} neutral>
          <CloseIcon />
          {t("Close")}
        </Button>
      }
    >
      <NetworkGraph
        collections={collections.orderedData.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        onNodeClick={handleNodeClick}
      />
    </Scene>
  );
}

export default observer(NetworkGraphPage);
