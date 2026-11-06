import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createAction } from "~/actions";
import { SettingsSection } from "~/actions/sections";
import Button from "~/components/Button";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import PluginIcon from "~/components/PluginIcon";
import { useMenuAction } from "~/hooks/useMenuAction";
import type { AvailableAuthenticationProvider } from "~/stores/AuthenticationProvidersStore";

type Props = {
  /** The provider types that can be added. */
  providers: AvailableAuthenticationProvider[];
  /** Called when a provider type is chosen. */
  onSelect: (provider: AvailableAuthenticationProvider) => void;
};

/**
 * A button that lists the authentication provider types that can be added to
 * the workspace in a dropdown menu.
 */
function AddAuthenticationProviderMenu({ providers, onSelect }: Props) {
  const { t } = useTranslation();

  const actions = useMemo(
    () =>
      providers.map((provider) =>
        createAction({
          name: provider.isConfigurable ? `${provider.name}…` : provider.name,
          section: SettingsSection,
          icon: <PluginIcon id={provider.id} size={20} />,
          perform: () => onSelect(provider),
        })
      ),
    [providers, onSelect]
  );

  const rootAction = useMenuAction(actions);

  if (!providers.length) {
    return null;
  }

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Add authentication provider")}
    >
      <Button icon={<PlusIcon />} neutral>
        {t("Add provider")}
      </Button>
    </DropdownMenu>
  );
}

export default observer(AddAuthenticationProviderMenu);
