/* eslint-disable react/prop-types */
import * as React from "react";
import Tooltip, { Props as TooltipProps } from "~/components/Tooltip";
import { performAction } from "~/actions";
import useIsMounted from "~/hooks/useIsMounted";
import { Action, ActionContext } from "~/types";

export type Props = React.HTMLAttributes<HTMLButtonElement> & {
  /** Show the button in a disabled state */
  disabled?: boolean;
  /** Hide the button entirely if action is not applicable */
  hideOnActionDisabled?: boolean;
  /** Action to use on button */
  action?: Action;
  /** Context of action, must be provided with action */
  context?: ActionContext;
  /** If tooltip props are provided the button will be wrapped in a tooltip */
  tooltip?: Omit<TooltipProps, "children">;
};

/**
 * Button that can be used to trigger an action definition.
 */
const ActionButton = React.forwardRef<HTMLButtonElement, Props>(
  function _ActionButton(
    { action, context, tooltip, hideOnActionDisabled, ...rest }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) {
    const isMounted = useIsMounted();
    const [executing, setExecuting] = React.useState(false);
    const disabled = rest.disabled;

    if (action && !context) {
      throw new Error("Context must be provided with action");
    }
    if (!context || !action) {
      return <button {...rest} ref={ref} />;
    }

    const actionContext = { ...context, isButton: true };

    if (
      action?.visible &&
      !action.visible(actionContext) &&
      hideOnActionDisabled
    ) {
      return null;
    }

    const label =
      typeof action.name === "function"
        ? action.name(actionContext)
        : action.name;

    const button = (
      <button
        {...rest}
        aria-label={label}
        disabled={disabled || executing}
        ref={ref}
        onClick={
          action?.perform && actionContext
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
