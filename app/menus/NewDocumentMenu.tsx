import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import { newDocumentPath } from "~/utils/routeHelpers";

function NewDocumentMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);

  if (!can.createDocument) {
    return null;
  }

  return (
    <Tooltip content={t("New document")} shortcut="n" placement="bottom">
      <Button as={Link} to={newDocumentPath()} icon={<PlusIcon />}>
        {t("New doc")}
      </Button>
    </Tooltip>
  );
}

export default observer(NewDocumentMenu);
