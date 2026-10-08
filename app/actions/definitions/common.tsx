import type { TFunction } from "i18next";
import { InputIcon } from "outline-icons";
import { toast } from "sonner";
import stores from "~/stores";
import type Model from "~/models/base/Model";
import type { Action, ActionContext } from "~/types";
import { client } from "~/utils/ApiClient";
import { createAction } from "..";

/** A model class, as accepted by the action context's `getActiveModels`. */
type ModelClass<T extends Model> = new (...args: never[]) => T;

/**
 * Runs a batchable per-item operation across the given items, coalescing the
 * requests into a single batch request.
 *
 * @param items The items to operate on.
 * @param operation The operation to perform on each item.
 * @returns the number of operations that succeeded.
 */
export async function performBatch<T>(
  items: T[],
  operation: (item: T) => Promise<unknown> | undefined
): Promise<number> {
  const results = await Promise.allSettled(
    client.batch(() => items.map((item) => Promise.resolve(operation(item))))
  );
  return results.filter((result) => result.status === "fulfilled").length;
}

/**
 * Whether there is at least one active model of the given class and every one
 * of them satisfies the predicate — the common shape of a bulk action's
 * `visible`.
 *
 * @param context The action context.
 * @param modelClass The class of models to consider.
 * @param predicate Called for each active model.
 * @returns true if all active models match.
 */
export function everyActiveModel<T extends Model>(
  context: ActionContext,
  modelClass: ModelClass<T>,
  predicate: (model: T) => boolean
): boolean {
  const models = context.getActiveModels(modelClass);
  return models.length > 0 && models.every(predicate);
}

/**
 * Runs a batchable operation across all active models of the given class,
 * coalescing the requests into a single batch and optionally showing a toast.
 * The common shape of a bulk action's `perform`.
 *
 * @param context The action context.
 * @param modelClass The class of models to operate on.
 * @param operation The operation to perform on each model.
 * @param message Given the models and how many succeeded, returns the toast to
 * show, or undefined to show none (e.g. to stay silent for a single model). No
 * toast is shown when every operation failed.
 * @returns the number of operations that succeeded.
 */
export async function performBatchOnActiveModels<T extends Model>(
  context: ActionContext,
  modelClass: ModelClass<T>,
  operation: (model: T) => Promise<unknown> | undefined,
  message?: (models: T[], succeeded: number, t: TFunction) => string | undefined
): Promise<number> {
  const models = context.getActiveModels(modelClass);
  if (!models.length) {
    return 0;
  }

  const succeeded = await performBatch(models, operation);
  const text = succeeded ? message?.(models, succeeded, context.t) : undefined;
  if (text) {
    toast.success(text);
  }
  return succeeded;
}

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
 * Required when the title is not a plain string.
 * @param icon - optional icon for the menu item.
 * @param iconInContextMenu - whether the icon is shown in context menus.
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
  iconInContextMenu,
  keywords,
  visible,
  dangerous,
  width,
  stopEvent,
}: {
  analyticsName: string;
  section: Action["section"];
  content: (onSubmit: () => void, context: ActionContext) => React.ReactNode;
  icon?: React.ReactNode;
  iconInContextMenu?: boolean;
  keywords?: string;
  visible?: Action["visible"];
  dangerous?: boolean;
  width?: string | number;
  stopEvent?: boolean;
} & (
  | {
      title: (t: TFunction, context: ActionContext) => string;
      name?: (t: TFunction) => string;
    }
  | {
      title: (t: TFunction, context: ActionContext) => React.ReactNode;
      name: (t: TFunction) => string;
    }
)) =>
  createAction({
    // The title is only used as a label when it's a plain string, the type
    // requires a name otherwise.
    name: (context) => {
      if (name) {
        return name(context.t);
      }
      const value = title(context.t, context);
      return typeof value === "string" ? `${value}…` : "";
    },
    analyticsName,
    section,
    icon,
    iconInContextMenu,
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
