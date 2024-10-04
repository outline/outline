import { RovingTabIndexProvider } from "@getoutline/react-roving-tabindex";
import { observer } from "mobx-react";
import * as React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: () => React.ReactNode;
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
  items: unknown[];
};

function ArrowKeyNavigation(
  { children, onEscape, items, ...rest }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>) => {
      if (onEscape) {
        if (ev.nativeEvent.isComposing) {
          return;
        }

        if (ev.key === "Escape" || ev.key === "Backspace") {
          ev.preventDefault();
          onEscape(ev);
        }

        if (
          ev.key === "ArrowUp" &&
          // If the first item is focused and the user presses ArrowUp
          ev.currentTarget.firstElementChild === document.activeElement
        ) {
          onEscape(ev);
        }
      }
    },
    [onEscape]
  );

  return (
    <RovingTabIndexProvider
      options={{ focusOnClick: true, direction: "both" }}
      items={items}
    >
      <div {...rest} onKeyDown={handleKeyDown} ref={ref}>
        {children()}
      </div>
    </RovingTabIndexProvider>
  );
}

export default observer(React.forwardRef(ArrowKeyNavigation));
