import find from "lodash/find";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { IntegrationService, IntegrationType } from "@shared/types";
import type Integration from "~/models/Integration";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import { redirectTo } from "~/utils/urls";
import { GitLabUtils } from "../../shared/GitLabUtils";

export function GitLabConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { integrations } = useStores();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.GitLab,
  }) as Integration<IntegrationType.Embed> | undefined;

  const customUrl = integration?.settings?.gitlab?.url;

  return (
    <Button
      onClick={() => redirectTo(GitLabUtils.authUrl(team.id, customUrl))}
      neutral
      {...props}
    >
      {t("Connect")}
    </Button>
  );
}
