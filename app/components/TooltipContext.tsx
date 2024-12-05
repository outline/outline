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
};

export function TooltipProvider({ children }: Props) {
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
      />
      <TooltipContext.Provider value={target}>
        {children}
      </TooltipContext.Provider>
    </>
  );
}
