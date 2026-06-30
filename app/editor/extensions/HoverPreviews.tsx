import { action, observable } from "mobx";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import stores from "~/stores";
import HoverPreview from "~/components/HoverPreview";
import env from "~/env";

/**
 * Options for the HoverPreviews extension.
 */
interface HoverPreviewsOptions {
  /** Delay in milliseconds before the target is considered "hovered" and the preview is shown. */
  delay: number;
}

export default class HoverPreviews extends Extension<HoverPreviewsOptions> {
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

  get allowInReadOnly() {
    return true;
  }

  get plugins() {
    const isHoverTarget = (target: Element | null) =>
      target instanceof HTMLElement &&
      this.editor.elementRef.current?.contains(target);

    let hoveringTimeout: ReturnType<typeof setTimeout>;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseover: (_view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );
              if (isHoverTarget(target)) {
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

                      // The fetch is async, so the pointer may have already
                      // left the target (or the node may have been removed) by
                      // the time it resolves – only show the preview if the
                      // element is still hovered.
                      if (
                        unfurl &&
                        element.isConnected &&
                        element.matches(":hover")
                      ) {
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
            mouseout: action((_view: EditorView, event: MouseEvent) => {
              const target = (event.target as HTMLElement)?.closest(
                ".use-hover-preview"
              );
              if (isHoverTarget(target)) {
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
