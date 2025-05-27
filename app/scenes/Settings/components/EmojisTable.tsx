import {
  ColumnDef,
  ColumnSort,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Emoji from "~/models/Emoji";
import Avatar from "~/components/Avatar";
import Table from "~/components/Table";
import Time from "~/components/Time";
import EmojiMenu from "~/menus/EmojiMenu";

type Props = {
  data: Emoji[];
  sort: ColumnSort;
  canManage: boolean;
  loading?: boolean;
  page?: {
    hasNext: boolean;
    fetchNext: () => Promise<void>;
  };
};

export const EmojisTable = observer(function EmojisTable({
  data,
  sort,
  canManage,
  loading,
  page,
}: Props) {
  const { t } = useTranslation();

  const columns = React.useMemo(
    (): ColumnDef<Emoji>[] => [
      {
        id: "emoji",
        header: t("Emoji"),
        accessorKey: "url",
        cell: ({ row }) => (
          <EmojiPreview>
            <EmojiImage src={row.original.url} alt={row.original.name} />
            <span>:{row.original.name}:</span>
          </EmojiPreview>
        ),
        enableSorting: false,
        size: 120,
      },
      {
        id: "name",
        header: t("Name"),
        accessorKey: "name",
        cell: ({ getValue }) => <strong>{getValue<string>()}</strong>,
        size: 200,
      },
      {
        id: "createdBy",
        header: t("Created by"),
        accessorKey: "createdBy",
        cell: ({ row }) => {
          const createdBy = row.original.createdBy;
          return createdBy ? (
            <Avatar
              model={createdBy}
              size={24}
              showBorder={false}
              style={{ marginRight: 8 }}
            />
          ) : (
            t("Unknown")
          );
        },
        enableSorting: false,
        size: 120,
      },
      {
        id: "createdAt",
        header: t("Created"),
        accessorKey: "createdAt",
        cell: ({ getValue }) => <Time dateTime={getValue<string>()} />,
        size: 120,
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: Emoji } }) => (
                <EmojiMenu emoji={row.original} />
              ),
              enableSorting: false,
              size: 40,
            } as ColumnDef<Emoji>,
          ]
        : []),
    ],
    [t, canManage]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    initialState: {
      sorting: [sort],
    },
  });

  return (
    <Table
      table={table}
      loading={loading}
      page={page}
      empty={
        data.length === 0 ? (
          <div>
            <h2>{t("No custom emojis yet")}</h2>
            <p>
              {t(
                "Custom emojis will appear here once they have been uploaded."
              )}
            </p>
          </div>
        ) : undefined
      }
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
