import { observer } from "mobx-react";
import * as React from "react";
import {
  useCompositeState,
  Composite,
  CompositeStateReturn,
} from "reakit/Composite";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: (composite: CompositeStateReturn) => React.ReactNode;
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
};

function ArrowKeyNavigation(
  { children, onEscape, ...rest }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const composite = useCompositeState();

  const handleKeyDown = React.useCallback(
    (ev) => {
      if (onEscape) {
        if (ev.nativeEvent.isComposing) {
          return;
        }

        if (ev.key === "Escape") {
          onEscape(ev);
        }

        if (
          ev.key === "ArrowUp" &&
          composite.currentId === composite.items[0].id
        ) {
          onEscape(ev);
        }
      }
    },
    [composite.currentId, composite.items, onEscape]
  );

  return (
    <Composite
      {...rest}
      {...composite}
      onKeyDown={handleKeyDown}
      role="menu"
      ref={ref}
    >
      {children(composite)}
    </Composite>
  );
}

export default observer(React.forwardRef(ArrowKeyNavigation));
