/* oxlint-disable react/prop-types */
import * as React from "react";
import Tooltip, { Props as TooltipProps } from "~/components/Tooltip";
import { performAction, performActionV2, resolve } from "~/actions";
import useIsMounted from "~/hooks/useIsMounted";
import { Action, ActionV2Variant, ActionV2WithChildren } from "~/types";
import useActionContext from "~/hooks/useActionContext";

export type Props = React.HTMLAttributes<HTMLButtonElement> & {
  /** Show the button in a disabled state */
  disabled?: boolean;
  /** Hide the button entirely if action is not applicable */
  hideOnActionDisabled?: boolean;
  /** Action to use on button */
  action?: Action | Exclude<ActionV2Variant, ActionV2WithChildren>;
  /** If tooltip props are provided the button will be wrapped in a tooltip */
  tooltip?: Omit<TooltipProps, "children">;
};

/**
 * Button that can be used to trigger an action definition.
 */
const ActionButton = React.forwardRef<HTMLButtonElement, Props>(
  function _ActionButton(
    { action, tooltip, hideOnActionDisabled, ...rest }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) {
    const actionContext = useActionContext({
      isButton: true,
    });
    const isMounted = useIsMounted();
    const [executing, setExecuting] = React.useState(false);
    const disabled = rest.disabled;

    if (!actionContext || !action) {
      return <button {...rest} ref={ref} />;
    }

    if (
      action.visible &&
      !resolve<boolean>(action.visible, actionContext) &&
      hideOnActionDisabled
    ) {
      return null;
    }

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
                const response =
                  "variant" in action
                    ? performActionV2(action, actionContext)
                    : performAction(action, actionContext);
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
