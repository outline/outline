import deburr from "lodash/deburr";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { FetchPageParams } from "~/stores/base/Store";
import Button, { Inner } from "~/components/Button";
import Text from "~/components/Text";
import Input, { NativeInput, Outline } from "./Input";
import type { PaginatedItem } from "./PaginatedList";
import PaginatedList from "./PaginatedList";
import { MenuProvider } from "./primitives/Menu/MenuContext";
import { Menu, MenuContent, MenuTrigger, MenuButton } from "./primitives/Menu";
import { MenuIconWrapper } from "./primitives/components/Menu";

interface TFilterOption extends PaginatedItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

type Props = {
  options: TFilterOption[];
  selectedKeys: (string | null | undefined)[];
  defaultLabel?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
  showFilter?: boolean;
  showIcons?: boolean;
  fetchQuery?: (options: FetchPageParams) => Promise<PaginatedItem[]>;
  fetchQueryOptions?: Record<string, string>;
  disclosure?: boolean;
};

const FilterOptions = ({
  options,
  selectedKeys = [],
  className,
  onSelect,
  showFilter,
  showIcons = true,
  fetchQuery,
  fetchQueryOptions,
  disclosure = true,
  ...rest
}: Props) => {
  const { t } = useTranslation();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const selectedItems = options.filter((option) =>
    selectedKeys.includes(option.key)
  );
  const [query, setQuery] = React.useState("");

  const selectedLabel = selectedItems.length
    ? selectedItems.map((selected) => selected.label).join(", ")
    : "";

  const renderItem = React.useCallback(
    (option) => (
      <MenuButton
        key={option.key}
        icon={
          option.icon && showIcons ? (
            <MenuIconWrapper aria-hidden>{option.icon}</MenuIconWrapper>
          ) : undefined
        }
        label={option.label}
        onClick={() => {
          onSelect(option.key);
          setOpen(false);
        }}
        selected={selectedKeys.includes(option.key)}
      />
    ),
    [onSelect, showIcons, selectedKeys]
  );

  const handleFilter = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(ev.target.value);
    },
    []
  );

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = deburr(query.toLowerCase());

    const filtered = query
      ? options.filter((option) =>
          deburr(option.label).toLowerCase().includes(normalizedQuery)
        )
      : options;

    return filtered.sort((a, b) => {
      const aSelected = selectedKeys.includes(a.key);
      const bSelected = selectedKeys.includes(b.key);

      // Selected items come first
      if (aSelected && !bSelected) {
        return -1;
      }
      if (!aSelected && bSelected) {
        return 1;
      }

      // If both have the same selection state and there's a query,
      // sort options starting with query first
      if (query) {
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
      }

      return 0;
    });
  }, [options, query, selectedKeys]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.nativeEvent.isComposing || ev.shiftKey) {
        return;
      }

      // Stop all keyboard events from propagating to prevent Radix UI menu
      // from handling them and potentially moving focus
      ev.stopPropagation();

      switch (ev.key) {
        case "Escape":
          setOpen(false);
          break;
        case "Enter":
          if (filteredOptions.length === 1) {
            ev.preventDefault();
            onSelect(filteredOptions[0].key);
            setOpen(false);
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
    [filteredOptions, onSelect]
  );

  const handleEscapeFromList = React.useCallback((ev: React.KeyboardEvent) => {
    searchInputRef.current?.focus();

    if (ev.key === "Backspace") {
      setQuery((prev) => prev.slice(0, -1));
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  const showFilterInput = showFilter || options.length > 10;
  const defaultLabel = rest.defaultLabel || t("Filter options");

  return (
    <MenuProvider variant="dropdown">
      <Menu open={open} onOpenChange={setOpen}>
        <MenuTrigger>
          <StyledButton
            className={className}
            icon={selectedItems[0]?.key && selectedItems[0]?.icon}
            disclosure={disclosure}
            neutral
          >
            {selectedItems.length ? selectedLabel : defaultLabel}
          </StyledButton>
        </MenuTrigger>
        <MenuContent aria-label={defaultLabel} align="start">
          <PaginatedList<TFilterOption>
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
        </MenuContent>
      </Menu>
    </MenuProvider>
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
    border-bottom: 1px solid ${s("divider")};
    background: ${s("menuBackground")};
    margin: 0;
  }

  ${NativeInput} {
    font-size: 14px;
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
    line-height: 28px;
    min-height: auto;
  }
`;

export default FilterOptions;
