// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import Input from 'components/Input';
import Button from 'components/Button';
import CopyToClipboard from 'components/CopyToClipboard';
import HelpText from 'components/HelpText';
import Document from 'models/Document';

type Props = {
  document: Document,
  onCopyLink: () => *,
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
      this.props.onCopyLink();
    }, 2000);
  };

  render() {
    const { document } = this.props;

    return (
      <div>
        <HelpText>
          The link below allows anyone to access a read-only version of the
          document <strong>{document.title}</strong>. You can revoke this link
          in settings at any time.
        </HelpText>
        <Input
          type="text"
          label="Share link"
          value={document.shareUrl || 'Loading…'}
          disabled
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
