import { observer } from "mobx-react";
import * as React from "react";
import {
  useCompositeState,
  Composite,
  CompositeStateReturn,
} from "reakit/Composite";
import styled from "styled-components";

type Props = {
  children: (composite: CompositeStateReturn) => React.ReactNode;
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
};

function ArrowKeyNavigation(
  { children, onEscape }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const composite = useCompositeState();

  const handleKeyDown = React.useCallback(
    (ev) => {
      if (onEscape) {
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
    <StyledComposite
      {...composite}
      onKeyDown={handleKeyDown}
      role="menu"
      aria-label="My toolbar"
      ref={ref}
    >
      {children(composite)}
    </StyledComposite>
  );
}

export default observer(React.forwardRef(ArrowKeyNavigation));

const StyledComposite = styled(Composite)``;
