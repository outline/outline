import type { TargetAndTransition } from "framer-motion";
import { m } from "framer-motion";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import useMeasure from "react-use-measure";

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
  /** Ref to the inner content element. */
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * Automatically animates the height of a container based on it's contents.
 */
export function ResizingHeightContainer(props: Props) {
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
    ref: forwardedRef,
  } = props;

  const [measureRef, { width, height }] = useMeasure();

  // Bounds are zero until first measured, do not animate toward them on mount.
  const isMeasured = width > 0 || height > 0;

  return (
    <m.div
      animate={
        isMeasured
          ? {
              ...config,
              height: Math.round(height),
            }
          : undefined
      }
      style={{
        ...style,
        overflow: hideOverflow ? "hidden" : "inherit",
        position: "relative",
      }}
    >
      <div ref={mergeRefs([measureRef, forwardedRef])}>{children}</div>
    </m.div>
  );
}
