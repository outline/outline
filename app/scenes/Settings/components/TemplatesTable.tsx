import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import React, { useCallback } from "react";
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
import { ContextMenu } from "~/components/Menu/ContextMenu";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useTemplateSettingsActions } from "~/hooks/useTemplateSettingsActions";
import Disclosure from "~/components/Sidebar/components/Disclosure";
import TemplateMenu from "~/menus/TemplateMenu";
import { FILTER_HEIGHT } from "./StickyFilters";
import history from "~/utils/history";
import usePolicy from "~/hooks/usePolicy";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;
const NESTED_INDENT = 24;

type Props = Omit<TableProps<Template>, "columns" | "rowHeight"> & {
  /** Ids of templates whose nested templates are shown. */
  expandedIds?: Set<string>;
  /** Callback to show or hide the nested templates of a template. */
  onToggleExpand?: (template: Template) => void;
};

const TemplateRowContextMenu = observer(function TemplateRowContextMenu({
  template,
  menuLabel,
  children,
}: {
  template: Template;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useTemplateSettingsActions(template, () =>
    history.push(template.path)
  );
  return (
    <ActionContextProvider value={{ activeModels: [template] }}>
      <ContextMenu action={action} ariaLabel={menuLabel}>
        {children}
      </ContextMenu>
    </ActionContextProvider>
  );
});

export function TemplatesTable({
  expandedIds,
  onToggleExpand,
  ...rest
}: Props) {
  const { t } = useTranslation();

  const handleOpen = (template: Template) => {
    history.push(template.path);
  };

  const applyContextMenu = useCallback(
    (template: Template, rowElement: React.ReactNode) => (
      <TemplateRowContextMenu
        template={template}
        menuLabel={t("Template options")}
      >
        {rowElement}
      </TemplateRowContextMenu>
    ),
    [t]
  );

  const columns = React.useMemo<TableColumn<Template>[]>(
    () =>
      compact<TableColumn<Template>>([
        {
          type: "data",
          id: "title",
          header: t("Title"),
          accessor: (template) => template.titleWithDefault,
          component: (template) => (
            <TemplateLink
              template={template}
              onClick={handleOpen}
              expanded={expandedIds?.has(template.id)}
              onToggleExpand={onToggleExpand}
            />
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
          width: "2fr",
        },
        {
          type: "action",
          id: "action",
          component: (template) => (
            <TemplateMenu
              template={template}
              onEdit={() => handleOpen(template)}
            />
          ),
          width: "50px",
        },
      ]),
    [t, expandedIds, onToggleExpand]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      decorateRow={applyContextMenu}
      {...rest}
    />
  );
}

const TemplateLink = observer(
  ({
    template,
    onClick,
    expanded,
    onToggleExpand,
  }: {
    template: Template;
    onClick: (template: Template) => void;
    expanded?: boolean;
    onToggleExpand?: (template: Template) => void;
  }) => {
    const theme = useTheme();
    const can = usePolicy(template);
    const showNesting = !!onToggleExpand;
    const content = (
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
        {can.update ? (
          <Title>{template.titleWithDefault}</Title>
        ) : (
          <Text>{template.titleWithDefault}</Text>
        )}
      </Flex>
    );

    const link = can.update ? (
      <ButtonLink onClick={() => onClick(template)}>{content}</ButtonLink>
    ) : (
      content
    );

    if (!showNesting) {
      return link;
    }

    return (
      <NestedTitle align="center" $depth={template.depth}>
        {template.hasChildTemplates && (
          <Disclosure
            expanded={!!expanded}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleExpand(template);
            }}
          />
        )}
        {link}
      </NestedTitle>
    );
  }
);

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

const NestedTitle = styled(Flex)<{ $depth: number }>`
  position: relative;
  padding-inline-start: ${(props) => 20 + props.$depth * NESTED_INDENT}px;

  ${Disclosure} {
    inset-inline-start: ${(props) => props.$depth * NESTED_INDENT - 2}px;
  }
`;
