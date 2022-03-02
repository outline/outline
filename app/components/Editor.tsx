import * as React from "react";
import { Optional } from "utility-types";
import embeds from "@shared/editor/embeds";
import { isInternalUrl } from "@shared/utils/urls";
import ErrorBoundary from "~/components/ErrorBoundary";
import { Props as EditorProps } from "~/editor";
import useDictionary from "~/hooks/useDictionary";
import useToasts from "~/hooks/useToasts";
import { uploadFile } from "~/utils/files";
import history from "~/utils/history";
import { isModKey } from "~/utils/keyboard";
import { isHash } from "~/utils/urls";

const SharedEditor = React.lazy(
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
> & {
  shareId?: string | undefined;
  embedsDisabled?: boolean;
  grow?: boolean;
  onSynced?: () => Promise<void>;
  onPublish?: (event: React.MouseEvent) => any;
};

function Editor(props: Props, ref: React.Ref<any>) {
  const { id, shareId } = props;
  const { showToast } = useToasts();
  const dictionary = useDictionary();

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

  const onShowToast = React.useCallback(
    (message: string) => {
      showToast(message);
    },
    [showToast]
  );

  return (
    <ErrorBoundary reloadOnChunkMissing>
      <SharedEditor
        ref={ref}
        uploadFile={onUploadFile}
        onShowToast={onShowToast}
        embeds={embeds}
        dictionary={dictionary}
        {...props}
        onClickLink={onClickLink}
        placeholder={props.placeholder || ""}
        defaultValue={props.defaultValue || ""}
      />
    </ErrorBoundary>
  );
}

export default React.forwardRef(Editor);
