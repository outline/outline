import * as React from "react";

export type UseMeasureRect = Pick<
  DOMRectReadOnly,
  "x" | "y" | "top" | "left" | "right" | "bottom" | "height" | "width"
>;

const defaultState: UseMeasureRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

function useDimensions(deps: React.DependencyList = []): [any, UseMeasureRect] {
  const [element, ref] = React.useState<HTMLElement | null>(null);
  const [rect, setRect] = React.useState(defaultState);

  const observer = React.useMemo(
    () =>
      new (window as any).ResizeObserver((entries: any) => {
        if (entries[0]) {
          const {
            x,
            y,
            width,
            height,
            top,
            left,
            bottom,
            right,
          } = entries[0].contentRect;
          setRect({ x, y, width, height, top, left, bottom, right });
        }
      }),
    []
  );

  React.useLayoutEffect(() => {
    if (!element) return;

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, observer]);

  React.useLayoutEffect(() => {
    const bounding = element?.getBoundingClientRect();
    if (!bounding) return;

    setRect({
      x: bounding.x,
      y: bounding.y,
      width: bounding.width,
      height: bounding.height,
      top: bounding.top,
      left: bounding.left,
      bottom: bounding.bottom,
      right: bounding.right,
    });
  }, [element, ...deps]);

  return [ref, rect];
}

export default useDimensions;
