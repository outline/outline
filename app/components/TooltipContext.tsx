import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

export const TooltipContext = React.createContext<boolean>(false);

export function useTooltipContext() {
  return React.useContext(TooltipContext);
}

type Props = {
  children: React.ReactNode;
  /** The duration from when the mouse enters the trigger until the tooltip gets opened */
  delayDuration?: number;
  /** How much time a user has to enter another trigger without incurring a delay again */
  skipDelayDuration?: number;
  /** Prevents the tooltip from opening */
  disableHoverableContent?: boolean;
};

/**
 * Wrap a collection of tooltips in a provider to allow them to share the same provider instance.
 */
export function TooltipProvider({
  children,
  delayDuration = 500,
  skipDelayDuration = 300,
  disableHoverableContent = false,
}: Props) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipContext.Provider value={true}>{children}</TooltipContext.Provider>
    </TooltipPrimitive.Provider>
  );
}
