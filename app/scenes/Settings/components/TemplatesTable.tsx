import Flex from "@shared/components/Flex";
import compact from "lodash/compact";
import React from "react";
import { useTranslation } from "react-i18next";
import Template from "~/models/Template";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { HEADER_HEIGHT } from "~/components/Header";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import { FILTER_HEIGHT } from "./StickyFilters";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Template>, "columns" | "rowHeight">;

export function TemplatesTable(props: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const columns = React.useMemo<TableColumn<Template>[]>(
    () =>
      compact<TableColumn<Template>>([
        {
          type: "data",
          id: "title",
          header: t("Title"),
          accessor: (template) => template.titleWithDefault,
          component: (template) => <>{template.titleWithDefault}</>,
          width: "4fr",
        },
        {
          type: "data",
          id: "collectionId",
          header: t("Permission"),
          accessor: (template) => template.collection?.name,
          component: (template) => (
            <Flex align="center" gap={8}>
              {template.collection ? (
                <CollectionIcon collection={template.collection} />
              ) : null}
              {template.collectionId
                ? template.collection?.name
                : t("Workspace")}
            </Flex>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "lastModifiedById",
          header: t("Updated by"),
          accessor: (template) => template.updatedBy?.name,
          component: (template) => (
            <Flex align="center" gap={8}>
              <Avatar model={template.updatedBy} size={AvatarSize.Medium} />{" "}
              {template.updatedBy?.name}{" "}
            </Flex>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "createdAt",
          header: t("Date created"),
          accessor: (title) => title.createdAt,
          component: (title) =>
            title.createdAt ? (
              <Time dateTime={title.createdAt} addSuffix />
            ) : null,
          width: "1fr",
        },
        // {
        //   type: "action",
        //   id: "action",
        //   component: (group) => <GroupMenu group={group} />,
        //   width: "50px",
        // },
      ]),
    [t]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      {...props}
    />
  );
}
