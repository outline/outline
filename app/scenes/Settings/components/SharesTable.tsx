import compact from "lodash/compact";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import Share from "~/models/Share";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Time from "~/components/Time";
import useUserLocale from "~/hooks/useUserLocale";
import ShareMenu from "~/menus/ShareMenu";
import { formatNumber } from "~/utils/language";

type Props = Omit<
  TableProps<Share>,
  "columns" | "rowHeight" | "gridColumns"
> & {
  canManage: boolean;
};

export function SharesTable({ data, canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const language = useUserLocale();
  const hasDomain = data.some((share) => share.domain);

  const gridColumns = React.useMemo(() => {
    if (canManage && hasDomain) {
      return "4fr 2fr 2fr 2fr 1.5fr 1fr 0.5fr"; // all columns will be displayed.
    } else if (canManage && !hasDomain) {
      return "4fr 2fr 2fr 2fr 1fr 0.5fr"; // domain won't be displayed.
    } else if (!canManage && hasDomain) {
      return "4fr 2fr 2fr 2fr 1.5fr 1fr"; // action won't be displayed.
    } else {
      return "4fr 2fr 2fr 2fr 1fr"; // domain and action won't be displayed.
    }
  }, [canManage, hasDomain]);

  const columns = React.useMemo<TableColumn<Share>[]>(
    () =>
      compact<TableColumn<Share>>([
        {
          type: "data",
          id: "title",
          header: t("Document"),
          accessor: (share) => share.documentTitle,
          sortable: false,
          component: (share) => <>{share.documentTitle}</>,
        },
        {
          type: "data",
          id: "createdBy",
          header: t("Shared by"),
          accessor: (share) => share.createdBy,
          sortable: false,
          component: (share) => (
            <Flex align="center" gap={4}>
              {share.createdBy && (
                <>
                  <Avatar model={share.createdBy} />
                  {share.createdBy.name}
                </>
              )}
            </Flex>
          ),
        },
        {
          type: "data",
          id: "createdAt",
          header: t("Date shared"),
          accessor: (share) => share.createdAt,
          component: (share) =>
            share.createdAt ? (
              <Time dateTime={share.createdAt} addSuffix />
            ) : null,
        },
        {
          type: "data",
          id: "lastAccessedAt",
          header: t("Last accessed"),
          accessor: (share) => share.lastAccessedAt,
          component: (share) =>
            share.lastAccessedAt ? (
              <Time dateTime={share.lastAccessedAt} addSuffix />
            ) : null,
        },
        hasDomain
          ? {
              type: "data",
              id: "domain",
              header: t("Domain"),
              accessor: (share) => share.domain,
              sortable: false,
              component: (share) => <>{share.domain}</>,
            }
          : undefined,
        {
          type: "data",
          id: "views",
          header: t("Views"),
          accessor: (share) => share.views,
          component: (share) => (
            <>
              {language
                ? formatNumber(share.views, unicodeCLDRtoBCP47(language))
                : share.views}
            </>
          ),
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (share) => (
                <Flex align="center">
                  <ShareMenu share={share} />
                </Flex>
              ),
            }
          : undefined,
      ]),
    [t, language, hasDomain, canManage]
  );

  return (
    <SortableTable
      data={data}
      columns={columns}
      rowHeight={50}
      gridColumns={gridColumns}
      {...rest}
    />
  );
}
