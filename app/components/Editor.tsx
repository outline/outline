import deburr from "lodash/deburr";
import difference from "lodash/difference";
import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useHistory } from "react-router-dom";
import { Optional } from "utility-types";
import insertFiles from "@shared/editor/commands/insertFiles";
import { AttachmentPreset } from "@shared/types";
import { Heading } from "@shared/utils/ProsemirrorHelper";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import { getDataTransferFiles } from "@shared/utils/files";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isInternalUrl } from "@shared/utils/urls";
import { AttachmentValidation } from "@shared/validations";
import Document from "~/models/Document";
import ClickablePadding from "~/components/ClickablePadding";
import ErrorBoundary from "~/components/ErrorBoundary";
import HoverPreview from "~/components/HoverPreview";
import type { Props as EditorProps, Editor as SharedEditor } from "~/editor";
import useDictionary from "~/hooks/useDictionary";
import useEmbeds from "~/hooks/useEmbeds";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { NotFoundError } from "~/utils/errors";
import { uploadFile } from "~/utils/files";
import { isModKey } from "~/utils/keyboard";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { sharedDocumentPath } from "~/utils/routeHelpers";
import { isHash } from "~/utils/urls";
import DocumentBreadcrumb from "./DocumentBreadcrumb";

const LazyLoadedEditor = lazyWithRetry(() => import("~/editor"));

export type Props = Optional<
  EditorProps,
  | "placeholder"
  | "defaultValue"
  | "onClickLink"
  | "embeds"
  | "dictionary"
  | "extensions"
> & {
  shareId?: string | undefined;
  embedsDisabled?: boolean;
  previewsDisabled?: boolean;
  onHeadingsChange?: (headings: Heading[]) => void;
  onSynced?: () => Promise<void>;
  onPublish?: (event: React.MouseEvent) => any;
  editorStyle?: React.CSSProperties;
};

function Editor(props: Props, ref: React.RefObject<SharedEditor> | null) {
  const {
    id,
    shareId,
    onChange,
    onHeadingsChange,
    onCreateCommentMark,
    onDeleteCommentMark,
    previewsDisabled,
  } = props;
  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);
  const { auth, comments, documents } = useStores();
  const dictionary = useDictionary();
  const embeds = useEmbeds(!shareId);
  const history = useHistory();
  const localRef = React.useRef<SharedEditor>();
  const preferences = auth.user?.preferences;
  const previousHeadings = React.useRef<Heading[] | null>(null);
  const [activeLinkElement, setActiveLink] =
    React.useState<HTMLAnchorElement | null>(null);
  const previousCommentIds = React.useRef<string[]>();

  const handleLinkActive = React.useCallback((element: HTMLAnchorElement) => {
    setActiveLink(element);
    return false;
  }, []);

  const handleLinkInactive = React.useCallback(() => {
    setActiveLink(null);
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
          const time = dateToRelative(Date.parse(document.updatedAt), {
            addSuffix: true,
            shorten: true,
            locale,
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
        results.map((document: Document) => ({
          title: document.title,
          subtitle: <DocumentBreadcrumb document={document} onlyText />,
          url: document.url,
        })),
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

  const handleUploadFile = React.useCallback(
    async (file: File) => {
      const result = await uploadFile(file, {
        documentId: id,
        preset: AttachmentPreset.DocumentAttachment,
      });
      return result.url;
    },
    [id]
  );

  const handleClickLink = React.useCallback(
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

        // Link to our own API should be opened in a new tab, not in the app
        if (navigateTo.startsWith("/api/")) {
          window.open(href, "_blank");
          return;
        }

        // If we're navigating to an internal document link then prepend the
        // share route to the URL so that the document is loaded in context
        if (shareId && navigateTo.includes("/doc/")) {
          navigateTo = sharedDocumentPath(shareId, navigateTo);
        }

        history.push(navigateTo);
      } else if (href) {
        window.open(href, "_blank");
      }
    },
    [history, shareId]
  );

  const focusAtEnd = React.useCallback(() => {
    localRef?.current?.focusAtEnd();
  }, [localRef]);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const files = getDataTransferFiles(event);

      const view = localRef?.current?.view;
      if (!view) {
        return;
      }

      // Find a valid position at the end of the document to insert our content
      const pos = TextSelection.near(
        view.state.doc.resolve(view.state.doc.nodeSize - 2)
      ).from;

      // If there are no files in the drop event attempt to parse the html
      // as a fragment and insert it at the end of the document
      if (files.length === 0) {
        const text =
          event.dataTransfer.getData("text/html") ||
          event.dataTransfer.getData("text/plain");

        const dom = new DOMParser().parseFromString(text, "text/html");

        view.dispatch(
          view.state.tr.insert(
            pos,
            ProsemirrorDOMParser.fromSchema(view.state.schema).parse(dom)
          )
        );

        return;
      }

      // Insert all files as attachments if any of the files are not images.
      const isAttachment = files.some(
        (file) => !AttachmentValidation.imageContentTypes.includes(file.type)
      );

      insertFiles(view, event, pos, files, {
        uploadFile: handleUploadFile,
        onFileUploadStart: props.onFileUploadStart,
        onFileUploadStop: props.onFileUploadStop,
        dictionary,
        isAttachment,
      });
    },
    [
      localRef,
      props.onFileUploadStart,
      props.onFileUploadStop,
      dictionary,
      handleUploadFile,
    ]
  );

  // see: https://stackoverflow.com/a/50233827/192065
  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
    },
    []
  );

  // Calculate if headings have changed and trigger callback if so
  const updateHeadings = React.useCallback(() => {
    if (onHeadingsChange) {
      const headings = localRef?.current?.getHeadings();
      if (
        headings &&
        headings.map((h) => h.level + h.title).join("") !==
          previousHeadings.current?.map((h) => h.level + h.title).join("")
      ) {
        previousHeadings.current = headings;
        onHeadingsChange(headings);
      }
    }
  }, [localRef, onHeadingsChange]);

  const updateComments = React.useCallback(() => {
    if (onCreateCommentMark && onDeleteCommentMark) {
      const commentMarks = localRef.current?.getComments();
      const commentIds = comments.orderedData.map((c) => c.id);
      const commentMarkIds = commentMarks?.map((c) => c.id);
      const newCommentIds = difference(
        commentMarkIds,
        previousCommentIds.current ?? [],
        commentIds
      );

      newCommentIds.forEach((commentId) => {
        const mark = commentMarks?.find((c) => c.id === commentId);
        if (mark) {
          onCreateCommentMark(mark.id, mark.userId);
        }
      });

      const removedCommentIds = difference(
        previousCommentIds.current ?? [],
        commentMarkIds ?? []
      );

      removedCommentIds.forEach((commentId) => {
        onDeleteCommentMark(commentId);
      });

      previousCommentIds.current = commentMarkIds;
    }
  }, [onCreateCommentMark, onDeleteCommentMark, comments.orderedData]);

  const handleChange = React.useCallback(
    (event) => {
      onChange?.(event);
      updateHeadings();
      updateComments();
    },
    [onChange, updateComments, updateHeadings]
  );

  const handleRefChanged = React.useCallback(
    (node: SharedEditor | null) => {
      if (node) {
        updateHeadings();
        updateComments();
      }
    },
    [updateComments, updateHeadings]
  );

  return (
    <ErrorBoundary component="div" reloadOnChunkMissing>
      <>
        <LazyLoadedEditor
          ref={mergeRefs([ref, localRef, handleRefChanged])}
          uploadFile={handleUploadFile}
          embeds={embeds}
          userPreferences={preferences}
          dictionary={dictionary}
          {...props}
          onHoverLink={previewsDisabled ? undefined : handleLinkActive}
          onClickLink={handleClickLink}
          onSearchLink={handleSearchLink}
          onChange={handleChange}
          placeholder={props.placeholder || ""}
          defaultValue={props.defaultValue || ""}
        />
        {props.editorStyle?.paddingBottom && !props.readOnly && (
          <ClickablePadding
            onClick={focusAtEnd}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            minHeight={props.editorStyle.paddingBottom}
          />
        )}
        {activeLinkElement && !shareId && (
          <HoverPreview
            element={activeLinkElement}
            onClose={handleLinkInactive}
          />
        )}
      </>
    </ErrorBoundary>
  );
}

export default observer(React.forwardRef(Editor));
