import * as React from "react";
import Tooltip, { Props as TooltipProps } from "~/components/Tooltip";
import { Action, ActionContext } from "~/types";

export type Props = {
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
const ActionButton = React.forwardRef(
  (
    {
      action,
      context,
      tooltip,
      hideOnActionDisabled,
      ...rest
    }: Props & React.HTMLAttributes<HTMLButtonElement>,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const disabled = rest.disabled;

    if (!context || !action) {
      return <button {...rest} ref={ref} />;
    }

    if (action?.visible && !action.visible(context) && hideOnActionDisabled) {
      return null;
    }

    const label =
      typeof action.name === "function" ? action.name(context) : action.name;

    const button = (
      <button
        {...rest}
        aria-label={label}
        disabled={disabled}
        ref={ref}
        onClick={
          action?.perform && context
            ? (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                action.perform?.(context);
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
