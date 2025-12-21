/* oxlint-disable react/prop-types */
import * as React from "react";
import type { Props as TooltipProps } from "~/components/Tooltip";
import Tooltip from "~/components/Tooltip";
import { performAction, resolve } from "~/actions";
import useIsMounted from "~/hooks/useIsMounted";
import useActionContext from "~/hooks/useActionContext";
import type { ActionVariant, ActionWithChildren } from "~/types";

export type Props = React.HTMLAttributes<HTMLButtonElement> & {
  /** Show the button in a disabled state */
  disabled?: boolean;
  /** Hide the button entirely if action is not applicable */
  hideOnActionDisabled?: boolean;
  /** Action to use on button */
  action?: Exclude<ActionVariant, ActionWithChildren>;
  /** If tooltip props are provided the button will be wrapped in a tooltip */
  tooltip?: Omit<TooltipProps, "children">;
};

/**
 * Button that can be used to trigger an action definition.
 */
const ActionButton = React.forwardRef<HTMLButtonElement, Props>(
  function ActionButton_(
    { action, tooltip, hideOnActionDisabled, ...rest }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) {
    const actionContext = useActionContext({
      isButton: true,
    });
    const isMounted = useIsMounted();
    const [executing, setExecuting] = React.useState(false);

    if (!actionContext || !action) {
      return <button {...rest} ref={ref} />;
    }

    const actionIsDisabled =
      action.visible && !resolve<boolean>(action.visible, actionContext);

    if (actionIsDisabled && hideOnActionDisabled) {
      return null;
    }

    const disabled = rest.disabled || actionIsDisabled;

    const label =
      rest["aria-label"] ??
      (typeof action.name === "function"
        ? action.name(actionContext)
        : action.name);

    const button = (
      <button
        {...rest}
        aria-label={label}
        disabled={disabled || executing}
        ref={ref}
        onClick={
          actionContext
            ? (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const response = performAction(action, actionContext);
                if (response?.finally) {
                  setExecuting(true);
                  void response.finally(
                    () => isMounted() && setExecuting(false)
                  );
                }
              }
            : rest.onClick
        }
      >
        {rest.children ?? label}
      </button>
    );

    if (tooltip) {
      return <Tooltip {...tooltip}>{button}</Tooltip>;
    }

    return button;
  }
);

export default ActionButton;
