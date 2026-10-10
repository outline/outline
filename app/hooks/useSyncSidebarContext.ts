import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { patchLocation } from "~/utils/history";

/**
 * Writes the sidebar context of the active document into the location state, so
 * that the section which contains the document is the one revealed in the
 * sidebar. Sections the user is already looking at, and the starred section,
 * are left alone.
 *
 * @param belongsToSection whether the given context is one of this section's own.
 * @param resolve returns the context for the active document, or undefined when
 * the document does not belong to this section.
 */
export function useSyncSidebarContext(
  belongsToSection: (context: NonNullable<SidebarContextType>) => boolean,
  resolve: (activeDocumentId: string) => SidebarContextType | undefined
) {
  const { ui } = useStores();
  const history = useHistory();
  const locationSidebarContext = useLocationSidebarContext();

  useEffect(() => {
    if (
      !ui.activeDocumentId ||
      (locationSidebarContext &&
        (belongsToSection(locationSidebarContext) ||
          locationSidebarContext.startsWith("starred")))
    ) {
      return;
    }

    const sidebarContext = resolve(ui.activeDocumentId);
    if (!sidebarContext) {
      return;
    }

    history.push(
      patchLocation(history.location, {
        state: {
          ...(history.location.state as Record<string, unknown>),
          sidebarContext,
        },
      })
    );
    // `history` is read imperatively, the sidebar context should only be
    // recalculated when the active document or memberships change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.activeDocumentId, locationSidebarContext, belongsToSection, resolve]);
}
