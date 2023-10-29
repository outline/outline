import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Extension from "../lib/Extension";

interface HoverPreviewsOptions {
  /** Callback when a hover target is found or lost. */
  onHoverLink?: (target: Element | null) => void;

  /** Delay before the target is considered "hovered" and callback is triggered. */
  delay: number;
}

export default class HoverPreviews extends Extension {
  get defaultOptions(): HoverPreviewsOptions {
    return {
      delay: 500,
    };
  }

  get name() {
    return "hover-previews";
  }

  get plugins() {
    const isHoverTarget = (target: Element | null, view: EditorView) =>
      target instanceof HTMLElement &&
      this.editor.elementRef.current?.contains(target) &&
      (!view.editable || (view.editable && !view.hasFocus()));

    let hoveringTimeout: ReturnType<typeof setTimeout>;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseover: (view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );
              if (isHoverTarget(target, view)) {
                if (this.options.onHoverLink) {
                  hoveringTimeout = setTimeout(() => {
                    this.options.onHoverLink?.(target);
                  }, this.options.delay);
                }
              }
              return false;
            },
            mouseout: (view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );
              if (isHoverTarget(target, view)) {
                clearTimeout(hoveringTimeout);
                this.options.onHoverLink?.(null);
              }
              return false;
            },
          },
        },
      }),
    ];
  }
}
