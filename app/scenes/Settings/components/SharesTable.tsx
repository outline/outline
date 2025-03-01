import compact from "lodash/compact";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import Share from "~/models/Share";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Time from "~/components/Time";
import useUserLocale from "~/hooks/useUserLocale";
import ShareMenu from "~/menus/ShareMenu";
import { formatNumber } from "~/utils/language";

const ROW_HEIGHT = 50;

type Props = Omit<TableProps<Share>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

export function SharesTable({ data, canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const language = useUserLocale();
  const hasDomain = data.some((share) => share.domain);

  const columns = React.useMemo<TableColumn<Share>[]>(
    () =>
      compact<TableColumn<Share>>([
        {
          type: "data",
          id: "title",
          header: t("Document"),
          accessor: (share) => share.documentTitle || t("Untitled"),
          sortable: false,
          component: (share) => <>{share.documentTitle || t("Untitled")}</>,
          width: "4fr",
        },
        {
          type: "data",
          id: "createdBy",
          header: t("Shared by"),
          accessor: (share) => share.createdBy,
          sortable: false,
          component: (share) => (
            <Flex align="center" gap={8}>
              {share.createdBy && (
                <>
                  <Avatar model={share.createdBy} size={AvatarSize.Small} />
                  {share.createdBy.name}
                </>
              )}
            </Flex>
          ),
          width: "2fr",
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
          width: "2fr",
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
          width: "2fr",
        },
        hasDomain
          ? {
              type: "data",
              id: "domain",
              header: t("Domain"),
              accessor: (share) => share.domain,
              sortable: false,
              component: (share) => <>{share.domain}</>,
              width: "1.5fr",
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
          width: "150px",
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
              width: "50px",
            }
          : undefined,
      ]),
    [t, language, hasDomain, canManage]
  );

  return (
    <SortableTable
      data={data}
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={HEADER_HEIGHT}
      {...rest}
    />
  );
}
