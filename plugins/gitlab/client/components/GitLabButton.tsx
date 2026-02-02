import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { redirectTo } from "~/utils/urls";

export function GitLabConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  return (
    <Button
      onClick={() =>
        redirectTo(`/api/integrations.gitlab.redirect?state=${team.id}`)
      }
      neutral
      {...props}
    >
      {t("Connect")}
    </Button>
  );
}
