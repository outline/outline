import deburr from "lodash/deburr";
import difference from "lodash/difference";
import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { Optional } from "utility-types";
import insertFiles from "@shared/editor/commands/insertFiles";
import { AttachmentPreset } from "@shared/types";
import { Heading } from "@shared/utils/ProsemirrorHelper";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import { getDataTransferFiles } from "@shared/utils/files";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isInternalUrl } from "@shared/utils/urls";
import { AttachmentValidation } from "@shared/validations";
import ClickablePadding from "~/components/ClickablePadding";
import ErrorBoundary from "~/components/ErrorBoundary";
import type { Props as EditorProps, Editor as SharedEditor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useDictionary from "~/hooks/useDictionary";
import useEditorClickHandlers from "~/hooks/useEditorClickHandlers";
import useEmbeds from "~/hooks/useEmbeds";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { NotFoundError } from "~/utils/errors";
import { uploadFile } from "~/utils/files";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DocumentBreadcrumb from "./DocumentBreadcrumb";
import Icon from "./Icon";

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
  onHeadingsChange?: (headings: Heading[]) => void;
  onSynced?: () => Promise<void>;
  onPublish?: (event: React.MouseEvent) => void;
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
  } = props;
  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);
  const { comments, documents } = useStores();
  const dictionary = useDictionary();
  const embeds = useEmbeds(!shareId);
  const localRef = React.useRef<SharedEditor>();
  const preferences = useCurrentUser({ rejectOnEmpty: false })?.preferences;
  const previousHeadings = React.useRef<Heading[] | null>(null);
  const previousCommentIds = React.useRef<string[]>();

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
              icon: document.icon ? (
                <Icon
                  value={document.icon}
                  color={document.color ?? undefined}
                />
              ) : undefined,
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
        results.map(({ document }) => ({
          title: document.title,
          subtitle: <DocumentBreadcrumb document={document} onlyText />,
          url: document.url,
          icon: document.icon ? (
            <Icon value={document.icon} color={document.color ?? undefined} />
          ) : undefined,
        })),
        (document) =>
          deburr(document.title)
            .toLowerCase()
            .startsWith(deburr(term).toLowerCase())
            ? -1
            : 1
      );
    },
    [locale, documents]
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

  const { handleClickLink } = useEditorClickHandlers({ shareId });

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

      return insertFiles(view, event, pos, files, {
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
    if (onCreateCommentMark && onDeleteCommentMark && localRef.current) {
      const commentMarks = localRef.current.getComments();
      const commentIds = comments.orderedData.map((c) => c.id);
      const commentMarkIds = commentMarks?.map((c) => c.id);
      const newCommentIds = difference(
        commentMarkIds,
        previousCommentIds.current ?? [],
        commentIds
      );

      newCommentIds.forEach((commentId) => {
        const mark = commentMarks.find((c) => c.id === commentId);
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
      </>
    </ErrorBoundary>
  );
}

export default observer(React.forwardRef(Editor));
