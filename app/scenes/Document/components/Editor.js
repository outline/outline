// @flow
import * as React from 'react';
import styled from 'styled-components';
import { inject, observer } from 'mobx-react';
import Editor from 'components/Editor';
import PublishingInfo from 'components/PublishingInfo';
import ClickablePadding from 'components/ClickablePadding';
import Flex from 'shared/components/Flex';
import parseTitle from 'shared/utils/parseTitle';
import ViewsStore from 'stores/ViewsStore';
import Document from 'models/Document';
import plugins from './plugins';

type Props = {|
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  defaultValue: string,
  document: Document,
  views: ViewsStore,
  isDraft: boolean,
  readOnly?: boolean,
|};

@observer
class DocumentEditor extends React.Component<Props> {
  editor: ?Editor;

  focusAtStart = () => {
    if (this.editor) {
      this.editor.focusAtStart();
    }
  };

  focusAtEnd = () => {
    if (this.editor) {
      this.editor.focusAtEnd();
    }
  };

  handleTitleKeyDown = (event: SyntheticKeyboardEvent<>) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.focusAtStart();
    }
  };

  render() {
    const {
      views,
      document,
      title,
      onChangeTitle,
      isDraft,
      readOnly,
    } = this.props;
    const totalViews = views.countForDocument(document.id);
    const { emoji } = parseTitle(title);
    const startsWithEmojiAndSpace = !!(
      emoji && title.match(new RegExp(`^${emoji}\\s`))
    );

    return (
      <Flex auto column>
        <Title
          type="text"
          onChange={onChangeTitle}
          onKeyDown={this.handleTitleKeyDown}
          placeholder="Start with a title…"
          value={!title && readOnly ? 'Untitled' : title}
          offsetLeft={startsWithEmojiAndSpace}
          readOnly={readOnly}
          autoFocus={!title}
        />
        <Meta document={document}>
          {totalViews && !isDraft ? (
            <React.Fragment>
              &nbsp;&middot; Viewed{' '}
              {totalViews === 1 ? 'once' : `${totalViews} times`}
            </React.Fragment>
          ) : null}
        </Meta>
        <Editor
          ref={ref => (this.editor = ref)}
          autoFocus={title && !this.props.defaultValue}
          placeholder="…the rest is up to you"
          plugins={plugins}
          grow
          {...this.props}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
      </Flex>
    );
  }
}

const Meta = styled(PublishingInfo)`
  margin: -12px 0 2em 0;
  font-size: 14px;
`;

const Title = styled('input')`
  z-index: 1;
  line-height: 1.25;
  margin-top: 1em;
  margin-bottom: 0.5em;
  margin-left: ${props => (props.offsetLeft ? '-1.2em' : 0)};
  color: ${props => props.theme.text};
  font-size: 2.25em;
  font-weight: 500;
  outline: none;
  border: 0;
  padding: 0;

  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

export default inject('views')(DocumentEditor);
