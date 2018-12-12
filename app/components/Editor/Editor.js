// @flow
import * as React from 'react';
import RichMarkdownEditor from 'rich-markdown-editor';
import { uploadFile } from 'utils/uploadFile';
import isInternalUrl from 'utils/isInternalUrl';
import Link from './Link';

type Props = {
  titlePlaceholder?: string,
  bodyPlaceholder?: string,
  defaultValue?: string,
  readOnly?: boolean,
  disableEmbeds?: boolean,
  forwardedRef: *,
  history: *,
  ui: *,
};

class Editor extends React.Component<Props> {
  onUploadImage = async (file: File) => {
    const result = await uploadFile(file);
    return result.url;
  };

  onClickLink = (href: string) => {
    // on page hash
    if (href[0] === '#') {
      window.location.href = href;
      return;
    }

    if (isInternalUrl(href)) {
      // relative
      let navigateTo = href;

      // probably absolute
      if (href[0] !== '/') {
        try {
          const url = new URL(href);
          navigateTo = url.pathname + url.hash;
        } catch (err) {
          navigateTo = href;
        }
      }

      this.props.history.push(navigateTo);
    } else {
      window.open(href, '_blank');
    }
  };

  onShowToast = (message: string) => {
    this.props.ui.showToast(message, 'success');
  };

  renderNode = props => {
    if (this.props.disableEmbeds) return;

    // overriding the Link component allows us to inject embeddable widgets
    if (props.node.type === 'link') {
      return <Link {...props} />;
    }
  };

  render() {
    return (
      <RichMarkdownEditor
        ref={this.props.forwardedRef}
        uploadImage={this.onUploadImage}
        onClickLink={this.onClickLink}
        onShowToast={this.onShowToast}
        renderNode={this.renderNode}
        validateNode={node => {
          if (node.type !== 'link') return;
          if (node.object !== 'inline') return;

          console.log(node.getParent(node.key));
          console.log(node);
          // TODO check for embed
          return change => {
            change.withoutNormalization(c => c.unwrapNodeByKey(node.key));
          };
        }}
        {...this.props}
      />
    );
  }
}

// $FlowIssue - https://github.com/facebook/flow/issues/6103
export default React.forwardRef((props, ref) => (
  <Editor {...props} forwardedRef={ref} />
));
