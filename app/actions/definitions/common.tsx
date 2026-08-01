import type { TFunction } from "i18next";
import { InputIcon } from "outline-icons";
import stores from "~/stores";
import type { Action, ActionContext } from "~/types";
import { createAction } from "..";

/**
 * Creates an action that opens a dialog, taking care of wiring the dialog's
 * submit handler to close it again.
 *
 * @param analyticsName - untranslated name for analytics.
 * @param section - the section the action belongs to.
 * @param title - the dialog title, given the action context.
 * @param content - renders the dialog, given a handler to close it and the
 * action context.
 * @param name - the menu item label, defaults to the title with an ellipsis.
 * @param icon - optional icon for the menu item.
 * @param keywords - optional additional search terms for the command bar.
 * @param visible - optional visibility predicate.
 * @param dangerous - whether the action is destructive.
 * @param width - optional dialog width.
 * @param stopEvent - whether to suppress the triggering event before opening.
 * @returns an action for use in menus.
 */
export const dialogActionFactory = ({
  analyticsName,
  section,
  title,
  content,
  name,
  icon,
  keywords,
  visible,
  dangerous,
  width,
  stopEvent,
}: {
  analyticsName: string;
  section: Action["section"];
  title: (t: TFunction, context: ActionContext) => string;
  content: (onSubmit: () => void, context: ActionContext) => React.ReactNode;
  name?: (t: TFunction) => string;
  icon?: React.ReactNode;
  keywords?: string;
  visible?: Action["visible"];
  dangerous?: boolean;
  width?: string | number;
  stopEvent?: boolean;
}) =>
  createAction({
    name: (context) =>
      name ? name(context.t) : `${title(context.t, context)}…`,
    analyticsName,
    section,
    icon,
    keywords,
    visible,
    dangerous,
    perform: (context) => {
      if (stopEvent) {
        context.event?.preventDefault();
        context.event?.stopPropagation();
      }

      stores.dialogs.openModal({
        title: title(context.t, context),
        content: content(stores.dialogs.closeAllModals, context),
        width,
      });
    },
  });

/**
 * Creates an action that begins renaming a model, either by switching an inline
 * title into edit mode or by opening a rename dialog.
 *
 * @param section - the section the action belongs to.
 * @param modelId - optional model to check the update ability against.
 * @param onRename - invoked when the action is performed.
 * @returns an action for use in menus.
 */
export const renameActionFactory = ({
  section,
  modelId,
  onRename,
}: {
  section: Action["section"];
  modelId?: string;
  onRename?: () => void;
}) =>
  createAction({
    name: ({ t }) => `${t("Rename")}…`,
    analyticsName: "Rename",
    section,
    icon: <InputIcon />,
    visible: ({ stores: rootStore }) =>
      !!onRename &&
      (modelId ? rootStore.policies.abilities(modelId).update : true),
    // Deferred a frame so the menu has closed before focus moves to the input.
    perform: () => requestAnimationFrame(() => onRename?.()),
  });
