// @flow
import { lighten } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { withRouter, type RouterHistory } from "react-router-dom";
import { Extension } from "rich-markdown-editor";
import styled, { withTheme } from "styled-components";
import embeds from "shared/embeds";
import { light } from "shared/theme";
import UiStore from "stores/UiStore";
import ErrorBoundary from "components/ErrorBoundary";
import Tooltip from "components/Tooltip";
import useMediaQuery from "hooks/useMediaQuery";
import useToasts from "hooks/useToasts";
import { type Theme } from "types";
import { isModKey } from "utils/keyboard";
import { uploadFile } from "utils/uploadFile";
import { isInternalUrl, isHash } from "utils/urls";

const RichMarkdownEditor = React.lazy(() =>
  import(/* webpackChunkName: "rich-markdown-editor" */ "rich-markdown-editor")
);

const EMPTY_ARRAY = [];

export type Props = {|
  id?: string,
  value?: string,
  defaultValue?: string,
  readOnly?: boolean,
  grow?: boolean,
  disableEmbeds?: boolean,
  ui?: UiStore,
  style?: Object,
  extensions?: Extension[],
  shareId?: ?string,
  autoFocus?: boolean,
  template?: boolean,
  placeholder?: string,
  maxLength?: number,
  scrollTo?: string,
  theme?: Theme,
  className?: string,
  handleDOMEvents?: Object,
  readOnlyWriteCheckboxes?: boolean,
  onBlur?: (event: SyntheticEvent<>) => any,
  onFocus?: (event: SyntheticEvent<>) => any,
  onPublish?: (event: SyntheticEvent<>) => any,
  onSave?: ({ done?: boolean, autosave?: boolean, publish?: boolean }) => any,
  onCancel?: () => any,
  onDoubleClick?: () => any,
  onChange?: (getValue: () => string) => any,
  onSearchLink?: (title: string) => any,
  onHoverLink?: (event: MouseEvent) => any,
  onCreateLink?: (title: string) => Promise<string>,
  onImageUploadStart?: () => any,
  onImageUploadStop?: () => any,
|};

type PropsWithRef = Props & {
  forwardedRef: React.Ref<any>,
  history: RouterHistory,
};

function Editor(props: PropsWithRef) {
  const { id, shareId, history } = props;
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const isPrinting = useMediaQuery("print");

  const onUploadImage = React.useCallback(
    async (file: File) => {
      const result = await uploadFile(file, { documentId: id });
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
    [history, shareId]
  );

  const onShowToast = React.useCallback(
    (message: string) => {
      showToast(message);
    },
    [showToast]
  );

  const dictionary = React.useMemo(() => {
    return {
      addColumnAfter: t("Insert column after"),
      addColumnBefore: t("Insert column before"),
      addRowAfter: t("Insert row after"),
      addRowBefore: t("Insert row before"),
      alignCenter: t("Align center"),
      alignLeft: t("Align left"),
      alignRight: t("Align right"),
      bulletList: t("Bulleted list"),
      checkboxList: t("Todo list"),
      codeBlock: t("Code block"),
      codeCopied: t("Copied to clipboard"),
      codeInline: t("Code"),
      createLink: t("Create link"),
      createLinkError: t("Sorry, an error occurred creating the link"),
      createNewDoc: t("Create a new doc"),
      deleteColumn: t("Delete column"),
      deleteRow: t("Delete row"),
      deleteTable: t("Delete table"),
      deleteImage: t("Delete image"),
      downloadImage: t("Download image"),
      alignImageLeft: t("Float left"),
      alignImageRight: t("Float right"),
      alignImageDefault: t("Center large"),
      em: t("Italic"),
      embedInvalidLink: t("Sorry, that link won’t work for this embed type"),
      findOrCreateDoc: `${t("Find or create a doc")}…`,
      h1: t("Big heading"),
      h2: t("Medium heading"),
      h3: t("Small heading"),
      heading: t("Heading"),
      hr: t("Divider"),
      image: t("Image"),
      imageUploadError: t("Sorry, an error occurred uploading the image"),
      imageCaptionPlaceholder: t("Write a caption"),
      info: t("Info"),
      infoNotice: t("Info notice"),
      link: t("Link"),
      linkCopied: t("Link copied to clipboard"),
      mark: t("Highlight"),
      newLineEmpty: `${t("Type '/' to insert")}…`,
      newLineWithSlash: `${t("Keep typing to filter")}…`,
      noResults: t("No results"),
      openLink: t("Open link"),
      orderedList: t("Ordered list"),
      pageBreak: t("Page break"),
      pasteLink: `${t("Paste a link")}…`,
      pasteLinkWithTitle: (service: string) =>
        t("Paste a {{service}} link…", { service }),
      placeholder: t("Placeholder"),
      quote: t("Quote"),
      removeLink: t("Remove link"),
      searchOrPasteLink: `${t("Search or paste a link")}…`,
      strikethrough: t("Strikethrough"),
      strong: t("Bold"),
      subheading: t("Subheading"),
      table: t("Table"),
      tip: t("Tip"),
      tipNotice: t("Tip notice"),
      warning: t("Warning"),
      warningNotice: t("Warning notice"),
    };
  }, [t]);

  return (
    <ErrorBoundary reloadOnChunkMissing>
      <StyledEditor
        ref={props.forwardedRef}
        uploadImage={onUploadImage}
        onClickLink={onClickLink}
        onShowToast={onShowToast}
        embeds={props.disableEmbeds ? EMPTY_ARRAY : embeds}
        tooltip={EditorTooltip}
        dictionary={dictionary}
        {...props}
        theme={isPrinting ? light : props.theme}
      />
    </ErrorBoundary>
  );
}

const StyledEditor = styled(RichMarkdownEditor)`
  flex-grow: ${(props) => (props.grow ? 1 : 0)};
  justify-content: start;

  > div {
    background: transparent;
  }

  & * {
    box-sizing: content-box;
  }

  .notice-block.tip,
  .notice-block.warning {
    font-weight: 500;
  }

  .heading-anchor {
    box-sizing: border-box;
  }

  .heading-name {
    pointer-events: none;
    display: block;
    position: relative;
    top: -60px;
    visibility: hidden;
  }

  .heading-name:first-child,
  .heading-name:first-child + .ProseMirror-yjs-cursor {
    & + h1,
    & + h2,
    & + h3,
    & + h4 {
      margin-top: 0;
    }
  }

  p {
    a {
      color: ${(props) => props.theme.text};
      border-bottom: 1px solid ${(props) => lighten(0.5, props.theme.text)};
      text-decoration: none !important;
      font-weight: 500;

      &:hover {
        border-bottom: 1px solid ${(props) => props.theme.text};
        text-decoration: none;
      }
    }
  }

  .ProseMirror {
    & > .ProseMirror-yjs-cursor {
      display: none;
    }

    .ProseMirror-yjs-cursor {
      position: relative;
      margin-left: -1px;
      margin-right: -1px;
      border-left: 1px solid black;
      border-right: 1px solid black;
      height: 1em;
      word-break: normal;

      &:after {
        content: "";
        display: block;
        position: absolute;
        left: -8px;
        right: -8px;
        top: 0;
        bottom: 0;
      }
      > div {
        opacity: 0;
        transition: opacity 100ms ease-in-out;
        position: absolute;
        top: -1.8em;
        font-size: 13px;
        background-color: rgb(250, 129, 0);
        font-style: normal;
        line-height: normal;
        user-select: none;
        white-space: nowrap;
        color: white;
        padding: 2px 6px;
        font-weight: 500;
        border-radius: 4px;
        pointer-events: none;
        left: -1px;
      }

      &:hover {
        > div {
          opacity: 1;
        }
      }
    }
  }

  &.show-cursor-names .ProseMirror-yjs-cursor > div {
    opacity: 1;
  }
`;

const EditorTooltip = ({ children, ...props }) => (
  <Tooltip offset="0, 16" delay={150} {...props}>
    <Span>{children}</Span>
  </Tooltip>
);

const Span = styled.span`
  outline: none;
`;

const EditorWithRouterAndTheme = withRouter(withTheme(Editor));

export default React.forwardRef<Props, typeof Editor>((props, ref) => (
  <EditorWithRouterAndTheme {...props} forwardedRef={ref} />
));
