import { useMachine } from "@xstate/react";
import { useCallback } from "react";
import { panelMachine } from "~/machines/panel";

/** What a scene needs to show one panel at a time. */
export interface Panels {
  /** Whether this panel is the open one. */
  isOpen: (panel: string) => boolean;
  /** Which panel is open, when one is. */
  current: string | undefined;
  /** Opens a panel, closing whichever was open. */
  open: (panel: string) => void;
  /** Closes whatever is open. */
  close: () => void;
}

/**
 * Shows one panel at a time on a page.
 *
 * Replaces the boolean-per-panel that let two forms sit on the page at once.
 * A panel is named by a string rather than typed per scene, because the
 * machine is shared and the names differ from page to page; what matters is
 * that there is one of them.
 *
 * @param initial which panel to start on, for a tab strip that always has one.
 * @returns which panel is open and how to change it.
 */
export function usePanel(initial?: string): Panels {
  const [state, send] = useMachine(panelMachine, {
    input: { open: initial },
  });

  const open = useCallback(
    (panel: string) => send({ type: "OPEN", panel }),
    [send]
  );
  const close = useCallback(() => send({ type: "CLOSE" }), [send]);
  const isOpen = useCallback(
    (panel: string) => state.context.panel === panel,
    [state.context.panel]
  );

  return { isOpen, current: state.context.panel, open, close };
}
