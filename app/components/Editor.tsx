import { lighten } from "polished";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { Optional } from "utility-types";
import { Props as EditorProps } from "@shared/editor";
import { EmbedDescriptor } from "@shared/editor/types";
import embeds from "@shared/embeds";
import useDictionary from "@shared/hooks/useDictionary";
import useMediaQuery from "@shared/hooks/useMediaQuery";
import { light } from "@shared/theme";
import ErrorBoundary from "~/components/ErrorBoundary";
import Tooltip from "~/components/Tooltip";
import useToasts from "~/hooks/useToasts";
import history from "~/utils/history";
import { isModKey } from "~/utils/keyboard";
import { uploadFile } from "~/utils/uploadFile";
import { isInternalUrl, isHash } from "~/utils/urls";

// TODO: This entire component can be removed now that Editor is in the codebase

const SharedEditor = React.lazy(
  () =>
    import(
      /* webpackChunkName: "shared-editor" */
      "@shared/editor"
    )
);

const EMPTY_ARRAY: EmbedDescriptor[] = [];

export type Props = Optional<
  EditorProps,
  "placeholder" | "defaultValue" | "tooltip" | "onClickLink" | "embeds"
> & {
  shareId?: string | undefined;
  disableEmbeds?: boolean;
  grow?: boolean;
  onSynced?: () => Promise<void>;
  onPublish?: (event: React.MouseEvent) => any;
};

function Editor(props: Props, ref: React.Ref<any>) {
  const { id, shareId } = props;
  const theme = useTheme();
  const { showToast } = useToasts();
  const isPrinting = useMediaQuery("print");
  const dictionary = useDictionary();

  const onUploadImage = React.useCallback(
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

  const onShowToast = React.useCallback(
    (message: string) => {
      showToast(message);
    },
    [showToast]
  );

  return (
    <ErrorBoundary reloadOnChunkMissing>
      <StyledEditor
        ref={ref}
        uploadImage={onUploadImage}
        onShowToast={onShowToast}
        embeds={props.disableEmbeds ? EMPTY_ARRAY : embeds}
        dictionary={dictionary}
        {...props}
        tooltip={EditorTooltip}
        onClickLink={onClickLink}
        placeholder={props.placeholder || ""}
        defaultValue={props.defaultValue || ""}
        theme={isPrinting ? light : theme}
      />
    </ErrorBoundary>
  );
}

const StyledEditor = styled(SharedEditor)<{ grow?: boolean }>`
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

type TooltipProps = {
  children: React.ReactNode;
  tooltip: string;
};

const EditorTooltip = ({ children, tooltip, ...props }: TooltipProps) => (
  <Tooltip offset="0, 16" delay={150} tooltip={tooltip} {...props}>
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

const TooltipContent = styled.span`
  outline: none;
`;

export default React.forwardRef<typeof Editor, Props>(Editor);
