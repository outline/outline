import { snakeCase } from "es-toolkit";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { TeamPreference } from "@shared/types";
import { performAction, resolve } from "~/actions";
import type {
  ActionContext,
  ActionGroup,
  ActionSeparator,
  ActionVariant,
  ActionWithChildren,
} from "~/types";
import {
  isModelContextSupported,
  registerModelContextTool,
} from "~/utils/ModelContext";
import useActionContext from "./useActionContext";
import useStores from "./useStores";

type PerformableAction = Exclude<ActionVariant, ActionWithChildren>;

/**
 * Hook to expose actions as WebMCP tools while the hook is inside a mounted
 * component. Tools are unregistered automatically on unmount or navigation.
 *
 * @param actions actions to make available as tools.
 */
export default function useWebMCPActions(
  actions: ActionVariant[],
  additionalDeps: React.DependencyList = []
) {
  const location = useLocation();
  const { auth } = useStores();
  const context = useActionContext({ isMCP: true });

  const enabled =
    isModelContextSupported() && !!auth.team?.getPreference(TeamPreference.MCP);

  const performable = enabled ? flattenActions(actions, context) : [];
  const toolNames = performable.map((action) =>
    snakeCase(action.analyticsName ?? "")
  );

  // Refs keep `execute` callbacks working against the latest context and
  // action list without re-registering tools on every render.
  const contextRef = React.useRef(context);
  contextRef.current = context;
  const performableRef = React.useRef(performable);
  performableRef.current = performable;

  React.useEffect(() => {
    if (!enabled || performableRef.current.length === 0) {
      return;
    }

    const controller = new AbortController();

    for (const action of performableRef.current) {
      const ctx = contextRef.current;
      const name = snakeCase(action.analyticsName ?? "");
      const title = resolve<React.ReactNode>(action.name, ctx);
      const description =
        resolve<string | undefined>(action.description, ctx) ??
        (typeof title === "string" ? title : action.analyticsName);

      if (!name || !description) {
        continue;
      }

      registerModelContextTool(
        {
          name,
          description,
          inputSchema: action.mcp?.inputSchema,
          execute: async (args) => {
            const result = await performAction(action, {
              ...contextRef.current,
              mcpArgs: args,
            });
            return {
              content: [
                {
                  type: "text",
                  text:
                    typeof result === "string"
                      ? result
                      : result === undefined
                        ? "Done"
                        : JSON.stringify(result),
                },
              ],
            };
          },
        },
        controller.signal
      );
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, toolNames.join(","), location.pathname, ...additionalDeps]);
}

function flattenActions(
  actions: (ActionVariant | ActionGroup | ActionSeparator)[],
  context: ActionContext
): PerformableAction[] {
  const result: PerformableAction[] = [];

  for (const action of actions) {
    if (action.type === "action_separator") {
      continue;
    }
    if (action.type === "action_group") {
      result.push(...flattenActions(action.actions, context));
      continue;
    }
    if (resolve<boolean>(action.visible, context) === false) {
      continue;
    }
    if (action.variant === "action_with_children") {
      const children = resolve<
        (ActionVariant | ActionGroup | ActionSeparator)[]
      >(action.children, context);
      result.push(...flattenActions(children, context));
      continue;
    }
    if (action.variant === "action" && action.dangerous) {
      continue;
    }
    if (action.analyticsName) {
      result.push(action);
    }
  }

  return result;
}
