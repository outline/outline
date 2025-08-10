import deburr from "lodash/deburr";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { FetchPageParams } from "~/stores/base/Store";
import Button from "~/components/Button";
import Input, { NativeInput, Outline } from "~/components/Input";
import PaginatedList, { PaginatedItem } from "~/components/PaginatedList";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export interface ComboboxOption extends PaginatedItem {
  key: string;
  label: string;
  note?: string;
  icon?: React.ReactNode;
}

export interface ComboboxProps {
  /** Array of options to display */
  options: ComboboxOption[];
  /** Currently selected option keys */
  selectedKeys: (string | null | undefined)[];
  /** Placeholder text for the trigger button */
  placeholder?: string;
  /** Default label when no selection is made */
  defaultLabel?: string;
  /** CSS class name */
  className?: string;
  /** Callback when an option is selected */
  onSelect: (key: string | null | undefined) => void;
  /** Whether to show the search filter input */
  showFilter?: boolean;
  /** Whether the popover is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Function to fetch paginated data */
  fetchQuery?: (options: FetchPageParams) => Promise<PaginatedItem[]>;
  /** Additional options to pass to the fetch function */
  fetchQueryOptions?: Record<string, string>;
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      selectedKeys = [],
      placeholder = "Select option...",
      defaultLabel,
      className,
      onSelect,
      showFilter = true,
      open: controlledOpen,
      onOpenChange,
      fetchQuery,
      fetchQueryOptions,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    // Use controlled or internal open state
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const selectedItems = options.filter((option) =>
      selectedKeys.includes(option.key)
    );

    const selectedLabel = selectedItems.length
      ? selectedItems.map((selected) => selected.label).join(", ")
      : "";

    const displayLabel = selectedItems.length
      ? selectedLabel
      : defaultLabel || placeholder;

    // Filter options based on search query
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

    const handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(ev.target.value);
    };

    const handleKeyDown = React.useCallback(
      (ev: React.KeyboardEvent) => {
        if (ev.nativeEvent.isComposing || ev.shiftKey) {
          return;
        }

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
      [filteredOptions, onSelect, setOpen]
    );

    const handleEscapeFromList = React.useCallback(
      (ev: React.KeyboardEvent) => {
        searchInputRef.current?.focus();

        if (ev.key === "Backspace") {
          setQuery((prev) => prev.slice(0, -1));
        }
      },
      []
    );

    const handleOptionSelect = React.useCallback(
      (optionKey: string) => {
        onSelect(optionKey);
        setOpen(false);
      },
      [onSelect, setOpen]
    );

    const renderItem = React.useCallback(
      (option: ComboboxOption) => (
        <ComboboxOption
          key={option.key}
          onClick={() => handleOptionSelect(option.key)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              handleOptionSelect(option.key);
            } else if (ev.key === "Escape") {
              handleEscapeFromList(ev);
            }
          }}
          selected={selectedKeys.includes(option.key)}
          tabIndex={0}
        >
          {option.icon}
          {option.note ? (
            <LabelWithNote>
              {option.label}
              <Note>{option.note}</Note>
            </LabelWithNote>
          ) : (
            option.label
          )}
        </ComboboxOption>
      ),
      [selectedKeys, handleEscapeFromList, handleOptionSelect]
    );

    React.useEffect(() => {
      if (open && showFilter) {
        searchInputRef.current?.focus();
      } else {
        setQuery("");
      }
    }, [open, showFilter]);

    const showFilterInput = showFilter || options.length > 10;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <ComboboxButton
            ref={ref}
            className={className}
            icon={selectedItems[0]?.key && selectedItems[0]?.icon}
            neutral
            disclosure
          >
            {displayLabel}
          </ComboboxButton>
        </PopoverTrigger>
        <PopoverContent
          aria-label={defaultLabel || placeholder}
          minWidth={300}
          shrink
        >
          <ComboboxContent>
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
            <PaginatedList<ComboboxOption>
              listRef={listRef}
              options={{ query, ...fetchQueryOptions }}
              items={filteredOptions}
              fetch={fetchQuery}
              renderItem={renderItem}
              onEscape={handleEscapeFromList}
              heading={showFilterInput ? <Spacer /> : undefined}
              empty={<EmptyState />}
            />
          </ComboboxContent>
        </PopoverContent>
      </Popover>
    );
  }
);

Combobox.displayName = "Combobox";

const EmptyState = () => {
  const { t } = useTranslation();

  return (
    <>
      <Spacer />
      <EmptyText size="small" type="tertiary" style={{ marginLeft: 6 }}>
        {t("No results")}
      </EmptyText>
    </>
  );
};

// Styled components
const ComboboxButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: auto;

  &:hover {
    background: transparent;
  }

  div {
    line-height: 28px;
    min-height: auto;
  }
`;

const ComboboxContent = styled.div`
  position: relative;
  min-height: 44px;
  max-height: 350px;
`;

const SearchInput = styled(Input)`
  margin-bottom: 8px;
  border-radius: 6px;

  ${Outline} {
    border: 1px solid ${s("divider")};
    background: ${s("background")};
  }

  ${NativeInput} {
    font-size: 14px;
  }
`;

const Spacer = styled.div`
  height: 30px;
`;

const ComboboxOption = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-size: 16px;
  cursor: var(--pointer);
  color: ${s("textSecondary")};
  background: ${(props) => (props.selected ? s("accent") : "none")};
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: 4px;
  outline: 0;
  user-select: none;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  @media (hover: hover) {
    &:hover,
    &:focus {
      color: ${s("accentText")};
      background: ${s("accent")};

      svg {
        color: ${s("accentText")};
        fill: ${s("accentText")};
      }
    }
  }

  ${(props) =>
    props.selected &&
    `
    color: ${s("accentText")};
    
    svg {
      color: ${s("accentText")};
      fill: ${s("accentText")};
    }
  `}
`;

const EmptyText = styled.div<{ size: string; type: string }>`
  font-size: ${(props) => (props.size === "small" ? "14px" : "16px")};
  color: ${(props) =>
    props.type === "tertiary" ? s("textTertiary") : s("textSecondary")};
`;

const Note = styled.div`
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

export default Combobox;
