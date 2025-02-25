import { m, TargetAndTransition } from "framer-motion";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useComponentSize } from "@shared/hooks/useComponentSize";

type Props = {
  /** The children to render */
  children: React.ReactNode;
  /** Whether to hide overflow. */
  hideOverflow?: boolean;
  /** A way to calculate height */
  componentSizeCalculation?: "clientRectHeight" | "scrollHeight";
  /** Optional animation config. */
  config?: TargetAndTransition;
  /** Optional styles. */
  style?: React.CSSProperties;
};

/**
 * Automatically animates the height of a container based on it's contents.
 */
export const ResizingHeightContainer = React.forwardRef<HTMLDivElement, Props>(
  function ResizingHeightContainer_(props, forwardedRef) {
    const {
      hideOverflow,
      children,
      config = {
        transition: {
          duration: 0.1,
          ease: "easeInOut",
        },
      },
      style,
    } = props;

    const ref = React.useRef<HTMLDivElement>(null);
    const { height } = useComponentSize(ref);

    return (
      <m.div
        animate={{
          ...config,
          height: Math.round(height),
        }}
        style={{
          ...style,
          overflow: hideOverflow ? "hidden" : "inherit",
          position: "relative",
        }}
      >
        <div ref={mergeRefs([ref, forwardedRef])}>{children}</div>
      </m.div>
    );
  }
);
