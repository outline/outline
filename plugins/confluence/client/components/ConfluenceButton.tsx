import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { redirectTo } from "~/utils/urls";
import { ConfluenceUtils } from "../../shared/ConfluenceUtils";

export function ConfluenceConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  return (
    <Button
      onClick={() => redirectTo(ConfluenceUtils.authUrl(team.id))}
      neutral
      {...props}
    >
      {t("Connect")}
    </Button>
  );
}
