import { action, observable } from "mobx";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import stores from "~/stores";
import HoverPreview from "~/components/HoverPreview";
import env from "~/env";

interface HoverPreviewsOptions {
  /** Delay before the target is considered "hovered" and callback is triggered. */
  delay: number;
}

export default class HoverPreviews extends Extension {
  state: {
    activeLinkElement: HTMLElement | null;
    unfurlId: string | null;
    dataLoading: boolean;
  } = observable({
    activeLinkElement: null,
    unfurlId: null,
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
                      const transformedUrl = url.startsWith("/")
                        ? env.URL + url
                        : url;

                      this.state.dataLoading = true;

                      const unfurl = await stores.unfurls.fetchUnfurl({
                        url: transformedUrl,
                        documentId,
                      });

                      if (unfurl) {
                        this.state.activeLinkElement = element;
                        this.state.unfurlId = transformedUrl;
                      } else {
                        this.state.activeLinkElement = null;
                      }

                      this.state.dataLoading = false;
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
      unfurlId={this.state.unfurlId}
      dataLoading={this.state.dataLoading}
      onClose={action(() => {
        this.state.activeLinkElement = null;
        this.state.unfurlId = null;
      })}
    />
  );
}
