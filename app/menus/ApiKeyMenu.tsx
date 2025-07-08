import { observer } from "mobx-react";
import ApiKey from "~/models/ApiKey";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { revokeApiKeyFactory } from "~/actions/definitions/apiKeys";

type Props = {
  /** The apiKey to associate with the menu */
  apiKey: ApiKey;
};

function ApiKeyMenu({ apiKey }: Props) {
  const actions = [revokeApiKeyFactory({ apiKey })];

  return (
    <DropdownMenu actions={actions}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(ApiKeyMenu);
