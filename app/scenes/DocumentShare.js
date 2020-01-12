// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import Input from 'components/Input';
import Button from 'components/Button';
import CopyToClipboard from 'components/CopyToClipboard';
import HelpText from 'components/HelpText';
import Document from 'models/Document';

type Props = {
  document: Document,
  onSubmit: () => void,
};

@observer
class DocumentShare extends React.Component<Props> {
  @observable isCopied: boolean;
  timeout: TimeoutID;

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleCopied = () => {
    this.isCopied = true;

    this.timeout = setTimeout(() => {
      this.isCopied = false;
      this.props.onSubmit();
    }, 1500);
  };

  render() {
    const { document, onSubmit } = this.props;

    return (
      <div>
        <HelpText>
          The link below allows anyone in the world to access a read-only
          version of the document <strong>{document.title}</strong>. You can
          revoke this link in settings at any time.{' '}
          <Link to="/settings/shares" onClick={onSubmit}>
            Manage share links
          </Link>.
        </HelpText>
        <Input
          type="text"
          label="Share link"
          value={document.shareUrl || 'Loading…'}
          readOnly
        />
        <CopyToClipboard
          text={document.shareUrl || ''}
          onCopy={this.handleCopied}
        >
          <Button type="submit" disabled={this.isCopied} primary>
            {this.isCopied ? 'Copied!' : 'Copy Link'}
          </Button>
        </CopyToClipboard>
      </div>
    );
  }
}

export default DocumentShare;
