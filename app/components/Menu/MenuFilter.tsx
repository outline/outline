import { VISUALLY_HIDDEN_STYLES } from "@radix-ui/react-visually-hidden";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import isTextInput from "~/utils/isTextInput";

interface MenuFilterState {
  /** The current filter query, or undefined when the filter is hidden. */
  query: string | undefined;
  /** Sets the filter query. */
  setQuery: (query: string) => void;
  /** Capture-phase keydown handler to attach to the menu content. */
  handleKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** Escape handler to attach to the menu content. */
  handleEscapeKeyDown: (event: KeyboardEvent) => void;
  /** Hides the filter and clears the query. */
  reset: () => void;
}

/**
 * Lets the user filter a menu by typing. When a key that types text is pressed
 * on a menu item, focus moves to the filter input, which then receives the
 * text.
 *
 * @returns the filter query and the handlers to attach to the menu content.
 */
export function useMenuFilter(): MenuFilterState {
  const [query, setQuery] = React.useState<string>();
  const contentRef = React.useRef<HTMLElement | null>(null);
  const highlightRef = React.useRef<HTMLElement | null>(null);

  const reset = React.useCallback(() => {
    contentRef.current = null;
    highlightRef.current = null;
    setQuery(undefined);
  }, []);

  const handleKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const { target, currentTarget } = event;
      if (
        !(target instanceof HTMLElement) ||
        target.closest("[data-radix-menu-content]") !== currentTarget ||
        (isTextInput(target) && !target.matches('[role^="menuitem"]')) ||
        target.isContentEditable
      ) {
        return;
      }

      const input = currentTarget.querySelector<HTMLInputElement>(
        `[${INPUT_ATTRIBUTE}]`
      );

      // AltGr is reported as Ctrl+Alt on Windows, but it types a character.
      const isShortcut =
        (event.ctrlKey || event.metaKey || event.altKey) &&
        !event.getModifierState("AltGraph");
      if (!input || isShortcut) {
        return;
      }

      // Move up from the first item to the input while the filter is visible.
      if (
        event.key === "ArrowUp" &&
        query !== undefined &&
        target === currentTarget.querySelector(ITEM_SELECTOR)
      ) {
        event.preventDefault();
        event.stopPropagation();
        highlightRef.current = highlightItem(currentTarget, target);
        input.focus();
        return;
      }

      const isText =
        Array.from(event.key).length === 1 ||
        (event.key === "Backspace" && !!query);
      if (!isText) {
        return;
      }

      // Space selects the focused item until there is a query to add it to.
      if (event.key === " " && !query) {
        return;
      }

      // The default action is kept, so the browser types into the input. Radix
      // typeahead, item selection and global shortcuts must not handle the key.
      event.stopPropagation();
      contentRef.current = currentTarget;
      if (target.matches(ITEM_SELECTOR)) {
        highlightRef.current = target;
      }
      if (query === undefined) {
        lockLayout(currentTarget);
      }
      input.focus();
    },
    [query]
  );

  const handleEscapeKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (query === undefined) {
        return;
      }
      event.preventDefault();
      setQuery(undefined);
    },
    [query]
  );

  // While the input has focus, highlight the item that had focus before, or
  // the first match if it was filtered out. Otherwise move focus to the first
  // item if the focused item was filtered out, or if the filter was hidden
  // while it had focus. A passive effect runs after Radix removes unmounted
  // items from its collection.
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const active = document.activeElement;
    if (query !== undefined && active?.hasAttribute(INPUT_ATTRIBUTE)) {
      highlightRef.current = highlightItem(content, highlightRef.current);
      return;
    }
    if (
      active &&
      content.contains(active) &&
      active.getAttribute("role")?.startsWith("menuitem")
    ) {
      return;
    }

    const first = content.querySelector<HTMLElement>(ITEM_SELECTOR);
    (first ?? content).focus();
  }, [query]);

  return { query, setQuery, handleKeyDownCapture, handleEscapeKeyDown, reset };
}

interface Props {
  /** The current filter query, or undefined when the filter is hidden. */
  query: string | undefined;
  /** Called when the user changes the query. */
  onChange: (query: string) => void;
}

/**
 * Displays the filter input at the top of a menu. The input is always
 * rendered, so that it can receive focus before the first character is typed,
 * but it is only visible while there is a query.
 */
export function MenuFilter({ query, onChange }: Props) {
  const { t } = useTranslation();
  const isActive = query !== undefined;

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Radix typeahead must not handle keys typed into the input, but Tab
      // must reach the menu so that focus stays in it.
      if (event.key !== "Tab") {
        event.stopPropagation();
      }
      if (event.nativeEvent.isComposing) {
        return;
      }

      const content = event.currentTarget.closest("[data-radix-menu-content]");
      const items = content
        ? Array.from(content.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
        : [];
      const highlighted =
        content?.querySelector<HTMLElement>(`[${HIGHLIGHT_ATTRIBUTE}]`) ??
        items[0];

      if (event.key === "ArrowDown") {
        event.preventDefault();
        highlighted?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        highlighted?.click();
      }
    },
    []
  );

  return (
    <Wrapper style={isActive ? undefined : VISUALLY_HIDDEN_STYLES}>
      <Input
        value={query ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`${t("Filter")}…`}
        aria-label={t("Filter")}
        tabIndex={-1}
        autoComplete="off"
        spellCheck={false}
        {...{ [INPUT_ATTRIBUTE]: "" }}
      />
    </Wrapper>
  );
}

/**
 * Displays a message when no menu items match the filter query.
 */
export function MenuFilterEmpty() {
  const { t } = useTranslation();
  return <Empty>{t("No results")}</Empty>;
}

/**
 * Records the current width and position of the menu. The filter row applies
 * them, so that the menu does not move while the items are filtered.
 */
function lockLayout(content: HTMLElement) {
  // The computed width is not changed by the scale of the open animation.
  content.style.setProperty(
    "--menu-filter-width",
    getComputedStyle(content).width
  );
  content.setAttribute(LOCKED_ATTRIBUTE, "");

  const wrapper = content.closest<HTMLElement>(
    "[data-radix-popper-content-wrapper]"
  );
  if (wrapper?.style.transform) {
    wrapper.style.setProperty(
      "--menu-filter-transform",
      wrapper.style.transform
    );
    wrapper.setAttribute(LOCKED_ATTRIBUTE, "");
  }
}

/**
 * Marks the item that Enter selects while the filter input has focus.
 *
 * @param content the menu content.
 * @param preferred the item to mark if it is still in the menu.
 * @returns the marked item, or null if the menu has no items.
 */
function highlightItem(content: HTMLElement, preferred: HTMLElement | null) {
  const item =
    preferred?.isConnected &&
    content.contains(preferred) &&
    preferred.matches(ITEM_SELECTOR)
      ? preferred
      : content.querySelector<HTMLElement>(ITEM_SELECTOR);

  content
    .querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}]`)
    .forEach((element) => element.removeAttribute(HIGHLIGHT_ATTRIBUTE));
  item?.setAttribute(HIGHLIGHT_ATTRIBUTE, "");
  return item;
}

const ITEM_SELECTOR = '[role^="menuitem"]:not([data-disabled])';

const HIGHLIGHT_ATTRIBUTE = "data-menu-filter-highlighted";

const LOCKED_ATTRIBUTE = "data-menu-filter-locked";

const INPUT_ATTRIBUTE = "data-menu-filter-input";

const Wrapper = styled.label`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  min-height: 40px;
  margin: -6px -6px 6px;
  padding: 8px 18px;
  cursor: text;
  background: ${s("menuBackground")};
  border-bottom: 1px solid ${s("divider")};

  // Keep the size and position that the menu had before filtering. This rule
  // overrides the inline transform that Radix changes when the menu resizes.
  [data-radix-menu-content][${LOCKED_ATTRIBUTE}]:has(&) {
    width: var(--menu-filter-width);
  }

  [data-radix-popper-content-wrapper][${LOCKED_ATTRIBUTE}]:has(&) {
    transform: var(--menu-filter-transform) !important;
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: none;
  font: inherit;
  font-size: 16px;
  color: ${s("text")};

  &::placeholder {
    color: ${s("placeholder")};
  }

  ${breakpoint("tablet")`
    font-size: 14px;
  `}
`;

const Empty = styled.div`
  padding: 4px 12px;
  font-size: 14px;
  color: ${s("textTertiary")};
`;
