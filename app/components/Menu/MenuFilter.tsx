import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";

interface MenuFilterState {
  /** The current filter query, or undefined when the filter is hidden. */
  query: string | undefined;
  /** Capture-phase keydown handler to attach to the menu content. */
  handleKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** Escape handler to attach to the menu content. */
  handleEscapeKeyDown: (event: KeyboardEvent) => void;
  /** Hides the filter and clears the query. */
  reset: () => void;
}

/**
 * Lets the user filter a menu by typing while focus stays on the menu items,
 * so that the arrow keys continue to move between the items.
 *
 * @returns the filter query and the handlers to attach to the menu content.
 */
export function useMenuFilter(): MenuFilterState {
  const [query, setQuery] = React.useState<string>();
  const contentRef = React.useRef<HTMLElement | null>(null);

  const reset = React.useCallback(() => setQuery(undefined), []);

  const handleKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const { target, currentTarget } = event;
      if (
        !(target instanceof HTMLElement) ||
        target.closest("[data-radix-menu-content]") !== currentTarget ||
        isEditable(target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.nativeEvent.isComposing
      ) {
        return;
      }

      let next: string;
      if (event.key === "Backspace") {
        if (!query) {
          return;
        }
        next = query.slice(0, -1);
      } else if (event.key.length === 1) {
        // Space selects the focused item until there is a query to add it to.
        if (event.key === " " && !query) {
          return;
        }
        next = (query ?? "") + event.key;
      } else {
        return;
      }

      // The filter uses the key, so Radix typeahead, item selection and global
      // shortcuts must not also handle it.
      event.preventDefault();
      event.stopPropagation();
      contentRef.current = currentTarget;
      if (query === undefined) {
        lockLayout(currentTarget);
      }
      setQuery(next);
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

  // Keep focus on the same item, or move it to the first match if that item
  // was filtered out. A passive effect runs after Radix removes unmounted
  // items from its collection.
  React.useEffect(() => {
    const content = contentRef.current;
    if (query === undefined || !content) {
      return;
    }

    const active = document.activeElement;
    if (
      active &&
      content.contains(active) &&
      active.getAttribute("role")?.startsWith("menuitem")
    ) {
      return;
    }

    const first = content.querySelector<HTMLElement>(
      '[role^="menuitem"]:not([data-disabled])'
    );
    (first ?? content).focus();
  }, [query]);

  return { query, handleKeyDownCapture, handleEscapeKeyDown, reset };
}

interface Props {
  /** The current filter query. */
  query: string;
}

/**
 * Displays the filter query at the top of a menu. Focus is not moved here, so
 * a caret is drawn to show where typed text goes.
 */
export function MenuFilter({ query }: Props) {
  const { t } = useTranslation();

  return (
    <Wrapper>
      {query}
      <Caret aria-hidden />
      {!query && <Placeholder>{`${t("Filter")}…`}</Placeholder>}
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

const LOCKED_ATTRIBUTE = "data-menu-filter-locked";

function isEditable(element: HTMLElement) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.isContentEditable
  );
}

const blink = keyframes`
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
`;

const Wrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  min-height: 40px;
  margin: -6px -6px 6px;
  padding: 8px 18px;
  font-size: 16px;
  white-space: pre;
  overflow: hidden;
  color: ${s("text")};
  background: ${s("menuBackground")};
  border-bottom: 1px solid ${s("divider")};

  ${breakpoint("tablet")`
    font-size: 14px;
  `}

  // Keep the size and position that the menu had before filtering. This rule
  // overrides the inline transform that Radix changes when the menu resizes.
  [data-radix-menu-content]:has(&) {
    width: var(--menu-filter-width);
  }

  [${LOCKED_ATTRIBUTE}]:has(&) {
    transform: var(--menu-filter-transform) !important;
  }
`;

const Caret = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 1.2em;
  background: ${s("accent")};
  animation: ${blink} 1s step-end infinite;
`;

const Placeholder = styled.span`
  color: ${s("placeholder")};
`;

const Empty = styled.div`
  padding: 4px 12px;
  font-size: 14px;
  color: ${s("textTertiary")};
`;
