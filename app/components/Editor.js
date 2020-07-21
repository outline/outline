// @flow
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { lighten } from "polished";
import styled, { withTheme } from "styled-components";
import RichMarkdownEditor from "rich-markdown-editor";
import { uploadFile } from "utils/uploadFile";
import isInternalUrl from "utils/isInternalUrl";
import Tooltip from "components/Tooltip";
import UiStore from "stores/UiStore";
import embeds from "../embeds";

const EMPTY_ARRAY = [];

type Props = {
  id: string,
  defaultValue?: string,
  readOnly?: boolean,
  grow?: boolean,
  disableEmbeds?: boolean,
  history: RouterHistory,
  forwardedRef: React.Ref<RichMarkdownEditor>,
  ui: UiStore,
};

@observer
class Editor extends React.Component<Props> {
  @observable redirectTo: ?string;

  onUploadImage = async (file: File) => {
    const result = await uploadFile(file, { documentId: this.props.id });
    return result.url;
  };

  onClickLink = (href: string) => {
    // on page hash
    if (href[0] === "#") {
      window.location.href = href;
      return;
    }

    if (isInternalUrl(href)) {
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
    this.props.ui.showToast(message);
  };

  render() {
    return (
      <StyledEditor
        ref={this.props.forwardedRef}
        uploadImage={this.onUploadImage}
        onClickLink={this.onClickLink}
        onShowToast={this.onShowToast}
        embeds={this.props.disableEmbeds ? EMPTY_ARRAY : embeds}
        tooltip={EditorTooltip}
        {...this.props}
      />
    );
  }
}

const StyledEditor = styled(RichMarkdownEditor)`
  flex-grow: ${props => (props.grow ? 1 : 0)};
  justify-content: start;

  > div {
    transition: ${props => props.theme.backgroundTransition};
  }

  .notice-block.tip,
  .notice-block.warning {
    font-weight: 500;
  }

  p {
    a {
      color: ${props => props.theme.link};
      border-bottom: 1px solid ${props => lighten(0.5, props.theme.link)};
      text-decoration: none !important;
      font-weight: 500;

      &:hover {
        border-bottom: 1px solid ${props => props.theme.link};
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

export default React.forwardRef((props, ref) => (
  <EditorWithRouterAndTheme {...props} forwardedRef={ref} />
));
