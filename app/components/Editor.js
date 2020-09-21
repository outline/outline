// @flow
import { lighten } from "polished";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import UiStore from "stores/UiStore";
import ErrorBoundary from "components/ErrorBoundary";
import Tooltip from "components/Tooltip";
import embeds from "../embeds";
import isInternalUrl from "utils/isInternalUrl";
import { uploadFile } from "utils/uploadFile";

const RichMarkdownEditor = React.lazy(() => import("rich-markdown-editor"));

const EMPTY_ARRAY = [];

type Props = {
  id?: string,
  defaultValue?: string,
  readOnly?: boolean,
  grow?: boolean,
  disableEmbeds?: boolean,
  ui?: UiStore,
};

type PropsWithRef = Props & {
  forwardedRef: React.Ref<any>,
  history: RouterHistory,
};

class Editor extends React.Component<PropsWithRef> {
  onUploadImage = async (file: File) => {
    const result = await uploadFile(file, { documentId: this.props.id });
    return result.url;
  };

  onClickLink = (href: string, event: MouseEvent) => {
    // on page hash
    if (href[0] === "#") {
      window.location.href = href;
      return;
    }

    if (isInternalUrl(href) && !event.metaKey && !event.shiftKey) {
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

      this.props.history.push(navigateTo);
    } else {
      window.open(href, "_blank");
    }
  };

  onShowToast = (message: string) => {
    if (this.props.ui) {
      this.props.ui.showToast(message);
    }
  };

  render() {
    return (
      <ErrorBoundary reloadOnChunkMissing>
        <StyledEditor
          ref={this.props.forwardedRef}
          uploadImage={this.onUploadImage}
          onClickLink={this.onClickLink}
          onShowToast={this.onShowToast}
          embeds={this.props.disableEmbeds ? EMPTY_ARRAY : embeds}
          tooltip={EditorTooltip}
          {...this.props}
        />
      </ErrorBoundary>
    );
  }
}

const StyledEditor = styled(RichMarkdownEditor)`
  flex-grow: ${(props) => (props.grow ? 1 : 0)};
  justify-content: start;

  > div {
    transition: ${(props) => props.theme.backgroundTransition};
  }

  .notice-block.tip,
  .notice-block.warning {
    font-weight: 500;
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
