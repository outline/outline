import FuzzySearch from "fuzzy-search";
import { includes, difference, concat, filter, flatten } from "lodash";
import { observer } from "mobx-react";
import { StarredIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { NavigationNode } from "@shared/types";
import parseTitle from "@shared/utils/parseTitle";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import PublishLocation from "~/components/PublishLocation";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { isModKey } from "~/utils/keyboard";
import { flattenTree, ancestors, descendants } from "~/utils/tree";

type Props = {
  /** Document to publish */
  document: Document;
};

function DocumentPublish({ document }: Props) {
  const isMobile = useMobile();
  const { collections, documents, dialogs } = useStores();
  const { showToast } = useToasts();
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

  const publish = async () => {
    if (!selectedNode) {
      showToast(t("Select a location to publish"), {
        type: "info",
      });
      return;
    }

    try {
      const { type, id: parentDocumentId } = selectedNode;

      const collectionId = selectedNode.collectionId as string;

      // Also move it under if selected path corresponds to another doc
      if (type === "document") {
        await document.move(collectionId, parentDocumentId);
      }

      document.collectionId = collectionId;
      await document.save({ publish: true });

      showToast(t("Document published"), {
        type: "success",
      });

      dialogs.closeAllModals();
    } catch (err) {
      showToast(t("Couldn’t publish the document, try again?"), {
        type: "error",
      });
    }
  };

  const row = ({
    index,
    data,
    style,
  }: {
    index: number;
    data: NavigationNode[];
    style: React.CSSProperties;
  }) => {
    const result = data[index];
    const isCollection = result.type === "collection";
    let icon, title, path;

    if (isCollection) {
      const col = collections.get(result.collectionId as string);
      icon = col && (
        <CollectionIcon collection={col} expanded={isExpanded(index)} />
      );
      title = result.title;
    } else {
      const doc = documents.get(result.id);
      const { strippedTitle, emoji } = parseTitle(result.title);
      title = strippedTitle;

      if (emoji) {
        icon = <EmojiIcon emoji={emoji} />;
      } else if (doc?.isStarred) {
        icon = <StarredIcon color={theme.yellow} />;
      } else {
        icon = <DocumentIcon />;
      }

      path = ancestors(result)
        .map((a) => parseTitle(a.title).strippedTitle)
        .join(" / ");
    }

    return (
      <PublishLocation
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
        nestLevel={result.depth as number}
        hasChildren={result.children.length > 0}
        isSearchResult={!!searchTerm}
      />
    );
  };

  if (!document || !collections.isLoaded) {
    return null;
  }

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
          publish();
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
    <FlexContainer column tabIndex={-1} onKeyDown={handleKeyDown}>
      <Search
        ref={inputSearchRef}
        onChange={handleSearch}
        placeholder={`${t("Search collections & documents")}…`}
        autoFocus
      />
      {nodes.length ? (
        <Results>
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
                  {row}
                </List>
              </Flex>
            )}
          </AutoSizer>
        </Results>
      ) : (
        <NoResults>
          <Text type="secondary">{t("No results found")}.</Text>
        </NoResults>
      )}
      <Footer justify="space-between" align="center" gap={8}>
        {selectedNode ? (
          <SelectedLocation type="secondary">
            <Trans
              defaults="Publish in <em>{{ location }}</em>"
              values={{
                location: selectedNode.title,
              }}
              components={{
                em: <strong />,
              }}
            />
          </SelectedLocation>
        ) : (
          <SelectedLocation type="tertiary">
            {t("Select a location to publish")}
          </SelectedLocation>
        )}
        <Button disabled={!selectedNode} onClick={publish}>
          {t("Publish")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

const NoResults = styled(Flex)`
  align-items: center;
  justify-content: center;
  height: 65vh;

  ${breakpoint("tablet")`
    height: 40vh;
  `}
`;

const Search = styled(InputSearch)`
  ${Outline} {
    border-radius: 16px;
  }
  margin-bottom: 4px;
  padding-left: 24px;
  padding-right: 24px;
`;

const FlexContainer = styled(Flex)`
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  outline: none;
`;

const Results = styled.div`
  height: 65vh;

  ${breakpoint("tablet")`
    height: 40vh;
  `}
`;

const Footer = styled(Flex)`
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding-left: 24px;
  padding-right: 24px;
`;

const SelectedLocation = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0;
`;

export default observer(DocumentPublish);
