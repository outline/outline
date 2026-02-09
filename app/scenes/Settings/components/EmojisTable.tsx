import compact from "lodash/compact";
import { observer } from "mobx-react";
import * as React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type Emoji from "~/models/Emoji";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useEmojiMenuActions } from "~/hooks/useEmojiMenuActions";
import Time from "~/components/Time";
import { FILTER_HEIGHT } from "./StickyFilters";
import { CustomEmoji } from "@shared/components/CustomEmoji";
import EmojisMenu from "~/menus/EmojisMenu";
import { s } from "@shared/styles";
import styled from "styled-components";
import { HStack } from "~/components/primitives/HStack";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Emoji>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

function EmojiRowContextMenu({
  emoji,
  menuLabel,
  children,
}: {
  emoji: Emoji;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useEmojiMenuActions(emoji);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
}

const EmojisTable = observer(function EmojisTable({
  canManage,
  ...rest
}: Props) {
  const { t } = useTranslation();

  const applyContextMenu = useCallback(
    (emoji: Emoji, rowElement: React.ReactNode) => (
      <EmojiRowContextMenu emoji={emoji} menuLabel={t("Emoji options")}>
        {rowElement}
      </EmojiRowContextMenu>
    ),
    [t]
  );

  const columns = React.useMemo(
    (): TableColumn<Emoji>[] =>
      compact([
        {
          type: "data",
          id: "name",
          header: t("Emoji"),
          accessor: (emoji) => emoji.url,
          component: (emoji) => (
            <EmojiPreview>
              <CustomEmoji value={emoji.id} alt={emoji.name} size={28} />
              <span>:{emoji.name}:</span>
            </EmojiPreview>
          ),
          width: "1fr",
        },
        {
          type: "data",
          id: "createdBy",
          header: t("Added by"),
          accessor: (emoji) => emoji.createdBy,
          sortable: false,
          component: (emoji) => (
            <HStack>
              {emoji.createdBy && (
                <>
                  <Avatar model={emoji.createdBy} size={AvatarSize.Small} />
                  {emoji.createdBy.name}
                </>
              )}
            </HStack>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "createdAt",
          header: t("Date added"),
          accessor: (emoji) => emoji.createdAt,
          component: (emoji) => <Time dateTime={emoji.createdAt} addSuffix />,
          width: "1fr",
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (emoji) => <EmojisMenu emoji={emoji} />,
              width: "50px",
            }
          : undefined,
      ]),
    [t, canManage]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      decorateRow={canManage ? applyContextMenu : undefined}
      {...rest}
    />
  );
});

export const EmojiPreview = styled(HStack)`
  font-family: monospace;
  font-size: 14px;
  color: ${s("textSecondary")};
`;

export default EmojisTable;
