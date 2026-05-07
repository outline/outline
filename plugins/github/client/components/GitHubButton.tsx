import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { redirectTo } from "~/utils/urls";
import { GitHubOAuthNonceCookie, GitHubUtils } from "../../shared/GitHubUtils";

export function GitHubConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const handleConnect = React.useCallback(() => {
    const nonce = generateOAuthStateNonce(GitHubOAuthNonceCookie);
    redirectTo(GitHubUtils.authUrl({ teamId: team.id, nonce }));
  }, [team.id]);

  return (
    <Button onClick={handleConnect} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
