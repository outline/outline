import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { redirectTo } from "~/utils/urls";
import { GitLabUtils } from "../../shared/GitLabUtils";

export function GitLabConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  return (
    <Button
      onClick={() => redirectTo(GitLabUtils.authUrl(team.id))}
      neutral
      {...props}
    >
      {t("Connect")}
    </Button>
  );
}
