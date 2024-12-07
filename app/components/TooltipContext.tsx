import Tippy, { useSingleton, TippyProps } from "@tippyjs/react";
import * as React from "react";
import { roundArrow } from "tippy.js";

export const TooltipContext =
  React.createContext<TippyProps["singleton"]>(undefined);

export function useTooltipContext() {
  return React.useContext(TooltipContext);
}

type Props = {
  children: React.ReactNode;
  /** Props to pass to the Tippy component */
  tippyProps?: TippyProps;
};

/**
 * Wrap a collection of tooltips in a provider to allow them to share the same singleton instance.
 */
export function TooltipProvider({ children, tippyProps }: Props) {
  const [source, target] = useSingleton();

  return (
    <>
      <Tippy
        delay={500}
        arrow={roundArrow}
        animation="shift-away"
        singleton={source}
        duration={[200, 150]}
        inertia
        {...tippyProps}
      />
      <TooltipContext.Provider value={target}>
        {children}
      </TooltipContext.Provider>
    </>
  );
}
