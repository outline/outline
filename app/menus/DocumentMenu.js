// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import CollectionStore from 'stores/CollectionsStore';
import {
  documentMoveUrl,
  documentHistoryUrl,
  newDocumentUrl,
} from 'utils/routeHelpers';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  ui: UiStore,
  auth: AuthStore,
  label?: React.Node,
  position?: 'left' | 'right' | 'center',
  document: Document,
  collections: CollectionStore,
  className: string,
  showPrint?: boolean,
  showToggleEmbeds?: boolean,
  showPin?: boolean,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class DocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewChild = (ev: SyntheticEvent<*>) => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId, document.id);
  };

  handleDelete = (ev: SyntheticEvent<*>) => {
    const { document } = this.props;
    this.props.ui.setActiveModal('document-delete', { document });
  };

  handleDocumentHistory = () => {
    this.redirectTo = documentHistoryUrl(this.props.document);
  };

  handleMove = (ev: SyntheticEvent<*>) => {
    this.redirectTo = documentMoveUrl(this.props.document);
  };

  handleDuplicate = async (ev: SyntheticEvent<*>) => {
    const duped = await this.props.document.duplicate();

    // when duplicating, go straight to the duplicated document content
    this.redirectTo = duped.url;
    this.props.ui.showToast('Document duplicated');
  };

  handleArchive = async (ev: SyntheticEvent<*>) => {
    await this.props.document.archive();
    this.props.ui.showToast('Document archived');
  };

  handleRestore = async (ev: SyntheticEvent<*>) => {
    await this.props.document.restore();
    this.props.ui.showToast('Document restored');
  };

  handlePin = (ev: SyntheticEvent<*>) => {
    this.props.document.pin();
  };

  handleUnpin = (ev: SyntheticEvent<*>) => {
    this.props.document.unpin();
  };

  handleStar = (ev: SyntheticEvent<*>) => {
    this.props.document.star();
  };

  handleUnstar = (ev: SyntheticEvent<*>) => {
    this.props.document.unstar();
  };

  handleExport = (ev: SyntheticEvent<*>) => {
    this.props.document.download();
  };

  handleShareLink = async (ev: SyntheticEvent<*>) => {
    const { document } = this.props;
    if (!document.shareUrl) await document.share();

    this.props.ui.setActiveModal('document-share', { document });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const {
      document,
      position,
      label,
      className,
      showPrint,
      showPin,
      auth,
      onOpen,
      onClose,
    } = this.props;
    const canShareDocuments = auth.team && auth.team.sharing;

    if (document.isArchived) {
      return (
        <DropdownMenu label={label || <MoreIcon />} className={className}>
          <DropdownMenuItem onClick={this.handleRestore}>
            Restore
          </DropdownMenuItem>
          <DropdownMenuItem onClick={this.handleDelete}>
            Delete…
          </DropdownMenuItem>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        className={className}
        position={position}
        onOpen={onOpen}
        onClose={onClose}
      >
        {!document.isDraft ? (
          <React.Fragment>
            {showPin &&
              (document.pinned ? (
                <DropdownMenuItem onClick={this.handleUnpin}>
                  Unpin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={this.handlePin}>
                  Pin to collection
                </DropdownMenuItem>
              ))}
            {document.isStarred ? (
              <DropdownMenuItem onClick={this.handleUnstar}>
                Unstar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={this.handleStar}>
                Star
              </DropdownMenuItem>
            )}
            {canShareDocuments && (
              <DropdownMenuItem
                onClick={this.handleShareLink}
                title="Create a public share link"
              >
                Share link…
              </DropdownMenuItem>
            )}
            <hr />
            <DropdownMenuItem onClick={this.handleDocumentHistory}>
              Document history
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={this.handleNewChild}
              title="Create a new child document for the current document"
            >
              New child document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={this.handleDuplicate}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={this.handleArchive}>
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={this.handleDelete}>
              Delete…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={this.handleMove}>Move…</DropdownMenuItem>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {canShareDocuments && (
              <DropdownMenuItem
                onClick={this.handleShareLink}
                title="Create a public share link"
              >
                Share link…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={this.handleDelete}>
              Delete…
            </DropdownMenuItem>
          </React.Fragment>
        )}
        <hr />
        <DropdownMenuItem onClick={this.handleExport}>
          Download
        </DropdownMenuItem>
        {showPrint && (
          <DropdownMenuItem onClick={window.print}>Print</DropdownMenuItem>
        )}
      </DropdownMenu>
    );
  }
}

export default inject('ui', 'auth', 'collections')(DocumentMenu);
