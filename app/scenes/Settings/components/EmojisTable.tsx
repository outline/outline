import compact from "lodash/compact";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import Emoji from "~/models/Emoji";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Time from "~/components/Time";
import EmojiMenu from "~/menus/EmojiMenu";
import { FILTER_HEIGHT } from "./StickyFilters";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Emoji>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

export const EmojisTable = observer(function EmojisTable({
  canManage,
  ...rest
}: Props) {
  const { t } = useTranslation();

  const columns = React.useMemo(
    (): TableColumn<Emoji>[] =>
      compact([
        {
          type: "data",
          id: "emoji",
          header: t("Emoji"),
          accessor: (emoji) => emoji.url,
          component: (emoji) => (
            <EmojiPreview>
              <EmojiImage src={emoji.url} alt={emoji.name} />
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
            <Flex align="center" gap={8}>
              {emoji.createdBy && (
                <>
                  <Avatar model={emoji.createdBy} size={AvatarSize.Small} />
                  {emoji.createdBy.name}
                </>
              )}
            </Flex>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "createdAt",
          header: t("Date added"),
          accessor: (emoji) => emoji.createdAt,
          component: (emoji) =>
            emoji.createdAt ? (
              <Time dateTime={emoji.createdAt} addSuffix />
            ) : null,
          width: "1fr",
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (emoji) => <EmojiMenu emoji={emoji} />,
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
      {...rest}
    />
  );
});

const EmojiPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 14px;
  color: ${s("textSecondary")};
`;

const EmojiImage = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
`;
