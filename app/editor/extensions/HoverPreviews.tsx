import { action, observable } from "mobx";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import Extension from "@shared/editor/lib/Extension";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import HoverPreview from "~/components/HoverPreview";
import env from "~/env";
import { client } from "~/utils/ApiClient";

interface HoverPreviewsOptions {
  /** Delay before the target is considered "hovered" and callback is triggered. */
  delay: number;
}

export default class HoverPreviews extends Extension {
  state: {
    activeLinkElement: HTMLElement | null;
    data: Record<string, any> | null;
    dataLoading: boolean;
  } = observable({
    activeLinkElement: null,
    data: null,
    dataLoading: false,
  });

  get defaultOptions(): HoverPreviewsOptions {
    return {
      delay: 600,
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
                  action(async () => {
                    const element = target as HTMLElement;

                    const url =
                      element?.getAttribute("href") || element?.dataset.url;
                    const documentId = parseDocumentSlug(
                      window.location.pathname
                    );

                    if (url) {
                      this.state.dataLoading = true;
                      try {
                        const data = await client.post("/urls.unfurl", {
                          url: url.startsWith("/") ? env.URL + url : url,
                          documentId,
                        });
                        this.state.activeLinkElement = element;
                        this.state.data = data;
                      } catch (err) {
                        this.state.activeLinkElement = null;
                      } finally {
                        this.state.dataLoading = false;
                      }
                    }
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
      data={this.state.data}
      dataLoading={this.state.dataLoading}
      onClose={action(() => {
        this.state.activeLinkElement = null;
      })}
    />
  );
}
