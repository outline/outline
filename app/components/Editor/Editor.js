// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { withTheme } from 'styled-components';
import RichMarkdownEditor from 'rich-markdown-editor';
import { uploadFile } from 'utils/uploadFile';
import isInternalUrl from 'utils/isInternalUrl';
import Embed from './Embed';
import embeds from '../../embeds';

type Props = {
  defaultValue?: string,
  readOnly?: boolean,
  disableEmbeds?: boolean,
  forwardedRef: *,
  ui: *,
};

@observer
class Editor extends React.Component<Props> {
  @observable redirectTo: ?string;

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

      this.redirectTo = navigateTo;
    } else {
      window.open(href, '_blank');
    }
  };

  onShowToast = (message: string) => {
    this.props.ui.showToast(message);
  };

  getLinkComponent = node => {
    if (this.props.disableEmbeds) return;

    const url = node.data.get('href');
    const keys = Object.keys(embeds);

    for (const key of keys) {
      const component = embeds[key];

      for (const host of component.ENABLED) {
        const matches = url.match(host);
        if (matches) return Embed;
      }
    }
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    return (
      <RichMarkdownEditor
        ref={this.props.forwardedRef}
        uploadImage={this.onUploadImage}
        onClickLink={this.onClickLink}
        onShowToast={this.onShowToast}
        getLinkComponent={this.getLinkComponent}
        {...this.props}
      />
    );
  }
}

export default withTheme(
  // $FlowIssue - https://github.com/facebook/flow/issues/6103
  React.forwardRef((props, ref) => <Editor {...props} forwardedRef={ref} />)
);
