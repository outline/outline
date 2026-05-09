import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { redirectTo } from "~/utils/urls";
import { LinearOAuthNonceCookie, LinearUtils } from "../../shared/LinearUtils";

export function LinearConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const handleConnect = React.useCallback(() => {
    const nonce = generateOAuthStateNonce(LinearOAuthNonceCookie);
    redirectTo(LinearUtils.authUrl({ state: { teamId: team.id, nonce } }));
  }, [team.id]);

  return (
    <Button onClick={handleConnect} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
