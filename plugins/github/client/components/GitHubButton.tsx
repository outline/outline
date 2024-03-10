import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { redirectTo } from "~/utils/urls";
import { GitHubUtils } from "../../shared/GitHubUtils";
import GitHubIcon from "../Icon";

function GitHubConnectButton() {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  return (
    <Button
      onClick={() => redirectTo(GitHubUtils.authUrl(team.id))}
      icon={<GitHubIcon />}
      neutral
    >
      {t("Connect")}
    </Button>
  );
}

export default GitHubConnectButton;
