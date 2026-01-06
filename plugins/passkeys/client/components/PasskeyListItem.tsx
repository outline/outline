import * as React from "react";
import { useTranslation } from "react-i18next";
import { EditIcon, TrashIcon } from "outline-icons";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionSeparator, createAction } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";
import PasskeyIcon from "./PasskeyIcon";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import useUserLocale from "~/hooks/useUserLocale";
import Time from "~/components/Time";

type Passkey = {
  id: string;
  name: string;
  aaguid: string | null;
  userAgent: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  /** The passkey to render. */
  passkey: Passkey;
  /** Callback fired when the rename action is triggered. */
  onRename: () => void;
  /** Callback fired when the delete action is triggered. */
  onDelete: () => void;
};

function PasskeyMenu({ onRename, onDelete }: Props) {
  const { t } = useTranslation();

  const actions = React.useMemo(
    () => [
      createAction({
        name: `${t("Rename")}…`,
        icon: <EditIcon />,
        section: "Passkey",
        perform: onRename,
      }),
      ActionSeparator,
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
 */
function PasskeyListItem({ passkey, onRename, onDelete }: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);

  return (
    <ListItem
      image={<PasskeyIcon passkey={passkey} size={24} />}
      title={passkey.name}
      subtitle={
        passkey.lastActiveAt ? (
          <Text type="tertiary">
            {t("Last used")} <Time dateTime={passkey.lastActiveAt} addSuffix />
          </Text>
        ) : (
          <Text type="tertiary">
            {t("Registered {{ timeAgo }}", {
              timeAgo: dateToRelative(Date.parse(passkey.createdAt), {
                addSuffix: true,
                locale,
              }),
            })}
          </Text>
        )
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
