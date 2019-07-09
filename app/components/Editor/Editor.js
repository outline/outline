// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { lighten } from 'polished';
import styled, { withTheme, createGlobalStyle } from 'styled-components';
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
      <React.Fragment>
        <PrismStyles />
        <StyledEditor
          ref={this.props.forwardedRef}
          uploadImage={this.onUploadImage}
          onClickLink={this.onClickLink}
          onShowToast={this.onShowToast}
          getLinkComponent={this.getLinkComponent}
          tooltip={EditorTooltip}
          {...this.props}
        />
      </React.Fragment>
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

/*
Based on Prism template by Bram de Haan (http://atelierbram.github.io/syntax-highlighting/prism/)
Original Base16 color scheme by Chris Kempson (https://github.com/chriskempson/base16)
*/
const PrismStyles = createGlobalStyle`
  code[class*="language-"],
  pre[class*="language-"] {
    -webkit-font-smoothing: initial;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 13px;
    line-height: 1.375;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
    color: #24292e;
  }

  /* Code blocks */
  pre[class*="language-"] {
    padding: 1em;
    margin: .5em 0;
    overflow: auto;
  }

  /* Inline code */
  :not(pre) > code[class*="language-"] {
    padding: .1em;
    border-radius: .3em;
  }

  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: #6a737d;
  }

  .token.punctuation {
    color: #5e6687;
  }

  .token.namespace {
    opacity: .7;
  }

  .token.operator,
  .token.boolean,
  .token.number {
    color: #d73a49;
  }

  .token.property {
    color: #c08b30;
  }

  .token.tag {
    color: #3d8fd1;
  }

  .token.string {
    color: #032f62;
  }

  .token.selector {
    color: #6679cc;
  }

  .token.attr-name {
    color: #c76b29;
  }

  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string {
    color: #22a2c9;
  }

  .token.attr-value,
  .token.keyword,
  .token.control,
  .token.directive,
  .token.unit {
    color: #d73a49;
  }

  .token.function {
    color: #6f42c1;
  }

  .token.statement,
  .token.regex,
  .token.atrule {
    color: #22a2c9;
  }

  .token.placeholder,
  .token.variable {
    color: #3d8fd1;
  }

  .token.deleted {
    text-decoration: line-through;
  }

  .token.inserted {
    border-bottom: 1px dotted #202746;
    text-decoration: none;
  }

  .token.italic {
    font-style: italic;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.important {
    color: #c94922;
  }

  .token.entity {
    cursor: help;
  }

  pre > code.highlight {
    outline: 0.4em solid #c94922;
    outline-offset: .4em;
  }
`;

const EditorTooltip = props => (
  <Tooltip offset="0, 16" delay={150} {...props} />
);

export default withTheme(
  // $FlowIssue - https://github.com/facebook/flow/issues/6103
  React.forwardRef((props, ref) => <Editor {...props} forwardedRef={ref} />)
);
