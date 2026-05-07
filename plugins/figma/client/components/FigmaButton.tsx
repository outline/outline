import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { redirectTo } from "~/utils/urls";
import { FigmaOAuthNonceCookie, FigmaUtils } from "../../shared/FigmaUtils";

export function FigmaConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const handleConnect = React.useCallback(() => {
    const nonce = generateOAuthStateNonce(FigmaOAuthNonceCookie);
    redirectTo(FigmaUtils.authUrl({ state: { teamId: team.id, nonce } }));
  }, [team.id]);

  return (
    <Button onClick={handleConnect} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
