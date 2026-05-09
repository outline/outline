import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type ApiKey from "~/models/ApiKey";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useApiKeyMenuActions } from "~/hooks/useApiKeyMenuActions";

type Props = {
  /** The apiKey to associate with the menu */
  apiKey: ApiKey;
};

function ApiKeyMenu({ apiKey }: Props) {
  const { t } = useTranslation();
  const rootAction = useApiKeyMenuActions(apiKey);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("API key")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(ApiKeyMenu);
