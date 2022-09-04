import type { TippyProps } from "@tippy.js/react";
import { TFunctionResult } from "i18next";
import React from "react";

export type Props = Omit<TippyProps, "content" | "theme"> & {
  tooltip: React.ReactChild | React.ReactChild[] | TFunctionResult;
  shortcut?: React.ReactNode;
};

const LazyTooltip = React.lazy(() => {
  return import(/* webpackChunkName: "tooltip" */ "./Tooltip");
});

const Tooltip = (props: Props) => {
  return (
    <React.Suspense fallback={null}>
      <LazyTooltip {...props} />
    </React.Suspense>
  );
};

export default Tooltip;
