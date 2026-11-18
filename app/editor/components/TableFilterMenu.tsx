import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { observer } from "mobx-react";
import { TableMap } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  getTableColumnValues,
  isListOperator,
  isTableFilterActive,
  isTextOperator,
  parseTableFilterOperator,
  parseTableFilters,
  toFilterKey,
} from "@shared/editor/lib/tableFilter";
import {
  closeTableFilterMenu,
  setLocalTableFilters,
  tableFilterPluginKey,
  type TableFilterTarget,
} from "@shared/editor/plugins/TableFilterPlugin";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { TableFilterOperator, type TableFilter } from "@shared/editor/types";
import { s } from "@shared/styles";
import ButtonSmall from "~/components/ButtonSmall";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import { InputSelect, type Option } from "~/components/InputSelect";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/primitives/Popover";
import { useComputed } from "~/hooks/useComputed";
import useDebouncedValue from "~/hooks/useDebouncedValue";
import { useEditor } from "./EditorContext";

/** The number of values above which the value list can be searched. */
const SearchThreshold = 8;

/** Equal padding on all sides of the menu. */
const MenuStyle = { padding: 12 };

/** The most values shown at once, a search finds the others. */
const MaxShownValues = 100;

/**
 * The menu to filter the rows of a table by the values in a column, and a
 * live region that tells screen reader users how many rows are shown.
 *
 * @returns the menu, if open, and the live region.
 */
export const TableFilterMenu = observer(function TableFilterMenu() {
  const { t } = useTranslation();
  const editor = useEditor();
  const { view } = editor;
  const open = useComputed(
    () => tableFilterPluginKey.getState(editor.editorState)?.open ?? null,
    [editor]
  );

  const announcement = useComputed(() => {
    const pluginState = tableFilterPluginKey.getState(editor.editorState);
    if (!pluginState || pluginState.changed === null) {
      return "";
    }

    const summary = pluginState.summaries.get(pluginState.changed);
    if (!summary || summary.visibleRows === summary.totalRows) {
      return t("Showing all rows");
    }
    return t("Showing {{ visible }} of {{ count }} rows", {
      visible: summary.visibleRows,
      count: summary.totalRows,
    });
  }, [editor, t]);

  const cell = open ? getHeaderCell(view, open) : null;
  const lastCell = React.useRef<HTMLElement | null>(null);
  if (cell) {
    lastCell.current = cell;
  }

  React.useEffect(() => {
    if (open && !cell) {
      view.dispatch(closeTableFilterMenu(view.state.tr));
    }
  }, [view, open, cell]);

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!value) {
        view.dispatch(closeTableFilterMenu(view.state.tr));
      }
    },
    [view]
  );

  // The filter button toggles the menu, so a press on it is not treated as a
  // press outside of the menu.
  const handleInteractOutside = React.useCallback((event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(`.${EditorStyleHelper.tableFilterButton}`)
    ) {
      event.preventDefault();
    }
  }, []);

  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      event.preventDefault();
      const button = lastCell.current?.querySelector(
        `.${EditorStyleHelper.tableFilterButton}`
      );
      if (
        button instanceof HTMLElement &&
        button.isConnected &&
        getComputedStyle(button).display !== "none"
      ) {
        button.focus();
      } else if (view.editable) {
        view.focus();
      }
    },
    [view]
  );

  // The menu hangs from the filter button, which ProseMirror can redraw while
  // the menu is open, so the button is found again on each measure.
  const anchorRef = React.useMemo(
    () => ({
      current: cell
        ? {
            getBoundingClientRect: () =>
              (
                cell.querySelector(`.${EditorStyleHelper.tableFilterButton}`) ??
                cell
              ).getBoundingClientRect(),
          }
        : null,
    }),
    [cell]
  );

  // The menu sits below the header cell, so the column name is only announced.
  const columnName = cell?.textContent?.trim();

  return (
    <>
      <VisuallyHidden.Root role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden.Root>
      {open && cell && (
        <Popover open onOpenChange={handleOpenChange}>
          <PopoverAnchor virtualRef={anchorRef} />
          <PopoverContent
            width={300}
            style={MenuStyle}
            align="end"
            aria-label={
              columnName
                ? t("Filter {{ columnName }}", { columnName })
                : t("Filter")
            }
            onInteractOutside={handleInteractOutside}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <TableFilterForm key={`${open.pos}:${open.column}`} target={open} />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
});

type FormProps = {
  /** The column to filter. */
  target: TableFilterTarget;
};

const TableFilterForm = observer(function TableFilterForm({
  target,
}: FormProps) {
  const { t } = useTranslation();
  const editor = useEditor();
  const { view } = editor;
  const [query, setQuery] = React.useState("");
  const textInputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  );
  const focusTextOnClose = React.useRef(false);
  const discardText = React.useRef(false);

  // Narrow reads, so that the menu only renders when this table changes.
  const table = useComputed(() => {
    const node = editor.editorState.doc.nodeAt(target.pos);
    return node?.type.spec.tableRole === "table" ? node : null;
  }, [editor, target.pos]);
  const local = useComputed(
    () =>
      tableFilterPluginKey.getState(editor.editorState)?.local.get(target.pos),
    [editor, target.pos]
  );
  const summary = useComputed(
    () =>
      tableFilterPluginKey
        .getState(editor.editorState)
        ?.summaries.get(target.pos),
    [editor, target.pos]
  );

  const columnValues = React.useMemo(
    () => (table ? getTableColumnValues(table, target.column) : []),
    [table, target.column]
  );

  if (!table) {
    return null;
  }

  const filters = local ?? parseTableFilters(table.attrs.filters);
  const filter: TableFilter = filters.find(
    (f) => f.column === target.column
  ) ?? {
    column: target.column,
    operator: TableFilterOperator.Is,
    values: [],
  };
  const selected = new Set(filter.values.map(toFilterKey));
  const found = new Set(columnValues.map(toFilterKey));

  // Chosen values that no rows have any more are kept, so that they can be
  // removed.
  const values = [
    ...columnValues,
    ...filter.values.filter((value) => !found.has(toFilterKey(value))),
  ];
  const normalizedQuery = toFilterKey(query);
  const matchingValues = normalizedQuery
    ? values.filter((value) => toFilterKey(value).includes(normalizedQuery))
    : values;
  const visibleValues = matchingValues.slice(0, MaxShownValues);
  const canClear = filters.some(
    (f) => f.column === target.column && isTableFilterActive(f)
  );
  const hasValues = isListOperator(filter.operator);
  const hasText = isTextOperator(filter.operator);

  const update = (next: TableFilter | undefined) => {
    const others = filters.filter((f) => f.column !== target.column);
    view.dispatch(
      setLocalTableFilters(
        view.state.tr,
        target.pos,
        next ? [...others, next] : others
      )
    );
  };

  const handleOperatorChange = (value: string) => {
    const operator = parseTableFilterOperator(value);
    if (!operator) {
      return;
    }

    // A list of values and a text are not the same, so a change between the
    // two starts again with nothing.
    focusTextOnClose.current = isTextOperator(operator);
    const isSameKind =
      isListOperator(operator) === isListOperator(filter.operator) &&
      isTextOperator(operator) === isTextOperator(filter.operator);
    // Leaving a text condition drops text that is not yet applied, and a new
    // text field starts without it.
    discardText.current = !isSameKind && isTextOperator(filter.operator);
    update({
      ...filter,
      operator,
      values: isSameKind ? filter.values : [],
    });
  };

  const handleValueChange = (value: string, checked: boolean) => {
    const key = toFilterKey(value);
    update({
      ...filter,
      values: checked
        ? [...filter.values, value]
        : filter.values.filter((v) => toFilterKey(v) !== key),
    });
  };

  // After a text condition is chosen, the reader types the text next.
  const handleConditionCloseAutoFocus = (event: Event) => {
    if (focusTextOnClose.current && textInputRef.current) {
      event.preventDefault();
      textInputRef.current.focus();
    }
    focusTextOnClose.current = false;
  };

  const handleTextChange = (text: string) => {
    update({ ...filter, values: text.trim() ? [text] : [] });
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleClear = () => {
    discardText.current = true;
    update(undefined);
  };

  const options: Option[] = [
    { type: "item", label: t("Is"), value: TableFilterOperator.Is },
    { type: "item", label: t("Is not"), value: TableFilterOperator.IsNot },
    {
      type: "item",
      label: t("Contains"),
      value: TableFilterOperator.Contains,
    },
    {
      type: "item",
      label: t("Does not contain"),
      value: TableFilterOperator.DoesNotContain,
    },
    { type: "item", label: t("Is empty"), value: TableFilterOperator.IsEmpty },
    {
      type: "item",
      label: t("Is not empty"),
      value: TableFilterOperator.IsNotEmpty,
    },
  ];

  return (
    <Flex column gap={12}>
      <InputSelect
        label={t("Condition")}
        labelHidden
        options={options}
        value={filter.operator}
        onChange={handleOperatorChange}
        onCloseAutoFocus={handleConditionCloseAutoFocus}
      />
      {hasText && (
        <FilterTextInput
          ref={textInputRef}
          value={filter.values[0] ?? ""}
          onChange={handleTextChange}
          discard={discardText}
        />
      )}
      {hasValues &&
        (values.length ? (
          <>
            {values.length > SearchThreshold && (
              <InputSearch
                value={query}
                onChange={handleQueryChange}
                placeholder={`${t("Search values")}…`}
                aria-label={t("Search values")}
                margin={0}
              />
            )}
            <ValueList role="group" aria-label={t("Values")}>
              {visibleValues.map((value) => (
                <ValueOption
                  key={value}
                  value={value}
                  checked={selected.has(toFilterKey(value))}
                  onChange={handleValueChange}
                />
              ))}
            </ValueList>
            {matchingValues.length > visibleValues.length && (
              <Text type="tertiary" size="small">
                {t(
                  "Showing {{ shown }} of {{ total }} values. Search to find more.",
                  {
                    shown: visibleValues.length,
                    total: matchingValues.length,
                  }
                )}
              </Text>
            )}
            {!matchingValues.length && (
              <Text type="tertiary" size="small">
                {t("No values match your search.")}
              </Text>
            )}
          </>
        ) : (
          <Text type="secondary" size="small">
            {t("This column has no values")}
          </Text>
        ))}
      {(summary || canClear) && (
        <Flex justify="space-between" align="center" gap={8}>
          <Text type="secondary" size="small">
            {summary
              ? t("{{ visible }} of {{ count }} rows", {
                  visible: summary.visibleRows,
                  count: summary.totalRows,
                })
              : null}
          </Text>
          {canClear && (
            <ButtonSmall neutral onClick={handleClear}>
              {t("Clear")}
            </ButtonSmall>
          )}
        </Flex>
      )}
    </Flex>
  );
});

type FilterTextInputProps = {
  /** The text of the filter. */
  value: string;
  /** Called with the text once the reader stops typing, or the field closes. */
  onChange: (text: string) => void;
  /** Set to true to drop text that is not yet applied when the field closes. */
  discard: React.RefObject<boolean>;
  ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
};

/** The time to wait after the last key press before the table is filtered. */
const TextFilterWait = 200;

function FilterTextInput({
  value,
  onChange,
  discard,
  ref,
}: FilterTextInputProps) {
  const { t } = useTranslation();
  const [text, setText] = React.useState(value);
  const debouncedText = useDebouncedValue(text, TextFilterWait);
  const handleDebouncedChange = React.useEffectEvent((next: string) => {
    if (next !== value) {
      onChange(next);
    }
  });

  // Closing the menu removes the field before the wait ends, so the last text
  // is applied then, unless it was cleared.
  const handleClose = React.useEffectEvent(() => {
    if (!discard.current && text !== value) {
      onChange(text);
    }
  });

  React.useEffect(() => {
    handleDebouncedChange(debouncedText);
  }, [debouncedText]);

  React.useEffect(() => () => handleClose(), []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  return (
    <Input
      value={text}
      onChange={handleChange}
      placeholder={`${t("Filter")}…`}
      label={t("Filter")}
      labelHidden
      margin={0}
      ref={ref}
    />
  );
}

type ValueOptionProps = {
  /** The value. */
  value: string;
  /** Whether the value is chosen. */
  checked: boolean;
  /** Called when the value is chosen or no longer chosen. */
  onChange: (value: string, checked: boolean) => void;
};

function ValueOption({ value, checked, onChange }: ValueOptionProps) {
  const id = React.useId();
  const handleChange = (next: boolean) => onChange(value, next);

  return (
    <ValueRow htmlFor={id}>
      <ValueLabel>{value}</ValueLabel>
      <Switch
        id={id}
        checked={checked}
        onChange={handleChange}
        width={26}
        height={14}
      />
    </ValueRow>
  );
}

/**
 * Get the element of the header cell of a table column.
 *
 * @param view the editor view.
 * @param target the column.
 * @returns the element, or null if the column does not exist.
 */
function getHeaderCell(
  view: EditorView,
  target: TableFilterTarget
): HTMLElement | null {
  const table = view.state.doc.nodeAt(target.pos);
  if (table?.type.spec.tableRole !== "table") {
    return null;
  }

  const map = TableMap.get(table);
  if (target.column >= map.width) {
    return null;
  }

  const dom = view.nodeDOM(target.pos + 1 + map.map[target.column]);
  return dom instanceof HTMLElement ? dom : null;
}

const ValueList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
  margin: 0 -8px;
`;

const ValueRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const ValueLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
