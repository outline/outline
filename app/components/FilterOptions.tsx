import deburr from "lodash/deburr";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { FetchPageParams } from "~/stores/base/Store";
import Button, { Inner } from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import Text from "~/components/Text";
import Input, { NativeInput, Outline } from "./Input";
import PaginatedList, { PaginatedItem } from "./PaginatedList";

interface TFilterOption extends PaginatedItem {
  key: string;
  label: string;
  note?: string;
  icon?: React.ReactNode;
}

type Props = {
  options: TFilterOption[];
  selectedKeys: (string | null | undefined)[];
  defaultLabel?: string;
  selectedPrefix?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
  showFilter?: boolean;
  fetchQuery?: (options: FetchPageParams) => Promise<PaginatedItem[]>;
  fetchQueryOptions?: Record<string, string>;
};

const FilterOptions = ({
  options,
  selectedKeys = [],
  defaultLabel = "Filter options",
  selectedPrefix = "",
  className,
  onSelect,
  showFilter,
  fetchQuery,
  fetchQueryOptions,
}: Props) => {
  const { t } = useTranslation();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const menu = useMenuState({
    modal: true,
  });
  const selectedItems = options.filter((option) =>
    selectedKeys.includes(option.key)
  );
  const [query, setQuery] = React.useState("");

  const selectedLabel = selectedItems.length
    ? selectedItems
        .map((selected) => `${selectedPrefix} ${selected.label}`)
        .join(", ")
    : "";

  const renderItem = React.useCallback(
    (option: TFilterOption) => (
      <MenuItem
        key={option.key}
        onClick={() => {
          onSelect(option.key);
          menu.hide();
        }}
        selected={selectedKeys.includes(option.key)}
        {...menu}
      >
        {option.icon && <Icon>{option.icon}</Icon>}
        {option.note ? (
          <LabelWithNote>
            {option.label}
            <Note>{option.note}</Note>
          </LabelWithNote>
        ) : (
          option.label
        )}
      </MenuItem>
    ),
    [menu, onSelect, selectedKeys]
  );

  const handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  };

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = deburr(query.toLowerCase());

    return query
      ? options
          .filter((option) =>
            deburr(option.label).toLowerCase().includes(normalizedQuery)
          )
          // sort options starting with query first
          .sort((a, b) => {
            const aStartsWith = deburr(a.label)
              .toLowerCase()
              .startsWith(normalizedQuery);
            const bStartsWith = deburr(b.label)
              .toLowerCase()
              .startsWith(normalizedQuery);

            if (aStartsWith && !bStartsWith) {
              return -1;
            }
            if (!aStartsWith && bStartsWith) {
              return 1;
            }
            return 0;
          })
      : options;
  }, [options, query]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.nativeEvent.isComposing || ev.shiftKey) {
        return;
      }

      switch (ev.key) {
        case "Escape":
          menu.hide();
          break;
        case "Enter":
          if (filteredOptions.length === 1) {
            ev.preventDefault();
            onSelect(filteredOptions[0].key);
            menu.hide();
          }
          break;
        case "ArrowDown":
          ev.preventDefault();
          (listRef.current?.firstElementChild as HTMLElement)?.focus();
          break;
        default:
          break;
      }
    },
    [filteredOptions, menu, onSelect]
  );

  const handleEscapeFromList = React.useCallback((ev: React.KeyboardEvent) => {
    searchInputRef.current?.focus();

    if (ev.key === "Backspace") {
      setQuery((prev) => prev.slice(0, -1));
    }
  }, []);

  React.useEffect(() => {
    if (menu.visible) {
      searchInputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [menu.visible]);

  const showFilterInput = showFilter || options.length > 10;

  return (
    <div>
      <MenuButton {...menu}>
        {(props) => (
          <StyledButton {...props} className={className} neutral disclosure>
            {selectedItems.length ? selectedLabel : defaultLabel}
          </StyledButton>
        )}
      </MenuButton>
      <ContextMenu aria-label={defaultLabel} minHeight={66} {...menu}>
        <PaginatedList
          listRef={listRef}
          options={{ query, ...fetchQueryOptions }}
          items={filteredOptions}
          fetch={fetchQuery}
          renderItem={renderItem}
          onEscape={handleEscapeFromList}
          heading={showFilterInput ? <Spacer /> : undefined}
          empty={<Empty />}
        />
        {showFilterInput && (
          <SearchInput
            ref={searchInputRef}
            value={query}
            onChange={handleFilter}
            onKeyDown={handleKeyDown}
            placeholder={`${t("Filter")}…`}
            autoFocus
          />
        )}
      </ContextMenu>
    </div>
  );
};

const Empty = () => {
  const { t } = useTranslation();

  return (
    <>
      <Spacer />
      <Text size="small" type="tertiary" style={{ marginLeft: 6 }}>
        {t("No results")}
      </Text>
    </>
  );
};

const Spacer = styled.div`
  height: 30px;
`;

const SearchInput = styled(Input)`
  position: absolute;
  width: 100%;
  border: none;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  overflow: hidden;
  margin: 0;
  top: 0;
  left: 0;
  right: 0;

  ${Outline} {
    border: none;
    border-radius: 0;
    border-bottom: 1px solid rgb(34 40 52);
    background: ${s("menuBackground")};
  }

  ${NativeInput} {
    font-size: 14px;
  }
`;

const Note = styled(Text)`
  display: block;
  margin: 2px 0;
  line-height: 1.2em;
  font-size: 14px;
  font-weight: 500;
  color: ${s("textTertiary")};
`;

const LabelWithNote = styled.div`
  font-weight: 500;
  text-align: left;

  &:hover ${Note} {
    color: ${(props) => props.theme.white50};
  }
`;

export const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: auto;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 24px;
    min-height: auto;
  }
`;

const Icon = styled.div`
  margin-right: 8px;
  width: 18px;
  height: 18px;
`;

export default FilterOptions;
