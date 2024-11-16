import * as React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  /**
   * Capture all events, pointer events, or click events.
   * @default "all"
   */
  captureEvents?: "all" | "pointer" | "click";
};

const EventBoundary: React.FC<Props> = ({
  children,
  className,
  captureEvents = "all",
}: Props) => {
  const stopEvent = React.useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  let props = {};

  if (captureEvents === "all" || captureEvents === "pointer") {
    props = {
      onPointerDown: stopEvent,
      onPointerUp: stopEvent,
    };
  }
  if (captureEvents === "all" || captureEvents === "click") {
    props = {
      ...props,
      onClick: stopEvent,
    };
  }
  return (
    <span {...props} className={className}>
      {children}
    </span>
  );
};

export default EventBoundary;
