import FuzzySearch from "fuzzy-search";
import {
  concat,
  difference,
  fill,
  flatten,
  includes,
  map,
  union,
} from "es-toolkit/compat";
import { observer } from "mobx-react";
import { StarredIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { ListImperativeAPI, RowComponentProps } from "react-window";
import { List } from "react-window";
import styled, { useTheme } from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { isModKey } from "@shared/utils/keyboard";
import { ancestors, descendants, flattenTree } from "@shared/utils/tree";
import DocumentExplorerNode from "./DocumentExplorerNode";
import DocumentExplorerSearchResult from "./DocumentExplorerSearchResult";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSearch from "~/components/InputSearch";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

type Props = {
  /** Action taken upon submission of selected item, could be publish, move etc. */
  onSubmit: (item: NavigationNode | null) => void;
  /** A side-effect of item selection */
  onSelect: (item: NavigationNode | null) => void;
  /** Items to be shown in explorer */
  items: NavigationNode[];
  /** Automatically expand to and select item with the given id */
  defaultValue?: string;
  /** Whether to show child documents */
  showDocuments?: boolean;
};

const VERTICAL_PADDING = 6;
const HORIZONTAL_PADDING = 24;

const expandableDescendantIds = (node: NavigationNode) =>
  descendants(node)
    .filter((des) => des.children.length > 0)
    .map((des) => des.id);

interface RowProps {
  data: NavigationNode[];
}

const rowKey = (index: number, { data }: RowProps) => data[index].id;

function DocumentExplorer({
  onSubmit,
  onSelect,
  items,
  defaultValue,
  showDocuments,
}: Props) {
  const isMobile = useMobile();
  const { collections, documents } = useStores();
  const { t } = useTranslation();
  const theme = useTheme();

  const [searchTerm, setSearchTerm] = React.useState<string>();
  // Defer filtering so typing in the search input stays responsive.
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  const [selectedNode, selectNode] = React.useState<NavigationNode | null>(
    () => {
      if (!defaultValue) {
        return null;
      }

      // Search through all nodes in the tree, not just top-level items
      const allNodes = flatten(items.map(flattenTree));
      const node = allNodes.find((item) => item.id === defaultValue);
      return node || null;
    }
  );
  const [activeNode, setActiveNode] = React.useState<number>(0);
  const [expandedNodes, setExpandedNodes] = React.useState<string[]>(() => {
    if (defaultValue) {
      // Search through all nodes in the tree, not just top-level items
      const allNodes = flatten(items.map(flattenTree));
      const node = allNodes.find((item) => item.id === defaultValue);
      if (node) {
        return ancestors(node).map((ancestorNode) => ancestorNode.id);
      }
    }
    return [];
  });
  // Nodes expanded with alt-click, whose descendants stay expanded as they load.
  const [deepExpandedNodes, setDeepExpandedNodes] = React.useState<string[]>(
    []
  );

  const [itemRefs, setItemRefs] = React.useState<
    React.RefObject<HTMLSpanElement>[]
  >([]);

  const inputSearchRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  );
  const listRef = React.useRef<ListImperativeAPI>(null);

  const searchIndex = React.useMemo(
    () =>
      new FuzzySearch(flatten(items.map(flattenTree)), ["title"], {
        caseSensitive: false,
      }),
    [items]
  );

  React.useEffect(() => {
    if (searchTerm) {
      selectNode(null);
      setExpandedNodes([]);
      setDeepExpandedNodes([]);
    }
    setActiveNode(0);
  }, [searchTerm]);

  React.useEffect(() => {
    setItemRefs((existingItemRefs) =>
      map(
        fill(Array(items.length), 0),
        (_, i) => existingItemRefs[i] || React.createRef()
      )
    );
  }, [items.length]);

  function getNodes() {
    function includeDescendants(item: NavigationNode): NavigationNode[] {
      return expandedNodes.includes(item.id)
        ? [item, ...descendants(item, 1).flatMap(includeDescendants)]
        : [item];
    }

    return deferredSearchTerm
      ? searchIndex.search(deferredSearchTerm)
      : items.flatMap(includeDescendants);
  }

  const nodes = getNodes();

  React.useEffect(() => {
    onSelect(selectedNode);
  }, [selectedNode, onSelect]);

  React.useEffect(() => {
    if (defaultValue && selectedNode && listRef) {
      const index = nodes.findIndex((node) => node.id === selectedNode.id);
      if (index > 0) {
        setTimeout(
          () => listRef.current?.scrollToRow({ index, align: "center" }),
          50
        );
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);
  const baseDepth = nodes.reduce(
    (min, node) => (node.depth ? Math.min(min, node.depth) : min),
    Infinity
  );
  const normalizedBaseDepth =
    (baseDepth === Infinity ? 0 : baseDepth) + (showDocuments ? 0 : 1);

  const scrollNodeIntoView = React.useCallback((node: number) => {
    listRef.current?.scrollToRow({ index: node, align: "smart" });
  }, []);

  const handleSearch = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const isExpanded = (node: number) => includes(expandedNodes, nodes[node].id);

  const collapse = (node: number) => {
    const descendantIds = descendants(nodes[node]).map((des) => des.id);
    const ancestorIds = ancestors(nodes[node]).map((anc) => anc.id);
    setExpandedNodes(
      difference(expandedNodes, [...descendantIds, nodes[node].id])
    );
    setDeepExpandedNodes(
      difference(deepExpandedNodes, [
        ...ancestorIds,
        ...descendantIds,
        nodes[node].id,
      ])
    );
  };

  const expand = (node: number, deep = false) => {
    if (deep) {
      setExpandedNodes(
        union(expandedNodes, [
          nodes[node].id,
          ...expandableDescendantIds(nodes[node]),
        ])
      );
      setDeepExpandedNodes(union(deepExpandedNodes, [nodes[node].id]));
    } else {
      setExpandedNodes(concat(expandedNodes, nodes[node].id));
    }
  };

  // Expand descendants of alt-clicked nodes that load after the click.
  React.useEffect(() => {
    if (!deepExpandedNodes.length) {
      return;
    }
    const ids = flatten(items.map(flattenTree))
      .filter((item) => deepExpandedNodes.includes(item.id))
      .flatMap(expandableDescendantIds);

    setExpandedNodes((prev) => {
      const missing = difference(ids, prev);
      return missing.length ? concat(prev, missing) : prev;
    });
  }, [items, deepExpandedNodes]);

  React.useEffect(() => {
    collections.orderedData
      .filter(
        (collection) => expandedNodes.includes(collection.id) || searchTerm
      )
      .forEach((collection) => {
        void collection.fetchDocuments();
      });
  }, [collections, expandedNodes, searchTerm]);

  const isSelected = (node: number) => {
    if (!selectedNode) {
      return false;
    }
    const selectedNodeId = selectedNode.id;
    const nodeId = nodes[node].id;

    return selectedNodeId === nodeId;
  };

  const hasChildren = (node: number) =>
    nodes[node].children.length > 0 ||
    (showDocuments !== false && nodes[node].type === "collection");

  const toggleCollapse = (node: number, deep = false) => {
    if (!hasChildren(node)) {
      return;
    }
    if (isExpanded(node)) {
      collapse(node);
    } else {
      expand(node, deep);
    }
  };

  const toggleSelect = (node: number) => {
    if (isSelected(node)) {
      selectNode(null);
    } else {
      selectNode(nodes[node]);
    }
  };

  const submitNode = (node: number) => {
    const selectedNode = nodes[node];

    selectNode(selectedNode);
    onSubmit(selectedNode);
  };

  const ListItem = observer(
    ({ index, data, style }: RowComponentProps<RowProps>) => {
      const node = data[index];
      const isCollection = node.type === "collection";
      let renderedIcon,
        title: string,
        icon: string | undefined,
        color: string | undefined,
        path;

      if (isCollection) {
        const col = collections.get(node.collectionId as string);
        renderedIcon = col && (
          <CollectionIcon collection={col} expanded={isExpanded(index)} />
        );
        title = node.title;
      } else {
        const doc = documents.get(node.id);
        icon = doc?.icon ?? node.icon ?? node.emoji;
        color = doc?.color ?? node.color;
        title = doc?.title ?? node.title;

        if (icon) {
          renderedIcon = (
            <Icon value={icon} initial={node.title} color={color} />
          );
        } else if (doc?.isStarred) {
          renderedIcon = <StarredIcon color={theme.yellow} />;
        } else {
          renderedIcon = <DocumentIcon color={theme.textSecondary} />;
        }

        path = ancestors(node)
          .map((a) => a.title)
          .join(" / ");
      }

      return deferredSearchTerm ? (
        <DocumentExplorerSearchResult
          selected={isSelected(index)}
          active={activeNode === index}
          style={{
            ...style,
            top: VERTICAL_PADDING,
            left: HORIZONTAL_PADDING,
            width: `calc(100% - ${HORIZONTAL_PADDING * 2}px)`,
          }}
          onPointerMove={() => setActiveNode(index)}
          onClick={() => selectNode(nodes[index])}
          onDoubleClick={() => submitNode(index)}
          icon={renderedIcon}
          title={title}
          path={path}
        />
      ) : (
        <DocumentExplorerNode
          style={{
            ...style,
            top: VERTICAL_PADDING,
            left: HORIZONTAL_PADDING,
            width: `calc(100% - ${HORIZONTAL_PADDING * 2}px)`,
          }}
          onPointerMove={() => setActiveNode(index)}
          onClick={() => selectNode(nodes[index])}
          onDoubleClick={() => submitNode(index)}
          onDisclosureClick={(ev) => {
            ev.stopPropagation();
            toggleCollapse(index, ev.altKey);
          }}
          selected={isSelected(index)}
          active={activeNode === index}
          expanded={isExpanded(index)}
          icon={renderedIcon}
          title={title}
          depth={(node.depth ?? 0) - normalizedBaseDepth}
          hasChildren={hasChildren(index)}
          ref={itemRefs[index]}
        />
      );
    }
  );

  const focusSearchInput = () => {
    inputSearchRef.current?.focus();
  };

  const next = () => Math.min(activeNode + 1, nodes.length - 1);

  const prev = () => Math.max(activeNode - 1, 0);

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    switch (ev.key) {
      case "ArrowDown": {
        ev.preventDefault();
        ev.stopPropagation();
        setActiveNode(next());
        scrollNodeIntoView(next());
        break;
      }
      case "ArrowUp": {
        ev.preventDefault();
        ev.stopPropagation();
        if (activeNode === 0) {
          focusSearchInput();
        } else {
          setActiveNode(prev());
          scrollNodeIntoView(prev());
        }
        break;
      }
      case "ArrowLeft": {
        if (!deferredSearchTerm && isExpanded(activeNode)) {
          toggleCollapse(activeNode);
        }
        break;
      }
      case "ArrowRight": {
        if (!deferredSearchTerm) {
          toggleCollapse(activeNode);
          // let the nodes re-render first and then scroll
          setTimeout(() => scrollNodeIntoView(activeNode), 0);
        }
        break;
      }
      case "Enter": {
        if (isModKey(ev)) {
          onSubmit(selectedNode);
        } else {
          toggleSelect(activeNode);
        }
        break;
      }
    }
  };

  return (
    <Container tabIndex={-1} onKeyDown={handleKeyDown}>
      <ListSearch
        ref={inputSearchRef}
        onChange={handleSearch}
        placeholder={
          showDocuments
            ? `${t("Search collections & documents")}…`
            : `${t("Search collections")}…`
        }
        autoFocus
      />
      <ListContainer>
        {nodes.length ? (
          <StyledList
            role="listbox"
            listRef={listRef}
            rowCount={nodes.length}
            rowHeight={isMobile ? 48 : 32}
            rowComponent={ListItem}
            rowProps={{ data: nodes }}
            rowKey={rowKey}
          />
        ) : (
          <FlexContainer>
            <Text as="p" type="secondary">
              {t("No results found")}.
            </Text>
          </FlexContainer>
        )}
      </ListContainer>
    </Container>
  );
}

const Container = styled.div``;

const FlexContainer = styled(Flex)`
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const ListSearch = styled(InputSearch).attrs({ round: true })`
  margin-bottom: 4px;
  padding-left: 24px;
  padding-right: 24px;
`;

// Rows are offset by the top padding, so the bottom needs room for both.
const StyledList = styled(List<RowProps>)`
  padding-bottom: ${VERTICAL_PADDING * 2}px;
`;

const ListContainer = styled.div`
  height: 65vh;

  ${breakpoint("tablet")`
    height: 40vh;
  `}
`;

export default observer(DocumentExplorer);
