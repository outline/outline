// @flow
import { lighten } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import UiStore from "stores/UiStore";
import ErrorBoundary from "components/ErrorBoundary";
import Tooltip from "components/Tooltip";
import embeds from "../embeds";
import { isModKey } from "utils/keyboard";
import { uploadFile } from "utils/uploadFile";
import { isInternalUrl } from "utils/urls";

const RichMarkdownEditor = React.lazy(() => import("rich-markdown-editor"));

const EMPTY_ARRAY = [];

export type Props = {|
  id?: string,
  value?: string,
  defaultValue?: string,
  readOnly?: boolean,
  grow?: boolean,
  disableEmbeds?: boolean,
  ui?: UiStore,
  autoFocus?: boolean,
  template?: boolean,
  placeholder?: string,
  maxLength?: number,
  scrollTo?: string,
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
  const { id, ui, history } = props;
  const { t } = useTranslation();

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
      if (href[0] === "#") {
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

        history.push(navigateTo);
      } else if (href) {
        window.open(href, "_blank");
      }
    },
    [history]
  );

  const onShowToast = React.useCallback(
    (message: string) => {
      if (ui) {
        ui.showToast(message);
      }
    },
    [ui]
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

  .heading-name:first-child {
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
