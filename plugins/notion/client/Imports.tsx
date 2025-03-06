import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import env from "@shared/env";
import { IntegrationService } from "@shared/types";
import Button from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { redirectTo } from "~/utils/urls";
import { NotionUtils } from "../shared/NotionUtils";
import { ImportDialog } from "./components/ImportDialog";

export const Notion = observer(() => {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const team = useCurrentTeam();
  const appName = env.APP_NAME;

  const authUrl = NotionUtils.authUrl({ state: { teamId: team.id } });

  const queryParams = useQuery();
  const service = queryParams.get("service");
  const oauthSuccess = queryParams.get("success") === "";
  const oauthError = queryParams.get("error");

  React.useEffect(() => {
    if (oauthSuccess && service === IntegrationService.Notion) {
      dialogs.openModal({
        title: t("Import data"),
        content: <ImportDialog />,
      });
    }
  }, [t, dialogs, oauthSuccess, service]);

  React.useEffect(() => {
    if (!oauthError) {
      return;
    }

    if (oauthError === "access_denied") {
      toast.error(
        t(
          "Whoops, you need to accept the permissions in Notion to connect {{ appName }} to your workspace. Try again?",
          {
            appName,
          }
        )
      );
    } else {
      toast.error(
        t(
          "Something went wrong while authenticating your request. Please try logging in again."
        )
      );
    }
  }, [t, appName, oauthError]);

  return (
    <Button type="submit" onClick={() => redirectTo(authUrl)} neutral>
      {t("Import")}
    </Button>
  );
});
