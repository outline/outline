import FuzzySearch from "fuzzy-search";
import { includes, difference, concat, filter } from "lodash";
import { observer } from "mobx-react";
import { StarredIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
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
  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [selectedLocation, setLocation] = React.useState<any>();
  const [initialScrollOffset, setInitialScrollOffset] = React.useState<number>(
    0
  );
  const { collections, documents } = useStores();
  const { showToast } = useToasts();
  const theme = useTheme();
  const [items, setItems] = React.useState<any>(
    flattenTree(collections.tree.root).slice(1)
  );
  const [activeItem, setActiveItem] = React.useState<number>(0);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const inputSearchRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  );
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const listRef = React.useRef<List<HTMLDivElement>>(null);
  const VERTICAL_PADDING = 6;
  const HORIZONTAL_PADDING = 24;

  const nextItem = () => {
    return Math.min(activeItem + 1, items.length - 1);
  };

  const prevItem = () => {
    return Math.max(activeItem - 1, 0);
  };

  const searchIndex = React.useMemo(() => {
    const data = flattenTree(collections.tree.root).slice(1);

    return new FuzzySearch(data, ["data.title"], {
      caseSensitive: false,
    });
  }, [collections.tree]);

  React.useEffect(() => {
    if (searchTerm) {
      setLocation(null);
      setExpandedItems([]);
    }
    setActiveItem(0);
  }, [searchTerm]);

  React.useEffect(() => {
    let results = flattenTree(collections.tree.root).slice(1);

    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = results.filter((r) => r.data.type === "collection");
      }
    }

    setInitialScrollOffset(0);
    setItems(results);
  }, [document, collections, searchTerm, searchIndex]);

  const handleSearch = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const isExpanded = (index: number) => {
    const item = items[index];
    return includes(expandedItems, item.data.id);
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

  const collapse = (item: number) => {
    const descendantIds = descendants(items[item]).map((des) => des.data.id);
    setExpandedItems(
      difference(expandedItems, [...descendantIds, items[item].data.id])
    );

    // remove children
    const newItems = filter(
      items,
      (item: any) => !includes(descendantIds, item.data.id)
    );
    const scrollOffset = calculateInitialScrollOffset(newItems.length);
    setInitialScrollOffset(scrollOffset);
    setItems(newItems);
  };

  const expand = (item: number) => {
    setExpandedItems(concat(expandedItems, items[item].data.id));

    // add children
    const newItems = items.slice();
    newItems.splice(item + 1, 0, ...descendants(items[item], 1));
    const scrollOffset = calculateInitialScrollOffset(newItems.length);
    setInitialScrollOffset(scrollOffset);
    setItems(newItems);
  };

  const isSelected = (item: number) => {
    if (!selectedLocation) {
      return false;
    }
    const selectedItemId = selectedLocation.data.id;
    const itemId = items[item].data.id;

    return selectedItemId === itemId;
  };

  const toggleCollapse = (item: number) => {
    if (isExpanded(item)) {
      collapse(item);
    } else {
      expand(item);
    }
  };

  const toggleSelect = (item: number) => {
    if (isSelected(item)) {
      setLocation(null);
    } else {
      setLocation(items[item]);
    }
  };

  const publish = async () => {
    if (!selectedLocation) {
      showToast(t("Select a location to publish"), {
        type: "info",
      });
      return;
    }

    try {
      const {
        collectionId,
        type,
        id: parentDocumentId,
      } = selectedLocation.data;

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
    data: any[];
    style: React.CSSProperties;
  }) => {
    const result = data[index];
    const isCollection = result.data.type === "collection";
    let icon, title, path;

    if (isCollection) {
      const col = collections.get(result.data.collectionId);
      icon = col && (
        <CollectionIcon collection={col} expanded={isExpanded(index)} />
      );
      title = result.data.title;
    } else {
      const doc = documents.get(result.data.id);
      const { strippedTitle, emoji } = parseTitle(result.data.title);
      title = strippedTitle;

      if (emoji) {
        icon = <EmojiIcon emoji={emoji} />;
      } else if (doc?.isStarred) {
        icon = <StarredIcon color={theme.yellow} />;
      } else {
        icon = <DocumentIcon />;
      }

      path = ancestors(result)
        .map((a) => parseTitle(a.data.title).strippedTitle)
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
        onPointerMove={() => setActiveItem(index)}
        onClick={() => toggleSelect(index)}
        onDisclosureClick={(ev) => {
          ev.stopPropagation();
          toggleCollapse(index);
        }}
        selected={isSelected(index)}
        active={activeItem === index}
        expanded={isExpanded(index)}
        icon={icon}
        title={title}
        path={path}
        nestLevel={result.depth}
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

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    switch (ev.key) {
      case "ArrowDown": {
        ev.preventDefault();
        setActiveItem(nextItem());
        break;
      }
      case "ArrowUp": {
        ev.preventDefault();
        if (activeItem === 0) {
          focusSearchInput();
        } else {
          setActiveItem(prevItem());
        }
        break;
      }
      case "ArrowLeft": {
        if (!searchTerm && isExpanded(activeItem)) {
          toggleCollapse(activeItem);
        }
        break;
      }
      case "ArrowRight": {
        if (!searchTerm) {
          toggleCollapse(activeItem);
        }
        break;
      }
      case "Enter": {
        if (isModKey(ev)) {
          publish();
        } else {
          toggleSelect(activeItem);
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
      {items.length ? (
        <Results>
          <AutoSizer>
            {({ width, height }: { width: number; height: number }) => (
              <Flex role="listbox" column>
                <List
                  ref={listRef}
                  key={items.length}
                  width={width}
                  height={height}
                  itemData={items}
                  itemCount={items.length}
                  itemSize={isMobile ? 48 : 32}
                  innerElementType={innerElementType}
                  initialScrollOffset={initialScrollOffset}
                  itemKey={(index, results: any) => results[index].data.id}
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
        {selectedLocation ? (
          <SelectedLocation type="secondary">
            <Trans
              defaults="Publish in <em>{{ location }}</em>"
              values={{
                location: selectedLocation.data.title,
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
        <Button disabled={!selectedLocation} onClick={publish}>
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
