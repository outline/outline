import * as React from "react";
import { ModelSelection } from "~/components/ModelSelection";
import useEventListener from "~/hooks/useEventListener";
import isTextInput from "~/utils/isTextInput";

const ModelSelectionContext = React.createContext<ModelSelection | null>(null);

/**
 * Retrieve the model selection for the nearest enclosing list, or null if the
 * list does not support multi-selection.
 *
 * @returns the model selection, or null.
 */
export function useModelSelection(): ModelSelection | null {
  return React.useContext(ModelSelectionContext);
}

type Props = {
  /** Identifiers of the list's models, in display order, for range selection. */
  items: string[];
  /** The toolbar rendered while a selection is active. */
  toolbar?: React.ReactNode;
  /** The list that consumes the selection. */
  children: React.ReactNode;
};

/**
 * Provides multi-selection state to a list of models, keeps the selection's
 * ordering in sync for shift-click ranges, selects all on meta/ctrl+a, clears
 * the selection on Escape, and renders the supplied toolbar of bulk actions.
 *
 * @param props The component props.
 * @returns the provider element.
 */
export function ModelSelectionProvider({ items, toolbar, children }: Props) {
  const [selection] = React.useState(() => new ModelSelection());

  selection.setOrder(items);

  useEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && selection.isActive) {
      selection.clear();
      return;
    }

    // Select every item on meta/ctrl+a, unless the user is editing text where
    // the browser's own select-all should win.
    const target = event.target;
    if (
      event.key === "a" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      items.length > 0 &&
      !(target instanceof Element && isTextInput(target))
    ) {
      event.preventDefault();
      selection.selectAll();
    }
  });

  return (
    <ModelSelectionContext.Provider value={selection}>
      {children}
      {toolbar}
    </ModelSelectionContext.Provider>
  );
}
