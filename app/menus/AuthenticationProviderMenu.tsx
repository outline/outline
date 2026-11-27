import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type AuthenticationProvider from "~/models/AuthenticationProvider";
import Button from "~/components/Button";
import { ConnectedIcon } from "~/components/Icons/ConnectedIcon";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { createAction } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";

interface Props {
  /** The connected authentication provider to show the menu for. */
  provider: AuthenticationProvider;
  /** Callback when the user chooses to reconnect the provider. */
  onReconnect: (name: string) => void;
  /** Callback when the user chooses to disconnect the provider. */
  onDisconnect: (provider: AuthenticationProvider) => void;
}

/**
 * A "Connected" button with a menu to reconnect or disconnect an
 * authentication provider.
 */
export const AuthenticationProviderMenu = observer(
  function AuthenticationProviderMenu({
    provider,
    onReconnect,
    onDisconnect,
  }: Props) {
    const { t } = useTranslation();
    const section = "Authentication";

    const actions = useMemo(
      () => [
        createAction({
          name: t("Reconnect"),
          section,
          perform: () => onReconnect(provider.name),
        }),
        createAction({
          name: `${t("Disconnect")}…`,
          section,
          dangerous: true,
          perform: () => onDisconnect(provider),
        }),
      ],
      [t, provider, onReconnect, onDisconnect]
    );

    const rootAction = useMenuAction(actions);

    return (
      <DropdownMenu action={rootAction} ariaLabel={t("Connected")}>
        <Button icon={<ConnectedIcon />} neutral disclosure>
          {t("Connected")}
        </Button>
      </DropdownMenu>
    );
  }
);
