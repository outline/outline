import * as React from "react";
import { useTranslation } from "react-i18next";
import { EditIcon, TrashIcon } from "outline-icons";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { createAction } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";
import PasskeyIcon from "./PasskeyIcon";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import useUserLocale from "~/hooks/useUserLocale";

type Passkey = {
  id: string;
  name: string;
  userAgent: string | null;
  transports: string[];
  createdAt: string;
  updatedAt: string;
};

type PasskeyListItemProps = {
  passkey: Passkey;
  onRename: () => void;
  onDelete: () => void;
};

type PasskeyMenuProps = {
  passkey: Passkey;
  onRename: () => void;
  onDelete: () => void;
};

function PasskeyMenu({ onRename, onDelete }: PasskeyMenuProps) {
  const { t } = useTranslation();

  const actions = React.useMemo(
    () => [
      createAction({
        name: `${t("Rename")}…`,
        icon: <EditIcon />,
        section: "Passkey",
        perform: onRename,
      }),
      createAction({
        name: `${t("Delete")}…`,
        icon: <TrashIcon />,
        section: "Passkey",
        dangerous: true,
        perform: onDelete,
      }),
    ],
    [t, onRename, onDelete]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Passkey options")}>
      <OverflowMenuButton neutral />
    </DropdownMenu>
  );
}

/**
 * Renders a single passkey list item with icon, metadata, and action menu.
 *
 * @param props - The component props.
 * @param props.passkey - The passkey object to display.
 * @param props.onRename - Callback fired when the rename action is triggered.
 * @param props.onDelete - Callback fired when the delete action is triggered.
 */
function PasskeyListItem({
  passkey,
  onRename,
  onDelete,
}: PasskeyListItemProps) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);

  return (
    <ListItem
      image={
        <PasskeyIcon
          transports={passkey.transports}
          userAgent={passkey.userAgent}
          size={24}
        />
      }
      title={passkey.name}
      subtitle={
        <Text type="tertiary">
          {t("Registered {{ timeAgo }}", {
            timeAgo: dateToRelative(Date.parse(passkey.createdAt), {
              addSuffix: true,
              locale,
            }),
          })}
        </Text>
      }
      actions={
        <PasskeyMenu
          passkey={passkey}
          onRename={onRename}
          onDelete={onDelete}
        />
      }
    />
  );
}

export default PasskeyListItem;
