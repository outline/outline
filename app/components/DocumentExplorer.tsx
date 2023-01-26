import FuzzySearch from "fuzzy-search";
import { includes, difference, concat, filter, flatten } from "lodash";
import { observer } from "mobx-react";
import { StarredIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { NavigationNode } from "@shared/types";
import parseTitle from "@shared/utils/parseTitle";
import DocumentExplorerNode from "~/components/DocumentExplorerNode";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { isModKey } from "~/utils/keyboard";
import { flattenTree, ancestors, descendants } from "~/utils/tree";

type Props = {
  actionOnItem: () => void;
  onSelectItem: (item: NavigationNode | null) => void;
};

function DocumentExplorer({ actionOnItem, onSelectItem }: Props) {
  const isMobile = useMobile();
  const { collections, documents } = useStores();
  const { t } = useTranslation();
  const theme = useTheme();
  const collectionTrees = useCollectionTrees();

  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [selectedNode, selectNode] = React.useState<NavigationNode | null>(
    null
  );
  const [initialScrollOffset, setInitialScrollOffset] = React.useState<number>(
    0
  );
  const [nodes, setNodes] = React.useState<NavigationNode[]>([]);
  const [activeNode, setActiveNode] = React.useState<number>(0);
  const [expandedNodes, setExpandedNodes] = React.useState<string[]>([]);

  const inputSearchRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  );
  const listRef = React.useRef<List<NavigationNode[]>>(null);

  const VERTICAL_PADDING = 6;
  const HORIZONTAL_PADDING = 24;

  const allNodes = React.useMemo(
    () => flatten(collectionTrees.map(flattenTree)),
    [collectionTrees]
  );

  const searchIndex = React.useMemo(() => {
    return new FuzzySearch(allNodes, ["title"], {
      caseSensitive: false,
    });
  }, [allNodes]);

  React.useEffect(() => {
    if (searchTerm) {
      selectNode(null);
      setExpandedNodes([]);
    }
    setActiveNode(0);
  }, [searchTerm]);

  React.useEffect(() => {
    let results;

    if (searchTerm) {
      results = searchIndex.search(searchTerm);
    } else {
      results = allNodes.filter((r) => r.type === "collection");
    }

    setInitialScrollOffset(0);
    setNodes(results);
  }, [searchTerm, allNodes, searchIndex]);

  React.useEffect(() => {
    onSelectItem(selectedNode);
  }, [selectedNode, onSelectItem]);

  const handleSearch = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const isExpanded = (node: number) => {
    return includes(expandedNodes, nodes[node].id);
  };

  const calculateInitialScrollOffset = (itemCount: number) => {
    if (listRef.current) {
      const { height, itemSize } = listRef.current.props;
      const { scrollOffset } = listRef.current.state as {
        scrollOffset: number;
      };
      const itemsHeight = itemCount * itemSize;
      return itemsHeight < height ? 0 : scrollOffset;
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
    setNodes(newNodes);
  };

  const expand = (node: number) => {
    setExpandedNodes(concat(expandedNodes, nodes[node].id));

    // add children
    const newNodes = nodes.slice();
    newNodes.splice(node + 1, 0, ...descendants(nodes[node], 1));
    const scrollOffset = calculateInitialScrollOffset(newNodes.length);
    setInitialScrollOffset(scrollOffset);
    setNodes(newNodes);
  };

  const isSelected = (node: number) => {
    if (!selectedNode) {
      return false;
    }
    const selectedNodeId = selectedNode.id;
    const nodeId = nodes[node].id;

    return selectedNodeId === nodeId;
  };

  const toggleCollapse = (node: number) => {
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

  const ListItem = ({
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
    let icon, title, path;

    if (isCollection) {
      const col = collections.get(node.collectionId as string);
      icon = col && (
        <CollectionIcon collection={col} expanded={isExpanded(index)} />
      );
      title = node.title;
    } else {
      const doc = documents.get(node.id);
      const { strippedTitle, emoji } = parseTitle(node.title);
      title = strippedTitle;

      if (emoji) {
        icon = <EmojiIcon emoji={emoji} />;
      } else if (doc?.isStarred) {
        icon = <StarredIcon color={theme.yellow} />;
      } else {
        icon = <DocumentIcon />;
      }

      path = ancestors(node)
        .map((a) => parseTitle(a.title).strippedTitle)
        .join(" / ");
    }

    return (
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
        icon={icon}
        title={title}
        path={path}
        nestLevel={node.depth as number}
        hasChildren={node.children.length > 0}
        isSearchResult={!!searchTerm}
      />
    );
  };

  const focusSearchInput = () => {
    inputSearchRef.current?.focus();
  };

  const next = () => {
    return Math.min(activeNode + 1, nodes.length - 1);
  };

  const prev = () => {
    return Math.max(activeNode - 1, 0);
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    switch (ev.key) {
      case "ArrowDown": {
        ev.preventDefault();
        setActiveNode(next());
        break;
      }
      case "ArrowUp": {
        ev.preventDefault();
        if (activeNode === 0) {
          focusSearchInput();
        } else {
          setActiveNode(prev());
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
        }
        break;
      }
      case "Enter": {
        if (isModKey(ev)) {
          actionOnItem();
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
  >(({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        height: `${parseFloat(style?.height + "") + VERTICAL_PADDING * 2}px`,
      }}
      {...rest}
    />
  ));

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
            <Text type="secondary">{t("No results found")}.</Text>
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
