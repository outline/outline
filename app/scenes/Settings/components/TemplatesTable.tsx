import compact from "lodash/compact";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import Flex from "@shared/components/Flex";
import Icon from "@shared/components/Icon";
import { hover } from "@shared/styles";
import type Template from "~/models/Template";
import { Avatar, AvatarSize } from "~/components/Avatar";
import ButtonLink from "~/components/ButtonLink";
import { HEADER_HEIGHT } from "~/components/Header";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import TemplateMenu from "~/menus/TemplateMenu";
import { FILTER_HEIGHT } from "./StickyFilters";
import history from "~/utils/history";
import { settingsPath } from "~/utils/routeHelpers";

const ROW_HEIGHT = 60;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<Template>, "columns" | "rowHeight">;

export function TemplatesTable(props: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleOpen = (template: Template) => () => {
    history.push(settingsPath("templates", template.id));
  };

  const columns = React.useMemo<TableColumn<Template>[]>(
    () =>
      compact<TableColumn<Template>>([
        {
          type: "data",
          id: "title",
          header: t("Title"),
          accessor: (template) => template.titleWithDefault,
          component: (template) => (
            <ButtonLink onClick={handleOpen(template)}>
              <Flex align="center" gap={4}>
                {template.icon ? (
                  <Icon
                    value={template.icon}
                    initial={template.initial}
                    color={template.color || undefined}
                    size={24}
                  />
                ) : (
                  <DocumentIcon size={24} color={theme.textSecondary} />
                )}
                <Title>{template.titleWithDefault}</Title>
              </Flex>
            </ButtonLink>
          ),
          width: "4fr",
        },
        {
          type: "data",
          id: "collectionId",
          header: t("Visibility"),
          accessor: (template) => template.collection?.name,
          component: (template) => <Permission template={template} />,
          width: "2fr",
        },
        {
          type: "data",
          id: "lastModifiedById",
          header: t("Updated by"),
          accessor: (template) => template.updatedBy?.name,
          sortable: false,
          component: (template) => (
            <Flex align="center" gap={8}>
              <Avatar model={template.updatedBy} size={AvatarSize.Small} />{" "}
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
        {
          type: "action",
          id: "action",
          component: (template) => (
            <TemplateMenu template={template} onEdit={handleOpen(template)} />
          ),
          width: "50px",
        },
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

const Permission = observer(({ template }: { template: Template }) => {
  const { t } = useTranslation();

  React.useEffect(() => {
    void template?.loadRelations();
  }, [template]);

  return (
    <Flex align="center" gap={4}>
      {template.collection ? (
        <CollectionIcon collection={template.collection} />
      ) : null}
      {template.collectionId ? template.collection?.name : t("Workspace")}
    </Flex>
  );
});

const Title = styled(Text)`
  &: ${hover} {
    text-decoration: underline;
    cursor: var(--pointer);
  }
`;
