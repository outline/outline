import { observer } from "mobx-react";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Share from "~/models/Share";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";
import TableFromParams from "~/components/TableFromParams";
import Time from "~/components/Time";
import ShareMenu from "~/menus/ShareMenu";

type Props = Omit<React.ComponentProps<typeof TableFromParams>, "columns"> & {
  data: Share[];
  canManage: boolean;
};

function SharesTable({ canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const columns = React.useMemo(
    () =>
      [
        {
          id: "documentTitle",
          Header: t("Document"),
          accessor: "documentTitle",
          disableSortBy: true,
          Cell: observer(({ value }: { value: string }) => <>{value}</>),
        },
        {
          id: "createdAt",
          Header: t("Date shared"),
          accessor: "createdAt",
          Cell: observer(
            ({ value, row }: { value: string; row: { original: Share } }) =>
              value ? (
                <Flex align="center" gap={4}>
                  {row.original.createdBy && (
                    <Avatar
                      model={row.original.createdBy}
                      alt={row.original.createdBy.name}
                    />
                  )}
                  <Time dateTime={value} addSuffix />
                </Flex>
              ) : null
          ),
        },
        {
          id: "lastAccessedAt",
          Header: t("Last accessed"),
          accessor: "lastAccessedAt",
          Cell: observer(({ value }: { value: string }) =>
            value ? <Time dateTime={value} addSuffix /> : null
          ),
        },
        {
          id: "includeChildDocuments",
          Header: t("Shared nested"),
          accessor: "includeChildDocuments",
          Cell: observer(({ value }: { value: string }) =>
            value ? (
              <Flex align="center">
                <CheckmarkIcon color={theme.accent} />
              </Flex>
            ) : null
          ),
        },
        {
          id: "views",
          Header: t("Views"),
          accessor: "views",
        },
        canManage
          ? {
              Header: " ",
              accessor: "id",
              className: "actions",
              disableSortBy: true,
              Cell: observer(
                ({ row }: { value: string; row: { original: Share } }) => (
                  <Flex align="center">
                    <ShareMenu share={row.original} />
                  </Flex>
                )
              ),
            }
          : undefined,
      ].filter((i) => i),
    [t, theme.accent, canManage]
  );

  return <TableFromParams columns={columns} {...rest} />;
}

export default SharesTable;
