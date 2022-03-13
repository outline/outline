import { observer } from "mobx-react";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Share from "~/models/Share";
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
                <>
                  <Time dateTime={value} addSuffix />{" "}
                  {t("by {{ name }}", {
                    name: row.original.createdBy.name,
                  })}
                </>
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
            value ? <CheckmarkIcon color={theme.primary} /> : null
          ),
        },
        canManage
          ? {
              Header: " ",
              accessor: "id",
              className: "actions",
              disableSortBy: true,
              Cell: observer(
                ({ row }: { value: string; row: { original: Share } }) => (
                  <ShareMenu share={row.original} />
                )
              ),
            }
          : undefined,
      ].filter((i) => i),
    [t, theme.primary, canManage]
  );

  return <TableFromParams columns={columns} {...rest} />;
}

export default SharesTable;
