// @flow
import * as React from 'react';
import styled from 'styled-components';
import { inject, observer } from 'mobx-react';
import Editor from 'components/Editor';
import PublishingInfo from 'components/PublishingInfo';
import ClickablePadding from 'components/ClickablePadding';
import ViewsStore from 'stores/ViewsStore';
import Document from 'models/Document';
import plugins from './plugins';

type Props = {|
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  defaultValue: string,
  document: Document,
  views: ViewsStore,
  readOnly?: boolean,
|};

@observer
class DocumentEditor extends React.Component<Props> {
  editor: ?Editor;

  componentDidMount() {
    if (!this.props.defaultValue) {
      setImmediate(this.focusAtStart);
    }
  }

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
    const { views, title, document, onChangeTitle, readOnly } = this.props;
    const totalViews = views.countForDocument(document.id);

    return (
      <React.Fragment>
        <Title
          type="text"
          onChange={onChangeTitle}
          onKeyDown={this.handleTitleKeyDown}
          placeholder="Start with a title…"
          value={title}
          readOnly={readOnly}
        />
        <Meta document={document}>
          {totalViews ? (
            <React.Fragment>
              &nbsp;&middot; Viewed {totalViews} time{totalViews === 1
                ? ''
                : 's'}
            </React.Fragment>
          ) : null}
        </Meta>
        <Editor
          ref={ref => (this.editor = ref)}
          autoFocus={!this.props.defaultValue}
          placeholder="…the rest is your canvas"
          plugins={plugins}
          grow={!readOnly}
          {...this.props}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
      </React.Fragment>
    );
  }
}

const Meta = styled(PublishingInfo)`
  margin: -12px 0 2em 0;
  font-size: 14px;
`;

const Title = styled('input')`
  line-height: 1.25;
  margin-top: 1em;
  margin-bottom: 0.5em;
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
