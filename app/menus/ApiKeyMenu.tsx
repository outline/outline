import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type ApiKey from "~/models/ApiKey";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { revokeApiKeyFactory } from "~/actions/definitions/apiKeys";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  /** The apiKey to associate with the menu */
  apiKey: ApiKey;
};

function ApiKeyMenu({ apiKey }: Props) {
  const { t } = useTranslation();
  const actions = useMemo(() => [revokeApiKeyFactory({ apiKey })], [apiKey]);
  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("API key")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(ApiKeyMenu);
