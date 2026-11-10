import { LinkIcon, NewDocumentIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

interface Props {
  /** Called to start creating a nested document. */
  onNewDoc: () => void;
  /** Called to start creating a link. When omitted, the button creates a document directly. */
  onNewLink?: () => void;
}

/**
 * The "+" button on a sidebar row, which adds a nested document or link.
 */
export function NewChildMenu({ onNewDoc, onNewLink }: Props) {
  const { t } = useTranslation();

  const handleClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      onNewDoc();
    },
    [onNewDoc]
  );

  const actions = React.useMemo(
    () => [
      createAction({
        name: t("Document"),
        section: DocumentSection,
        icon: <NewDocumentIcon />,
        perform: onNewDoc,
      }),
      createAction({
        name: `${t("Link")}…`,
        section: DocumentSection,
        icon: <LinkIcon />,
        visible: !!onNewLink,
        perform: () => onNewLink?.(),
      }),
    ],
    [t, onNewDoc, onNewLink]
  );
  const rootAction = useMenuAction(actions);

  if (!onNewLink) {
    return (
      <Tooltip content={t("New doc")}>
        <NudeButton aria-label={t("New nested document")} onClick={handleClick}>
          <PlusIcon />
        </NudeButton>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={t("Add")}>
      <DropdownMenu action={rootAction} align="end" ariaLabel={t("Add")}>
        <NudeButton>
          <PlusIcon />
        </NudeButton>
      </DropdownMenu>
    </Tooltip>
  );
}
