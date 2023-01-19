import FuzzySearch from "fuzzy-search";
import { isNumber, includes, difference, concat, filter } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import PublishLocation from "~/components/PublishLocation";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { isModKey } from "~/utils/keyboard";
import { flattenTree, descendants } from "~/utils/tree";

type Props = {
  /** Document to publish */
  document: Document;
};

function PublishModal({ document }: Props) {
  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [selectedLocation, setLocation] = React.useState<any>();
  const [initialScrollOffset, setInitialScrollOffset] = React.useState<number>(
    0
  );
  const { collections } = useStores();
  const { showToast } = useToasts();
  const [items, setItems] = React.useState<any>(
    flattenTree(collections.tree.root)
      .slice(1)
      .filter((d) => d.data.show)
  );
  const [activeItem, setActiveItem] = React.useState<number>(0);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const inputSearchRef:
    | React.RefObject<HTMLInputElement | HTMLTextAreaElement>
    | undefined = React.useRef(null);
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const listRef = React.useRef<any>(null);
  const VERTICAL_PADDING = 6;
  const HORIZONTAL_PADDING = 24;

  const nextItem = () => {
    return activeItem === items.length - 1 ? 0 : activeItem + 1;
  };

  const moveTo = (index: number) => {
    setActiveItem(index);
  };

  const prevItem = () => {
    return activeItem === 0 ? items.length - 1 : activeItem - 1;
  };

  const scrollTo = (index: number) => {
    if (listRef.current) {
      const { height, itemSize } = listRef.current.props;
      const scrollWindowTop = listRef.current.state.scrollOffset;
      const scrollWindowBottom = scrollWindowTop + height;

      const top = VERTICAL_PADDING + index * itemSize;
      const bottom = VERTICAL_PADDING + (index + 1) * itemSize;

      let offset;
      if (top < scrollWindowTop) {
        offset = top;
      }

      if (bottom > scrollWindowBottom) {
        offset = scrollWindowTop + bottom - scrollWindowBottom;
      }

      if (isNumber(offset)) {
        listRef.current.scrollTo(offset);
      }
    }
  };

  React.useEffect(() => {
    scrollTo(activeItem);
  }, [activeItem]);

  const searchIndex = React.useMemo(() => {
    const data = flattenTree(collections.tree.root).slice(1);

    return new FuzzySearch(data, ["data.title"], {
      caseSensitive: false,
    });
  }, [collections.tree]);

  React.useEffect(() => {
    if (searchTerm) {
      setLocation(null);
    }
    setActiveItem(0);
  }, [searchTerm]);

  React.useEffect(() => {
    let results: any = flattenTree(collections.tree.root).slice(1);

    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = results.filter((r: any) => r.data.show);
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
    const { height, itemSize } = listRef.current.props;
    const { scrollOffset } = listRef.current.state;
    const itemsHeight = itemCount * itemSize;
    return itemsHeight < height ? 0 : scrollOffset;
  };

  const removeChildren = (item: number) => {
    const descendantIds = descendants(items[item]).map((des) => des.data.id);
    const newItems = filter(
      items,
      (item: any) => !includes(descendantIds, item.data.id)
    );
    const scrollOffset = calculateInitialScrollOffset(newItems.length);
    setInitialScrollOffset(scrollOffset);
    setItems(newItems);
  };

  const addChildren = (item: number) => {
    const newItems = items.slice();
    newItems.splice(item + 1, 0, ...descendants(items[item], 1));
    const scrollOffset = calculateInitialScrollOffset(newItems.length);
    setInitialScrollOffset(scrollOffset);
    setItems(newItems);
  };

  const removeFromExpandedItems = (item: number) => {
    const descendantIds = descendants(items[item]).map((des) => des.data.id);
    setExpandedItems(
      difference(expandedItems, [...descendantIds, items[item].data.id])
    );
  };

  const addToExpandedItems = (item: number) => {
    setExpandedItems(concat(expandedItems, items[item].data.id));
  };

  const shrink = (item: number) => {
    removeFromExpandedItems(item);
    removeChildren(item);
  };

  const expand = (item: number) => {
    addToExpandedItems(item);
    addChildren(item);
  };

  const isSelected = (item: number) => {
    if (!selectedLocation) {
      return false;
    }
    const selectedItemId = selectedLocation.data.id;
    const itemId = items[item].data.id;

    return selectedItemId === itemId;
  };

  const select = (item: number) => {
    setLocation(items[item]);
  };

  const deselect = () => {
    setLocation(null);
  };

  const toggleCollapse = (item: number) => {
    if (isExpanded(item)) {
      shrink(item);
    } else {
      expand(item);
    }
  };

  const toggleSelect = (item: number) => {
    if (isSelected(item)) {
      deselect();
    } else {
      select(item);
    }
  };

  const publish = async () => {
    if (!selectedLocation) {
      showToast(t("Select destination to publish document"), {
        type: "info",
      });
      return;
    }
    try {
      const destCol = selectedLocation.data.collectionId;
      const destType = selectedLocation.data.type;

      document.collectionId = destCol;
      await document.save({ publish: true });

      // Also move it under if selected path corresponds to another doc
      if (destType === "document") {
        const destDoc = selectedLocation.data.id;
        await document.move(destCol, destDoc);
      }
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
    result.data.collection = collections.get(result.data.collectionId);
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
        location={result}
        selected={isSelected(index)}
        active={activeItem === index}
        expanded={isExpanded(index)}
        isSearchResult={!!searchTerm}
      ></PublishLocation>
    );
  };

  if (!document || !collections.isLoaded) {
    return null;
  }

  const shiftFocusToSearchInput = () => {
    inputSearchRef.current?.focus();
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    switch (ev.key) {
      case "ArrowDown": {
        ev.preventDefault();
        moveTo(nextItem());
        break;
      }
      case "ArrowUp": {
        ev.preventDefault();
        shiftFocusToSearchInput();
        moveTo(prevItem());
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

  const innerElementType = React.forwardRef<HTMLDivElement, any>(
    ({ style, ...rest }, ref) => (
      <div
        ref={ref}
        style={{
          ...style,
          height: `${parseFloat(style.height) + VERTICAL_PADDING * 2}px`,
        }}
        {...rest}
      />
    )
  );

  return (
    <FlexContainer column tabIndex={-1} onKeyDown={handleKeyDown}>
      <Search
        ref={inputSearchRef}
        onChange={handleSearch}
        placeholder={`${t("Search collections & documents")}…`}
        autoFocus
      />
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
                itemSize={32}
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
      <Footer justify="space-between" align="center">
        {selectedLocation ? (
          <SelectedLocation type="secondary">
            <Trans
              defaults="Publish under <strong>{{location}}</strong>"
              values={{
                location: selectedLocation.data.title,
              }}
            />
          </SelectedLocation>
        ) : (
          <SelectedLocation type="tertiary">
            {t("Choose a location to publish")}
          </SelectedLocation>
        )}
        <Button disabled={!selectedLocation} onClick={publish}>
          Publish
        </Button>
      </Footer>
    </FlexContainer>
  );
}

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
  max-width: 40vh;
`;

export default observer(PublishModal);
