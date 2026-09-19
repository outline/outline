import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import useQuery from "./useQuery";
import useStores from "./useStores";

/**
 * Open the keyboard shortcuts guide when a "shortcuts" param is present in the
 * query string, optionally filtered by the value of the param. This is used to
 * deep link to the guide from external sources, such as emails.
 */
export default function useKeyboardShortcutsQuery() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const query = useQuery();
  const shortcutsQuery = query.get("shortcuts");

  useEffect(() => {
    if (shortcutsQuery === null) {
      return;
    }

    dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts defaultQuery={shortcutsQuery} />,
    });
    // Only the query param should open the guide, re-running when the other
    // dependencies change would reopen an already dismissed dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutsQuery]);
}
