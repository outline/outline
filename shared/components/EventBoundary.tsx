import * as React from "react";

/**
 * Props for the EventBoundary component.
 */
export interface Props<T extends React.ElementType> {
  /** The element or component to render as. */
  as?: T;
  /** The children to be rendered within the boundary. */
  children?: React.ReactNode;
  /** Optional CSS class name. */
  className?: string;
  /**
   * Capture all events, pointer events, or click events.
   * @default "all"
   */
  captureEvents?: "all" | "pointer" | "click" | "mouse" | "keyboard";
}

/**
 * EventBoundary is a component that prevents events from propagating to parent elements.
 * This is useful for preventing clicks or other interactions from bubbling up the DOM tree.
 *
 * @param props - the properties of the component.
 * @return a React component that captures events.
 */
export const EventBoundary = <T extends React.ElementType = "span">({
  as,
  children,
  className,
  captureEvents = "all",
  ...rest
}: Props<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof Props<T>>) => {
  const Component = as || "span";

  const stopEvent = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const eventHandlers: {
    onPointerDown?: React.PointerEventHandler;
    onPointerUp?: React.PointerEventHandler;
    onClick?: React.MouseEventHandler;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onKeyDown?: React.KeyboardEventHandler;
    onKeyUp?: React.KeyboardEventHandler;
  } = {};

  if (captureEvents === "all" || captureEvents === "keyboard") {
    eventHandlers.onKeyDown = stopEvent;
    eventHandlers.onKeyUp = stopEvent;
  }

  if (captureEvents === "all" || captureEvents === "mouse") {
    eventHandlers.onMouseDown = stopEvent;
    eventHandlers.onMouseUp = stopEvent;
  }

  if (captureEvents === "all" || captureEvents === "pointer") {
    eventHandlers.onPointerDown = stopEvent;
    eventHandlers.onPointerUp = stopEvent;
  }

  if (captureEvents === "all" || captureEvents === "click") {
    eventHandlers.onClick = stopEvent;
  }

  return (
    <Component {...rest} {...eventHandlers} className={className}>
      {children}
    </Component>
  );
};

export default EventBoundary;
