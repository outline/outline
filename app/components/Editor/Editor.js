// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { lighten } from 'polished';
import styled, { withTheme } from 'styled-components';
import RichMarkdownEditor from 'rich-markdown-editor';
import Placeholder from 'rich-markdown-editor/lib/components/Placeholder';
import { uploadFile } from 'utils/uploadFile';
import isInternalUrl from 'utils/isInternalUrl';
import Tooltip from 'components/Tooltip';
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
      <StyledEditor
        ref={this.props.forwardedRef}
        uploadImage={this.onUploadImage}
        onClickLink={this.onClickLink}
        onShowToast={this.onShowToast}
        getLinkComponent={this.getLinkComponent}
        tooltip={EditorTooltip}
        {...this.props}
      />
    );
  }
}

const StyledEditor = styled(RichMarkdownEditor)`
  justify-content: start;

  > div {
    transition: ${props => props.theme.backgroundTransition};
  }

  p {
    ${Placeholder} {
      visibility: hidden;
    }
  }
  p:nth-child(2):last-child {
    ${Placeholder} {
      visibility: visible;
    }
  }

  p {
    a {
      color: ${props => props.theme.link};
      border-bottom: 1px solid ${props => lighten(0.5, props.theme.link)};
      font-weight: 500;

      &:hover {
        border-bottom: 1px solid ${props => props.theme.link};
        text-decoration: none;
      }
    }
  }
`;

const EditorTooltip = props => <Tooltip offset={8} {...props} />;

export default withTheme(
  // $FlowIssue - https://github.com/facebook/flow/issues/6103
  React.forwardRef((props, ref) => <Editor {...props} forwardedRef={ref} />)
);
