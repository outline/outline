import { action, observable } from "mobx";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import Extension from "@shared/editor/lib/Extension";
import HoverPreview from "~/components/HoverPreview";

interface HoverPreviewsOptions {
  /** Delay before the target is considered "hovered" and callback is triggered. */
  delay: number;
}

export default class HoverPreviews extends Extension {
  state: {
    activeLinkElement: HTMLElement | null;
  } = observable({
    activeLinkElement: null,
  });

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
                hoveringTimeout = setTimeout(
                  action(() => {
                    this.state.activeLinkElement = target as HTMLElement;
                  }),
                  this.options.delay
                );
              }
              return false;
            },
            mouseout: action((view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );
              if (isHoverTarget(target, view)) {
                clearTimeout(hoveringTimeout);
                this.state.activeLinkElement = null;
              }
              return false;
            }),
          },
        },
      }),
    ];
  }

  widget = () => (
    <HoverPreview
      element={this.state.activeLinkElement}
      onClose={action(() => {
        this.state.activeLinkElement = null;
      })}
    />
  );
}
