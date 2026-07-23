import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type Share from "~/models/Share";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useShareMenuActions } from "~/hooks/useShareMenuActions";
import useUserLocale from "~/hooks/useUserLocale";
import Time from "~/components/Time";
import ShareMenu from "~/menus/ShareMenu";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import { HStack } from "~/components/primitives/HStack";
import Text from "~/components/Text";
import { dateToExpiry } from "~/utils/date";

const ROW_HEIGHT = 50;

type Props = Omit<TableProps<Share>, "columns" | "rowHeight"> & {
  canManage: boolean;
};

const ShareRowContextMenu = observer(function ShareRowContextMenu({
  share,
  menuLabel,
  children,
}: {
  share: Share;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useShareMenuActions(share);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
});

export function SharesTable({ data, canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const formatNumber = useFormatNumber();
  const userLocale = useUserLocale();
  const hasDomain = data.some((share) => share.domain);

  const applyContextMenu = useCallback(
    (share: Share, rowElement: React.ReactNode) => (
      <ShareRowContextMenu share={share} menuLabel={t("Share options")}>
        {rowElement}
      </ShareRowContextMenu>
    ),
    [t]
  );

  const columns = useMemo<TableColumn<Share>[]>(
    () =>
      compact<TableColumn<Share>>([
        {
          type: "data",
          id: "title",
          header: t("Title"),
          accessor: (share) => share.sourceTitle || t("Untitled"),
          sortable: false,
          component: (share) => (
            <>
              {share.sourceTitle || t("Untitled")}{" "}
              {share.collectionId ? <Badge>{t("Collection")}</Badge> : null}
            </>
          ),
          width: "4fr",
        },
        {
          type: "data",
          id: "createdBy",
          header: t("Shared by"),
          accessor: (share) => share.createdBy,
          sortable: false,
          component: (share) => (
            <HStack>
              {share.createdBy && (
                <>
                  <Avatar model={share.createdBy} size={AvatarSize.Small} />
                  {share.createdBy.name}
                </>
              )}
            </HStack>
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
        {
          type: "data",
          id: "expiresAt",
          header: t("Expires"),
          accessor: (share) => share.expiresAt,
          component: (share) =>
            share.expiresAt && new Date(share.expiresAt) <= new Date() ? (
              <Text type="danger">
                {t("Expired")} <Time dateTime={share.expiresAt} addSuffix />
              </Text>
            ) : share.expiresAt ? (
              <Text type="tertiary">
                {dateToExpiry(share.expiresAt, t, userLocale)}
              </Text>
            ) : (
              <Text type="tertiary">{t("Never")}</Text>
            ),
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
          component: (share) => formatNumber(share.views),
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
    [t, hasDomain, canManage, formatNumber, userLocale]
  );

  return (
    <SortableTable
      data={data}
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={HEADER_HEIGHT}
      decorateRow={canManage ? applyContextMenu : undefined}
      {...rest}
    />
  );
}
