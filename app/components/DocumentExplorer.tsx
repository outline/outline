import FuzzySearch from "fuzzy-search";
import concat from "lodash/concat";
import difference from "lodash/difference";
import fill from "lodash/fill";
import filter from "lodash/filter";
import includes from "lodash/includes";
import map from "lodash/map";
import { observer } from "mobx-react";
import { StarredIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { NavigationNode } from "@shared/types";
import DocumentExplorerNode from "~/components/DocumentExplorerNode";
import DocumentExplorerSearchResult from "~/components/DocumentExplorerSearchResult";
import Flex from "~/components/Flex";
import Icon from "~/components/Icon";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { isModKey } from "~/utils/keyboard";
import { ancestors, descendants } from "~/utils/tree";

type Props = {
  /** Action taken upon submission of selected item, could be publish, move etc. */
  onSubmit: () => void;

  /** A side-effect of item selection */
  onSelect: (item: NavigationNode | null) => void;

  /** Items to be shown in explorer */
  items: NavigationNode[];
};

function DocumentExplorer({ onSubmit, onSelect, items }: Props) {
  const isMobile = useMobile();
  const { collections, documents } = useStores();
  const { t } = useTranslation();
  const theme = useTheme();

  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [selectedNode, selectNode] = React.useState<NavigationNode | null>(
    null
  );
  const [initialScrollOffset, setInitialScrollOffset] =
    React.useState<number>(0);
  const [activeNode, setActiveNode] = React.useState<number>(0);
  const [expandedNodes, setExpandedNodes] = React.useState<string[]>([]);
  const [itemRefs, setItemRefs] = React.useState<
    React.RefObject<HTMLSpanElement>[]
  >([]);

  const inputSearchRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  );
  const listRef = React.useRef<List<NavigationNode[]>>(null);

  const VERTICAL_PADDING = 6;
  const HORIZONTAL_PADDING = 24;

  const searchIndex = React.useMemo(
    () =>
      new FuzzySearch(items, ["title"], {
        caseSensitive: false,
      }),
    [items]
  );

  React.useEffect(() => {
    if (searchTerm) {
      selectNode(null);
      setExpandedNodes([]);
    }
    setActiveNode(0);
  }, [searchTerm]);

  React.useEffect(() => {
    setItemRefs((itemRefs) =>
      map(
        fill(Array(items.length), 0),
        (_, i) => itemRefs[i] || React.createRef()
      )
    );
  }, [items.length]);

  React.useEffect(() => {
    onSelect(selectedNode);
  }, [selectedNode, onSelect]);

  function getNodes() {
    function includeDescendants(item: NavigationNode): NavigationNode[] {
      return expandedNodes.includes(item.id)
        ? [item, ...descendants(item, 1).flatMap(includeDescendants)]
        : [item];
    }

    return searchTerm
      ? searchIndex.search(searchTerm)
      : items
          .filter((item) => item.type === "collection")
          .flatMap(includeDescendants);
  }

  const nodes = getNodes();

  const scrollNodeIntoView = React.useCallback(
    (node: number) => {
      if (itemRefs[node] && itemRefs[node].current) {
        scrollIntoView(itemRefs[node].current as HTMLSpanElement, {
          behavior: "auto",
          block: "center",
        });
      }
    },
    [itemRefs]
  );

  const handleSearch = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const isExpanded = (node: number) => includes(expandedNodes, nodes[node].id);

  const calculateInitialScrollOffset = (itemCount: number) => {
    if (listRef.current) {
      const { height, itemSize } = listRef.current.props;
      const { scrollOffset } = listRef.current.state as {
        scrollOffset: number;
      };
      const itemsHeight = itemCount * itemSize;
      return itemsHeight < Number(height) ? 0 : scrollOffset;
    }
    return 0;
  };

  const collapse = (node: number) => {
    const descendantIds = descendants(nodes[node]).map((des) => des.id);
    setExpandedNodes(
      difference(expandedNodes, [...descendantIds, nodes[node].id])
    );

    // remove children
    const newNodes = filter(nodes, (node) => !includes(descendantIds, node.id));
    const scrollOffset = calculateInitialScrollOffset(newNodes.length);
    setInitialScrollOffset(scrollOffset);
  };

  const expand = (node: number) => {
    setExpandedNodes(concat(expandedNodes, nodes[node].id));

    // add children
    const newNodes = nodes.slice();
    newNodes.splice(node + 1, 0, ...descendants(nodes[node], 1));
    const scrollOffset = calculateInitialScrollOffset(newNodes.length);
    setInitialScrollOffset(scrollOffset);
  };

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
    nodes[node].children.length > 0 || nodes[node].type === "collection";

  const toggleCollapse = (node: number) => {
    if (!hasChildren(node)) {
      return;
    }
    if (isExpanded(node)) {
      collapse(node);
    } else {
      expand(node);
    }
  };

  const toggleSelect = (node: number) => {
    if (isSelected(node)) {
      selectNode(null);
    } else {
      selectNode(nodes[node]);
    }
  };

  const ListItem = observer(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: NavigationNode[];
      style: React.CSSProperties;
    }) => {
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
        icon = doc?.icon ?? node.icon;
        color = doc?.color ?? node.color;
        title = doc?.title ?? node.title;

        if (icon) {
          renderedIcon = <Icon value={icon} color={color} />;
        } else if (doc?.isStarred) {
          renderedIcon = <StarredIcon color={theme.yellow} />;
        } else {
          renderedIcon = <DocumentIcon color={theme.textSecondary} />;
        }

        path = ancestors(node)
          .map((a) => a.title)
          .join(" / ");
      }

      return searchTerm ? (
        <DocumentExplorerSearchResult
          selected={isSelected(index)}
          active={activeNode === index}
          style={{
            ...style,
            top: (style.top as number) + VERTICAL_PADDING,
            left: (style.left as number) + HORIZONTAL_PADDING,
            width: `calc(${style.width} - ${HORIZONTAL_PADDING * 2}px)`,
          }}
          onPointerMove={() => setActiveNode(index)}
          onClick={() => toggleSelect(index)}
          icon={renderedIcon}
          title={title}
          path={path}
        />
      ) : (
        <DocumentExplorerNode
          style={{
            ...style,
            top: (style.top as number) + VERTICAL_PADDING,
            left: (style.left as number) + HORIZONTAL_PADDING,
            width: `calc(${style.width} - ${HORIZONTAL_PADDING * 2}px)`,
          }}
          onPointerMove={() => setActiveNode(index)}
          onClick={() => toggleSelect(index)}
          onDisclosureClick={(ev) => {
            ev.stopPropagation();
            toggleCollapse(index);
          }}
          selected={isSelected(index)}
          active={activeNode === index}
          expanded={isExpanded(index)}
          icon={renderedIcon}
          title={title}
          depth={node.depth as number}
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
        if (!searchTerm && isExpanded(activeNode)) {
          toggleCollapse(activeNode);
        }
        break;
      }
      case "ArrowRight": {
        if (!searchTerm) {
          toggleCollapse(activeNode);
          // let the nodes re-render first and then scroll
          setTimeout(() => scrollNodeIntoView(activeNode), 0);
        }
        break;
      }
      case "Enter": {
        if (isModKey(ev)) {
          onSubmit();
        } else {
          toggleSelect(activeNode);
        }
        break;
      }
    }
  };

  const innerElementType = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(function innerElementType(
    { style, ...rest }: React.HTMLAttributes<HTMLDivElement>,
    ref
  ) {
    return (
      <div
        ref={ref}
        style={{
          ...style,
          height: `${parseFloat(style?.height + "") + VERTICAL_PADDING * 2}px`,
        }}
        {...rest}
      />
    );
  });

  return (
    <Container tabIndex={-1} onKeyDown={handleKeyDown}>
      <ListSearch
        ref={inputSearchRef}
        onChange={handleSearch}
        placeholder={`${t("Search collections & documents")}…`}
        autoFocus
      />
      <ListContainer>
        {nodes.length ? (
          <AutoSizer>
            {({ width, height }: { width: number; height: number }) => (
              <Flex role="listbox" column>
                <List
                  ref={listRef}
                  key={nodes.length}
                  width={width}
                  height={height}
                  itemData={nodes}
                  itemCount={nodes.length}
                  itemSize={isMobile ? 48 : 32}
                  innerElementType={innerElementType}
                  initialScrollOffset={initialScrollOffset}
                  itemKey={(index, results) => results[index].id}
                >
                  {ListItem}
                </List>
              </Flex>
            )}
          </AutoSizer>
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

const ListSearch = styled(InputSearch)`
  ${Outline} {
    border-radius: 16px;
  }
  margin-bottom: 4px;
  padding-left: 24px;
  padding-right: 24px;
`;

const ListContainer = styled.div`
  height: 65vh;

  ${breakpoint("tablet")`
    height: 40vh;
  `}
`;

export default observer(DocumentExplorer);
