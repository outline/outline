import { useMachine } from "@xstate/react";
import { useCallback } from "react";
import { panelMachine } from "~/machines/panel";
/** What a scene needs to show one panel at a time. */
export interface Panels<T extends string> {
  /** Whether this panel is the open one. */
  isOpen: (panel: T) => boolean;
  /** Which panel is open, when one is. */
  current: T | undefined;
  /** Opens a panel, closing whichever was open. */
  open: (panel: T) => void;
  /** Closes whatever is open. */
  close: () => void;
}
/**
 * Shows one panel at a time on a page.
 *
 * Replaces the boolean-per-panel that let two forms sit on the page at once.
 * The machine is shared, so it holds the panel as a plain string; the names
 * differ from page to page and what matters is that there is one of them.
 * The scene's own names come back through T, so a tab compared against a
 * narrow union still type-checks.
 *
 * @param initial which panel to start on, for a tab strip that always has one.
 * @returns which panel is open and how to change it.
 */
export function usePanel<T extends string = string>(initial?: T): Panels<T> {
  const [state, send] = useMachine(panelMachine, {
    input: { open: initial },
  });
  const open = useCallback((panel: T) => send({ type: "OPEN", panel }), [send]);
  const close = useCallback(() => send({ type: "CLOSE" }), [send]);
  const isOpen = useCallback(
    (panel: T) => state.context.panel === panel,
    [state.context.panel]
  );
  return {
    isOpen,
    // The machine only ever holds what open() was given, and that is T.
    current: state.context.panel as T | undefined,
    open,
    close,
  };
}
