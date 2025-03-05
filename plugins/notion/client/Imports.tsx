import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { redirectTo } from "~/utils/urls";
import { NotionUtils } from "../shared/NotionUtils";

export const Notion = observer(() => {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const authUrl = NotionUtils.authUrl({ state: { teamId: team.id } });

  return (
    <Button type="submit" onClick={() => redirectTo(authUrl)} neutral>
      {t("Import")}
    </Button>
  );
});
