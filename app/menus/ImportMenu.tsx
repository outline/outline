import { observer } from "mobx-react";
import { CrossIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Import from "~/models/Import";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import { createAction } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";

const Section = "Imports";

type Props = {
  /** Import to which actions will be applied. */
  importModel: Import;
  /** Callback to handle import cancellation. */
  onCancel: () => Promise<void>;
  /** Callback to handle import deletion. */
  onDelete: () => Promise<void>;
};

export const ImportMenu = observer(
  ({ importModel, onCancel, onDelete }: Props) => {
    const { t } = useTranslation();
    const can = usePolicy(importModel);

    const actions = React.useMemo(
      () => [
        createAction({
          name: t("Cancel"),
          section: Section,
          visible: !!can.cancel,
          icon: <CrossIcon />,
          dangerous: true,
          perform: onCancel,
        }),
        createAction({
          name: t("Delete"),
          section: Section,
          visible: !!can.delete,
          icon: <TrashIcon />,
          dangerous: true,
          perform: onDelete,
        }),
      ],
      [t, can.cancel, can.delete, onCancel, onDelete]
    );

    const rootAction = useMenuAction(actions);

    return (
      <DropdownMenu action={rootAction} ariaLabel={t("Import menu options")}>
        <OverflowMenuButton />
      </DropdownMenu>
    );
  }
);
