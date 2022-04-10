import { formatDistanceToNow } from "date-fns";
import { deburr, sortBy } from "lodash";
import * as React from "react";
import { Optional } from "utility-types";
import embeds from "@shared/editor/embeds";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isInternalUrl } from "@shared/utils/urls";
import Document from "~/models/Document";
import ErrorBoundary from "~/components/ErrorBoundary";
import HoverPreview from "~/components/HoverPreview";
import type { Props as EditorProps, Editor as SharedEditor } from "~/editor";
import useDictionary from "~/hooks/useDictionary";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { NotFoundError } from "~/utils/errors";
import { uploadFile } from "~/utils/files";
import history from "~/utils/history";
import { isModKey } from "~/utils/keyboard";
import { isHash } from "~/utils/urls";
import DocumentBreadcrumb from "./DocumentBreadcrumb";

const LazyLoadedEditor = React.lazy(
  () =>
    import(
      /* webpackChunkName: "shared-editor" */
      "~/editor"
    )
);

export type Props = Optional<
  EditorProps,
  | "placeholder"
  | "defaultValue"
  | "onClickLink"
  | "embeds"
  | "dictionary"
  | "onShowToast"
  | "extensions"
> & {
  shareId?: string | undefined;
  embedsDisabled?: boolean;
  grow?: boolean;
  onSynced?: () => Promise<void>;
  onPublish?: (event: React.MouseEvent) => any;
};

function Editor(props: Props, ref: React.Ref<SharedEditor>) {
  const { id, shareId } = props;
  const { documents } = useStores();
  const { showToast } = useToasts();
  const dictionary = useDictionary();
  const [
    activeLinkEvent,
    setActiveLinkEvent,
  ] = React.useState<MouseEvent | null>(null);

  const handleLinkActive = React.useCallback((event: MouseEvent) => {
    setActiveLinkEvent(event);
    return false;
  }, []);

  const handleLinkInactive = React.useCallback(() => {
    setActiveLinkEvent(null);
  }, []);

  const handleSearchLink = React.useCallback(
    async (term: string) => {
      if (isInternalUrl(term)) {
        // search for exact internal document
        const slug = parseDocumentSlug(term);
        if (!slug) {
          return [];
        }

        try {
          const document = await documents.fetch(slug);
          const time = formatDistanceToNow(Date.parse(document.updatedAt), {
            addSuffix: true,
          });

          return [
            {
              title: document.title,
              subtitle: `Updated ${time}`,
              url: document.url,
            },
          ];
        } catch (error) {
          // NotFoundError could not find document for slug
          if (!(error instanceof NotFoundError)) {
            throw error;
          }
        }
      }

      // default search for anything that doesn't look like a URL
      const results = await documents.searchTitles(term);

      return sortBy(
        results.map((document: Document) => {
          return {
            title: document.title,
            subtitle: <DocumentBreadcrumb document={document} onlyText />,
            url: document.url,
          };
        }),
        (document) =>
          deburr(document.title)
            .toLowerCase()
            .startsWith(deburr(term).toLowerCase())
            ? -1
            : 1
      );
    },
    [documents]
  );

  const onUploadFile = React.useCallback(
    async (file: File) => {
      const result = await uploadFile(file, {
        documentId: id,
      });
      return result.url;
    },
    [id]
  );

  const onClickLink = React.useCallback(
    (href: string, event: MouseEvent) => {
      // on page hash
      if (isHash(href)) {
        window.location.href = href;
        return;
      }

      if (isInternalUrl(href) && !isModKey(event) && !event.shiftKey) {
        // relative
        let navigateTo = href;

        // probably absolute
        if (href[0] !== "/") {
          try {
            const url = new URL(href);
            navigateTo = url.pathname + url.hash;
          } catch (err) {
            navigateTo = href;
          }
        }

        if (shareId) {
          navigateTo = `/share/${shareId}${navigateTo}`;
        }

        history.push(navigateTo);
      } else if (href) {
        window.open(href, "_blank");
      }
    },
    [shareId]
  );

  return (
    <ErrorBoundary reloadOnChunkMissing>
      <>
        <LazyLoadedEditor
          ref={ref}
          uploadFile={onUploadFile}
          onShowToast={showToast}
          embeds={embeds}
          dictionary={dictionary}
          {...props}
          onHoverLink={handleLinkActive}
          onClickLink={onClickLink}
          onSearchLink={handleSearchLink}
          placeholder={props.placeholder || ""}
          defaultValue={props.defaultValue || ""}
        />
        {activeLinkEvent && !shareId && (
          <HoverPreview
            node={activeLinkEvent.target as HTMLAnchorElement}
            event={activeLinkEvent}
            onClose={handleLinkInactive}
          />
        )}
      </>
    </ErrorBoundary>
  );
}

export default React.forwardRef(Editor);
