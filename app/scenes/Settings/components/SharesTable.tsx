import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type Share from "~/models/Share";
import Badge from "~/components/Badge";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import { UserLabel } from "~/components/UserLabel";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useShareMenuActions } from "~/hooks/useShareMenuActions";
import Time from "~/components/Time";
import ShareMenu from "~/menus/ShareMenu";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import useStores from "~/hooks/useStores";
import ShareSelectionToolbar from "./ShareSelectionToolbar";

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
  const action = useShareMenuActions();
  return (
    <ActionContextProvider value={{ activeModels: [share] }}>
      <ContextMenu action={action} ariaLabel={menuLabel}>
        {children}
      </ContextMenu>
    </ActionContextProvider>
  );
});

export function SharesTable({ data, canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const formatNumber = useFormatNumber();
  const { policies } = useStores();
  const hasDomain = data.some((share) => share.domain);

  const isRowSelectable = useCallback(
    (share: Share) => !!policies.abilities(share.id).revoke,
    [policies]
  );

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
          component: (share) => <UserLabel user={share.createdBy} />,
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
          component: (share) => formatNumber(share.views),
          width: "150px",
        },
        canManage
          ? {
              type: "action",
              id: "action",
              component: (share) => <ShareMenu share={share} />,
              width: "50px",
            }
          : undefined,
      ]),
    [t, hasDomain, canManage, formatNumber]
  );

  return (
    <SortableTable
      id="shares"
      data={data}
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={HEADER_HEIGHT}
      decorateRow={canManage ? applyContextMenu : undefined}
      isRowSelectable={canManage ? isRowSelectable : undefined}
      selectionToolbar={<ShareSelectionToolbar />}
      {...rest}
    />
  );
}
